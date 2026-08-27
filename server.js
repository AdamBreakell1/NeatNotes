require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");
const { buildRevisionRecommendations, calculateConfidenceSummary } = require("./backend/services/learningAnalytics");
const {
  buildSession: buildAdaptiveSession,
  calculateMastery,
  calculateRetrievability,
  updateMemoryState,
} = require("./learning-model");
const { buildContentModel, flattenContent, validateContentModel } = require("./ocr-content");
const { QUESTION_BANK, getPublicQuestion, markAnswer, validateQuestionBank } = require("./exam-content");
const { LABS, assessLab, getPublicLab, validateLabs } = require("./cs-labs");

const app = express();
const PORT = Number(process.env.PORT || 4173);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_COOKIE = "nn_session";
const CONTACT_TO = process.env.CONTACT_TO || "neatnotescontact@gmail.com";
const CONTACT_RETRY_INTERVAL_MS = Number(process.env.CONTACT_RETRY_INTERVAL_MS || 10 * 60 * 1000);
const FREE_REVISION_DECK_LIMIT = Number(process.env.FREE_REVISION_DECK_LIMIT || 1);
const MAX_NOTE_BODY_BYTES = Number(process.env.MAX_NOTE_BODY_BYTES || 96 * 1024);
const MAX_NOTE_VERSIONS = Number(process.env.MAX_NOTE_VERSIONS || 40);
const MAX_NOTE_VERSION_BYTES = Number(process.env.MAX_NOTE_VERSION_BYTES || 1024 * 1024);
const DEFAULT_FREE_REVISION_DECK_ID = "cs-1-1-1";
const DATA_DIR = path.join(__dirname, "data");
const REQUESTED_DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "neat-notes.sqlite");
const DATABASE_CONFIG = prepareDatabasePath(REQUESTED_DB_PATH);
const DB_PATH = DATABASE_CONFIG.path;
const DB_FALLBACK_ACTIVE = DATABASE_CONFIG.fallbackActive;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || BASE_URL)
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 25),
});
const contactRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CONTACT_RATE_LIMIT || 8),
});
const joinRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.JOIN_RATE_LIMIT || 12),
});
const revisionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.REVISION_RATE_LIMIT || 90),
});
const billingRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.BILLING_RATE_LIMIT || 12),
});
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PLUS || "",
  teacher: process.env.STRIPE_PRICE_TEACHER || "",
  institution: process.env.STRIPE_PRICE_INSTITUTION || "",
};
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
      fullRevisionLibrary: false,
      quickPractice: true,
      billingPortal: false,
    },
  },
  pro: {
    id: "pro",
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
      fullRevisionLibrary: true,
      quickPractice: true,
      billingPortal: true,
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
      fullRevisionLibrary: true,
      quickPractice: true,
      billingPortal: true,
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
      fullRevisionLibrary: true,
      quickPractice: true,
      billingPortal: true,
    },
  },
};
const PRODUCT_EVENT_NAMES = new Set([
  "account_created", "onboarding_completed", "adaptive_session_started", "quick_practice_started",
  "quick_practice_completed", "exam_question_started", "exam_question_submitted", "mini_mock_started",
  "mini_mock_completed", "cs_lab_completed", "note_created", "note_revision_generated",
  "instant_cards_generated", "study_pack_generated", "teacher_assignment_created", "teacher_assignment_prepared",
  "pricing_opened", "demo_workspace_opened", "demo_exited_to_landing", "contact_enquiry_sent",
  "checkout_started", "checkout_completed", "upgrade_prompt_viewed",
  "profile_updated",
]);
const REVISION_TOPICS = loadRevisionTopicsFromAssets();

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
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    subscription_status TEXT,
    subscription_current_period_end TEXT,
    free_revision_deck_id TEXT,
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

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
    user_agent TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id, created_at);

  CREATE TABLE IF NOT EXISTS product_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS product_events_name_idx ON product_events(event_name, created_at);

  CREATE TABLE IF NOT EXISTS generated_resources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    source_note_updated_at TEXT,
    provenance TEXT NOT NULL,
    alignment_status TEXT NOT NULL DEFAULT 'needs_review',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS generated_resources_note_idx ON generated_resources(note_id, created_at);

  CREATE TABLE IF NOT EXISTS content_reviews (
    concept_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'unreviewed',
    reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    reviewed_at TEXT,
    updated_at TEXT NOT NULL
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

  CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_enquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    delivery_error TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    avatar_id TEXT NOT NULL DEFAULT 'notebook',
    year_group TEXT,
    exam_board TEXT NOT NULL DEFAULT 'OCR A-Level',
    learner_type TEXT,
    target_grade TEXT,
    personal_target TEXT,
    taught_topic_ids TEXT NOT NULL DEFAULT '[]',
    taught_topic_source TEXT NOT NULL DEFAULT 'self',
    revision_goal TEXT,
    exam_dates TEXT NOT NULL DEFAULT '{}',
    notification_preferences TEXT NOT NULL DEFAULT '{}',
    onboarding_completed_at TEXT,
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
    archived_at TEXT,
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

  CREATE INDEX IF NOT EXISTS flashcard_attempts_user_deck_idx
    ON flashcard_attempts(user_id, deck_id, created_at);

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
    task_type TEXT NOT NULL DEFAULT 'topic_revision',
    start_at TEXT,
    due_at TEXT,
    estimated_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assignment_completions (
    assignment_id TEXT NOT NULL REFERENCES class_assignments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (assignment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS learning_evidence (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    concept_id TEXT NOT NULL,
    deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    card_id TEXT REFERENCES flashcards(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    score REAL,
    difficulty REAL,
    response_type TEXT,
    confidence TEXT,
    previous_due_at TEXT,
    feedback_code TEXT,
    misconception_id TEXT,
    correction_successful INTEGER,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS learning_evidence_user_concept_idx
    ON learning_evidence(user_id, concept_id, created_at);

  CREATE TABLE IF NOT EXISTS review_schedules (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    difficulty REAL NOT NULL,
    stability_days REAL NOT NULL,
    retrievability REAL NOT NULL,
    last_review_at TEXT NOT NULL,
    next_review_at TEXT NOT NULL,
    successful_retrievals INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, concept_id)
  );

  CREATE INDEX IF NOT EXISTS review_schedules_due_idx
    ON review_schedules(user_id, next_review_at);

  CREATE TABLE IF NOT EXISTS mistake_journal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    concept_id TEXT NOT NULL,
    deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    card_id TEXT REFERENCES flashcards(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    explanation TEXT NOT NULL,
    misconception_id TEXT,
    corrected_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES class_groups(id) ON DELETE SET NULL,
    question_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    original_attempt_id TEXT REFERENCES exam_attempts(id) ON DELETE SET NULL,
    answer TEXT NOT NULL,
    proposed_mark INTEGER NOT NULL,
    maximum_mark INTEGER NOT NULL,
    rubric_result TEXT NOT NULL,
    confidence TEXT,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS exam_attempts_user_idx ON exam_attempts(user_id, created_at);

  CREATE TABLE IF NOT EXISTS lab_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lab_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    response TEXT NOT NULL,
    correct INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS lab_attempts_user_idx ON lab_attempts(user_id, created_at);
`);

migrateSchema();
seedRevisionDecks();
validatePublishedContent();

app.set("trust proxy", 1);
app.use((req, res, next) => {
  req.requestId = String(req.get("x-request-id") || crypto.randomUUID()).slice(0, 100);
  res.setHeader("x-request-id", req.requestId);
  next();
});
app.use(securityHeaders);
app.use(corsMiddleware);
app.post("/api/billing/stripe/webhook", express.raw({ type: "application/json" }), asyncHandler(handleStripeWebhook));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use("/api", enforceSameOriginMutation);
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
registerPublicAssetRoutes();

app.get("/api/session", requireUser, (req, res) => {
  res.json({
    user: publicUser(req.user),
    plans: PLAN_CATALOG,
    googleConfigured: isGoogleConfigured(),
    stripeConfigured: isStripeConfigured(),
  });
});

app.get("/api/plans", (req, res) => {
  res.json({ plans: PLAN_CATALOG, stripeConfigured: isStripeConfigured() });
});

app.post("/api/contact", contactRateLimiter, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 120);
  const email = normalizeEmail(req.body.email);
  const reason = String(req.body.reason || "General question").trim().slice(0, 120);
  const message = String(req.body.message || "").trim().slice(0, 2000);

  if (!name) {
    return res.status(400).json({ error: "Enter your name." });
  }

  if (!email) {
    return res.status(400).json({ error: "Enter a valid email address so we can reply." });
  }

  if (message.length < 10) {
    return res.status(400).json({ error: "Add a little more detail so the enquiry can be routed properly." });
  }

  const enquiry = createContactEnquiry({ name, email, reason, message });
  const smtpConfigError = getSmtpConfigError();
  if (smtpConfigError) {
    updateContactEnquiryDelivery(enquiry.id, "queued", smtpConfigError);
    console.warn(`Contact enquiry saved for ${CONTACT_TO}; email delivery is not ready: ${smtpConfigError}`, { enquiryId: enquiry.id, reason });
    return res.status(202).json({
      message: "Thanks. Your enquiry has been received by Neat Notes. It has been saved and queued for email delivery.",
      delivery: "queued",
    });
  }

  try {
    await sendContactEmail(enquiry);
    updateContactEnquiryDelivery(enquiry.id, "sent");
  } catch (error) {
    console.error("Contact email delivery failed:", sanitizeMailerError(error));
    updateContactEnquiryDelivery(enquiry.id, "delivery_failed", getEmailDeliveryErrorMessage(error));
    return res.status(202).json({
      message: "Thanks. Your enquiry has been received by Neat Notes. Email delivery is being retried automatically.",
      delivery: "queued",
    });
  }

  res.status(202).json({
    message: "Thanks. Your enquiry has been sent to the Neat Notes team.",
    delivery: "sent",
  });
}));

app.get("/api/health", (req, res) => {
  const database = db.prepare("SELECT 1 AS ok").get();
  const deckCount = db.prepare("SELECT COUNT(*) AS count FROM flashcard_decks").get().count;

  res.json({
    ok: Boolean(database?.ok),
    service: "neat-notes",
    databasePersistent: !DB_FALLBACK_ACTIVE,
    databaseFallbackActive: DB_FALLBACK_ACTIVE,
    deckCount,
    emailConfigured: !getSmtpConfigError(),
    googleConfigured: isGoogleConfigured(),
    stripeConfigured: isStripeConfigured(),
    release: String(process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || "development").slice(0, 12),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/events", requireUser, (req, res) => {
  const eventName = String(req.body.name || "").trim();
  if (!PRODUCT_EVENT_NAMES.has(eventName)) {
    return res.status(400).json({ error: "Unsupported product event." });
  }
  const preferences = normalizeNotificationPreferences(parseJsonValue(getStudentProfile(req.user.id)?.notification_preferences, {}));
  if (!preferences.usageAnalytics) return res.status(204).end();
  const metadata = sanitizeEventMetadata(req.body.details);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO product_events (id, user_id, event_name, metadata, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), req.user.id, eventName, JSON.stringify(metadata), now);
  db.prepare(`DELETE FROM product_events WHERE user_id = ? AND id NOT IN (
    SELECT id FROM product_events WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 1000
  )`).run(req.user.id, req.user.id);
  res.status(202).json({ accepted: true });
});

app.get("/api/internal/product-metrics", requireUser, requireAdmin, (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const events = db.prepare(`
    SELECT event_name AS name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS users
    FROM product_events WHERE created_at >= ? GROUP BY event_name ORDER BY count DESC
  `).all(since);
  const accounts = db.prepare("SELECT COUNT(*) AS total, SUM(email_verified) AS verified FROM users").get();
  const activeRevisers = db.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM learning_evidence WHERE created_at >= ?").get(since).count;
  res.json({ windowDays: 30, accounts, activeRevisers, events });
});

app.get("/api/internal/content-reviews", requireUser, requireAdmin, (req, res) => {
  const model = buildContentModel(REVISION_TOPICS);
  const { concepts: modelConcepts } = flattenContent(model);
  const reviews = new Map(db.prepare("SELECT * FROM content_reviews").all().map((review) => [review.concept_id, review]));
  const concepts = modelConcepts.map((concept) => {
    const review = reviews.get(concept.id);
    return {
      id: concept.id,
      topicId: concept.topicId,
      title: concept.title,
      publicationStatus: concept.reviewStatus,
      reviewStatus: review?.status || "unreviewed",
      reviewNotes: review?.notes || "",
      reviewedAt: review?.reviewed_at || null,
    };
  });
  res.json({ specification: model.specification, concepts });
});

app.put("/api/internal/content-reviews/:conceptId", requireUser, requireAdmin, (req, res) => {
  const conceptId = String(req.params.conceptId || "").trim();
  const model = buildContentModel(REVISION_TOPICS);
  if (!flattenContent(model).concepts.some((concept) => concept.id === conceptId)) {
    return res.status(404).json({ error: "OCR concept not found." });
  }
  const status = ["unreviewed", "in_review", "approved", "changes_required"].includes(req.body.status)
    ? req.body.status
    : "in_review";
  const notes = String(req.body.notes || "").trim().slice(0, 2000);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO content_reviews (concept_id, status, reviewer_id, notes, reviewed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(concept_id) DO UPDATE SET status = excluded.status, reviewer_id = excluded.reviewer_id,
      notes = excluded.notes, reviewed_at = excluded.reviewed_at, updated_at = excluded.updated_at
  `).run(conceptId, status, req.user.id, notes, status === "approved" ? now : null, now);
  writeAuditLog(req.user.id, "content_review_updated", "concept", conceptId, { status });
  res.json({ conceptId, status, notes, updatedAt: now });
});

app.post("/api/billing/checkout-session", billingRateLimiter, requireUser, asyncHandler(async (req, res) => {
  const plan = normalizePlanId(req.body.plan);
  if (!["pro", "teacher"].includes(plan)) {
    return res.status(400).json({ error: "Choose Pro or Teacher to start checkout." });
  }

  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and price IDs in Render." });
  }

  const price = STRIPE_PRICE_IDS[plan];
  if (!price) {
    return res.status(503).json({ error: `Stripe price for ${PLAN_CATALOG[plan].name} is not configured yet.` });
  }

  const user = await ensureStripeCustomer(req.user);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripe_customer_id,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${BASE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/?checkout=cancelled`,
    metadata: {
      userId: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
      },
    },
  });

  db.prepare("INSERT INTO billing_events (id, user_id, plan, provider, status, created_at) VALUES (?, ?, ?, 'stripe', 'checkout_started', ?)")
    .run(crypto.randomUUID(), user.id, plan, new Date().toISOString());

  res.json({ url: session.url });
}));

app.post("/api/billing/customer-portal", billingRateLimiter, requireUser, asyncHandler(async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured yet." });
  }

  const user = await ensureStripeCustomer(req.user);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${BASE_URL}/?billing=returned`,
  });

  res.json({ url: session.url });
}));

