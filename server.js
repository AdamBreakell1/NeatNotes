require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");
const nodemailer = require("nodemailer");
const { buildRevisionRecommendations, calculateConfidenceSummary } = require("./backend/services/learningAnalytics");

const app = express();
const PORT = Number(process.env.PORT || 4173);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_COOKIE = "nn_session";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "neat-notes.sqlite");
const DB_DIR = path.dirname(DB_PATH);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || BASE_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 25),
});
const PLAN_CATALOG = {
  free: {
    id: "free",
    name: "Free",
    price: "£0",
    noteLimit: 25,
    workspaceLimit: 2,
    features: {
      collaboration: false,
      classroomSpaces: false,
      pdfExport: false,
      versionHistory: false,
      studyPack: false,
      teacherDashboard: false,
    },
  },
  plus: {
    id: "plus",
    name: "Student Pro",
    price: "£3.99/mo",
    noteLimit: null,
    workspaceLimit: null,
    features: {
      collaboration: true,
      classroomSpaces: false,
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
      teacherDashboard: false,
    },
  },
  teacher: {
    id: "teacher",
    name: "Teacher / Classroom",
    price: "£9.99/mo",
    noteLimit: null,
    workspaceLimit: null,
    features: {
      collaboration: true,
      classroomSpaces: true,
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
      teacherDashboard: true,
    },
  },
  institution: {
    id: "institution",
    name: "Institution",
    price: "Custom",
    noteLimit: null,
    workspaceLimit: null,
    features: {
      collaboration: true,
      classroomSpaces: true,
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
      teacherDashboard: true,
    },
  },
};

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    email_verified INTEGER NOT NULL DEFAULT 0,
    google_id TEXT UNIQUE,
    last_accessed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    tag TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS note_versions (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    saved_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    tag TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    note_updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    year_group TEXT,
    exam_board TEXT NOT NULL DEFAULT 'OCR A-Level',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teacher_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    job_title TEXT,
    school_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS centres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'school',
    code TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS centre_memberships (
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'teacher')),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (centre_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS class_groups (
    id TEXT PRIMARY KEY,
    centre_id TEXT REFERENCES centres(id) ON DELETE SET NULL,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_board TEXT NOT NULL,
    year_group TEXT,
    description TEXT,
    join_code TEXT NOT NULL UNIQUE,
    join_code_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS class_memberships (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    status TEXT NOT NULL CHECK (status IN ('active', 'left', 'removed')) DEFAULT 'active',
    joined_at TEXT NOT NULL,
    left_at TEXT,
    UNIQUE (class_id, user_id, role)
  );

  CREATE TABLE IF NOT EXISTS flashcard_decks (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_board TEXT NOT NULL DEFAULT 'OCR A-Level',
    summary TEXT NOT NULL,
    source TEXT,
    card_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    card_key TEXT NOT NULL,
    category TEXT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (deck_id, card_key)
  );

  CREATE TABLE IF NOT EXISTS flashcard_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    confidence TEXT NOT NULL CHECK (confidence IN ('confident', 'needs_practice')),
    quiz_correct INTEGER,
    response_time_ms INTEGER,
    source TEXT NOT NULL DEFAULT 'flashcard',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topic_confidence (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    total_attempts INTEGER NOT NULL,
    confident_attempts INTEGER NOT NULL,
    needs_practice_attempts INTEGER NOT NULL,
    percent INTEGER NOT NULL,
    band TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, class_id, deck_id)
  );

  CREATE TABLE IF NOT EXISTS student_activity_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS class_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
    deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    instructions TEXT,
    due_at TEXT,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

migrateSchema();
seedRevisionDecks();

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.static(__dirname));

app.get("/api/session", requireUser, (req, res) => {
  res.json({
    user: publicUser(req.user),
    plans: PLAN_CATALOG,
    googleConfigured: isGoogleConfigured(),
  });
});

app.get("/api/plans", (req, res) => {
  res.json({ plans: PLAN_CATALOG });
});

app.get("/api/health", (req, res) => {
  const database = db.prepare("SELECT 1 AS ok").get();
  const deckCount = db.prepare("SELECT COUNT(*) AS count FROM flashcard_decks").get().count;

  res.json({
    ok: Boolean(database?.ok),
    service: "neat-notes",
    deckCount,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/billing/mock-upgrade", requireUser, (req, res) => {
  const plan = String(req.body.plan || "").toLowerCase();
  if (!PLAN_CATALOG[plan] || plan === "free") {
    return res.status(400).json({ error: "Choose Pro, Teacher, or Institution." });
  }

  const now = new Date().toISOString();
  const role = ["teacher", "institution"].includes(plan) ? "teacher" : req.user.role || "student";
  db.prepare("UPDATE users SET plan = ?, plan_status = 'active', plan_updated_at = ?, role = ?, updated_at = ? WHERE id = ?")
    .run(plan, now, role, now, req.user.id);
  db.prepare("INSERT INTO billing_events (id, user_id, plan, provider, status, created_at) VALUES (?, ?, ?, 'mock', 'complete', ?)")
    .run(crypto.randomUUID(), req.user.id, plan, now);
  ensureAccountProfiles({ ...req.user, role });

  res.json({
    user: publicUser({ ...req.user, plan, role, plan_status: "active", plan_updated_at: now }),
    message: `Mock upgraded to ${PLAN_CATALOG[plan].name}. Stripe can replace this endpoint later.`,
  });
});

app.post("/api/auth/signup", authRateLimiter, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: "Enter a name, valid email, and password with at least 8 characters." });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    if (!existing.email_verified) {
      const verification = await createAndSendVerification(existing.id, existing.email, existing.name);
      return res.status(202).json({
        message: "That account already exists but is not verified yet. I sent a fresh verification link.",
        devVerificationUrl: verification.devVerificationUrl,
      });
    }

    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const passwordRecord = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, password_salt, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(userId, email, name, passwordRecord.hash, passwordRecord.salt, now, now);

  ensurePersonalWorkspace(userId, name);
  ensureAccountProfiles({ id: userId, role: "student" });
  const verification = await createAndSendVerification(userId, email, name);

  res.status(201).json({
    message: "Account created. Check your email for the verification link before logging in.",
    devVerificationUrl: verification.devVerificationUrl,
  });
}));

app.post("/api/auth/login", authRateLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const user = getUserByEmail(email);

  if (!user || !user.password_hash || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }

  if (!user.email_verified) {
    return res.status(403).json({ error: "Verify your email before logging in." });
  }

  ensureAccountProfiles(user);
  issueSession(res, user.id);
  res.json({ user: publicUser(user), plans: PLAN_CATALOG });
}));