app.post("/api/billing/mock-upgrade", requireUser, (req, res) => {
  if (process.env.ALLOW_MOCK_BILLING !== "true" || process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Mock billing is disabled. Use Stripe Checkout." });
  }

  const plan = normalizePlanId(req.body.plan);
  if (!PLAN_CATALOG[plan] || plan === "free") {
    return res.status(400).json({ error: "Choose Pro, Teacher, or Institution." });
  }

  const updatedUser = applyUserPlan(req.user.id, plan, "active", null, null);
  db.prepare("INSERT INTO billing_events (id, user_id, plan, provider, status, created_at) VALUES (?, ?, ?, 'mock', 'complete', ?)")
    .run(crypto.randomUUID(), req.user.id, plan, new Date().toISOString());

  res.json({
    user: publicUser(updatedUser),
    message: `Dev-only mock upgrade applied to ${PLAN_CATALOG[plan].name}.`,
  });
});

app.post("/api/auth/signup", authRateLimiter, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 120);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Enter a name, valid email, and password between 8 and 128 characters." });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    if (!existing.email_verified) {
      const passwordMatches = existing.password_hash
        && verifyPassword(password, existing.password_salt, existing.password_hash);
      if (passwordMatches) {
        await createAndSendVerification(existing.id, existing.email, existing.name);
      }
      return res.status(202).json({
        message: "If an account can be created or verified for that email, a verification message is on its way.",
      });
    }

    return res.status(202).json({
      message: "If an account can be created or verified for that email, a verification message is on its way.",
    });
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
  issueSession(res, user.id, req);
  res.json({ user: publicUser(user), plans: PLAN_CATALOG });
}));

app.post("/api/auth/logout", requireUser, (req, res) => {
  if (req.sessionHash) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(req.sessionHash);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/auth/forgot-password", authRateLimiter, asyncHandler(async (req, res) => {
  const responseNotBefore = Date.now() + 250;
  const email = normalizeEmail(req.body.email);
  const user = email ? getUserByEmail(email) : null;

  if (user?.password_hash && user.email_verified) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 30);
    const resetUrl = `${BASE_URL}/?reset=${encodeURIComponent(rawToken)}`;

    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);
    db.prepare(`
      INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenHash, user.id, expiresAt.toISOString(), now.toISOString());

    if (hasSmtpConfig()) {
      sendPasswordResetEmail(user, resetUrl).catch((error) => {
        console.error("Password reset email delivery failed:", sanitizeMailerError(error));
      });
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`Development password reset link for ${user.email}: ${resetUrl}`);
    }
    writeAuditLog(user.id, "password_reset_requested", "user", user.id);
  }

  const remainingDelay = responseNotBefore - Date.now();
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));

  res.status(202).json({
    message: "If an eligible account exists for that email, a password reset link is on its way.",
  });
}));

app.post("/api/auth/reset-password", authRateLimiter, (req, res) => {
  const tokenHash = hashToken(String(req.body.token || ""));
  const password = String(req.body.password || "");
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Use a password between 8 and 128 characters." });
  }

  const reset = db.prepare(`
    SELECT password_reset_tokens.* FROM password_reset_tokens
    WHERE token_hash = ?
  `).get(tokenHash);
  if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: "That password reset link is invalid or has expired." });
  }

  const passwordRecord = hashPassword(password);
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
      .run(passwordRecord.hash, passwordRecord.salt, now, reset.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?").run(now, tokenHash);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(reset.user_id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  writeAuditLog(reset.user_id, "password_reset_completed", "user", reset.user_id);
  clearSessionCookie(res);
  res.json({ message: "Password updated. Log in again on each device." });
});

app.get("/api/account/sessions", requireUser, (req, res) => {
  const sessions = db.prepare(`
    SELECT token_hash, created_at, last_used_at, expires_at, user_agent
    FROM sessions WHERE user_id = ? ORDER BY datetime(COALESCE(last_used_at, created_at)) DESC
  `).all(req.user.id).map((session) => ({
    id: session.token_hash.slice(0, 12),
    current: session.token_hash === req.sessionHash,
    createdAt: session.created_at,
    lastUsedAt: session.last_used_at || session.created_at,
    expiresAt: session.expires_at,
    device: describeUserAgent(session.user_agent),
  }));
  res.json({ sessions });
});

app.delete("/api/account/sessions/others", requireUser, (req, res) => {
  const result = db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?")
    .run(req.user.id, req.sessionHash);
  writeAuditLog(req.user.id, "other_sessions_revoked", "user", req.user.id, { count: Number(result.changes) });
  res.json({ message: `${Number(result.changes)} other session${Number(result.changes) === 1 ? "" : "s"} signed out.` });
});

app.get("/api/account/export", requireUser, (req, res) => {
  const workspaces = db.prepare(`
    SELECT workspaces.id, workspaces.name, workspaces.kind, workspace_members.role,
      workspaces.created_at, workspaces.updated_at
    FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id
    WHERE workspace_members.user_id = ?
  `).all(req.user.id).filter((workspace) => workspace.role === "owner" || ownerHasWorkspaceCollaboration(workspace.id));
  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const placeholders = workspaceIds.map(() => "?").join(",");
  const exportData = {
    exportedAt: new Date().toISOString(),
    account: publicUser(req.user),
    profile: getAccountProfiles(req.user.id),
    workspaces,
    notes: workspaceIds.length ? db.prepare(`
      SELECT id, workspace_id, owner_id, body, tag, title, summary, created_at, updated_at
      FROM notes WHERE workspace_id IN (${placeholders}) ORDER BY datetime(updated_at) DESC
    `).all(...workspaceIds) : [],
    revisionEvidence: db.prepare(`
      SELECT concept_id, deck_id, activity_type, score, difficulty, response_type, confidence,
        feedback_code, misconception_id, correction_successful, created_at
      FROM learning_evidence WHERE user_id = ? ORDER BY datetime(created_at)
    `).all(req.user.id),
    reviewSchedule: db.prepare("SELECT * FROM review_schedules WHERE user_id = ?").all(req.user.id),
    classMemberships: db.prepare(`
      SELECT class_id, role, status, joined_at, left_at FROM class_memberships WHERE user_id = ?
    `).all(req.user.id),
  };
  writeAuditLog(req.user.id, "account_data_exported", "user", req.user.id);
  res.setHeader("Content-Disposition", `attachment; filename="neat-notes-account-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(exportData);
});

app.delete("/api/account", requireUser, (req, res) => {
  const confirmation = String(req.body.confirmation || "").trim();
  const password = String(req.body.password || "");
  if (confirmation !== "DELETE MY ACCOUNT") {
    return res.status(400).json({ error: "Type DELETE MY ACCOUNT to confirm permanent deletion." });
  }
  if (req.user.password_hash && !verifyPassword(password, req.user.password_salt, req.user.password_hash)) {
    return res.status(401).json({ error: "Enter your current password to delete this account." });
  }
  if (!req.user.password_hash && Date.now() - new Date(req.sessionCreatedAt).getTime() > 15 * 60 * 1000) {
    return res.status(401).json({ error: "Sign in with Google again before deleting this account." });
  }
  if (["active", "trialing", "past_due"].includes(req.user.subscription_status)) {
    return res.status(409).json({ error: "Cancel the active subscription in Billing before deleting this account." });
  }

  const userId = req.user.id;
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  clearSessionCookie(res);
  console.info(JSON.stringify({ event: "account_deleted", userId, timestamp: new Date().toISOString() }));
  res.json({ message: "Your Neat Notes account and associated personal data have been deleted." });
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
  if (!profile.email || profile.email_verified !== true) {
    return res.status(400).send(renderMessagePage("Google sign-in failed", "Google did not confirm a verified email address."));
  }
  const user = upsertGoogleUser(profile);
  issueSession(res, user.id, req);
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
  `).all(req.user.id).filter((workspace) =>
    workspace.role === "owner" || ownerHasWorkspaceCollaboration(workspace.id),
  );

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
  if (!isNoteBodyWithinLimit(body)) {
    return res.status(413).json({ error: `Notes can be up to ${Math.floor(MAX_NOTE_BODY_BYTES / 1024)} KB.` });
  }
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
  if (!isNoteBodyWithinLimit(body)) {
    return res.status(413).json({ error: `Notes can be up to ${Math.floor(MAX_NOTE_BODY_BYTES / 1024)} KB.` });
  }
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

  const studyPack = createStudyPack(note);
  const generatedAt = new Date().toISOString();
  const resourceId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO generated_resources (
      id, user_id, note_id, resource_type, source_note_updated_at, provenance, alignment_status, created_at
    ) VALUES (?, ?, ?, 'study_pack', ?, 'user_note_deterministic_generator', 'needs_review', ?)
  `).run(resourceId, req.user.id, note.id, note.updated_at, generatedAt);
  res.json({
    studyPack,
    provenance: {
      id: resourceId,
      sourceNoteId: note.id,
      sourceNoteUpdatedAt: note.updated_at,
      generatedAt,
      method: "Deterministic Neat Notes generator",
      alignmentStatus: "needs_review",
      notice: "Generated from your note. Review accuracy and OCR alignment before revising from it.",
    },
  });
});