app.post("/api/auth/logout", requireUser, (req, res) => {
  if (req.sessionHash) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(req.sessionHash);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/verify", (req, res) => {
  const token = String(req.query.token || "");
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT email_verification_tokens.*, users.email
    FROM email_verification_tokens
    JOIN users ON users.id = email_verification_tokens.user_id
    WHERE token_hash = ?
  `).get(tokenHash);

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return res.status(400).send(renderMessagePage("Verification failed", "That link is invalid or has expired."));
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(now, row.user_id);
  db.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE token_hash = ?").run(now, tokenHash);

  res.redirect("/?verified=1");
});

app.get("/api/auth/google", authRateLimiter, (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(503).send(renderMessagePage("Google is not configured", "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env first."));
  }

  const state = crypto.randomBytes(24).toString("hex");
  res.cookie("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/api/auth/google/callback", asyncHandler(async (req, res) => {
  const stateCookie = parseCookies(req.headers.cookie || "").google_oauth_state;
  if (!isGoogleConfigured() || !req.query.code || !req.query.state || req.query.state !== stateCookie) {
    return res.status(400).send(renderMessagePage("Google sign-in failed", "The OAuth response could not be verified."));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(req.query.code),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return res.status(400).send(renderMessagePage("Google sign-in failed", "Google did not accept the authorization code."));
  }

  const tokens = await tokenResponse.json();
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    return res.status(400).send(renderMessagePage("Google sign-in failed", "The Google profile could not be loaded."));
  }

  const profile = await profileResponse.json();
  const user = upsertGoogleUser(profile);
  issueSession(res, user.id);
  res.clearCookie("google_oauth_state");
  res.redirect("/");
}));

app.get("/api/workspaces", requireUser, (req, res) => {
  const workspaces = db.prepare(`
    SELECT workspaces.*, workspace_members.role,
      (SELECT COUNT(*) FROM notes WHERE notes.workspace_id = workspaces.id) AS note_count,
      (SELECT COUNT(*) FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id) AS member_count
    FROM workspaces
    JOIN workspace_members ON workspace_members.workspace_id = workspaces.id
    WHERE workspace_members.user_id = ?
    ORDER BY workspaces.updated_at DESC
  `).all(req.user.id);

  res.json({ workspaces });
});

app.post("/api/workspaces", requireUser, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  const kind = normalizeWorkspaceKind(req.body.kind || "project");
  if (!name) return res.status(400).json({ error: "Workspace name is required." });
  if (kind === "classroom" && !hasFeature(req.user, "classroomSpaces")) {
    return res.status(402).json({ error: "Classroom spaces are part of the Teacher plan." });
  }

  const limit = getPlan(req.user).workspaceLimit;
  const currentCount = countOwnedWorkspaces(req.user.id);
  if (limit !== null && currentCount >= limit) {
    return res.status(402).json({ error: `Free accounts can create ${limit} spaces. Upgrade for unlimited projects and classes.` });
  }

  const workspace = createWorkspace(req.user.id, name, kind);
  res.status(201).json({ workspace });
});

app.get("/api/workspaces/:id/dashboard", requireUser, (req, res) => {
  const membership = requireWorkspaceMember(req, res);
  if (!membership) return;
  const workspace = getWorkspace(req.params.id);
  if (!workspace || workspace.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Only the owner can view this dashboard." });
  }
  if (!hasFeature(req.user, "teacherDashboard")) {
    return res.status(402).json({ error: "Teacher dashboards are part of the Teacher plan." });
  }

  const summary = db.prepare(`
    SELECT
      COUNT(notes.id) AS note_count,
      COUNT(DISTINCT notes.owner_id) AS active_authors,
      MAX(notes.updated_at) AS last_activity
    FROM notes
    WHERE notes.workspace_id = ?
  `).get(req.params.id);
  const contributors = db.prepare(`
    SELECT users.name, users.email, COUNT(notes.id) AS note_count, MAX(notes.updated_at) AS last_activity
    FROM workspace_members
    JOIN users ON users.id = workspace_members.user_id
    LEFT JOIN notes ON notes.owner_id = users.id AND notes.workspace_id = workspace_members.workspace_id
    WHERE workspace_members.workspace_id = ?
    GROUP BY users.id
    ORDER BY note_count DESC, users.name
  `).all(req.params.id);

  res.json({ workspace, summary, contributors });
});

app.get("/api/workspaces/:id/members", requireUser, (req, res) => {
  const membership = requireWorkspaceMember(req, res);
  if (!membership) return;

  const members = db.prepare(`
    SELECT users.id, users.email, users.name, workspace_members.role, workspace_members.created_at
    FROM workspace_members
    JOIN users ON users.id = workspace_members.user_id
    WHERE workspace_members.workspace_id = ?
    ORDER BY workspace_members.role DESC, users.name
  `).all(req.params.id);

  res.json({ members });
});

app.post("/api/workspaces/:id/members", requireUser, (req, res) => {
  const membership = requireWorkspaceMember(req, res);
  if (!membership) return;
  if (membership.role !== "owner") {
    return res.status(403).json({ error: "Only the workspace owner can add collaborators." });
  }
  if (!hasFeature(req.user, "collaboration")) {
    return res.status(402).json({ error: "Collaboration is part of Pro and Teacher plans." });
  }

  const email = normalizeEmail(req.body.email);
  const user = getUserByEmail(email);
  if (!user) return res.status(404).json({ error: "Ask them to sign up first, then add their email here." });
  if (!user.email_verified) return res.status(409).json({ error: "That user needs to verify their email first." });

  db.prepare(`
    INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (?, ?, 'editor', ?)
  `).run(req.params.id, user.id, new Date().toISOString());

  res.status(201).json({ ok: true });
});

app.get("/api/notes", requireUser, (req, res) => {
  const workspaceId = String(req.query.workspaceId || "");
  if (!isWorkspaceMember(workspaceId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that workspace." });
  }

  const notes = db.prepare(`
    SELECT notes.*, users.name AS owner_name
    FROM notes
    JOIN users ON users.id = notes.owner_id
    WHERE workspace_id = ?
    ORDER BY datetime(notes.updated_at) DESC
  `).all(workspaceId);

  res.json({ notes });
});

app.post("/api/notes", requireUser, (req, res) => {
  const workspaceId = String(req.body.workspaceId || "");
  if (!isWorkspaceMember(workspaceId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that workspace." });
  }

  const limit = getPlan(req.user).noteLimit;
  const currentCount = countUserNotes(req.user.id);
  if (limit !== null && currentCount >= limit) {
    return res.status(402).json({ error: `Free accounts can create ${limit} notes. Upgrade for unlimited notes and revision spaces.` });
  }

  const body = String(req.body.body || "");
  const tag = normalizeTag(req.body.tag || "inbox");
  const now = new Date().toISOString();
  const note = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    owner_id: req.user.id,
    body,
    tag,
    title: createTitle(body),
    summary: createSummary(body),
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO notes (id, workspace_id, owner_id, body, tag, title, summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(note.id, note.workspace_id, note.owner_id, note.body, note.tag, note.title, note.summary, note.created_at, note.updated_at);
  touchWorkspace(workspaceId);

  res.status(201).json({ note });
});

app.patch("/api/notes/:id", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  const body = "body" in req.body ? String(req.body.body || "") : note.body;
  const tag = "tag" in req.body ? normalizeTag(req.body.tag) : note.tag;
  const now = new Date().toISOString();
  const title = createTitle(body);
  const summary = createSummary(body);

  if (body !== note.body || tag !== note.tag) {
    saveNoteVersion(note, req.user.id);
  }

  db.prepare(`
    UPDATE notes
    SET body = ?, tag = ?, title = ?, summary = ?, updated_at = ?
    WHERE id = ?
  `).run(body, tag, title, summary, now, note.id);
  touchWorkspace(note.workspace_id);

  res.json({
    note: {
      ...note,
      body,
      tag,
      title,
      summary,
      updated_at: now,
    },
  });
});

app.get("/api/notes/:id/versions", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });
  if (!hasFeature(req.user, "versionHistory")) {
    return res.status(402).json({ error: "Version history is part of Pro and Teacher plans." });
  }

  const versions = db.prepare(`
    SELECT note_versions.*, users.name AS saved_by_name
    FROM note_versions
    JOIN users ON users.id = note_versions.saved_by
    WHERE note_versions.note_id = ?
    ORDER BY datetime(note_versions.created_at) DESC
    LIMIT 30
  `).all(note.id);

  res.json({ versions });
});

app.get("/api/notes/:id/study-pack", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });
  if (!hasFeature(req.user, "studyPack")) {
    return res.status(402).json({ error: "Study packs are part of Pro and Teacher plans." });
  }

  res.json({ studyPack: createStudyPack(note) });
});

app.get("/api/notes/:id/export.pdf", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });
  if (!hasFeature(req.user, "pdfExport")) {
    return res.status(402).json({ error: "PDF export is part of Pro and Teacher plans." });
  }

  const workspace = getWorkspace(note.workspace_id);
  const pdf = createNotePdf(note, workspace, req.user);
  const filename = `${slugify(note.title || "note")}.pdf`;
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", `attachment; filename="${filename}"`);
  res.send(pdf);
});

app.delete("/api/notes/:id", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  db.prepare("DELETE FROM notes WHERE id = ?").run(note.id);
  touchWorkspace(note.workspace_id);
  res.json({ ok: true });
});

app.get("/api/profile", requireUser, (req, res) => {
  ensureAccountProfiles(req.user);
  res.json({
    user: publicUser(req.user),
    studentProfile: getStudentProfile(req.user.id),
    teacherProfile: getTeacherProfile(req.user.id),
  });
});

app.patch("/api/profile", requireUser, (req, res) => {
  const name = String(req.body.name || req.user.name).trim().slice(0, 120);
  const requestedRole = normalizeUserRole(req.body.role || req.user.role);
  const role = isTeacherUser(req.user) ? requestedRole : req.user.role || "student";
  if (!name) return res.status(400).json({ error: "Name is required." });

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?").run(name, role, now, req.user.id);
  const updatedUser = { ...req.user, name, role };
  ensureAccountProfiles(updatedUser);
  res.json({ user: publicUser(updatedUser) });
});

app.get("/api/centres", requireUser, (req, res) => {
  const centres = db.prepare(`
    SELECT centres.*, centre_memberships.role AS membership_role
    FROM centres
    JOIN centre_memberships ON centre_memberships.centre_id = centres.id
    WHERE centre_memberships.user_id = ?
    ORDER BY centres.name
  `).all(req.user.id);

  res.json({ centres });
});

app.post("/api/centres", requireUser, requireTeacher, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 120);
  const type = normalizeCentreType(req.body.type);
  if (!name) return res.status(400).json({ error: "Centre name is required." });

  const now = new Date().toISOString();
  const centre = {
    id: crypto.randomUUID(),
    name,
    type,
    code: createJoinCode("CENTRE"),
    created_by: req.user.id,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO centres (id, name, type, code, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(centre.id, centre.name, centre.type, centre.code, centre.created_by, centre.created_at, centre.updated_at);
  db.prepare("INSERT INTO centre_memberships (centre_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)")
    .run(centre.id, req.user.id, now);

  res.status(201).json({ centre: { ...centre, membership_role: "owner" } });
});

app.post("/api/centres/join", requireUser, requireTeacher, (req, res) => {
  const code = normaliseClassCode(req.body.code);
  if (!code) return res.status(400).json({ error: "Enter a centre code." });

  const centre = db.prepare("SELECT * FROM centres WHERE code = ?").get(code);
  if (!centre) return res.status(404).json({ error: "We could not find a centre with that code." });

  db.prepare(`
    INSERT OR IGNORE INTO centre_memberships (centre_id, user_id, role, joined_at)
    VALUES (?, ?, 'teacher', ?)
  `).run(centre.id, req.user.id, new Date().toISOString());

  res.status(201).json({ centre: { ...centre, membership_role: "teacher" } });
});

app.get("/api/classes", requireUser, (req, res) => {
  const classes = isTeacherUser(req.user) ? listTeacherClasses(req.user.id) : listStudentClasses(req.user.id);
  res.json({ classes });
});

app.post("/api/classes", requireUser, requireTeacher, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 120);
  const subject = String(req.body.subject || "Computer Science").trim().slice(0, 80);
  const examBoard = String(req.body.examBoard || "OCR A-Level").trim().slice(0, 80);
  const yearGroup = String(req.body.yearGroup || "").trim().slice(0, 40);
  const description = String(req.body.description || "").trim().slice(0, 500);
  const centreId = String(req.body.centreId || "").trim() || null;

  if (!name) return res.status(400).json({ error: "Class name is required." });
  if (centreId && !canManageCentre(centreId, req.user.id)) {
    return res.status(403).json({ error: "You cannot create classes for that centre." });
  }

  const now = new Date().toISOString();
  const classGroup = {
    id: crypto.randomUUID(),
    centre_id: centreId,
    teacher_id: req.user.id,
    name,
    subject,
    exam_board: examBoard,
    year_group: yearGroup,
    description,
    join_code: createJoinCode("NN"),
    join_code_enabled: 1,
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO class_groups (id, centre_id, teacher_id, name, subject, exam_board, year_group, description, join_code, join_code_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    classGroup.id,
    classGroup.centre_id,
    classGroup.teacher_id,
    classGroup.name,
    classGroup.subject,
    classGroup.exam_board,
    classGroup.year_group,
    classGroup.description,
    classGroup.join_code,
    classGroup.created_at,
    classGroup.updated_at,
  );
  db.prepare(`
    INSERT INTO class_memberships (id, class_id, user_id, role, status, joined_at)
    VALUES (?, ?, ?, 'teacher', 'active', ?)
  `).run(crypto.randomUUID(), classGroup.id, req.user.id, now);
  recordStudentActivity(req.user.id, classGroup.id, null, "class_created", { name: classGroup.name });

  res.status(201).json({ class: decorateClassGroup(classGroup) });
});

app.post("/api/classes/join", requireUser, (req, res) => {
  const code = normaliseClassCode(req.body.code);
  if (!code) return res.status(400).json({ error: "Enter a class code to continue." });
  if (!isValidClassCode(code)) {
    return res.status(400).json({ error: "That class code does not look right. Check it and try again." });
  }

  const classGroup = db.prepare("SELECT * FROM class_groups WHERE join_code = ? AND join_code_enabled = 1").get(code);
  if (!classGroup) return res.status(404).json({ error: "We could not find a class with that code." });
  if (classGroup.teacher_id === req.user.id) {
    return res.status(409).json({ error: "You already manage this class as the teacher." });
  }

  const existing = db.prepare(`
    SELECT * FROM class_memberships
    WHERE class_id = ? AND user_id = ? AND role = 'student'
  `).get(classGroup.id, req.user.id);

  const now = new Date().toISOString();
  if (existing?.status === "active") {
    return res.status(409).json({ error: "You have already joined this class." });
  }

  if (existing) {
    db.prepare("UPDATE class_memberships SET status = 'active', joined_at = ?, left_at = NULL WHERE id = ?").run(now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO class_memberships (id, class_id, user_id, role, status, joined_at)
      VALUES (?, ?, ?, 'student', 'active', ?)
    `).run(crypto.randomUUID(), classGroup.id, req.user.id, now);
  }

  ensureAccountProfiles(req.user);
  recordStudentActivity(req.user.id, classGroup.id, null, "class_joined", { code });
  res.status(201).json({
    message: `You have joined ${classGroup.name}.`,
    class: decorateClassGroup(classGroup, req.user.id),
  });
});