app.get("/api/notes/:id/generated-resources", requireUser, (req, res) => {
  const note = getAccessibleNote(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found." });
  const resources = db.prepare(`
    SELECT id, resource_type, source_note_updated_at, provenance, alignment_status, created_at
    FROM generated_resources WHERE note_id = ? AND user_id = ?
    ORDER BY datetime(created_at) DESC LIMIT 50
  `).all(note.id, req.user.id);
  res.json({ resources });
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
  const name = String(req.body.name ?? req.user.name).trim();
  const role = normalizeUserRole(req.user.role || "student");
  if (name.length < 2) return res.status(400).json({ error: "Enter a display name with at least 2 characters." });
  if (name.length > 80) return res.status(400).json({ error: "Display names must be 80 characters or fewer." });

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?").run(name, role, now, req.user.id);
  const updatedUser = { ...req.user, name, role };
  ensureAccountProfiles(updatedUser);

  const student = getStudentProfile(req.user.id);
  const avatarId = normalizeProfileAvatarId(req.body.avatarId ?? student?.avatar_id);
  const learnerType = normalizeLearnerType(req.body.learnerType ?? student?.learner_type);
  const targetGrade = normalizeTargetGrade(req.body.targetGrade ?? student?.target_grade);
  const personalTarget = String(req.body.personalTarget ?? student?.personal_target ?? "").trim().slice(0, 240) || null;
  const revisionGoal = normalizeRevisionGoal(req.body.revisionGoal ?? student?.revision_goal);
  const taughtTopicIds = normalizeTopicIdArray(req.body.taughtTopicIds ?? parseJsonValue(student?.taught_topic_ids, []));
  const taughtTopicSource = ["self", "teacher", "class"].includes(req.body.taughtTopicSource)
    ? req.body.taughtTopicSource
    : student?.taught_topic_source || "self";
  const examDates = normalizeExamDates(req.body.examDates ?? parseJsonValue(student?.exam_dates, {}));
  const notificationPreferences = normalizeNotificationPreferences(
    req.body.notificationPreferences ?? parseJsonValue(student?.notification_preferences, {}),
  );
  const completeOnboarding = req.body.completeOnboarding === true;

  db.prepare(`
    UPDATE student_profiles
    SET avatar_id = ?, year_group = ?, learner_type = ?, target_grade = ?, personal_target = ?,
      taught_topic_ids = ?, taught_topic_source = ?, revision_goal = ?, exam_dates = ?,
      notification_preferences = ?, onboarding_completed_at = CASE
        WHEN ? THEN COALESCE(onboarding_completed_at, ?)
        ELSE onboarding_completed_at
      END,
      updated_at = ?
    WHERE user_id = ?
  `).run(
    avatarId,
    learnerType === "year_12" ? "Year 12" : learnerType === "year_13" ? "Year 13" : "Independent learner",
    learnerType,
    targetGrade,
    personalTarget,
    JSON.stringify(taughtTopicIds),
    taughtTopicSource,
    revisionGoal,
    JSON.stringify(examDates),
    JSON.stringify(notificationPreferences),
    completeOnboarding ? 1 : 0,
    now,
    now,
    req.user.id,
  );

  res.json({
    user: publicUser(updatedUser),
    studentProfile: getStudentProfile(req.user.id),
    teacherProfile: getTeacherProfile(req.user.id),
  });
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

app.post("/api/centres/join", joinRateLimiter, requireUser, requireTeacher, (req, res) => {
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

app.post("/api/classes/preview", joinRateLimiter, requireUser, (req, res) => {
  const code = normaliseClassCode(req.body.code);
  if (!code || !isValidClassCode(code)) return res.status(400).json({ error: "That class code does not look right." });
  const classGroup = db.prepare(`
    SELECT class_groups.*, users.name AS teacher_name
    FROM class_groups JOIN users ON users.id = class_groups.teacher_id
    WHERE class_groups.join_code = ? AND class_groups.join_code_enabled = 1 AND class_groups.archived_at IS NULL
  `).get(code);
  if (!classGroup) return res.status(404).json({ error: "We could not find an active class with that code." });
  res.json({
    class: {
      name: classGroup.name,
      subject: classGroup.subject,
      examBoard: classGroup.exam_board,
      yearGroup: classGroup.year_group,
      description: classGroup.description,
      teacherName: classGroup.teacher_name,
    },
  });
});

app.post("/api/classes/join", joinRateLimiter, requireUser, (req, res) => {
  const code = normaliseClassCode(req.body.code);
  if (!code) return res.status(400).json({ error: "Enter a class code to continue." });
  if (!isValidClassCode(code)) {
    return res.status(400).json({ error: "That class code does not look right. Check it and try again." });
  }

  const classGroup = db.prepare("SELECT * FROM class_groups WHERE join_code = ? AND join_code_enabled = 1 AND archived_at IS NULL").get(code);
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

app.delete("/api/classes/:id/members/:userId", requireUser, requireClassTeacher, (req, res) => {
  const membership = db.prepare(`
    SELECT * FROM class_memberships WHERE class_id = ? AND user_id = ? AND role = 'student' AND status = 'active'
  `).get(req.classGroup.id, req.params.userId);
  if (!membership) return res.status(404).json({ error: "Active student membership not found." });
  const now = new Date().toISOString();
  db.prepare("UPDATE class_memberships SET status = 'removed', left_at = ? WHERE id = ?").run(now, membership.id);
  writeAuditLog(req.user.id, "class_member_removed", "class", req.classGroup.id, { studentId: req.params.userId });
  res.json({ message: "Student removed from the class." });
});

app.patch("/api/classes/:id/archive", requireUser, requireClassTeacher, (req, res) => {
  const now = new Date().toISOString();
  db.prepare("UPDATE class_groups SET archived_at = ?, join_code_enabled = 0, updated_at = ? WHERE id = ?")
    .run(now, now, req.classGroup.id);
  db.prepare("UPDATE class_assignments SET status = 'archived', updated_at = ? WHERE class_id = ? AND status = 'active'")
    .run(now, req.classGroup.id);
  writeAuditLog(req.user.id, "class_archived", "class", req.classGroup.id);
  res.json({ message: "Class archived and its join code disabled." });
});

app.get("/api/assignments", requireUser, (req, res) => {
  const classes = isTeacherUser(req.user) ? listTeacherClasses(req.user.id) : listStudentClasses(req.user.id);
  const classIds = classes.map((classGroup) => classGroup.id);
  if (!classIds.length) return res.json({ assignments: [] });
  const placeholders = classIds.map(() => "?").join(",");
  const assignments = db.prepare(`
    SELECT class_assignments.*, flashcard_decks.topic_id, flashcard_decks.code, flashcard_decks.title AS topic_title,
      class_groups.name AS class_name,
      (SELECT COUNT(*) FROM assignment_completions WHERE assignment_id = class_assignments.id AND status = 'complete') AS completed_count,
      (SELECT COUNT(*) FROM class_memberships WHERE class_id = class_assignments.class_id AND role = 'student' AND status = 'active') AS student_count,
      (SELECT status FROM assignment_completions WHERE assignment_id = class_assignments.id AND user_id = ?) AS user_status
    FROM class_assignments
    JOIN class_groups ON class_groups.id = class_assignments.class_id
    LEFT JOIN flashcard_decks ON flashcard_decks.id = class_assignments.deck_id
    WHERE class_assignments.class_id IN (${placeholders})
    ORDER BY CASE WHEN class_assignments.due_at IS NULL THEN 1 ELSE 0 END, datetime(class_assignments.due_at)
  `).all(req.user.id, ...classIds).map(decorateAssignment);
  res.json({ assignments });
});

app.post("/api/classes/:id/assignments", requireUser, requireClassTeacher, (req, res) => {
  const topicId = String(req.body.topicId || "").trim();
  const deck = db.prepare("SELECT * FROM flashcard_decks WHERE id = ? OR topic_id = ?").get(topicId, topicId);
  if (!deck) return res.status(400).json({ error: "Choose a published OCR topic." });
  const taskType = normalizeAssignmentType(req.body.taskType);
  const instructions = String(req.body.instructions || "").trim().slice(0, 1000);
  const startAt = normalizeOptionalDate(req.body.startAt);
  const dueAt = normalizeOptionalDate(req.body.dueAt);
  if (startAt && dueAt && new Date(dueAt) < new Date(startAt)) {
    return res.status(400).json({ error: "Due date must be after the start date." });
  }
  const estimatedMinutes = Math.min(120, Math.max(5, Number(req.body.estimatedMinutes) || 15));
  const now = new Date().toISOString();
  const assignment = {
    id: crypto.randomUUID(), class_id: req.classGroup.id, deck_id: deck.id,
    title: String(req.body.title || `${deck.code} ${deck.title}`).trim().slice(0, 160),
    instructions, task_type: taskType, start_at: startAt, due_at: dueAt,
    estimated_minutes: estimatedMinutes, status: "active", created_by: req.user.id,
    created_at: now, updated_at: now,
  };
  db.prepare(`
    INSERT INTO class_assignments (
      id, class_id, deck_id, title, instructions, task_type, start_at, due_at,
      estimated_minutes, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    assignment.id, assignment.class_id, assignment.deck_id, assignment.title, assignment.instructions,
    assignment.task_type, assignment.start_at, assignment.due_at, assignment.estimated_minutes,
    assignment.created_by, assignment.created_at, assignment.updated_at,
  );
  writeAuditLog(req.user.id, "assignment_created", "assignment", assignment.id, { classId: req.classGroup.id, taskType });
  res.status(201).json({ assignment: decorateAssignment({ ...assignment, topic_id: deck.topic_id, code: deck.code, topic_title: deck.title, class_name: req.classGroup.name, completed_count: 0, student_count: getClassStudents(req.classGroup.id).length }) });
});

app.patch("/api/assignments/:id/status", requireUser, (req, res) => {
  const assignment = db.prepare(`
    SELECT class_assignments.* FROM class_assignments
    JOIN class_groups ON class_groups.id = class_assignments.class_id
    JOIN class_memberships ON class_memberships.class_id = class_assignments.class_id
    WHERE class_assignments.id = ? AND class_memberships.user_id = ?
      AND class_memberships.role = 'student' AND class_memberships.status = 'active'
      AND class_assignments.status = 'active' AND class_groups.archived_at IS NULL
  `).get(req.params.id, req.user.id);
  if (!assignment) return res.status(404).json({ error: "Assignment not found for this account." });
  const status = ["started", "complete"].includes(req.body.status) ? req.body.status : "started";
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO assignment_completions (assignment_id, user_id, status, started_at, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(assignment_id, user_id) DO UPDATE SET
      status = excluded.status,
      started_at = COALESCE(assignment_completions.started_at, excluded.started_at),
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at
  `).run(assignment.id, req.user.id, status, now, status === "complete" ? now : null, now);
  recordStudentActivity(req.user.id, assignment.class_id, assignment.deck_id, `assignment_${status}`, { assignmentId: assignment.id });
  res.json({ status, updatedAt: now });
});

app.get("/api/classes/:id/dashboard", requireUser, requireClassTeacher, (req, res) => {
  res.json(getClassDashboard(req.classGroup.id));
});

app.get("/api/classes/:id/insights", requireUser, requireClassTeacher, (req, res) => {
  const students = getClassStudents(req.classGroup.id);
  res.json({
    dashboard: getClassDashboard(req.classGroup.id),
    students,
    studentProfiles: students.map((student) => getStudentConfidenceProfile(req.classGroup.id, student.id)),
  });
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

  const decks = listRevisionDecks(req.user, classId);
  res.json({ decks });
});

app.post("/api/revision/free-deck", requireUser, (req, res) => {
  const requestedDeckId = String(req.body.deckId || req.body.topicId || "").trim();
  const deck = db.prepare("SELECT * FROM flashcard_decks WHERE id = ? OR topic_id = ?").get(requestedDeckId, requestedDeckId);
  if (!deck) return res.status(404).json({ error: "Deck not found." });

  if (hasFeature(req.user, "fullRevisionLibrary")) {
    return res.json({
      user: publicUser(req.user),
      deck: getRevisionDeck(deck.id, req.user),
      message: "Your plan already includes the full OCR revision library.",
    });
  }

  if (req.user.free_revision_deck_id && req.user.free_revision_deck_id !== deck.id) {
    return res.status(402).json({
      error: "Your free deck is already selected. Upgrade to Pro to unlock every OCR Computer Science deck.",
    });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE users SET free_revision_deck_id = ?, updated_at = ? WHERE id = ?")
    .run(deck.id, now, req.user.id);
  const updatedUser = getUserById(req.user.id);

  res.json({
    user: publicUser(updatedUser),
    deck: getRevisionDeck(deck.id, updatedUser),
    message: `${deck.code} ${deck.title} is now your free revision deck.`,
  });
});

app.get("/api/revision/decks/:id", requireUser, (req, res) => {
  const classId = String(req.query.classId || "").trim() || null;
  if (classId && !isClassParticipant(classId, req.user.id)) {
    return res.status(403).json({ error: "You do not have access to that class context." });
  }

  const deck = getRevisionDeck(req.params.id, req.user, classId);
  if (!deck) return res.status(404).json({ error: "Deck not found." });
  if (deck.locked) return res.status(402).json({ error: "Upgrade to Pro to unlock this OCR revision deck." });
  res.json({ deck });
});

app.post("/api/revision/attempts", revisionRateLimiter, requireUser, (req, res) => {
  const deckId = String(req.body.deckId || "").trim();
  const cardId = String(req.body.cardId || "").trim();
  const confidence = normalizeConfidence(req.body.confidence);
  const classId = String(req.body.classId || "").trim() || null;
  const source = String(req.body.source || "flashcard").trim().slice(0, 40) || "flashcard";
  const rating = normalizeReviewRating(req.body.rating || req.body.difficulty, confidence);

  if (!deckId || !cardId || !confidence) {
    return res.status(400).json({ error: "Deck, card and confidence are required." });
  }

  const card = db.prepare("SELECT * FROM flashcards WHERE id = ? AND deck_id = ?").get(cardId, deckId);
  if (!card) return res.status(404).json({ error: "Flashcard not found." });
  if (!canAccessRevisionDeck(req.user, deckId)) {
    return res.status(402).json({ error: "Upgrade to Pro to save progress on this OCR revision deck." });
  }
  if (classId && !isActiveClassStudent(classId, req.user.id)) {
    return res.status(403).json({ error: "You are not joined to that class." });
  }

  const quizCorrect = req.body.quizCorrect === undefined ? null : (req.body.quizCorrect ? 1 : 0);
  const responseTimeMs = req.body.responseTimeMs !== null && req.body.responseTimeMs !== undefined && Number.isFinite(Number(req.body.responseTimeMs))
    ? Math.max(0, Number(req.body.responseTimeMs))
    : null;
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
  const learning = recordLearningEvidenceFromAttempt(req.user.id, attempt, card, rating);
  recordStudentActivity(req.user.id, classId, deckId, "card_attempt", { confidence, source, quizCorrect });
  pruneLearningHistory(req.user.id, card.id, learning.conceptId);

  res.status(201).json({
    attempt,
    confidence: confidenceSummary,
    learning,
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

app.get("/api/learning/dashboard", requireUser, (req, res) => {
  res.json(getLearningDashboard(req.user));
});

app.post("/api/learning/session", requireUser, (req, res) => {
  const requestedDuration = Number(req.body.durationMinutes || 15);
  const durationMinutes = [5, 15, 25].includes(requestedDuration)
    ? requestedDuration
    : Math.min(60, Math.max(5, requestedDuration || 15));
  const dashboard = getLearningDashboard(req.user, durationMinutes);

  recordStudentActivity(req.user.id, null, dashboard.session.items[0]?.deckId || null, "adaptive_session_started", {
    durationMinutes,
    itemCount: dashboard.session.items.length,
  });
  res.status(201).json({ session: dashboard.session, summary: dashboard.summary });
});

app.post("/api/learning/mistakes/:id/correct", requireUser, (req, res) => {
  const mistake = db.prepare("SELECT * FROM mistake_journal WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!mistake) return res.status(404).json({ error: "Mistake entry not found." });

  const now = new Date().toISOString();
  db.prepare("UPDATE mistake_journal SET corrected_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(now, now, mistake.id, req.user.id);
  res.json({ mistake: { ...mistake, corrected_at: now, updated_at: now } });
});

app.get("/api/exam/questions", requireUser, (req, res) => {
  const topicId = String(req.query.topicId || "").trim();
  const available = QUESTION_BANK.filter((question) => !topicId || question.topicId === topicId)
    .filter((question) => canAccessRevisionDeck(req.user, question.topicId));
  res.json({
    questions: available.map(getPublicQuestion),
    lockedTopicIds: QUESTION_BANK
      .filter((question) => !canAccessRevisionDeck(req.user, question.topicId))
      .map((question) => question.topicId),
    markingNotice: "Marks are suggested using a transparent Neat Notes rubric, not OCR examiner or AI marking.",
  });
});

app.post("/api/exam/attempts", revisionRateLimiter, requireUser, (req, res) => {
  const questionId = String(req.body.questionId || "").trim();
  const answer = String(req.body.answer || "").trim().slice(0, 4000);
  const question = QUESTION_BANK.find((item) => item.id === questionId);
  if (!question) return res.status(404).json({ error: "Exam-practice question not found." });
  if (!canAccessRevisionDeck(req.user, question.topicId)) {
    return res.status(402).json({ error: "Choose this as your free deck or upgrade to Pro to submit this question." });
  }
  if (answer.length < 8) return res.status(400).json({ error: "Write a little more before submitting your answer." });

  const originalAttemptId = String(req.body.originalAttemptId || "").trim() || null;
  if (originalAttemptId) {
    const original = db.prepare("SELECT id FROM exam_attempts WHERE id = ? AND user_id = ? AND question_id = ?")
      .get(originalAttemptId, req.user.id, question.id);
    if (!original) return res.status(400).json({ error: "The original answer could not be matched to this account." });
  }
  const confidence = ["low", "medium", "high"].includes(req.body.confidence) ? req.body.confidence : null;
  const responseTimeMs = req.body.responseTimeMs !== null && req.body.responseTimeMs !== undefined && Number.isFinite(Number(req.body.responseTimeMs))
    ? Math.min(1000 * 60 * 120, Math.max(0, Number(req.body.responseTimeMs)))
    : null;
  const result = markAnswer(question, answer);
  const now = new Date().toISOString();
  const attemptId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO exam_attempts (
      id, user_id, class_id, question_id, topic_id, original_attempt_id, answer,
      proposed_mark, maximum_mark, rubric_result, confidence, response_time_ms, created_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attemptId, req.user.id, question.id, question.topicId, originalAttemptId, answer,
    result.proposedMark, result.maximumMark, JSON.stringify(result), confidence, responseTimeMs, now,
  );
  const learning = recordExamLearningEvidence(req.user.id, question, result, {
    attemptId, confidence, responseTimeMs, corrected: Boolean(originalAttemptId), now,
  });
  pruneExtendedAttemptHistory(req.user.id, question.conceptIds[0]);
  recordStudentActivity(req.user.id, null, question.topicId, originalAttemptId ? "exam_answer_improved" : "exam_question_submitted", {
    questionId: question.id,
    proposedMark: result.proposedMark,
    maximumMark: result.maximumMark,
  });
  res.status(201).json({
    attemptId,
    question: getPublicQuestion(question),
    result: { ...result, modelReasoning: question.modelReasoning },
    learning,
    notice: "This is a suggested mark from the published Neat Notes rubric. Equivalent valid wording may need teacher review.",
  });
});

app.get("/api/exam/attempts", requireUser, (req, res) => {
  const attempts = db.prepare(`
    SELECT id, question_id, topic_id, original_attempt_id, proposed_mark, maximum_mark,
      confidence, response_time_ms, created_at
    FROM exam_attempts WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 100
  `).all(req.user.id);
  res.json({ attempts });
});

app.get("/api/labs", requireUser, (req, res) => {
  const available = LABS.filter((labItem) => canAccessRevisionDeck(req.user, labItem.topicId));
  res.json({
    labs: available.map(getPublicLab),
    lockedCount: LABS.length - available.length,
    notice: "Interactive tasks use original Neat Notes scenarios and feed the adaptive mastery model.",
  });
});

app.post("/api/labs/attempts", revisionRateLimiter, requireUser, (req, res) => {
  const labId = String(req.body.labId || "").trim();
  const response = String(req.body.response || "").trim().slice(0, 2000);
  const labItem = LABS.find((item) => item.id === labId);
  if (!labItem) return res.status(404).json({ error: "Interactive task not found." });
  if (!canAccessRevisionDeck(req.user, labItem.topicId)) {
    return res.status(402).json({ error: "Choose this as your free deck or upgrade to Pro to submit this task." });
  }
  if (!response) return res.status(400).json({ error: "Enter or choose an answer first." });
  const assessment = assessLab(labItem, response);
  const responseTimeMs = req.body.responseTimeMs !== null && req.body.responseTimeMs !== undefined && Number.isFinite(Number(req.body.responseTimeMs))
    ? Math.min(1000 * 60 * 60, Math.max(0, Number(req.body.responseTimeMs)))
    : null;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO lab_attempts (id, user_id, lab_id, topic_id, response, correct, response_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), req.user.id, labItem.id, labItem.topicId, response, assessment.correct ? 1 : 0, responseTimeMs, now);
  const learning = recordLabLearningEvidence(req.user.id, labItem, assessment, { responseTimeMs, now });
  pruneExtendedAttemptHistory(req.user.id, labItem.conceptId);
  recordStudentActivity(req.user.id, null, labItem.topicId, "interactive_lab_completed", { labId, correct: assessment.correct });
  res.status(201).json({ assessment, learning });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((err, req, res, next) => {
  console.error("Request failed:", {
    method: req.method,
    path: req.path,
    name: err?.name || "Error",
    message: String(err?.message || "Unexpected error").slice(0, 300),
    status: Number(err?.status || 500),
  });
  res.status(Number(err?.status || 500)).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Neat Notes running at ${BASE_URL}`);
  const smtpConfigError = getSmtpConfigError();
  if (smtpConfigError) {
    console.log(`${smtpConfigError} Development verification links are available only outside production.`);
  }
  if (!isGoogleConfigured()) {
    console.log("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.");
  }
  retryQueuedContactEnquiries().catch((error) => {
    console.error("Initial contact enquiry retry failed:", sanitizeMailerError(error));
  });
});

if (CONTACT_RETRY_INTERVAL_MS > 0) {
  setInterval(() => {
    retryQueuedContactEnquiries().catch((error) => {
      console.error("Contact enquiry retry failed:", sanitizeMailerError(error));
    });
  }, CONTACT_RETRY_INTERVAL_MS).unref();
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function registerPublicAssetRoutes() {
  app.get("/app-relaunch.js", (req, res) => {
    res.type("application/javascript").sendFile(path.join(__dirname, "app.js"));
  });
  app.get("/styles-relaunch.css", (req, res) => {
    res.type("text/css").sendFile(path.join(__dirname, "styles.css"));
  });

  const publicAssets = new Map([
    ["/app.js", "application/javascript"],
    ["/theme-init.js", "application/javascript"],
    ["/learning-model.js", "application/javascript"],
    ["/ocr-content.js", "application/javascript"],
    ["/service-worker.js", "application/javascript"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/styles.css", "text/css"],
    ["/revision-generator.js", "application/javascript"],
    ["/neat-questions.js", "application/javascript"],
    ["/favicon.svg", "image/svg+xml"],
  ]);

  publicAssets.forEach((contentType, publicPath) => {
    app.get(publicPath, (req, res) => {
      res.type(contentType);
      res.sendFile(path.join(__dirname, publicPath.slice(1)));
    });
  });

  app.get("/revision-topics.js", (req, res) => {
    const user = getOptionalSessionUser(req);
    const fullLibrary = Boolean(user && hasFeature(user, "fullRevisionLibrary"));
    const selectedFreeDeckId = user ? user.free_revision_deck_id : DEFAULT_FREE_REVISION_DECK_ID;
    const topics = loadRevisionTopicsFromAssets().map((topic) =>
      createPublicRevisionTopic(topic, fullLibrary || topic.id === selectedFreeDeckId),
    );

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
    res.type("application/javascript");
    res.send(`window.REVISION_TOPICS = ${JSON.stringify(topics)};`);
  });

  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  });

  app.get("/ocr-h446/:code", (req, res) => {
    const topic = REVISION_TOPICS.find((item) => item.code === req.params.code);
    if (!topic) return res.status(404).type("text/plain").send("Topic not found.");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(renderPublicTopicPage(topic));
  });

  app.get("/sitemap.xml", (req, res) => {
    const urls = [BASE_URL, ...REVISION_TOPICS.map((topic) => `${BASE_URL}/ocr-h446/${encodeURIComponent(topic.code)}`)];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join("")}</urlset>`,
    );
  });
}

function renderPublicTopicPage(topic) {
  const description = String(topic.summary || `Revise OCR H446 ${topic.code} ${topic.title} with Neat Notes.`).slice(0, 220);
  const concepts = (topic.cards || []).slice(0, 6).map((card) => `<li><strong>${escapeHtml(card.front)}</strong><span>${escapeHtml(card.category || "Knowledge")}</span></li>`).join("");
  const canonical = `${BASE_URL}/ocr-h446/${encodeURIComponent(topic.code)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(topic.code)} ${escapeHtml(topic.title)} | OCR H446 revision | Neat Notes</title>
    <meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(topic.code)} ${escapeHtml(topic.title)} | Neat Notes"><meta property="og:description" content="${escapeHtml(description)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head>
    <body class="public-topic-page"><header><a class="public-topic-brand" href="/"><span class="brand-mark">NN</span><span><strong>Neat Notes</strong><small>A BreakellSystems product</small></span></a><a class="primary-account-button" href="/?signup=1">Start free</a></header>
    <main><p class="eyebrow">OCR H446 · Component 01</p><h1>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</h1><p class="public-topic-summary">${escapeHtml(description)}</p>
    <section><div><p class="eyebrow">Topic overview</p><h2>Build accurate recall, then apply it.</h2><p>Neat Notes combines active flashcards, quick checks, exam practice and scheduled review. Progress is based on learning evidence rather than passive completion.</p></div><ul>${concepts}</ul></section>
    <aside><div><strong>${Number(topic.cards?.length || 0)} original retrieval cards</strong><span>Mapped to stable OCR concepts</span></div><a href="/?demo=1">Try the interactive demo</a><a href="/?signup=1">Create a free account</a></aside>
    <p class="public-topic-disclaimer">Neat Notes is independently produced and is not endorsed by OCR. OCR is a registered trademark of OCR.</p></main></body></html>`;
}

function getOptionalSessionUser(req) {
  const token = parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = db.prepare(`
    SELECT sessions.*, users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash);

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session;
}

function createPublicRevisionTopic(topic, includeCards) {
  const cards = Array.isArray(topic.cards) ? topic.cards : [];
  return {
    id: topic.id,
    subject: topic.subject || "Computer Science",
    code: topic.code || "",
    title: topic.title || "Untitled deck",
    summary: topic.summary || "",
    cardCount: cards.length,
    lockedPreview: !includeCards,
    cards: includeCards ? cards.map((card) => decoratePublicRevisionCard(topic.id, card)) : [],
  };
}

function decoratePublicRevisionCard(topicId, card) {
  const cardKey = String(card.id || "");
  return {
    id: cardKey,
    serverCardId: `${topicId}__${cardKey}`,
    category: card.category || "Revision",
    front: card.front || "",
    back: card.back || "",
  };
}

async function handleStripeWebhook(req, res) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe webhook is not configured." });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  const existing = db.prepare("SELECT 1 FROM stripe_events WHERE id = ?").get(event.id);
  if (existing) return res.json({ received: true, duplicate: true });

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChanged(event.data.object);
      break;
    default:
      break;
  }

  db.prepare("INSERT INTO stripe_events (id, type, processed_at) VALUES (?, ?, ?)")
    .run(event.id, event.type, new Date().toISOString());
  res.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) return;

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  let subscription = null;
  if (subscriptionId && stripe) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const status = subscription?.status || "inactive";
  const activeStatuses = new Set(["active", "trialing"]);
  const pricedPlan = getPlanFromStripeSubscription(subscription);
  const plan = activeStatuses.has(status) ? pricedPlan : "free";
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  applyUserPlan(userId, plan, status, subscriptionId, currentPeriodEnd);
  db.prepare("INSERT INTO billing_events (id, user_id, plan, provider, status, created_at) VALUES (?, ?, ?, 'stripe', ?, ?)")
    .run(crypto.randomUUID(), userId, plan, "checkout_completed", new Date().toISOString());
}

async function handleSubscriptionChanged(subscription) {
  if (stripe && subscription?.id) {
    subscription = await stripe.subscriptions.retrieve(subscription.id);
  }
  const subscriptionId = subscription.id;
  const user = db.prepare("SELECT * FROM users WHERE stripe_subscription_id = ? OR stripe_customer_id = ?")
    .get(subscriptionId, subscription.customer);
  const plan = getPlanFromStripeSubscription(subscription);
  if (!user || !PLAN_CATALOG[plan]) return;

  const status = subscription.status || "inactive";
  const activeStatuses = new Set(["active", "trialing"]);
  const effectivePlan = activeStatuses.has(status) ? plan : "free";
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  applyUserPlan(user.id, effectivePlan, status, subscriptionId, currentPeriodEnd);
  db.prepare("INSERT INTO billing_events (id, user_id, plan, provider, status, created_at) VALUES (?, ?, ?, 'stripe', ?, ?)")
    .run(crypto.randomUUID(), user.id, effectivePlan, `subscription_${status}`, new Date().toISOString());
}

function prepareDatabasePath(requestedPath) {
  const requestedDir = path.dirname(requestedPath);

  try {
    fs.mkdirSync(requestedDir, { recursive: true });
    return {
      path: requestedPath,
      fallbackActive: false,
    };
  } catch (error) {
    const fallbackPath = process.env.DATABASE_FALLBACK_PATH || path.join(os.tmpdir(), "neat-notes.sqlite");
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    console.warn(
      `Could not prepare DATABASE_PATH directory "${requestedDir}" (${error.code || error.message}). ` +
        `Falling back to "${fallbackPath}". Data will not persist until a Render disk is mounted at the configured path.`,
    );

    return {
      path: fallbackPath,
      fallbackActive: true,
    };
  }
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = isAllowedRequestOrigin(req, origin);

  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", normalizeOrigin(origin));
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

function enforceSameOriginMutation(req, res, next) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();

  const origin = req.headers.origin;
  if (!isAllowedRequestOrigin(req, origin)) {
    return res.status(403).json({ error: "This request did not originate from Neat Notes." });
  }

  next();
}

function isAllowedRequestOrigin(req, origin) {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  if (ALLOWED_ORIGINS.includes(normalizedOrigin)) return true;
  return originMatchesRequestHost(req, normalizedOrigin);
}

function originMatchesRequestHost(req, normalizedOrigin) {
  const requestHost = String(req.get("host") || "").trim().toLowerCase();
  if (!requestHost) return false;
  try {
    return new URL(normalizedOrigin).host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

function normalizeOrigin(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : "";
  } catch {
    return "";
  }
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  let requestCount = 0;

  return (req, res, next) => {
    const now = Date.now();
    requestCount += 1;
    if (requestCount % 250 === 0) {
      for (const [storedKey, storedRecord] of hits) {
        if (storedRecord.resetAt <= now) hits.delete(storedKey);
      }
    }
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
  addColumnIfMissing("users", "stripe_customer_id", "TEXT");
  addColumnIfMissing("users", "stripe_subscription_id", "TEXT");
  addColumnIfMissing("users", "subscription_status", "TEXT");
  addColumnIfMissing("users", "subscription_current_period_end", "TEXT");
  addColumnIfMissing("users", "plan", "TEXT NOT NULL DEFAULT 'free'");
  addColumnIfMissing("users", "plan_status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing("users", "plan_updated_at", "TEXT");
  addColumnIfMissing("users", "free_revision_deck_id", "TEXT");
  addColumnIfMissing("workspaces", "kind", "TEXT NOT NULL DEFAULT 'project'");
  addColumnIfMissing("sessions", "user_agent", "TEXT");
  addColumnIfMissing("sessions", "last_used_at", "TEXT");
  addColumnIfMissing("class_assignments", "task_type", "TEXT NOT NULL DEFAULT 'topic_revision'");
  addColumnIfMissing("class_assignments", "start_at", "TEXT");
  addColumnIfMissing("class_assignments", "estimated_minutes", "INTEGER");
  addColumnIfMissing("class_assignments", "status", "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing("class_groups", "archived_at", "TEXT");
  addColumnIfMissing("student_profiles", "learner_type", "TEXT");
  addColumnIfMissing("student_profiles", "avatar_id", "TEXT NOT NULL DEFAULT 'notebook'");
  addColumnIfMissing("student_profiles", "target_grade", "TEXT");
  addColumnIfMissing("student_profiles", "personal_target", "TEXT");
  addColumnIfMissing("student_profiles", "taught_topic_ids", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing("student_profiles", "taught_topic_source", "TEXT NOT NULL DEFAULT 'self'");
  addColumnIfMissing("student_profiles", "revision_goal", "TEXT");
  addColumnIfMissing("student_profiles", "exam_dates", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing("student_profiles", "notification_preferences", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing("student_profiles", "onboarding_completed_at", "TEXT");
  db.prepare("UPDATE workspaces SET kind = 'personal' WHERE kind = 'project' AND name LIKE ?").run("%'s Notes");
  db.prepare("UPDATE users SET plan = 'pro' WHERE plan = 'plus'").run();
  db.prepare("UPDATE users SET role = 'teacher' WHERE role = 'student' AND plan IN ('teacher', 'institution')").run();
  db.prepare("SELECT id, join_code FROM class_groups").all().forEach((classGroup) => {
    if (isLegacyClassJoinCode(classGroup.join_code)) {
      db.prepare("UPDATE class_groups SET join_code = ?, updated_at = ? WHERE id = ?")
        .run(createJoinCode("NN"), new Date().toISOString(), classGroup.id);
    }
  });
  db.prepare("SELECT id, code FROM centres").all().forEach((centre) => {
    if (isLegacyCentreCode(centre.code)) {
      db.prepare("UPDATE centres SET code = ?, updated_at = ? WHERE id = ?")
        .run(createJoinCode("CENTRE"), new Date().toISOString(), centre.id);
    }
  });
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

function validatePublishedContent() {
  const model = buildContentModel(loadRevisionTopicsFromAssets());
  const result = validateContentModel(model);
  if (!result.valid) {
    throw new Error(`OCR content validation failed: ${result.errors.slice(0, 8).join("; ")}`);
  }
  const questionResult = validateQuestionBank();
  const labResult = validateLabs();
  const conceptIds = new Set(model.components.flatMap((component) => component.sections.flatMap((section) =>
    section.topics.flatMap((topic) => topic.concepts.map((concept) => concept.id)),
  )));
  const invalidMappings = QUESTION_BANK.flatMap((question) => question.conceptIds.filter((id) => !conceptIds.has(id)));
  const invalidLabMappings = LABS.filter((labItem) => !conceptIds.has(labItem.conceptId)).map((labItem) => labItem.conceptId);
  if (!questionResult.valid || !labResult.valid || invalidMappings.length || invalidLabMappings.length) {
    throw new Error(`Practice content validation failed: ${[
      ...questionResult.errors,
      ...labResult.errors,
      ...invalidMappings.map((id) => `Unknown concept ${id}`),
      ...invalidLabMappings.map((id) => `Unknown lab concept ${id}`),
    ].join("; ")}`);
  }
  console.info(JSON.stringify({
    event: "content_validated",
    ...result.counts,
    examQuestions: questionResult.count,
    interactiveLabs: labResult.count,
    specification: "ocr-h446-2020",
  }));
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

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  next();
}

function requireClassTeacher(req, res, next) {
  const classGroup = getClassGroup(req.params.id);
  if (!classGroup) return res.status(404).json({ error: "Class not found." });
  if (!hasFeature(req.user, "teacherDashboard")) {
    return res.status(402).json({ error: "An active Teacher plan is required to manage classes." });
  }
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

function normalizeProfileAvatarId(value) {
  const normalized = String(value || "notebook").trim().toLowerCase();
  return ["notebook", "code", "formula", "revision", "exam", "lab"].includes(normalized)
    ? normalized
    : "notebook";
}

function normalizeLearnerType(value) {
  const normalized = String(value || "independent").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  return ["year_12", "year_13", "independent"].includes(normalized) ? normalized : "independent";
}

function normalizeTargetGrade(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return ["A*", "A", "B", "C", "D", "E"].includes(normalized) ? normalized : null;
}

function normalizeRevisionGoal(value) {
  const normalized = String(value || "keep_up").trim().toLowerCase();
  return ["keep_up", "weak_topics", "mocks", "final_exams"].includes(normalized) ? normalized : "keep_up";
}

function normalizeTopicIdArray(value) {
  if (!Array.isArray(value)) return [];
  const validIds = new Set(db.prepare("SELECT topic_id FROM flashcard_decks").all().map((row) => row.topic_id));
  return [...new Set(value.map((item) => String(item || "").trim()).filter((item) => validIds.has(item)))].slice(0, 100);
}

function normalizeExamDates(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalizedSource = {
    ...source,
    paper1: source.paper1 || source.component1,
    paper2: source.paper2 || source.component2,
  };
  return Object.fromEntries(
    ["mock", "paper1", "paper2"].flatMap((key) => {
      const date = String(normalizedSource[key] || "").trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? [[key, date]] : [];
    }),
  );
}

function normalizeNotificationPreferences(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    weeklyProgress: source.weeklyProgress === true,
    dueRevision: source.dueRevision === true,
    assignmentDue: source.assignmentDue !== false,
    billingSecurity: source.billingSecurity !== false,
    usageAnalytics: source.usageAnalytics === true,
  };
}

function sanitizeEventMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const safe = {};
  const blocked = /email|name|answer|message|body|content|password|token/i;
  Object.entries(value).slice(0, 20).forEach(([key, item]) => {
    if (blocked.test(key)) return;
    if (["string", "number", "boolean"].includes(typeof item)) {
      safe[String(key).slice(0, 60)] = typeof item === "string" ? item.slice(0, 160) : item;
    }
  });
  return safe;
}

function normalizeAssignmentType(value) {
  const normalized = String(value || "topic_revision").trim().toLowerCase();
  const allowed = new Set(["adaptive_session", "topic_revision", "flashcards", "quick_quiz", "exam_questions", "mini_mock", "interactive_lab"]);
  return allowed.has(normalized) ? normalized : "topic_revision";
}

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw.length === 10 ? `${raw}T16:00:00.000Z` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function decorateAssignment(assignment) {
  return {
    id: assignment.id,
    classId: assignment.class_id,
    className: assignment.class_name,
    deckId: assignment.deck_id,
    topicId: assignment.topic_id || assignment.deck_id,
    topicCode: assignment.code,
    topicTitle: assignment.topic_title,
    title: assignment.title,
    instructions: assignment.instructions,
    taskType: assignment.task_type,
    startAt: assignment.start_at,
    dueAt: assignment.due_at,
    estimatedMinutes: assignment.estimated_minutes,
    status: assignment.status,
    userStatus: assignment.user_status || "not_started",
    completedCount: Number(assignment.completed_count || 0),
    studentCount: Number(assignment.student_count || 0),
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
  };
}

function parseJsonValue(value, fallback) {
  try {
    return JSON.parse(value || "") ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeCentreType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  return ["school", "college", "department", "trust"].includes(normalized) ? normalized : "school";
}

function isTeacherUser(user) {
  return hasFeature(user, "teacherDashboard")
    && ["teacher", "centre_admin", "admin"].includes(user?.role);
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

function getAccountProfiles(userId) {
  return {
    student: getStudentProfile(userId),
    teacher: getTeacherProfile(userId),
  };
}

function writeAuditLog(userId, action, entityType = null, entityId = null, metadata = {}) {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId || null,
    String(action || "unknown").slice(0, 80),
    entityType ? String(entityType).slice(0, 60) : null,
    entityId ? String(entityId).slice(0, 160) : null,
    JSON.stringify(metadata || {}).slice(0, 4000),
    new Date().toISOString(),
  );
}

function describeUserAgent(userAgent) {
  const value = String(userAgent || "");
  const browser = value.includes("Edg/") ? "Edge"
    : value.includes("Firefox/") ? "Firefox"
      : value.includes("Chrome/") ? "Chrome"
        : value.includes("Safari/") ? "Safari"
          : "Browser";
  const device = /iPhone|Android.+Mobile/i.test(value) ? "phone"
    : /iPad|Android/i.test(value) ? "tablet"
      : "computer";
  return `${browser} on this ${device}`;
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

function isLegacyClassJoinCode(value) {
  return /^NN-[A-Z0-9]{5}$/i.test(String(value || ""));
}

function isLegacyCentreCode(value) {
  return /^CENTRE-[A-Z0-9]{5}$/i.test(String(value || ""));
}

function createJoinCode(prefix) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const randomSegment = (length) => {
    let segment = "";
    while (segment.length < length) {
      const byte = crypto.randomBytes(1)[0];
      if (byte >= 224) continue;
      segment += alphabet[byte % alphabet.length];
    }
    return segment;
  };
  let code;
  do {
    code = `${normaliseClassCode(prefix)}-${randomSegment(5)}-${randomSegment(5)}`;
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
    WHERE (class_groups.teacher_id = ?
       OR (centre_memberships.user_id = ? AND centre_memberships.role IN ('owner', 'admin')))
      AND class_groups.archived_at IS NULL
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
      AND class_groups.archived_at IS NULL
    ORDER BY datetime(class_memberships.joined_at) DESC
  `).all(userId).map((classGroup) => decorateClassGroup(classGroup, userId));
}

function getClassStudents(classId) {
  return db.prepare(`
    SELECT users.id, users.name, users.email, users.last_accessed_at,
      class_memberships.joined_at,
      (SELECT COUNT(*) FROM flashcard_attempts
        WHERE flashcard_attempts.user_id = users.id AND flashcard_attempts.class_id = class_memberships.class_id
      ) AS attempt_count,
      (SELECT MAX(student_activity_events.created_at) FROM student_activity_events
        WHERE student_activity_events.user_id = users.id AND student_activity_events.class_id = class_memberships.class_id
      ) AS last_activity
    FROM class_memberships
    JOIN users ON users.id = class_memberships.user_id
    WHERE class_memberships.class_id = ?
      AND class_memberships.role = 'student'
      AND class_memberships.status = 'active'
    ORDER BY users.name
  `).all(classId);
}

function canAccessRevisionDeck(user, deckId) {
  if (hasFeature(user, "fullRevisionLibrary")) return true;
  return user?.free_revision_deck_id === deckId;
}

function listRevisionDecks(user, classId = null) {
  return db.prepare("SELECT * FROM flashcard_decks ORDER BY code").all().map((deck) => {
    const attempts = getDeckAttempts(deck.id, user.id, classId);
    const summary = calculateConfidenceSummary(attempts);
    const locked = !canAccessRevisionDeck(user, deck.id);
    const freeSelectable = !hasFeature(user, "fullRevisionLibrary") && !user.free_revision_deck_id;
    const selectedFreeDeck = user.free_revision_deck_id === deck.id;
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
      locked,
      freeSelectable,
      selectedFreeDeck,
      requiredPlan: locked && !freeSelectable ? "pro" : null,
      confidence: summary,
      lastAttemptAt: attempts[0]?.created_at || null,
    };
  });
}

function getRevisionDeck(deckId, user, classId = null) {
  const deck = db.prepare("SELECT * FROM flashcard_decks WHERE id = ? OR topic_id = ?").get(deckId, deckId);
  if (!deck) return null;
  const locked = !canAccessRevisionDeck(user, deck.id);

  const cards = db.prepare("SELECT * FROM flashcards WHERE deck_id = ? ORDER BY position").all(deck.id);
  const attempts = getDeckAttempts(deck.id, user.id, classId);
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
    locked,
    selectedFreeDeck: user.free_revision_deck_id === deck.id,
    requiredPlan: locked ? "pro" : null,
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
    LIMIT 500
  `).all(...params);
}

function normalizeConfidence(confidence) {
  const normalized = String(confidence || "").trim().toLowerCase();
  if (["confident", "thumbs_up", "up", "correct"].includes(normalized)) return "confident";
  if (["needs_practice", "thumbs_down", "down", "incorrect"].includes(normalized)) return "needs_practice";
  return "";
}

function normalizeReviewRating(rating, confidence) {
  const normalized = String(rating || "").trim().toLowerCase();
  if (["again", "hard", "good", "easy"].includes(normalized)) return normalized;
  return confidence === "needs_practice" ? "again" : "good";
}

function getLearningActivityType(source) {
  const normalized = String(source || "flashcard").trim().toLowerCase();
  const activityTypes = {
    flashcard: "flashcard_rating",
    quick_practice: "multiple_choice",
    quick_quiz: "multiple_choice",
    free_recall: "free_recall",
    short_answer: "short_answer",
    exam_response: "exam_response",
    correction: "correction",
  };
  return activityTypes[normalized] || "flashcard_rating";
}

function recordLearningEvidenceFromAttempt(userId, attempt, card, rating) {
  const conceptId = `${attempt.deck_id}:${card.card_key}`;
  const existingSchedule = db.prepare("SELECT * FROM review_schedules WHERE user_id = ? AND concept_id = ?")
    .get(userId, conceptId);
  const previousState = existingSchedule
    ? {
        difficulty: existingSchedule.difficulty,
        stabilityDays: existingSchedule.stability_days,
        retrievability: existingSchedule.retrievability,
        lastReviewAt: existingSchedule.last_review_at,
        nextReviewAt: existingSchedule.next_review_at,
        successfulRetrievals: existingSchedule.successful_retrievals,
        lapses: existingSchedule.lapses,
      }
    : {};
  const memoryState = updateMemoryState(previousState, rating, attempt.created_at);
  const activityType = getLearningActivityType(attempt.source);
  const score = attempt.quiz_correct === null
    ? ({ again: 0.18, hard: 0.5, good: 0.72, easy: 0.86 }[rating] || 0.5)
    : attempt.quiz_correct ? 1 : 0;
  const now = attempt.created_at;
  const evidenceId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO learning_evidence (
      id, user_id, class_id, concept_id, deck_id, card_id, activity_type, score, difficulty,
      response_type, confidence, previous_due_at, feedback_code, misconception_id,
      correction_successful, response_time_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evidenceId,
    userId,
    attempt.class_id,
    conceptId,
    attempt.deck_id,
    attempt.card_id,
    activityType,
    score,
    Number(attempt.difficulty) || 1,
    activityType === "multiple_choice" ? "selected_option" : "self_rating",
    rating,
    existingSchedule?.next_review_at || null,
    score < 0.5 ? "retry_scheduled" : "retrieval_recorded",
    null,
    score >= 0.5 ? 1 : 0,
    attempt.response_time_ms,
    now,
  );

  db.prepare(`
    INSERT INTO review_schedules (
      user_id, concept_id, deck_id, difficulty, stability_days, retrievability, last_review_at,
      next_review_at, successful_retrievals, lapses, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET
      deck_id = excluded.deck_id,
      difficulty = excluded.difficulty,
      stability_days = excluded.stability_days,
      retrievability = excluded.retrievability,
      last_review_at = excluded.last_review_at,
      next_review_at = excluded.next_review_at,
      successful_retrievals = excluded.successful_retrievals,
      lapses = excluded.lapses,
      updated_at = excluded.updated_at
  `).run(
    userId,
    conceptId,
    attempt.deck_id,
    memoryState.difficulty,
    memoryState.stabilityDays,
    memoryState.retrievability,
    memoryState.lastReviewAt,
    memoryState.nextReviewAt,
    memoryState.successfulRetrievals,
    memoryState.lapses,
    now,
  );

  if (score < 0.5) {
    upsertMistakeJournalEntry(userId, attempt, card, conceptId, activityType, now);
  } else {
    db.prepare(`
      UPDATE mistake_journal
      SET corrected_at = COALESCE(corrected_at, ?), updated_at = ?
      WHERE user_id = ? AND concept_id = ? AND corrected_at IS NULL
    `).run(now, now, userId, conceptId);
  }

  const evidence = getConceptEvidence(userId, conceptId);
  return {
    conceptId,
    mastery: calculateMastery(evidence),
    schedule: {
      ...memoryState,
      retrievability: calculateRetrievability(memoryState),
    },
  };
}

function recordExamLearningEvidence(userId, question, result, context) {
  const conceptId = question.conceptIds[0];
  const score = result.maximumMark ? result.proposedMark / result.maximumMark : 0;
  const rating = score >= 0.85 ? "easy" : score >= 0.6 ? "good" : score >= 0.35 ? "hard" : "again";
  const existingSchedule = db.prepare("SELECT * FROM review_schedules WHERE user_id = ? AND concept_id = ?")
    .get(userId, conceptId);
  const previousState = existingSchedule ? {
    difficulty: existingSchedule.difficulty,
    stabilityDays: existingSchedule.stability_days,
    retrievability: existingSchedule.retrievability,
    lastReviewAt: existingSchedule.last_review_at,
    nextReviewAt: existingSchedule.next_review_at,
    successfulRetrievals: existingSchedule.successful_retrievals,
    lapses: existingSchedule.lapses,
  } : {};
  const memoryState = updateMemoryState(previousState, rating, context.now);
  const possibleMismatch = context.confidence === "high" && score < 0.5;

  db.prepare(`
    INSERT INTO learning_evidence (
      id, user_id, class_id, concept_id, deck_id, card_id, activity_type, score, difficulty,
      response_type, confidence, previous_due_at, feedback_code, misconception_id,
      correction_successful, response_time_ms, created_at
    ) VALUES (?, ?, NULL, ?, ?, NULL, 'exam_response', ?, ?, 'free_text', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(), userId, conceptId, question.topicId, score, question.difficulty,
    context.confidence, existingSchedule?.next_review_at || null,
    possibleMismatch ? "confidence_mismatch" : context.corrected ? "answer_improved" : "rubric_feedback",
    possibleMismatch ? `${conceptId}:confidence_mismatch` : null,
    context.corrected && score >= 0.6 ? 1 : 0,
    context.responseTimeMs,
    context.now,
  );
  db.prepare(`
    INSERT INTO review_schedules (
      user_id, concept_id, deck_id, difficulty, stability_days, retrievability, last_review_at,
      next_review_at, successful_retrievals, lapses, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET
      deck_id = excluded.deck_id, difficulty = excluded.difficulty,
      stability_days = excluded.stability_days, retrievability = excluded.retrievability,
      last_review_at = excluded.last_review_at, next_review_at = excluded.next_review_at,
      successful_retrievals = excluded.successful_retrievals, lapses = excluded.lapses,
      updated_at = excluded.updated_at
  `).run(
    userId, conceptId, question.topicId, memoryState.difficulty, memoryState.stabilityDays,
    memoryState.retrievability, memoryState.lastReviewAt, memoryState.nextReviewAt,
    memoryState.successfulRetrievals, memoryState.lapses, context.now,
  );

  if (score < 0.6) {
    const existing = db.prepare(`
      SELECT id FROM mistake_journal WHERE user_id = ? AND concept_id = ? AND corrected_at IS NULL LIMIT 1
    `).get(userId, conceptId);
    if (existing) {
      db.prepare("UPDATE mistake_journal SET explanation = ?, updated_at = ? WHERE id = ?")
        .run(question.modelReasoning, context.now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO mistake_journal (
          id, user_id, class_id, concept_id, deck_id, card_id, activity_type, explanation,
          misconception_id, corrected_at, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, NULL, 'exam_response', ?, ?, NULL, ?, ?)
      `).run(
        crypto.randomUUID(), userId, conceptId, question.topicId, question.modelReasoning,
        possibleMismatch ? `${conceptId}:confidence_mismatch` : null, context.now, context.now,
      );
    }
  } else if (context.corrected) {
    db.prepare(`
      UPDATE mistake_journal SET corrected_at = ?, updated_at = ?
      WHERE user_id = ? AND concept_id = ? AND corrected_at IS NULL
    `).run(context.now, context.now, userId, conceptId);
  }
  return { conceptId, mastery: calculateMastery(getConceptEvidence(userId, conceptId)), schedule: memoryState };
}

function recordLabLearningEvidence(userId, labItem, assessment, context) {
  const existingSchedule = db.prepare("SELECT * FROM review_schedules WHERE user_id = ? AND concept_id = ?")
    .get(userId, labItem.conceptId);
  const previousState = existingSchedule ? {
    difficulty: existingSchedule.difficulty,
    stabilityDays: existingSchedule.stability_days,
    retrievability: existingSchedule.retrievability,
    lastReviewAt: existingSchedule.last_review_at,
    nextReviewAt: existingSchedule.next_review_at,
    successfulRetrievals: existingSchedule.successful_retrievals,
    lapses: existingSchedule.lapses,
  } : {};
  const memoryState = updateMemoryState(previousState, assessment.correct ? "good" : "again", context.now);
  db.prepare(`
    INSERT INTO learning_evidence (
      id, user_id, class_id, concept_id, deck_id, card_id, activity_type, score, difficulty,
      response_type, confidence, previous_due_at, feedback_code, misconception_id,
      correction_successful, response_time_ms, created_at
    ) VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, 2, ?, NULL, ?, ?, NULL, ?, ?, ?)
  `).run(
    crypto.randomUUID(), userId, labItem.conceptId, labItem.topicId, labItem.activityType,
    assessment.score, labItem.responseType, existingSchedule?.next_review_at || null,
    assessment.correct ? "interactive_success" : "interactive_correction",
    assessment.correct ? 1 : 0, context.responseTimeMs, context.now,
  );
  db.prepare(`
    INSERT INTO review_schedules (
      user_id, concept_id, deck_id, difficulty, stability_days, retrievability, last_review_at,
      next_review_at, successful_retrievals, lapses, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET
      deck_id = excluded.deck_id, difficulty = excluded.difficulty,
      stability_days = excluded.stability_days, retrievability = excluded.retrievability,
      last_review_at = excluded.last_review_at, next_review_at = excluded.next_review_at,
      successful_retrievals = excluded.successful_retrievals, lapses = excluded.lapses,
      updated_at = excluded.updated_at
  `).run(
    userId, labItem.conceptId, labItem.topicId, memoryState.difficulty, memoryState.stabilityDays,
    memoryState.retrievability, memoryState.lastReviewAt, memoryState.nextReviewAt,
    memoryState.successfulRetrievals, memoryState.lapses, context.now,
  );
  if (!assessment.correct) {
    const existing = db.prepare("SELECT id FROM mistake_journal WHERE user_id = ? AND concept_id = ? AND corrected_at IS NULL LIMIT 1")
      .get(userId, labItem.conceptId);
    if (existing) {
      db.prepare("UPDATE mistake_journal SET explanation = ?, updated_at = ? WHERE id = ?")
        .run(labItem.explanation, context.now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO mistake_journal (
          id, user_id, class_id, concept_id, deck_id, card_id, activity_type, explanation,
          misconception_id, corrected_at, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?)
      `).run(crypto.randomUUID(), userId, labItem.conceptId, labItem.topicId, labItem.activityType, labItem.explanation, context.now, context.now);
    }
  }
  return { conceptId: labItem.conceptId, mastery: calculateMastery(getConceptEvidence(userId, labItem.conceptId)), schedule: memoryState };
}

function upsertMistakeJournalEntry(userId, attempt, card, conceptId, activityType, now) {
  const existing = db.prepare(`
    SELECT id FROM mistake_journal
    WHERE user_id = ? AND concept_id = ? AND corrected_at IS NULL
    ORDER BY datetime(created_at) DESC LIMIT 1
  `).get(userId, conceptId);
  const explanation = card.back || "Review the concept and retry the question.";

  if (existing) {
    db.prepare(`
      UPDATE mistake_journal
      SET explanation = ?, activity_type = ?, class_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(explanation, activityType, attempt.class_id, now, existing.id, userId);
    return existing.id;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO mistake_journal (
      id, user_id, class_id, concept_id, deck_id, card_id, activity_type, explanation,
      misconception_id, corrected_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
  `).run(id, userId, attempt.class_id, conceptId, attempt.deck_id, attempt.card_id, activityType, explanation, now, now);
  return id;
}

function pruneLearningHistory(userId, cardId, conceptId) {
  db.prepare(`
    DELETE FROM flashcard_attempts
    WHERE id IN (
      SELECT id FROM flashcard_attempts
      WHERE user_id = ? AND card_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT -1 OFFSET 150
    )
  `).run(userId, cardId);
  db.prepare(`
    DELETE FROM learning_evidence
    WHERE id IN (
      SELECT id FROM learning_evidence
      WHERE user_id = ? AND concept_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT -1 OFFSET 150
    )
  `).run(userId, conceptId);
  db.prepare(`
    DELETE FROM student_activity_events WHERE id IN (
      SELECT id FROM student_activity_events WHERE user_id = ?
      ORDER BY datetime(created_at) DESC LIMIT -1 OFFSET 1200
    )
  `).run(userId);
}

function pruneExtendedAttemptHistory(userId, conceptId) {
  db.prepare(`
    DELETE FROM exam_attempts WHERE id IN (
      SELECT id FROM exam_attempts WHERE user_id = ?
      ORDER BY datetime(created_at) DESC LIMIT -1 OFFSET 500
    )
  `).run(userId);
  db.prepare(`
    DELETE FROM lab_attempts WHERE id IN (
      SELECT id FROM lab_attempts WHERE user_id = ?
      ORDER BY datetime(created_at) DESC LIMIT -1 OFFSET 500
    )
  `).run(userId);
  db.prepare(`
    DELETE FROM learning_evidence WHERE id IN (
      SELECT id FROM learning_evidence WHERE user_id = ? AND concept_id = ?
      ORDER BY datetime(created_at) DESC LIMIT -1 OFFSET 150
    )
  `).run(userId, conceptId);
}

function getConceptEvidence(userId, conceptId) {
  return db.prepare(`
    SELECT activity_type AS activityType, score, difficulty, confidence,
      created_at AS occurredAt, misconception_id AS misconceptionId
    FROM learning_evidence
    WHERE user_id = ? AND concept_id = ?
    ORDER BY datetime(created_at)
  `).all(userId, conceptId);
}

function getLearningDashboard(user, durationMinutes = 15) {
  const accessibleDecks = listRevisionDecks(user).filter((deck) => !deck.locked);
  const allowedDeckIds = new Set(accessibleDecks.map((deck) => deck.id));
  const schedules = db.prepare(`
    SELECT review_schedules.*
    FROM review_schedules
    WHERE review_schedules.user_id = ?
    ORDER BY datetime(review_schedules.next_review_at)
  `).all(user.id).filter((row) => allowedDeckIds.has(row.deck_id));

  const scheduledByConcept = new Map(schedules.map((row) => [row.concept_id, row]));
  const cards = accessibleDecks.flatMap((deck) => db.prepare(`
    SELECT flashcards.*, flashcard_decks.code, flashcard_decks.title
    FROM flashcards JOIN flashcard_decks ON flashcard_decks.id = flashcards.deck_id
    WHERE flashcards.deck_id = ? ORDER BY flashcards.position
  `).all(deck.id));
  const evidenceByConcept = new Map();
  db.prepare(`
    SELECT concept_id, activity_type AS activityType, score, difficulty, confidence,
      created_at AS occurredAt, misconception_id AS misconceptionId
    FROM learning_evidence
    WHERE user_id = ?
    ORDER BY datetime(created_at)
  `).all(user.id).forEach((entry) => {
    const entries = evidenceByConcept.get(entry.concept_id) || [];
    entries.push(entry);
    evidenceByConcept.set(entry.concept_id, entries);
  });

  const items = cards.map((card) => {
    const conceptId = `${card.deck_id}:${card.card_key}`;
    const schedule = scheduledByConcept.get(conceptId);
    const evidence = evidenceByConcept.get(conceptId) || [];
    const mastery = calculateMastery(evidence);
    return {
      conceptId,
      cardId: card.id,
      deckId: card.deck_id,
      topicId: card.deck_id,
      code: card.code,
      topicTitle: card.title,
      prompt: card.front,
      answer: card.back,
      category: card.category,
      nextReviewAt: schedule?.next_review_at || null,
      due: !schedule || new Date(schedule.next_review_at).getTime() <= Date.now(),
      memoryState: schedule
        ? {
            difficulty: schedule.difficulty,
            stabilityDays: schedule.stability_days,
            lastReviewAt: schedule.last_review_at,
            nextReviewAt: schedule.next_review_at,
            successfulRetrievals: schedule.successful_retrievals,
            lapses: schedule.lapses,
          }
        : {},
      mastery,
    };
  });
  const session = buildAdaptiveSession({ items, durationMinutes });
  const mistakes = db.prepare(`
    SELECT mistake_journal.*, flashcards.front, flashcard_decks.code, flashcard_decks.title
    FROM mistake_journal
    LEFT JOIN flashcards ON flashcards.id = mistake_journal.card_id
    LEFT JOIN flashcard_decks ON flashcard_decks.id = mistake_journal.deck_id
    WHERE mistake_journal.user_id = ? AND mistake_journal.corrected_at IS NULL
    ORDER BY datetime(mistake_journal.updated_at) DESC LIMIT 20
  `).all(user.id).filter((row) => allowedDeckIds.has(row.deck_id));
  const started = items.filter((item) => item.mastery.evidenceCount > 0);

  return {
    summary: {
      conceptsAvailable: items.length,
      conceptsStarted: started.length,
      conceptsSecure: started.filter((item) => item.mastery.state === "Secure").length,
      conceptsDue: session.items.filter((item) => item.due).length,
      mistakesToRepair: mistakes.length,
      evidenceCount: started.reduce((total, item) => total + item.mastery.evidenceCount, 0),
    },
    session,
    topics: accessibleDecks.map((deck) => {
      const topicItems = items.filter((item) => item.deckId === deck.id);
      const topicEvidence = topicItems.filter((item) => item.mastery.evidenceCount > 0);
      return {
        id: deck.id,
        code: deck.code,
        title: deck.title,
        state: topicEvidence.length ? calculateTopicLearningState(topicEvidence) : "New",
        evidenceScore: topicEvidence.length
          ? Math.round(topicEvidence.reduce((sum, item) => sum + item.mastery.score, 0) / topicEvidence.length)
          : 0,
        conceptsDue: topicItems.filter((item) => item.due).length,
        lastPractisedAt: topicEvidence.map((item) => item.mastery.lastPractisedAt).filter(Boolean).sort().at(-1) || null,
      };
    }),
    mistakes,
  };
}

function calculateTopicLearningState(items) {
  if (items.some((item) => item.mastery.state === "Misconception detected")) return "Misconception detected";
  if (items.some((item) => item.due)) return "Due for review";
  const average = items.reduce((sum, item) => sum + item.mastery.score, 0) / items.length;
  if (average >= 78 && items.some((item) => item.mastery.state === "Secure")) return "Secure";
  if (average >= 52) return "Fragile";
  return "Learning";
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
  db.prepare(`
    DELETE FROM student_activity_events WHERE id IN (
      SELECT id FROM student_activity_events WHERE user_id = ?
      ORDER BY datetime(created_at) DESC LIMIT -1 OFFSET 1200
    )
  `).run(userId);
}

function getRevisionRecommendations(userId, classId = null) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return [];
  const deckSummaries = listRevisionDecks(user, classId).filter((deck) => !deck.locked);
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
    SELECT sessions.token_hash AS session_token_hash,
      sessions.created_at AS session_created_at,
      sessions.expires_at AS session_expires_at,
      sessions.last_used_at AS session_last_used_at,
      users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash);

  if (!session || new Date(session.session_expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    clearSessionCookie(res);
    return res.status(401).json({ error: "Please log in again." });
  }

  req.sessionHash = tokenHash;
  req.sessionCreatedAt = session.session_created_at;
  req.user = session;
  ensureAccountProfiles(session);
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET last_accessed_at = ? WHERE id = ?").run(now, session.id);
  db.prepare("UPDATE sessions SET last_used_at = ? WHERE token_hash = ?").run(now, tokenHash);
  next();
}

function issueSession(res, userId, req = null) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, user_agent, last_used_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tokenHash,
    userId,
    expiresAt.toISOString(),
    String(req?.headers?.["user-agent"] || "").slice(0, 300) || null,
    now.toISOString(),
    now.toISOString(),
  );

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

  db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").run(userId);
  db.prepare(`
    INSERT INTO email_verification_tokens (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(tokenHash, userId, expiresAt.toISOString(), now.toISOString());

  if (hasSmtpConfig()) {
    const transport = createMailTransport();

    await transport.sendMail({
      from: getEmailFromAddress(),
      to: email,
      subject: "Verify your Neat Notes account",
      text: `Hi ${name},\n\nVerify your Neat Notes account here:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Verify your Neat Notes account here:</p><p><a href="${verificationUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    });

    return {};
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`Development verification link for ${email}: ${verificationUrl}`);
  }
  return process.env.NODE_ENV === "production" ? {} : { devVerificationUrl: verificationUrl };
}

async function sendPasswordResetEmail(user, resetUrl) {
  const transport = createMailTransport();
  await transport.sendMail({
    from: getEmailFromAddress(),
    to: user.email,
    subject: "Reset your Neat Notes password",
    text: `Hi ${user.name},\n\nReset your Neat Notes password here:\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Use the link below to reset your Neat Notes password.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`,
  });
}

async function sendContactEmail({ name, email, reason, message }) {
  const transport = createMailTransport();

  const submittedAt = new Date().toISOString();
  const subject = `Neat Notes enquiry: ${reason}`;
  const text = [
    "New Neat Notes enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Reason: ${reason}`,
    `Submitted: ${submittedAt}`,
    "",
    "Message:",
    message,
  ].join("\n");

  await transport.sendMail({
    from: getEmailFromAddress(),
    to: CONTACT_TO,
    replyTo: email,
    subject,
    text,
    html: `<h2>New Neat Notes enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
      <h3>Message</h3>
      <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`,
  });
}

function createMailTransport() {
  const settings = getSmtpSettings();
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user
      ? { user: settings.user, pass: settings.pass }
      : undefined,
  });
}

function getSmtpSettings() {
  const user = String(process.env.SMTP_USER || "").trim();
  const host = String(process.env.SMTP_HOST || inferSmtpHost(user) || "").trim();
  const port = Number(process.env.SMTP_PORT || (isGmailHost(host) ? 465 : 587));
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const rawPass = String(process.env.SMTP_PASS || "");
  const pass = isGmailHost(host) ? rawPass.replace(/\s+/g, "") : rawPass;

  return { host, port, secure, user, pass };
}

function inferSmtpHost(user) {
  return user.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : "";
}

function isGmailHost(host) {
  return String(host || "").toLowerCase().includes("gmail.com");
}

function createContactEnquiry({ name, email, reason, message }) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO contact_enquiries (id, name, email, reason, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
  `).run(id, name, email, reason, message, now, now);

  return { id, name, email, reason, message, status: "queued", created_at: now, updated_at: now };
}

function updateContactEnquiryDelivery(id, status, deliveryError = null) {
  const now = new Date().toISOString();
  const deliveredAt = status === "sent" ? now : null;
  db.prepare(`
    UPDATE contact_enquiries
    SET status = ?, delivery_error = ?, delivered_at = ?, updated_at = ?
    WHERE id = ?
  `).run(status, deliveryError, deliveredAt, now, id);
}

let contactRetryInProgress = false;

async function retryQueuedContactEnquiries(limit = 10) {
  if (contactRetryInProgress || getSmtpConfigError()) return;
  contactRetryInProgress = true;

  try {
    const enquiries = db.prepare(`
      SELECT id, name, email, reason, message
      FROM contact_enquiries
      WHERE status IN ('queued', 'delivery_failed')
      ORDER BY datetime(created_at) ASC
      LIMIT ?
    `).all(limit);

    for (const enquiry of enquiries) {
      try {
        await sendContactEmail(enquiry);
        updateContactEnquiryDelivery(enquiry.id, "sent");
        console.log("Queued contact enquiry sent:", { enquiryId: enquiry.id, to: CONTACT_TO });
      } catch (error) {
        updateContactEnquiryDelivery(enquiry.id, "delivery_failed", getEmailDeliveryErrorMessage(error));
        console.error("Queued contact enquiry delivery failed:", sanitizeMailerError(error));
      }
    }
  } finally {
    contactRetryInProgress = false;
  }
}

function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  if (!email || profile.email_verified !== true) {
    throw new Error("Google did not provide a verified email address.");
  }
  const now = new Date().toISOString();
  const existingByGoogle = db.prepare("SELECT * FROM users WHERE google_id = ?").get(profile.sub);
  if (existingByGoogle) {
    ensureAccountProfiles(existingByGoogle);
    return existingByGoogle;
  }

  const existingByEmail = getUserByEmail(email);
  if (existingByEmail) {
    const wasUnverified = !existingByEmail.email_verified;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(`
        UPDATE users
        SET google_id = ?,
          email_verified = 1,
          password_hash = CASE WHEN ? THEN NULL ELSE password_hash END,
          password_salt = CASE WHEN ? THEN NULL ELSE password_salt END,
          updated_at = ?
        WHERE id = ?
      `).run(profile.sub, wasUnverified ? 1 : 0, wasUnverified ? 1 : 0, now, existingByEmail.id);
      if (wasUnverified) {
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existingByEmail.id);
        db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").run(existingByEmail.id);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
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

  if (!membership || (membership.role !== "owner" && !ownerHasWorkspaceCollaboration(req.params.id))) {
    res.status(403).json({ error: "You do not have access to that workspace." });
    return null;
  }

  return membership;
}

function getWorkspace(workspaceId) {
  return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId);
}

function isWorkspaceMember(workspaceId, userId) {
  const membership = db.prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, userId);
  return Boolean(membership && (membership.role === "owner" || ownerHasWorkspaceCollaboration(workspaceId)));
}

function getAccessibleNote(noteId, userId) {
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(noteId);
  return note && isWorkspaceMember(note.workspace_id, userId) ? note : null;
}

function ownerHasWorkspaceCollaboration(workspaceId) {
  const owner = db.prepare(`
    SELECT users.*
    FROM workspaces
    JOIN users ON users.id = workspaces.owner_id
    WHERE workspaces.id = ?
  `).get(workspaceId);
  return Boolean(owner && hasFeature(owner, "collaboration"));
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

  const versions = db.prepare(`
    SELECT id, length(CAST(body AS BLOB)) AS body_bytes
    FROM note_versions
    WHERE note_id = ?
    ORDER BY datetime(created_at) DESC
  `).all(note.id);
  let retainedBytes = 0;
  const expiredIds = [];
  versions.forEach((version, index) => {
    retainedBytes += Number(version.body_bytes || 0);
    if (index >= MAX_NOTE_VERSIONS || retainedBytes > MAX_NOTE_VERSION_BYTES) {
      expiredIds.push(version.id);
    }
  });
  const deleteVersion = db.prepare("DELETE FROM note_versions WHERE id = ?");
  expiredIds.forEach((id) => deleteVersion.run(id));
}

function isNoteBodyWithinLimit(body) {
  return Buffer.byteLength(String(body || ""), "utf8") <= MAX_NOTE_BODY_BYTES;
}

function countUserNotes(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM notes WHERE owner_id = ?").get(userId).count;
}

function countOwnedWorkspaces(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM workspaces WHERE owner_id = ?").get(userId).count;
}

function normalizePlanId(plan) {
  const normalized = String(plan || "").trim().toLowerCase();
  if (normalized === "plus") return "pro";
  return PLAN_CATALOG[normalized] ? normalized : "free";
}

function getPlan(user) {
  const planId = normalizePlanId(user?.plan);
  if (planId !== "free" && !["active", "trialing"].includes(String(user?.plan_status || user?.subscription_status || ""))) {
    return PLAN_CATALOG.free;
  }
  return PLAN_CATALOG[planId] || PLAN_CATALOG.free;
}

function hasFeature(user, feature) {
  return Boolean(getPlan(user).features[feature]);
}

function getPlanFromStripePrice(priceId) {
  return Object.entries(STRIPE_PRICE_IDS).find(([, value]) => value && value === priceId)?.[0] || "free";
}

function getPlanFromStripeSubscription(subscription) {
  const plans = (subscription?.items?.data || [])
    .map((item) => getPlanFromStripePrice(item?.price?.id || ""))
    .filter((plan) => plan !== "free");
  return ["institution", "teacher", "pro"].find((plan) => plans.includes(plan)) || "free";
}

async function ensureStripeCustomer(user) {
  if (user.stripe_customer_id) return user;
  if (!stripe) throw new Error("Stripe is not configured.");

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user.id,
    },
  });
  db.prepare("UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?")
    .run(customer.id, new Date().toISOString(), user.id);
  return { ...user, stripe_customer_id: customer.id };
}

function applyUserPlan(userId, plan, subscriptionStatus = "active", subscriptionId = null, currentPeriodEnd = null) {
  const planId = normalizePlanId(plan);
  const now = new Date().toISOString();
  const role = ["teacher", "institution"].includes(planId) ? "teacher" : "student";
  const planStatus = ["active", "trialing"].includes(subscriptionStatus) ? "active" : subscriptionStatus || "inactive";

  db.prepare(`
    UPDATE users
    SET plan = ?,
      plan_status = ?,
      plan_updated_at = ?,
      role = ?,
      stripe_subscription_id = COALESCE(?, stripe_subscription_id),
      subscription_status = ?,
      subscription_current_period_end = ?,
      updated_at = ?
    WHERE id = ?
  `).run(planId, planStatus, now, role, subscriptionId, subscriptionStatus, currentPeriodEnd, now, userId);

  const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  ensureAccountProfiles(updatedUser);
  return updatedUser;
}

function normalizeWorkspaceKind(kind) {
  const normalized = String(kind || "").trim().toLowerCase();
  return ["personal", "project", "classroom"].includes(normalized) ? normalized : "project";
}

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
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
    subscriptionStatus: user.subscription_status || null,
    subscriptionCurrentPeriodEnd: user.subscription_current_period_end || null,
    freeRevisionDeckId: user.free_revision_deck_id || null,
    freeRevisionDeckLimit: FREE_REVISION_DECK_LIMIT,
    billingPortalReady: Boolean(user.stripe_customer_id && stripe),
    entitlements: plan,
    emailVerified: Boolean(user.email_verified),
  };
}

function hasSmtpConfig() {
  return !getSmtpConfigError();
}

function getSmtpConfigError() {
  const settings = getSmtpSettings();

  if (!settings.host) {
    return "Email delivery is not configured on the server yet. Add SMTP settings in Render and try again.";
  }

  if (settings.user && !settings.pass) {
    return "SMTP is missing its password or app password. Add SMTP_PASS in Render, then try again.";
  }

  if (isGmailHost(settings.host) && (!settings.user || !settings.pass)) {
    return "Gmail SMTP needs SMTP_USER and a Google app password in SMTP_PASS.";
  }

  if (settings.user.toLowerCase() === "resend" && !process.env.EMAIL_FROM) {
    return "EMAIL_FROM must be set to a verified sender address when using Resend SMTP.";
  }

  return "";
}

function getEmailFromAddress() {
  const settings = getSmtpSettings();

  if (isGmailHost(settings.host) && settings.user.includes("@")) {
    return `Neat Notes <${settings.user}>`;
  }

  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }

  if (settings.user.includes("@")) {
    return `Neat Notes <${settings.user}>`;
  }

  return "Neat Notes <no-reply@localhost>";
}

function getEmailDeliveryErrorMessage(error) {
  const detail = process.env.NODE_ENV === "production" ? "" : ` (${error.message})`;
  return `We could not send the enquiry email from the server. Check the SMTP provider, SMTP_PASS/app password, and EMAIL_FROM settings in Render, then try again.${detail}`;
}

function sanitizeMailerError(error) {
  return {
    message: error.message,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response: error.response,
  };
}

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function isStripeConfigured() {
  return Boolean(stripe && STRIPE_PRICE_IDS.pro && STRIPE_PRICE_IDS.teacher);
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