app.get("/api/classes/:id", requireUser, requireClassAccess, (req, res) => {
  res.json({ class: decorateClassGroup(req.classGroup, req.user.id) });
});

app.delete("/api/classes/:id/members/me", requireUser, requireClassAccess, (req, res) => {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE class_memberships
    SET status = 'left', left_at = ?
    WHERE class_id = ? AND user_id = ? AND role = 'student'
  `).run(now, req.classGroup.id, req.user.id);
  recordStudentActivity(req.user.id, req.classGroup.id, null, "class_left", {});
  res.json({ ok: true });
});

app.get("/api/classes/:id/students", requireUser, requireClassTeacher, (req, res) => {
  res.json({ students: getClassStudents(req.classGroup.id) });
});

app.get("/api/classes/:id/dashboard", requireUser, requireClassTeacher, (req, res) => {
  res.json(getClassDashboard(req.classGroup.id));
});

app.get("/api/classes/:id/students/:studentId/dashboard", requireUser, requireClassTeacher, (req, res) => {
  const student = getClassStudents(req.classGroup.id).find((item) => item.id === req.params.studentId);
  if (!student) return res.status(404).json({ error: "That student is not in this class." });

  res.json(getStudentConfidenceProfile(req.classGroup.id, student.id));
});

app.post("/api/classes/:id/join-code/regenerate", requireUser, requireClassTeacher, (req, res) => {
  const now = new Date().toISOString();
  const joinCode = createJoinCode("NN");
  db.prepare("UPDATE class_groups SET join_code = ?, join_code_enabled = 1, updated_at = ? WHERE id = ?")
    .run(joinCode, now, req.classGroup.id);
  res.json({ joinCode, enabled: true });
});

app.post("/api/classes/:id/join-code/disable", requireUser, requireClassTeacher, (req, res) => {
  db.prepare("UPDATE class_groups SET join_code_enabled = 0, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), req.classGroup.id);
  res.json({ enabled: false });
});

app.get("/api/revision/decks", requireUser, (req, res) => {
  const classId = String(req.query.classId || "").trim() || null;
  if (classId && !isClassParticipant(classId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that class context." });
  }

  const decks = listRevisionDecks(req.user.id, classId);
  res.json({ decks });
});

app.get("/api/revision/decks/:id", requireUser, (req, res) => {
  const classId = String(req.query.classId || "").trim() || null;
  if (classId && !isClassParticipant(classId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that class context." });
  }

  const deck = getRevisionDeck(req.params.id, req.user.id, classId);
  if (!deck) return res.status(404).json({ error: "Deck not found." });
  res.json({ deck });
});

app.post("/api/revision/attempts", requireUser, (req, res) => {
  const deckId = String(req.body.deckId || "").trim();
  const cardId = String(req.body.cardId || "").trim();
  const confidence = normalizeConfidence(req.body.confidence);
  const classId = String(req.body.classId || "").trim() || null;
  const source = String(req.body.source || "flashcard").trim().slice(0, 40) || "flashcard";

  if (!deckId || !cardId || !confidence) {
    return res.status(400).json({ error: "Deck, card and confidence are required." });
  }

  const card = db.prepare("SELECT * FROM flashcards WHERE id = ? AND deck_id = ?").get(cardId, deckId);
  if (!card) return res.status(404).json({ error: "Flashcard not found." });
  if (classId && !isActiveClassStudent(classId, req.user.id)) {
    return res.status(403).json({ error: "You are not joined to that class." });
  }

  const quizCorrect = req.body.quizCorrect === undefined ? null : (req.body.quizCorrect ? 1 : 0);
  const responseTimeMs = Number.isFinite(Number(req.body.responseTimeMs)) ? Math.max(0, Number(req.body.responseTimeMs)) : null;
  const now = new Date().toISOString();
  const attempt = {
    id: crypto.randomUUID(),
    user_id: req.user.id,
    class_id: classId,
    deck_id: deckId,
    card_id: cardId,
    confidence,
    quiz_correct: quizCorrect,
    response_time_ms: responseTimeMs,
    source,
    created_at: now,
  };

  db.prepare(`
    INSERT INTO flashcard_attempts (id, user_id, class_id, deck_id, card_id, confidence, quiz_correct, response_time_ms, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attempt.id,
    attempt.user_id,
    attempt.class_id,
    attempt.deck_id,
    attempt.card_id,
    attempt.confidence,
    attempt.quiz_correct,
    attempt.response_time_ms,
    attempt.source,
    attempt.created_at,
  );

  const confidenceSummary = updateTopicConfidence(req.user.id, classId, deckId);
  recordStudentActivity(req.user.id, classId, deckId, "card_attempt", { confidence, source, quizCorrect });

  res.status(201).json({
    attempt,
    confidence: confidenceSummary,
    recommendations: getRevisionRecommendations(req.user.id, classId).slice(0, 3),
  });
});

app.get("/api/revision/recommendations", requireUser, (req, res) => {
  const classId = String(req.query.classId || "").trim() || null;
  if (classId && !isClassParticipant(classId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that class context." });
  }

  res.json({ recommendations: getRevisionRecommendations(req.user.id, classId) });
});

app.get("/api/revision/activity", requireUser, (req, res) => {
  const activity = db.prepare(`
    SELECT student_activity_events.*, flashcard_decks.code, flashcard_decks.title AS deck_title, class_groups.name AS class_name
    FROM student_activity_events
    LEFT JOIN flashcard_decks ON flashcard_decks.id = student_activity_events.deck_id
    LEFT JOIN class_groups ON class_groups.id = student_activity_events.class_id
    WHERE student_activity_events.user_id = ?
    ORDER BY datetime(student_activity_events.created_at) DESC
    LIMIT 80
  `).all(req.user.id);

  res.json({ activity });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Neat Notes running at ${BASE_URL}`);
  if (!hasSmtpConfig()) {
    console.log("SMTP is not configured. Verification links will be printed to the server console and returned in dev responses.");
  }
  if (!isGoogleConfigured()) {
    console.log("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.");
  }
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = !origin || ALLOWED_ORIGINS.includes(origin);

  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return allowed ? res.sendStatus(204) : res.sendStatus(403);
  }

  next();
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (record.resetAt <= now) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    }

    next();
  };
}

function migrateSchema() {
  addColumnIfMissing("users", "role", "TEXT NOT NULL DEFAULT 'student'");
  addColumnIfMissing("users", "last_accessed_at", "TEXT");
  addColumnIfMissing("users", "plan", "TEXT NOT NULL DEFAULT 'free'");
  addColumnIfMissing("users", "plan_status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing("users", "plan_updated_at", "TEXT");
  addColumnIfMissing("workspaces", "kind", "TEXT NOT NULL DEFAULT 'project'");
  db.prepare("UPDATE workspaces SET kind = 'personal' WHERE kind = 'project' AND name LIKE ?").run("%'s Notes");
  db.prepare("UPDATE users SET role = 'teacher' WHERE role = 'student' AND plan IN ('teacher', 'institution')").run();
}

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seedRevisionDecks() {
  const topics = loadRevisionTopicsFromAssets();
  if (!topics.length) return;

  const now = new Date().toISOString();
  const deckStatement = db.prepare(`
    INSERT INTO flashcard_decks (id, topic_id, code, title, subject, exam_board, summary, source, card_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      title = excluded.title,
      subject = excluded.subject,
      exam_board = excluded.exam_board,
      summary = excluded.summary,
      source = excluded.source,
      card_count = excluded.card_count,
      updated_at = excluded.updated_at
  `);
  const cardStatement = db.prepare(`
    INSERT INTO flashcards (id, deck_id, card_key, category, front, back, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      front = excluded.front,
      back = excluded.back,
      position = excluded.position
  `);

  topics.forEach((topic) => {
    const deckId = topic.id;
    const cards = Array.isArray(topic.cards) ? topic.cards : [];
    deckStatement.run(
      deckId,
      topic.id,
      String(topic.code || ""),
      String(topic.title || "Untitled deck"),
      String(topic.subject || "Computer Science"),
      "OCR A-Level",
      String(topic.summary || ""),
      String(topic.source || "Neat Notes"),
      cards.length,
      now,
      now,
    );

    cards.forEach((card, index) => {
      const cardKey = String(card.id || `${deckId}-${index + 1}`);
      cardStatement.run(
        `${deckId}__${cardKey}`,
        deckId,
        cardKey,
        String(card.category || "Revision"),
        String(card.front || ""),
        String(card.back || ""),
        index,
      );
    });
  });
}

function loadRevisionTopicsFromAssets() {
  const topicsPath = path.join(__dirname, "revision-topics.js");
  if (!fs.existsSync(topicsPath)) return [];

  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(topicsPath, "utf8"), sandbox, { filename: "revision-topics.js" });
  return Array.isArray(sandbox.window.REVISION_TOPICS) ? sandbox.window.REVISION_TOPICS : [];
}

function requireTeacher(req, res, next) {
  if (!isTeacherUser(req.user)) {
    return res.status(403).json({ error: "Teacher access is required." });
  }

  next();
}

function requireClassTeacher(req, res, next) {
  const classGroup = getClassGroup(req.params.id);
  if (!classGroup) return res.status(404).json({ error: "Class not found." });
  if (!canManageClass(classGroup, req.user.id)) {
    return res.status(403).json({ error: "You cannot manage this class." });
  }

  req.classGroup = classGroup;
  next();
}

function requireClassAccess(req, res, next) {
  const classGroup = getClassGroup(req.params.id);
  if (!classGroup) return res.status(404).json({ error: "Class not found." });
  if (!isClassParticipant(classGroup.id, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that class." });
  }

  req.classGroup = classGroup;
  next();
}

function normalizeUserRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return ["student", "teacher", "centre_admin", "admin"].includes(normalized) ? normalized : "student";
}

function normalizeCentreType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  return ["school", "college", "department", "trust"].includes(normalized) ? normalized : "school";
}

function isTeacherUser(user) {
  return ["teacher", "centre_admin", "admin"].includes(user?.role) || hasFeature(user, "teacherDashboard");
}

function ensureAccountProfiles(user) {
  if (!user?.id) return;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO student_profiles (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
  `).run(user.id, now, now);

  if (isTeacherUser(user)) {
    db.prepare(`
      INSERT OR IGNORE INTO teacher_profiles (user_id, created_at, updated_at)
      VALUES (?, ?, ?)
    `).run(user.id, now, now);
  }
}

function getStudentProfile(userId) {
  return db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(userId) || null;
}

function getTeacherProfile(userId) {
  return db.prepare("SELECT * FROM teacher_profiles WHERE user_id = ?").get(userId) || null;
}

function normaliseClassCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function isValidClassCode(code) {
  return /^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+$/.test(code);
}

function createJoinCode(prefix) {
  let code;
  do {
    const left = crypto.randomBytes(2).toString("hex").toUpperCase();
    const right = crypto.randomBytes(2).toString("hex").toUpperCase();
    code = `${normaliseClassCode(prefix)}-${left}-${right}`;
  } while (
    db.prepare("SELECT 1 FROM class_groups WHERE join_code = ?").get(code) ||
    db.prepare("SELECT 1 FROM centres WHERE code = ?").get(code)
  );

  return code;
}

function getClassGroup(classId) {
  return db.prepare("SELECT * FROM class_groups WHERE id = ?").get(classId);
}

function canManageCentre(centreId, userId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM centre_memberships
    WHERE centre_id = ? AND user_id = ? AND role IN ('owner', 'admin', 'teacher')
  `).get(centreId, userId));
}

function canManageClass(classGroup, userId) {
  if (classGroup.teacher_id === userId) return true;
  return Boolean(db.prepare(`
    SELECT 1
    FROM class_groups
    JOIN centre_memberships ON centre_memberships.centre_id = class_groups.centre_id
    WHERE class_groups.id = ?
      AND centre_memberships.user_id = ?
      AND centre_memberships.role IN ('owner', 'admin')
  `).get(classGroup.id, userId));
}

function isActiveClassStudent(classId, userId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM class_memberships
    WHERE class_id = ? AND user_id = ? AND role = 'student' AND status = 'active'
  `).get(classId, userId));
}

function isClassParticipant(classId, userId) {
  const classGroup = getClassGroup(classId);
  if (classGroup && canManageClass(classGroup, userId)) return true;
  return Boolean(db.prepare(`
    SELECT 1 FROM class_memberships
    WHERE class_id = ? AND user_id = ? AND status = 'active'
  `).get(classId, userId));
}

function decorateClassGroup(classGroup, userId = null) {
  const centre = classGroup.centre_id ? db.prepare("SELECT id, name, type FROM centres WHERE id = ?").get(classGroup.centre_id) : null;
  const studentCount = db.prepare(`
    SELECT COUNT(*) AS count FROM class_memberships
    WHERE class_id = ? AND role = 'student' AND status = 'active'
  `).get(classGroup.id).count;
  const membership = userId
    ? db.prepare("SELECT role, status, joined_at, left_at FROM class_memberships WHERE class_id = ? AND user_id = ?").get(classGroup.id, userId)
    : null;

  return {
    id: classGroup.id,
    centreId: classGroup.centre_id,
    centre,
    teacherId: classGroup.teacher_id,
    name: classGroup.name,
    subject: classGroup.subject,
    examBoard: classGroup.exam_board,
    yearGroup: classGroup.year_group,
    description: classGroup.description,
    joinCode: classGroup.join_code,
    joinCodeEnabled: Boolean(classGroup.join_code_enabled),
    studentCount,
    membership: membership || null,
    createdAt: classGroup.created_at,
    updatedAt: classGroup.updated_at,
  };
}

function listTeacherClasses(userId) {
  return db.prepare(`
    SELECT class_groups.*
    FROM class_groups
    LEFT JOIN centre_memberships ON centre_memberships.centre_id = class_groups.centre_id
    WHERE class_groups.teacher_id = ?
       OR (centre_memberships.user_id = ? AND centre_memberships.role IN ('owner', 'admin'))
    GROUP BY class_groups.id
    ORDER BY datetime(class_groups.updated_at) DESC
  `).all(userId, userId).map((classGroup) => decorateClassGroup(classGroup));
}

function listStudentClasses(userId) {
  return db.prepare(`
    SELECT class_groups.*
    FROM class_memberships
    JOIN class_groups ON class_groups.id = class_memberships.class_id
    WHERE class_memberships.user_id = ?
      AND class_memberships.role = 'student'
      AND class_memberships.status = 'active'
    ORDER BY datetime(class_memberships.joined_at) DESC
  `).all(userId).map((classGroup) => decorateClassGroup(classGroup, userId));
}

function getClassStudents(classId) {
  return db.prepare(`
    SELECT users.id, users.name, users.email, users.last_accessed_at,
      class_memberships.joined_at,
      COUNT(flashcard_attempts.id) AS attempt_count,
      MAX(student_activity_events.created_at) AS last_activity
    FROM class_memberships
    JOIN users ON users.id = class_memberships.user_id
    LEFT JOIN flashcard_attempts ON flashcard_attempts.user_id = users.id AND flashcard_attempts.class_id = class_memberships.class_id
    LEFT JOIN student_activity_events ON student_activity_events.user_id = users.id AND student_activity_events.class_id = class_memberships.class_id
    WHERE class_memberships.class_id = ?
      AND class_memberships.role = 'student'
      AND class_memberships.status = 'active'
    GROUP BY users.id
    ORDER BY users.name
  `).all(classId);
}

function listRevisionDecks(userId, classId = null) {
  return db.prepare("SELECT * FROM flashcard_decks ORDER BY code").all().map((deck) => {
    const attempts = getDeckAttempts(deck.id, userId, classId);
    const summary = calculateConfidenceSummary(attempts);
    return {
      id: deck.id,
      topicId: deck.topic_id,
      code: deck.code,
      title: deck.title,
      subject: deck.subject,
      examBoard: deck.exam_board,
      summary: deck.summary,
      cardCount: deck.card_count,
      source: deck.source,
      confidence: summary,
      lastAttemptAt: attempts[0]?.created_at || null,
    };
  });
}

function getRevisionDeck(deckId, userId, classId = null) {
  const deck = db.prepare("SELECT * FROM flashcard_decks WHERE id = ? OR topic_id = ?").get(deckId, deckId);
  if (!deck) return null;

  const cards = db.prepare("SELECT * FROM flashcards WHERE deck_id = ? ORDER BY position").all(deck.id);
  const attempts = getDeckAttempts(deck.id, userId, classId);
  const latestByCard = new Map();
  attempts.forEach((attempt) => {
    if (!latestByCard.has(attempt.card_id)) latestByCard.set(attempt.card_id, attempt);
  });

  return {
    id: deck.id,
    topicId: deck.topic_id,
    code: deck.code,
    title: deck.title,
    subject: deck.subject,
    examBoard: deck.exam_board,
    summary: deck.summary,
    cardCount: deck.card_count,
    confidence: calculateConfidenceSummary(attempts),
    cards: cards.map((card) => ({
      id: card.id,
      cardKey: card.card_key,
      category: card.category,
      front: card.front,
      back: card.back,
      position: card.position,
      latestAttempt: latestByCard.get(card.id) || null,
    })),
  };
}

function getDeckAttempts(deckId, userId = null, classId = null) {
  const where = ["deck_id = ?"];
  const params = [deckId];
  if (userId) {
    where.push("user_id = ?");
    params.push(userId);
  }
  if (classId) {
    where.push("class_id = ?");
    params.push(classId);
  } else if (classId === null) {
    where.push("class_id IS NULL");
  }

  return db.prepare(`
    SELECT * FROM flashcard_attempts
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(created_at) DESC
  `).all(...params);
}

function normalizeConfidence(confidence) {
  const normalized = String(confidence || "").trim().toLowerCase();
  if (["confident", "thumbs_up", "up", "correct"].includes(normalized)) return "confident";
  if (["needs_practice", "thumbs_down", "down", "incorrect"].includes(normalized)) return "needs_practice";
  return "";
}

function updateTopicConfidence(userId, classId, deckId) {
  const attempts = getDeckAttempts(deckId, userId, classId);
  const summary = calculateConfidenceSummary(attempts);
  const now = new Date().toISOString();

  db.prepare("DELETE FROM topic_confidence WHERE user_id = ? AND deck_id = ? AND class_id IS ?")
    .run(userId, deckId, classId);
  db.prepare(`
    INSERT INTO topic_confidence (id, user_id, class_id, deck_id, total_attempts, confident_attempts, needs_practice_attempts, percent, band, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    classId,
    deckId,
    summary.totalAttempts,
    summary.confidentAttempts,
    summary.needsPracticeAttempts,
    summary.percent,
    summary.band,
    now,
  );

  return summary;
}

function recordStudentActivity(userId, classId, deckId, type, metadata = {}) {
  db.prepare(`
    INSERT INTO student_activity_events (id, user_id, class_id, deck_id, type, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    classId || null,
    deckId || null,
    type,
    JSON.stringify(metadata),
    new Date().toISOString(),
  );
}

function getRevisionRecommendations(userId, classId = null) {
  const deckSummaries = listRevisionDecks(userId, classId);
  return buildRevisionRecommendations(deckSummaries).map((recommendation) => ({
    deckId: recommendation.id,
    topicId: recommendation.topicId,
    code: recommendation.code,
    title: recommendation.title,
    confidence: recommendation.confidence,
    reason: recommendation.reason,
    priority: recommendation.priority,
  }));
}

function getClassDashboard(classId) {
  const classGroup = getClassGroup(classId);
  const students = getClassStudents(classId);
  const topicSummaries = getClassTopicSummaries(classId);
  const activity = getClassActivity(classId, 30);
  const activeSince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const activeStudentIds = new Set(activity.filter((event) => new Date(event.created_at) >= activeSince).map((event) => event.user_id));

  return {
    class: decorateClassGroup(classGroup),
    summary: {
      students: students.length,
      activeThisWeek: activeStudentIds.size,
      totalAttempts: topicSummaries.reduce((sum, topic) => sum + topic.confidence.totalAttempts, 0),
      weakestTopic: topicSummaries.find((topic) => topic.confidence.totalAttempts)?.title || null,
    },
    topicConfidence: topicSummaries,
    weakestTopics: topicSummaries.filter((topic) => topic.confidence.totalAttempts).slice(0, 5),
    strongestTopics: [...topicSummaries]
      .filter((topic) => topic.confidence.totalAttempts)
      .sort((a, b) => b.confidence.percent - a.confidence.percent)
      .slice(0, 5),
    inactiveStudents: students.filter((student) => !student.last_activity || new Date(student.last_activity) < activeSince),
    recentActivity: activity.slice(0, 12),
  };
}

function getClassTopicSummaries(classId) {
  return db.prepare("SELECT * FROM flashcard_decks ORDER BY code").all().map((deck) => {
    const attempts = getClassDeckAttempts(deck.id, classId);
    const confidence = calculateConfidenceSummary(attempts);
    return {
      deckId: deck.id,
      topicId: deck.topic_id,
      code: deck.code,
      title: deck.title,
      cardCount: deck.card_count,
      confidence,
      lastAttemptAt: attempts[0]?.created_at || null,
    };
  }).sort((a, b) => {
    if (a.confidence.totalAttempts !== b.confidence.totalAttempts) {
      return a.confidence.percent - b.confidence.percent;
    }
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });
}

function getClassDeckAttempts(deckId, classId, studentId = null) {
  const params = [deckId, classId];
  const studentFilter = studentId ? "AND user_id = ?" : "";
  if (studentId) params.push(studentId);

  return db.prepare(`
    SELECT * FROM flashcard_attempts
    WHERE deck_id = ? AND class_id = ? ${studentFilter}
    ORDER BY datetime(created_at) DESC
  `).all(...params);
}

function getStudentConfidenceProfile(classId, studentId) {
  const student = db.prepare("SELECT id, name, email, last_accessed_at FROM users WHERE id = ?").get(studentId);
  const topics = db.prepare("SELECT * FROM flashcard_decks ORDER BY code").all().map((deck) => {
    const attempts = getClassDeckAttempts(deck.id, classId, studentId);
    return {
      deckId: deck.id,
      topicId: deck.topic_id,
      code: deck.code,
      title: deck.title,
      confidence: calculateConfidenceSummary(attempts),
      lastAttemptAt: attempts[0]?.created_at || null,
    };
  });
  const recommendations = buildRevisionRecommendations(topics).slice(0, 5);

  return {
    student,
    topics,
    recommendations,
    recentActivity: getClassActivity(classId, 20).filter((event) => event.user_id === studentId),
  };
}

function getClassActivity(classId, limit = 30) {
  return db.prepare(`
    SELECT student_activity_events.*, users.name AS user_name, users.email AS user_email,
      flashcard_decks.code, flashcard_decks.title AS deck_title
    FROM student_activity_events
    JOIN users ON users.id = student_activity_events.user_id
    LEFT JOIN flashcard_decks ON flashcard_decks.id = student_activity_events.deck_id
    WHERE student_activity_events.class_id = ?
    ORDER BY datetime(student_activity_events.created_at) DESC
    LIMIT ?
  `).all(classId, limit);
}

function requireUser(req, res, next) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: "Please log in." });

  const tokenHash = hashToken(token);
  const session = db.prepare(`
    SELECT sessions.*, users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash);

  if (!session || new Date(session.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    clearSessionCookie(res);
    return res.status(401).json({ error: "Please log in again." });
  }

  req.sessionHash = tokenHash;
  req.user = session;
  ensureAccountProfiles(session);
  db.prepare("UPDATE users SET last_accessed_at = ? WHERE id = ?").run(new Date().toISOString(), session.id);
  next();
}

function issueSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(tokenHash, userId, expiresAt.toISOString(), now.toISOString());

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE);
}

function createWorkspace(ownerId, name, kind = "project") {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare("INSERT INTO workspaces (id, name, owner_id, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, name, ownerId, kind, now, now);
  db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)")
    .run(id, ownerId, now);

  return { id, name, kind, owner_id: ownerId, role: "owner", note_count: 0, member_count: 1, created_at: now, updated_at: now };
}

function ensurePersonalWorkspace(userId, name) {
  const existing = db.prepare("SELECT id FROM workspaces WHERE owner_id = ? LIMIT 1").get(userId);
  if (!existing) createWorkspace(userId, `${name}'s Notes`, "personal");
}

async function createAndSendVerification(userId, email, name) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24);
  const verificationUrl = `${BASE_URL}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;

  db.prepare(`
    INSERT INTO email_verification_tokens (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(tokenHash, userId, expiresAt.toISOString(), now.toISOString());

  if (hasSmtpConfig()) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });

    await transport.sendMail({
      from: process.env.EMAIL_FROM || "Neat Notes <no-reply@localhost>",
      to: email,
      subject: "Verify your Neat Notes account",
      text: `Hi ${name},\n\nVerify your Neat Notes account here:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Verify your Neat Notes account here:</p><p><a href="${verificationUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    });

    return {};
  }

  console.log(`Verification link for ${email}: ${verificationUrl}`);
  return process.env.NODE_ENV === "production" ? {} : { devVerificationUrl: verificationUrl };
}

function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  const now = new Date().toISOString();
  const existingByGoogle = db.prepare("SELECT * FROM users WHERE google_id = ?").get(profile.sub);
  if (existingByGoogle) {
    ensureAccountProfiles(existingByGoogle);
    return existingByGoogle;
  }

  const existingByEmail = getUserByEmail(email);
  if (existingByEmail) {
    db.prepare("UPDATE users SET google_id = ?, email_verified = 1, updated_at = ? WHERE id = ?")
      .run(profile.sub, now, existingByEmail.id);
    const user = getUserByEmail(email);
    ensureAccountProfiles(user);
    return user;
  }

  const userId = crypto.randomUUID();
  const name = String(profile.name || email.split("@")[0]);
  db.prepare(`
    INSERT INTO users (id, email, name, email_verified, google_id, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `).run(userId, email, name, profile.sub, now, now);
  ensurePersonalWorkspace(userId, name);
  const user = getUserByEmail(email);
  ensureAccountProfiles(user);
  return user;
}

function requireWorkspaceMember(req, res) {
  const membership = db.prepare(`
    SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!membership) {
    res.status(403).json({ error: "You do not have access to that workspace." });
    return null;
  }

  return membership;
}

function getWorkspace(workspaceId) {
  return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId);
}

function isWorkspaceMember(workspaceId, userId) {
  return Boolean(db.prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?").get(workspaceId, userId));
}

function getAccessibleNote(noteId, userId) {
  return db.prepare(`
    SELECT notes.*
    FROM notes
    JOIN workspace_members ON workspace_members.workspace_id = notes.workspace_id
    WHERE notes.id = ? AND workspace_members.user_id = ?
  `).get(noteId, userId);
}

function touchWorkspace(workspaceId) {
  db.prepare("UPDATE workspaces SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), workspaceId);
}

function saveNoteVersion(note, userId) {
  db.prepare(`
    INSERT INTO note_versions (id, note_id, workspace_id, saved_by, body, tag, title, summary, note_updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    note.id,
    note.workspace_id,
    userId,
    note.body,
    note.tag,
    note.title,
    note.summary,
    note.updated_at,
    new Date().toISOString(),
  );
}

function countUserNotes(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM notes WHERE owner_id = ?").get(userId).count;
}

function countOwnedWorkspaces(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM workspaces WHERE owner_id = ?").get(userId).count;
}

function getPlan(user) {
  return PLAN_CATALOG[user?.plan] || PLAN_CATALOG.free;
}

function hasFeature(user, feature) {
  return Boolean(getPlan(user).features[feature]);
}

function normalizeWorkspaceKind(kind) {
  const normalized = String(kind || "").trim().toLowerCase();
  return ["personal", "project", "classroom"].includes(normalized) ? normalized : "project";
}

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

function normalizeEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function normalizeTag(tag) {
  return (
    String(tag || "")
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "inbox"
  );
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(hash, expected);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return [decodeURIComponent(cookie.slice(0, index)), decodeURIComponent(cookie.slice(index + 1))];
      }),
  );
}

function publicUser(user) {
  const plan = getPlan(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "student",
    isTeacher: isTeacherUser(user),
    plan: plan.id,
    planName: plan.name,
    planStatus: user.plan_status || "active",
    entitlements: plan,
    emailVerified: Boolean(user.email_verified),
  };
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST);
}

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function googleRedirectUri() {
  return `${BASE_URL}/api/auth/google/callback`;
}

function createTitle(body) {
  const firstMeaningfulLine = String(body || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !/^---+$/.test(line));

  if (!firstMeaningfulLine) return "Untitled note";

  const cleaned = firstMeaningfulLine
    .replace(/^(#{1,3}\s+|- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/, "")
    .split(/[.!?]/)[0]
    .trim();

  return titleCase(cleaned.split(/\s+/).slice(0, 8).join(" ")) || "Untitled note";
}

function createSummary(body) {
  const lines = getPlainNoteLines(body);
  if (!lines.length) return "Start writing and a tidy summary will appear here.";

  const sentences = lines
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return lines.slice(0, 3).join(" · ");
  }

  const summary = sentences.slice(0, 2).join(" ");
  return summary.length > 170 ? `${summary.slice(0, 167).trim()}...` : summary;
}

function createStudyPack(note) {
  const lines = getPlainNoteLines(note.body);
  const title = note.title || createTitle(note.body);
  const contentLines = getStudyContentLines(note.body, title);
  const keyPoints = uniqueStrings(contentLines.length ? contentLines : lines.filter((line) => line !== title)).slice(0, 8);
  const tasks = extractTaskLines(note.body).slice(0, 8);
  const questions = keyPoints.slice(0, 8).map((point, index) => ({
    prompt: point.includes(":")
      ? `What should you remember about ${point.split(":")[0].trim()}?`
      : `Explain this point in your own words: ${point}`,
    answer: point.includes(":") ? point.split(":").slice(1).join(":").trim() : point,
    type: index < 3 ? "recall" : "explain",
  }));
  const flashcards = keyPoints.slice(0, 6).map((point) => {
    const term = point.split(/[-:–.]/)[0].trim().split(/\s+/).slice(0, 5).join(" ");
    return {
      front: term || title,
      back: point,
    };
  });

  return {
    title,
    summary: note.summary || createSummary(note.body),
    keyPoints,
    questions,
    flashcards,
    tasks,
    generatedAt: new Date().toISOString(),
  };
}

function getStudyContentLines(body, title) {
  return String(body || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,3}\s+/.test(line) && !/^---+$/.test(line))
    .map((line) =>
      line
        .replace(/^(- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/, "")
        .trim(),
    )
    .filter((line) => line && line !== title);
}

function getPlainNoteLines(body) {
  return String(body || "")
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^(#{1,3}\s+|- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/, "")
        .replace(/^---+$/, "")
        .trim(),
    )
    .filter(Boolean);
}

function extractTaskLines(body) {
  return String(body || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^- \[[ xX]\]\s+/.test(line))
    .map((line) => line.replace(/^- \[[ xX]\]\s+/, "").trim())
    .filter(Boolean);
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function titleCase(text) {
  return String(text).replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createNotePdf(note, workspace, user) {
  const title = note.title || createTitle(note.body);
  const meta = [
    `Workspace: ${workspace?.name || "Notes"}`,
    `Exported by: ${user.name}`,
    `Created: ${formatDateForPdf(note.created_at)}`,
    `Updated: ${formatDateForPdf(note.updated_at)}`,
    `Folder: #${note.tag}`,
  ];
  const bodyLines = String(note.body || "")
    .split("\n")
    .flatMap((line) => wrapPdfLine(line || " ", 92));
  const lines = [title, "", ...meta, "", "Summary", ...wrapPdfLine(note.summary || createSummary(note.body), 92), "", "Notes", ...bodyLines];
  const visibleLines = lines.slice(0, 48);
  const content = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    `(${escapePdfText(visibleLines[0])}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    ...visibleLines.slice(1).map((line) => `(${escapePdfText(line)}) Tj 0 -15 Td`),
    "ET",
  ].join("\n");

  return buildPdf(content);
}

function buildPdf(content) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf);
}

function wrapPdfLine(line, width) {
  const words = String(line).replace(/\s+/g, " ").trim().split(" ");
  if (!words[0]) return [""];
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function formatDateForPdf(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "note";
}

function renderMessagePage(title, message) {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)} | Neat Notes</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <main class="auth-page">
          <section class="auth-card">
            <p class="eyebrow">Neat Notes</p>
            <p class="product-signature">A BreakellSystems product</p>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(message)}</p>
            <a class="text-button" href="/">Back to app</a>
          </section>
        </main>
      </body>
    </html>`;
}
