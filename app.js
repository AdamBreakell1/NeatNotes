const SETTINGS_KEY = "neat-notes-settings";
const THEME_KEY = "neat-notes-theme";
const GUEST_WORKSPACE_KEY = "neat-notes-guest-workspace";
const REVISION_BADGES_KEY = "neat-notes-revision-badges";
const STUDY_HISTORY_KEY = "neat-notes-study-history";
const NEAT_QUIZ_PROGRESS_KEY = "neat-notes-quiz-progress";
const CARD_ATTEMPTS_KEY = "neat-notes-card-attempts";
const ACTIVITY_EVENTS_KEY = "neat-notes-activity-events";
const CLASS_GROUPS_KEY = "neat-notes-class-groups";
const CLASS_MEMBERSHIPS_KEY = "neat-notes-class-memberships";
const ACTIVE_STUDENT_CLASS_KEY = "neat-notes-active-student-class";
const CENTRES_KEY = "neat-notes-centres";
const LEARNING_MODE_KEY = "neat-notes-learning-mode";
const CONTACT_EMAIL = "hello@breakellsystems.co.uk";
const DAILY_REVIEW_GOAL = 10;
const MIN_LAUNCH_OVERLAY_MS = 2100;
const launchOverlayStartedAt = performance.now();
const TOPBAR_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const TOPBAR_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const BADGE_BLUEPRINTS = [
  { mark: "CPU", a: "#06b6d4", b: "#0f766e", c: "#102a43" },
  { mark: "PROC", a: "#a855f7", b: "#2563eb", c: "#21114b" },
  { mark: "I/O", a: "#f97316", b: "#ef4444", c: "#3d1607" },
  { mark: "OS", a: "#22c55e", b: "#14b8a6", c: "#073b2d" },
  { mark: "APP", a: "#facc15", b: "#f59e0b", c: "#3a2600" },
  { mark: "DEV", a: "#38bdf8", b: "#6366f1", c: "#101f56" },
  { mark: "LANG", a: "#f97316", b: "#d946ef", c: "#3b102f" },
  { mark: "HASH", a: "#fb7185", b: "#c026d3", c: "#3b102f" },
  { mark: "DB", a: "#34d399", b: "#059669", c: "#053525" },
  { mark: "NET", a: "#60a5fa", b: "#0ea5e9", c: "#082f49" },
  { mark: "WEB", a: "#f43f5e", b: "#7c3aed", c: "#351132" },
  { mark: "TYPE", a: "#fb923c", b: "#0284c7", c: "#102a43" },
  { mark: "DS", a: "#2dd4bf", b: "#84cc16", c: "#12331d" },
  { mark: "BOOL", a: "#e879f9", b: "#7c3aed", c: "#27113f" },
  { mark: "LAW", a: "#f472b6", b: "#ec4899", c: "#3b0a2a" },
  { mark: "ETH", a: "#818cf8", b: "#4f46e5", c: "#17113f" },
];
const DEFAULT_SETTINGS = {
  theme: localStorage.getItem(THEME_KEY) || "system",
  density: "default",
  editorFontSize: "16",
  defaultTag: "inbox",
};

let currentUser = null;
let appSettings = loadSettings();
let plans = {};
let workspaces = [];
let members = [];
let notes = [];
let activeWorkspaceId = null;
let activeTag = "all";
let selectedId = null;
let saveTimer = null;
let isGuestMode = true;
let activeAppSection = "notes";
let activeRevisionTopicId = "cs-1-1-1";
let revisionCardOrder = {};
let earnedRevisionBadges = loadRevisionBadges();
let studyHistory = loadStudyHistory();
const flippedRevisionCards = new Set();
const completedRevisionCards = new Set();
const generatedCardFlips = new Set();
let generatedNoteCards = [];
let revisionAutoResetTimer = null;
let neatQuizProgress = loadNeatQuizProgress();
let neatQuizState = createEmptyNeatQuizState();
let cardAttempts = loadLocalArray(CARD_ATTEMPTS_KEY);
let activityEvents = loadLocalArray(ACTIVITY_EVENTS_KEY);
let classGroups = loadLocalArray(CLASS_GROUPS_KEY);
let classMemberships = loadLocalArray(CLASS_MEMBERSHIPS_KEY);
let centres = loadLocalArray(CENTRES_KEY);
let activeLearningMode = localStorage.getItem(LEARNING_MODE_KEY) === "teacher" ? "teacher" : "student";
let activeTeacherSection = "dashboard";
let activeClassId = classGroups[0]?.id || null;
let activeStudentClassId = localStorage.getItem(ACTIVE_STUDENT_CLASS_KEY) || null;
let activeCentreId = centres[0]?.id || null;
let revisionSession = createRevisionSession(activeRevisionTopicId);
let revisionReviewMode = null;
let studentClassJoinMessage = { text: "", type: "" };
let studentClassCodeDraft = "";

const REVISION_TOPICS = window.REVISION_TOPICS || [];
const NEAT_QUESTIONS = window.NEAT_QUESTIONS || [];

const elements = {
  activeFolderLabel: document.querySelector("#active-folder-label"),
  allCount: document.querySelector("#all-count"),
  appView: document.querySelector("#app-view"),
  accountStatus: document.querySelector("#account-status"),
  authMessage: document.querySelector("#auth-message"),
  authView: document.querySelector("#auth-view"),
  authCardTitle: document.querySelector("#auth-card-title"),
  autoTitle: document.querySelector("#auto-title"),
  achievementBadge: document.querySelector("#achievement-badge"),
  achievementCollectionButton: document.querySelector("#achievement-view-badges-button"),
  achievementModal: document.querySelector("#achievement-modal"),
  achievementText: document.querySelector("#achievement-text"),
  achievementTitle: document.querySelector("#achievement-title"),
  badgeCollectionGrid: document.querySelector("#badge-collection-grid"),
  badgeCollectionSummary: document.querySelector("#badge-collection-summary"),
  badgeCount: document.querySelector("#badge-count"),
  badgeCourseBar: document.querySelector("#badge-course-bar"),
  badgeCourseCount: document.querySelector("#badge-course-count"),
  badgeCoursePercent: document.querySelector("#badge-course-percent"),
  badgeModal: document.querySelector("#badge-modal"),
  badgeProgressBar: document.querySelector("#badge-progress-bar"),
  badgeProgressLabel: document.querySelector("#badge-progress-label"),
  badgeProgressPercent: document.querySelector("#badge-progress-percent"),
  dashboardButton: document.querySelector("#dashboard-button"),
  deleteButton: document.querySelector("#delete-note-button"),
  exportPdfButton: document.querySelector("#export-pdf-button"),
  editorPanel: document.querySelector(".editor"),
  formattedPreview: document.querySelector("#formatted-preview"),
  formatToolbar: document.querySelector(".format-toolbar"),
  historyButton: document.querySelector("#history-button"),
  insightsPanel: document.querySelector("#insights-panel"),
  launchOverlay: document.querySelector("#launch-overlay"),
  loginForm: document.querySelector("#login-form"),
  loginPassword: document.querySelector("#login-password"),
  loginSubmitButton: document.querySelector("#login-submit-button"),
  loginCapsWarning: document.querySelector("#login-caps-warning"),
  logoutButton: document.querySelector("#logout-button"),
  memberList: document.querySelector("#member-list"),
  neatQuestionsCount: document.querySelector("#neat-questions-count"),
  neatQuestionsCurrentLink: document.querySelector("#neat-questions-current-link"),
  neatQuestionsGrid: document.querySelector("#neat-questions-grid"),
  neatQuizPanel: document.querySelector("#neat-quiz-panel"),
  learningModeSwitch: document.querySelector("#learning-mode-switch"),
  newButton: document.querySelector("#new-note-button"),
  notesSidebarContext: document.querySelector("#notes-sidebar-context"),
  noteBody: document.querySelector("#note-body"),
  noteCount: document.querySelector("#note-count"),
  noteDate: document.querySelector("#note-date"),
  notesColumn: document.querySelector(".notes-column"),
  notesList: document.querySelector("#notes-list"),
  closePlansButton: document.querySelector("#close-plans-button"),
  closeAuthButton: document.querySelector("#close-auth-button"),
  closeAchievementButton: document.querySelector("#close-achievement-button"),
  closeBadgesButton: document.querySelector("#close-badges-button"),
  contactEmail: document.querySelector("#contact-email"),
  contactForm: document.querySelector("#contact-form"),
  contactMessage: document.querySelector("#contact-message"),
  contactMessageCounter: document.querySelector("#contact-message-counter"),
  contactName: document.querySelector("#contact-name"),
  contactReason: document.querySelector("#contact-reason"),
  contactStatus: document.querySelector("#contact-status"),
  contactView: document.querySelector("#contact-view"),
  dailyGoalBar: document.querySelector("#daily-goal-bar"),
  dailyGoalCount: document.querySelector("#daily-goal-count"),
  dailyMissionCopy: document.querySelector("#daily-mission-copy"),
  dailyStreakLabel: document.querySelector("#daily-streak-label"),
  openBadgesButton: document.querySelector("#open-badges-button"),
  openPlansButton: document.querySelector("#open-plans-button"),
  pricingModal: document.querySelector("#pricing-modal"),
  revisionCardGrid: document.querySelector("#revision-card-grid"),
  revisionContinueButton: document.querySelector("#revision-continue-button"),
  revisionMasteryCopy: document.querySelector("#revision-mastery-copy"),
  revisionMasteryStat: document.querySelector("#revision-mastery-stat"),
  revisionProgressLabel: document.querySelector("#revision-progress-label"),
  revisionProgressPercent: document.querySelector("#revision-progress-percent"),
  revisionProgressJumpButton: document.querySelector("#revision-progress-jump-button"),
  revisionProgressSection: document.querySelector("#revision-progress-section"),
  revisionProgressRing: document.querySelector("#revision-progress-ring"),
  revisionBadgesButton: document.querySelector("#revision-badges-button"),
  revisionCourseBar: document.querySelector("#revision-course-bar"),
  revisionCourseLabel: document.querySelector("#revision-course-label"),
  revisionCoursePercent: document.querySelector("#revision-course-percent"),
  revisionResetButton: document.querySelector("#reset-revision-button"),
  revisionShuffleButton: document.querySelector("#shuffle-revision-button"),
  revisionMasteryMap: document.querySelector("#revision-mastery-map"),
  revisionRecommendedMeta: document.querySelector("#revision-recommended-meta"),
  revisionRecommendedNext: document.querySelector("#revision-recommended-next"),
  revisionTodayCopy: document.querySelector("#revision-today-copy"),
  revisionTodayStat: document.querySelector("#revision-today-stat"),
  revisionTopicCode: document.querySelector("#revision-topic-code"),
  revisionTopicList: document.querySelector("#revision-topic-list"),
  revisionTopicSummary: document.querySelector("#revision-topic-summary"),
  revisionTopicTitle: document.querySelector("#revision-topic-title"),
  revisionView: document.querySelector("#revision-view"),
  revisionWeakTopic: document.querySelector("#revision-weak-topic"),
  quickPracticeSection: document.querySelector("#quick-practice-section"),
  recentNoteList: document.querySelector("#recent-note-list"),
  saveState: document.querySelector("#save-state"),
  searchInput: document.querySelector("#search-input"),
  closeSettingsButton: document.querySelector("#close-settings-button"),
  downloadDataButton: document.querySelector("#download-data-button"),
  resetPreferencesButton: document.querySelector("#reset-preferences-button"),
  settingsButton: document.querySelector("#settings-button"),
  settingsDensity: document.querySelector("#settings-density"),
  settingsDefaultTag: document.querySelector("#settings-default-tag"),
  settingsEditorFont: document.querySelector("#settings-editor-font"),
  settingsMessage: document.querySelector("#settings-message"),
  settingsModal: document.querySelector("#settings-modal"),
  settingsTabs: document.querySelector(".settings-tabs"),
  shareEmail: document.querySelector("#share-email"),
  shareForm: document.querySelector("#share-form"),
  showLogin: document.querySelector("#show-login"),
  showSignup: document.querySelector("#show-signup"),
  signupForm: document.querySelector("#signup-form"),
  signupPassword: document.querySelector("#signup-password"),
  signupSubmitButton: document.querySelector("#signup-submit-button"),
  signupPasswordError: document.querySelector("#signup-password-error"),
  signupCapsWarning: document.querySelector("#signup-caps-warning"),
  guestAccountActions: document.querySelector("#guest-account-actions"),
  signedInAccountActions: document.querySelector("#signed-in-account-actions"),
  instantCardsButton: document.querySelector("#instant-cards-button"),
  studyPackButton: document.querySelector("#study-pack-button"),
  startDailyReviewButton: document.querySelector("#start-daily-review-button"),
  studentClassPanel: document.querySelector("#student-class-panel"),
  studyPane: document.querySelector(".study-pane"),
  summaryText: document.querySelector("#summary-text"),
  tagInput: document.querySelector("#tag-input"),
  tagList: document.querySelector("#tag-list"),
  teacherModePanel: document.querySelector("#teacher-mode-panel"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeChoiceGroup: document.querySelector("#theme-choice-group"),
  topbarLoginButton: document.querySelector("#topbar-login-button"),
  topbarLogoutButton: document.querySelector("#topbar-logout-button"),
  topbarSignupButton: document.querySelector("#topbar-signup-button"),
  topbarDate: document.querySelector("#topbar-date"),
  topbarSectionSwitch: document.querySelector(".topbar-section-switch"),
  topbarTime: document.querySelector("#topbar-time"),
  topbarUtilities: document.querySelector(".topbar-utilities"),
  topbarUserLabel: document.querySelector("#topbar-user-label"),
  upgradeMessage: document.querySelector("#upgrade-message"),
  userEmail: document.querySelector("#user-email"),
  userName: document.querySelector("#user-name"),
  userPlanLabel: document.querySelector("#user-plan-label"),
  workspaceCount: document.querySelector("#workspace-count"),
  workspaceForm: document.querySelector("#workspace-form"),
  workspaceKind: document.querySelector("#workspace-kind"),
  workspaceList: document.querySelector("#workspace-list"),
  workspaceMessage: document.querySelector("#workspace-message"),
  workspaceName: document.querySelector("#workspace-name"),
  workspaceTitle: document.querySelector("#workspace-title"),
};

elements.showLogin.addEventListener("click", () => setAuthMode("login"));
elements.showSignup.addEventListener("click", () => setAuthMode("signup"));
elements.loginForm.addEventListener("submit", login);
elements.signupForm.addEventListener("submit", signup);
document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", togglePasswordVisibility);
});
[elements.loginPassword, elements.signupPassword].forEach((input) => {
  input.addEventListener("keydown", updateCapsLockWarning);
  input.addEventListener("keyup", updateCapsLockWarning);
  input.addEventListener("blur", hideCapsLockWarning);
  input.addEventListener("input", clearAuthMessageOnInput);
});
elements.signupPassword.addEventListener("input", () => validateSignupPassword(false));
elements.loginForm.addEventListener("input", clearAuthMessageOnInput);
elements.signupForm.addEventListener("input", clearAuthMessageOnInput);
elements.logoutButton.addEventListener("click", logout);
elements.topbarLoginButton.addEventListener("click", () => openAuthModal("login"));
elements.topbarSignupButton.addEventListener("click", () => openAuthModal("signup"));
elements.topbarLogoutButton.addEventListener("click", logout);
elements.closeAuthButton.addEventListener("click", closeAuthModal);
elements.authView.addEventListener("click", handleAuthModalClick);
elements.workspaceForm.addEventListener("submit", createWorkspace);
elements.shareForm.addEventListener("submit", addCollaborator);
elements.openPlansButton.addEventListener("click", openPlansModal);
elements.closePlansButton.addEventListener("click", closePlansModal);
elements.pricingModal.addEventListener("click", handlePricingModalClick);
elements.openBadgesButton.addEventListener("click", openBadgeModal);
elements.revisionBadgesButton.addEventListener("click", openBadgeModal);
elements.closeBadgesButton.addEventListener("click", closeBadgeModal);
elements.badgeModal.addEventListener("click", handleBadgeModalClick);
elements.closeAchievementButton.addEventListener("click", closeAchievementModal);
elements.achievementCollectionButton.addEventListener("click", () => {
  closeAchievementModal();
  openBadgeModal();
});
elements.achievementModal.addEventListener("click", handleAchievementModalClick);
elements.settingsButton.addEventListener("click", openSettingsModal);
elements.closeSettingsButton.addEventListener("click", closeSettingsModal);
elements.settingsModal.addEventListener("click", handleSettingsModalClick);
elements.settingsTabs.addEventListener("click", switchSettingsTab);
elements.themeChoiceGroup.addEventListener("click", chooseTheme);
elements.settingsDensity.addEventListener("change", updateSettingsFromControls);
elements.settingsEditorFont.addEventListener("change", updateSettingsFromControls);
elements.settingsDefaultTag.addEventListener("input", updateSettingsFromControls);
elements.downloadDataButton.addEventListener("click", downloadWorkspaceData);
elements.resetPreferencesButton.addEventListener("click", resetLocalPreferences);
document.addEventListener("keydown", handleGlobalKeydown);
elements.themeToggle.addEventListener("click", toggleTheme);
elements.topbarSectionSwitch.addEventListener("click", switchAppSection);
elements.topbarUtilities.addEventListener("click", switchAppSection);
elements.startDailyReviewButton.addEventListener("click", startDailyReview);
elements.instantCardsButton.addEventListener("click", showInstantCards);
elements.insightsPanel.addEventListener("click", handleInsightsPanelClick);
elements.revisionCardGrid.addEventListener("click", flipRevisionCard);
elements.revisionCardGrid.addEventListener("keydown", handleRevisionCardKeydown);
elements.learningModeSwitch.addEventListener("click", switchLearningMode);
elements.studentClassPanel.addEventListener("click", handleStudentClassPanelClick);
elements.studentClassPanel.addEventListener("submit", handleStudentClassPanelSubmit);
elements.studentClassPanel.addEventListener("change", handleStudentClassPanelChange);
elements.teacherModePanel.addEventListener("click", handleTeacherModeClick);
elements.teacherModePanel.addEventListener("submit", handleTeacherModeSubmit);
elements.teacherModePanel.addEventListener("change", handleTeacherModeChange);
elements.revisionTopicList.addEventListener("click", selectRevisionTopic);
elements.revisionMasteryMap.addEventListener("click", handleMasteryMapClick);
elements.revisionResetButton.addEventListener("click", resetActiveRevisionCards);
elements.revisionShuffleButton.addEventListener("click", shuffleActiveRevisionCards);
elements.revisionContinueButton.addEventListener("click", continueRevisionJourney);
elements.revisionProgressJumpButton.addEventListener("click", scrollToRevisionProgress);
elements.neatQuestionsCurrentLink.addEventListener("click", startActiveTopicQuiz);
elements.neatQuestionsGrid.addEventListener("click", handleNeatQuestionsClick);
elements.neatQuizPanel.addEventListener("click", handleNeatQuizPanelClick);
elements.newButton.addEventListener("click", () => {
  setAppSection("notes");
  createNote();
});
elements.deleteButton.addEventListener("click", deleteSelectedNote);
elements.studyPackButton.addEventListener("click", showStudyPack);
elements.exportPdfButton.addEventListener("click", exportSelectedPdf);
elements.historyButton.addEventListener("click", showVersionHistory);
elements.dashboardButton.addEventListener("click", showTeacherDashboard);
elements.formatToolbar.addEventListener("click", applyFormattingAction);
elements.noteBody.addEventListener("input", updateActiveNote);
elements.noteBody.addEventListener("keydown", handleEditorKeydown);
elements.tagInput.addEventListener("input", updateActiveNote);
elements.searchInput.addEventListener("input", renderNotesAndFolders);
elements.notesSidebarContext.addEventListener("click", handleNotesSidebarClick);
elements.studyPane.addEventListener("click", handleStudyPaneClick);
elements.contactForm.addEventListener("submit", sendContactMessage);
elements.contactMessage.addEventListener("input", updateContactMessageCounter);
elements.contactView.addEventListener("click", handleContactRouteClick);

applySettings();
syncThemeToggle();
renderTopbarClock();
window.setInterval(renderTopbarClock, 1000);
renderSettingsControls();
renderAchievementSummary();
renderDailyStudyPanel();
renderRevisionPage();
setAppSection(activeAppSection);

boot();

function switchAppSection(event) {
  const button = event.target.closest("[data-app-section]");
  if (!button) return;

  setAppSection(button.dataset.appSection);
}

function setAppSection(section) {
  activeAppSection = ["revision", "contact"].includes(section) ? section : "notes";
  const isNotes = activeAppSection === "notes";
  const isRevision = activeAppSection === "revision";
  const isContact = activeAppSection === "contact";

  elements.notesColumn.hidden = !isNotes;
  elements.editorPanel.hidden = !isNotes;
  elements.revisionView.hidden = !isRevision;
  elements.contactView.hidden = !isContact;
  elements.notesSidebarContext.hidden = !isNotes;
  elements.appView.classList.toggle("notes-mode", isNotes);
  elements.appView.classList.toggle("revision-mode", isRevision);
  elements.appView.classList.toggle("contact-mode", isContact);

  document.querySelectorAll("[data-app-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appSection === activeAppSection);
  });

  if (isRevision) {
    recordActivityEvent({ type: "revision_started", topicId: activeRevisionTopicId });
    renderRevisionPage();
  }

  if (isContact) {
    renderContactPage();
  }
}

function renderTopbarClock() {
  const now = new Date();
  elements.topbarTime.textContent = TOPBAR_TIME_FORMATTER.format(now);
  elements.topbarDate.textContent = TOPBAR_DATE_FORMATTER.format(now);
  elements.topbarTime.dateTime = now.toISOString();
  elements.topbarDate.dateTime = now.toISOString().slice(0, 10);
}

function renderDailyStudyPanel() {
  const today = getTodayStudyStats();
  const streak = getStudyStreak();
  const recommendedTopic = getRecommendedRevisionTopic();
  const progress = Math.min(100, Math.round((today.cards / DAILY_REVIEW_GOAL) * 100));
  const remaining = Math.max(0, DAILY_REVIEW_GOAL - today.cards);

  elements.dailyGoalCount.textContent = `${today.cards} / ${DAILY_REVIEW_GOAL}`;
  elements.dailyGoalBar.style.width = `${progress}%`;
  elements.dailyStreakLabel.textContent = `${streak} day${streak === 1 ? "" : "s"} streak`;

  if (today.cards >= DAILY_REVIEW_GOAL) {
    elements.dailyMissionCopy.textContent = "Daily mission complete. Push on for bonus mastery or bank the win.";
    elements.startDailyReviewButton.textContent = "Continue reviewing";
    return;
  }

  elements.dailyMissionCopy.textContent = recommendedTopic
    ? `Recommended next: ${recommendedTopic.code} ${recommendedTopic.title}. ${remaining} cards to complete today's mission.`
    : `Complete ${remaining} cards to build today's study streak.`;
  elements.startDailyReviewButton.textContent = today.cards ? "Resume today's review" : "Start today's review";
}

function loadStudyHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || "{}");
    return history && typeof history === "object" && !Array.isArray(history) ? history : {};
  } catch {
    return {};
  }
}

function saveStudyHistory() {
  localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(studyHistory));
}

function loadNeatQuizProgress() {
  try {
    const progress = JSON.parse(localStorage.getItem(NEAT_QUIZ_PROGRESS_KEY) || "{}");
    return progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  } catch {
    return {};
  }
}

function saveNeatQuizProgress() {
  localStorage.setItem(NEAT_QUIZ_PROGRESS_KEY, JSON.stringify(neatQuizProgress));
}

function loadLocalArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createRevisionSession(topicId, mode = "full", cardIds = null) {
  return {
    id: createLocalId("session"),
    topicId,
    mode,
    cardIds,
    startedAt: new Date().toISOString(),
  };
}

function startRevisionSession(topicId, mode = "full", cardIds = null) {
  revisionSession = createRevisionSession(topicId, mode, cardIds);
  revisionReviewMode = mode === "weak" ? { topicId, cardIds: cardIds || [] } : null;
  recordActivityEvent({ type: "revision_started", topicId });
}

function recordCardAttempt(cardId, topicId, confidence, options = {}) {
  const classId = options.classId || getActiveRevisionClassId();
  const attempt = {
    id: createLocalId("attempt"),
    userId: currentUser?.id,
    cardId,
    topicId,
    deckId: topicId,
    classId,
    assignmentId: options.assignmentId,
    confidence,
    revealedAnswer: true,
    responseTimeMs: options.responseTimeMs,
    quizCorrect: options.quizCorrect,
    source: options.source || "flashcard",
    sessionId: revisionSession?.id,
    createdAt: new Date().toISOString(),
  };

  cardAttempts = [attempt, ...cardAttempts].slice(0, 1200);
  saveLocalArray(CARD_ATTEMPTS_KEY, cardAttempts);
  recordActivityEvent({ type: "card_rated", topicId, classId: attempt.classId });
  return attempt;
}

function getAttemptsByTopic(topicId, attempts = cardAttempts) {
  return attempts.filter((attempt) => attempt.topicId === topicId);
}

function getCurrentSessionAttempts(topicId = activeRevisionTopicId) {
  return cardAttempts.filter((attempt) => attempt.topicId === topicId && attempt.sessionId === revisionSession?.id);
}

function calculateTopicConfidence(attempts) {
  const totalAttempts = attempts.length;
  const confidentAttempts = attempts.filter((attempt) => attempt.confidence === "confident").length;
  const needsPracticeAttempts = attempts.filter((attempt) => attempt.confidence === "needs_practice").length;
  const percent = totalAttempts ? Math.round((confidentAttempts / totalAttempts) * 100) : 0;
  const band = getConfidenceBand(percent, totalAttempts);

  return {
    totalAttempts,
    confidentAttempts,
    needsPracticeAttempts,
    percent,
    ...band,
  };
}

function getConfidenceBand(percent, totalAttempts = 1) {
  if (!totalAttempts) {
    return {
      band: "No ratings yet",
      statusClass: "empty",
      message: "Rate cards as you revise to generate confidence insights.",
    };
  }

  if (percent >= 80) {
    return {
      band: "Secure",
      statusClass: "secure",
      message: "You are confident with most cards in this topic.",
    };
  }

  if (percent >= 60) {
    return {
      band: "Developing",
      statusClass: "developing",
      message: "You are making progress, but some cards need another review.",
    };
  }

  if (percent >= 40) {
    return {
      band: "Needs practice",
      statusClass: "needs-practice",
      message: "This topic should be revisited soon.",
    };
  }

  return {
    band: "Priority revision",
    statusClass: "priority",
    message: "This should be one of your next revision priorities.",
  };
}

function identifyWeakCards(topicId, attempts = cardAttempts) {
  const latestByCard = new Map();
  attempts
    .filter((attempt) => attempt.topicId === topicId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((attempt) => {
      if (!latestByCard.has(attempt.cardId)) {
        latestByCard.set(attempt.cardId, attempt);
      }
    });

  return [...latestByCard.values()]
    .filter((attempt) => attempt.confidence === "needs_practice")
    .map((attempt) => attempt.cardId);
}

function getTopicHistoricalConfidence(topicId) {
  return calculateTopicConfidence(getAttemptsByTopic(topicId));
}

function generateRevisionRecommendation(topicId = activeRevisionTopicId) {
  const topic = getQuizTopicById(topicId) || getActiveRevisionTopic();
  if (!topic) {
    return {
      type: "next_topic",
      title: "Start a revision topic",
      reason: "Complete a deck to receive personalised revision recommendations.",
      actionLabel: "Choose topic",
    };
  }
  const sessionConfidence = calculateTopicConfidence(getCurrentSessionAttempts(topic?.id));
  const weakCards = identifyWeakCards(topic?.id);

  if (sessionConfidence.totalAttempts && sessionConfidence.percent < 60) {
    return {
      type: "repeat_topic",
      topicId: topic.id,
      title: `Repeat ${topic.code} ${topic.title}`,
      reason: `Your current session confidence is ${sessionConfidence.percent}%, so this topic should be revisited before moving on.`,
      actionLabel: "Restart this deck",
    };
  }

  if (weakCards.length) {
    return {
      type: "weak_cards",
      topicId: topic.id,
      title: `Review ${weakCards.length} need-practice card${weakCards.length === 1 ? "" : "s"}`,
      reason: "You marked these cards as needing practice, so they are the best short review set.",
      actionLabel: "Review need-practice cards",
    };
  }

  const historicalCandidates = REVISION_TOPICS.map((candidate) => ({
    topic: candidate,
    confidence: getTopicHistoricalConfidence(candidate.id),
  })).filter((candidate) => candidate.confidence.totalAttempts >= 2);

  const lowest = historicalCandidates
    .filter((candidate) => candidate.confidence.percent < 80)
    .sort((a, b) => a.confidence.percent - b.confidence.percent)[0];

  if (lowest && lowest.topic.id !== topic.id) {
    return {
      type: "low_confidence_topic",
      topicId: lowest.topic.id,
      title: `Revise ${lowest.topic.code} ${lowest.topic.title} next`,
      reason: `Your recent confidence is ${lowest.confidence.percent}%, making it one of your lowest-confidence topics.`,
      actionLabel: `Start ${lowest.topic.code} review`,
    };
  }

  const nextTopic = getNextRevisionTopic(topic.id);
  if (nextTopic) {
    return {
      type: "next_topic",
      topicId: nextTopic.id,
      title: `Move to ${nextTopic.code} ${nextTopic.title}`,
      reason: "No lower-confidence topic is currently more urgent, so continue through the course sequence.",
      actionLabel: "Continue to next topic",
    };
  }

  return {
    type: "quiz_mode",
    topicId: topic.id,
    title: "Move into Quick Practice",
    reason: "Your flashcard confidence is strong. Use self-marking questions to check accuracy.",
    actionLabel: "Start quick practice",
  };
}

function getNextRevisionTopic(topicId) {
  const index = REVISION_TOPICS.findIndex((topic) => topic.id === topicId);
  if (index === -1) return REVISION_TOPICS[0];
  return REVISION_TOPICS[index + 1] || null;
}

function recordActivityEvent(event) {
  const revisionActivityTypes = new Set(["revision_started", "card_rated", "deck_completed"]);
  const classId = event.classId || (revisionActivityTypes.has(event.type) ? getActiveRevisionClassId() : undefined);
  const activity = {
    id: createLocalId("activity"),
    userId: currentUser?.id,
    classId,
    type: event.type,
    topicId: event.topicId,
    createdAt: new Date().toISOString(),
  };
  activityEvents = [activity, ...activityEvents].slice(0, 800);
  saveLocalArray(ACTIVITY_EVENTS_KEY, activityEvents);
}

function createEmptyNeatQuizState() {
  return {
    quizId: null,
    questions: [],
    currentIndex: 0,
    selectedIndex: null,
    answered: false,
    completed: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
  };
}

function getStudyDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayStudyStats() {
  const todayKey = getStudyDayKey();
  const today = studyHistory[todayKey] || {};
  return {
    cards: Number(today.cards) || 0,
    topics: Array.isArray(today.topics) ? today.topics : [],
  };
}

function getStudyStreak() {
  let streak = 0;
  const cursor = new Date();

  while (streak < 365) {
    const key = getStudyDayKey(cursor);
    const day = studyHistory[key];
    if (!day || !Number(day.cards)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function recordStudyCard(topic) {
  const todayKey = getStudyDayKey();
  const today = studyHistory[todayKey] || { cards: 0, topics: [] };
  const topicSet = new Set(Array.isArray(today.topics) ? today.topics : []);

  if (topic?.id) {
    topicSet.add(topic.id);
  }

  studyHistory = {
    ...studyHistory,
    [todayKey]: {
      cards: (Number(today.cards) || 0) + 1,
      topics: [...topicSet],
      updatedAt: new Date().toISOString(),
    },
  };
  saveStudyHistory();
  renderDailyStudyPanel();
}

function getRecommendedRevisionTopic() {
  const recommendation = generateRevisionRecommendation(activeRevisionTopicId);
  if (recommendation.topicId) {
    const recommendedTopic = getQuizTopicById(recommendation.topicId);
    if (recommendedTopic) return recommendedTopic;
  }

  const candidates = REVISION_TOPICS.filter((topic) => !earnedRevisionBadges[topic.id]);
  const topicPool = candidates.length ? candidates : REVISION_TOPICS;

  return topicPool
    .map((topic, index) => ({
      index,
      progress: topic.cards.length ? getCompletedRevisionCount(topic) / topic.cards.length : 1,
      topic,
    }))
    .sort((a, b) => a.progress - b.progress || a.index - b.index)[0]?.topic;
}

function startDailyReview() {
  const topic = getRecommendedRevisionTopic();
  if (topic) {
    activeRevisionTopicId = topic.id;
    startRevisionSession(topic.id);
  }

  setAppSection("revision");
  setTimeout(() => {
    elements.revisionCardGrid.querySelector("[data-card-id]")?.focus();
  }, 0);
}

function continueRevisionJourney() {
  const runningTopic = getQuizTopicById(neatQuizState.quizId);
  const recommendedTopic = getRecommendedRevisionTopic();
  const nextTopic = runningTopic && !neatQuizState.completed ? runningTopic : recommendedTopic || getActiveRevisionTopic();

  if (nextTopic?.id) {
    activeRevisionTopicId = nextTopic.id;
    startRevisionSession(nextTopic.id);
  }

  if (!runningTopic || neatQuizState.completed) {
    startNeatQuiz(nextTopic?.id);
  } else {
    renderRevisionPage();
  }

  window.setTimeout(() => {
    elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function scrollToRevisionProgress() {
  elements.revisionProgressSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAchievementSummary() {
  const totals = getRevisionAchievementTotals();
  const badgeCount = `${totals.earnedTopics} / ${totals.totalTopics}`;
  const cardCount = `${totals.earnedCards} / ${totals.totalCards}`;

  elements.badgeCount.textContent = badgeCount;
  elements.badgeProgressPercent.textContent = `${totals.percent}%`;
  elements.badgeProgressLabel.textContent = `${cardCount} cards mastered`;
  elements.badgeProgressBar.style.width = `${totals.percent}%`;

  elements.badgeCoursePercent.textContent = `${totals.percent}%`;
  elements.badgeCourseCount.textContent = cardCount;
  elements.badgeCourseBar.style.width = `${totals.percent}%`;
  elements.badgeCollectionSummary.textContent =
    totals.earnedTopics === totals.totalTopics && totals.totalTopics
      ? "Every Computer Science deck is complete. That collection is looking seriously sharp."
      : `${totals.earnedTopics} of ${totals.totalTopics} deck badges unlocked. Complete decks to fill the collection.`;

  elements.revisionCoursePercent.textContent = `${totals.percent}%`;
  elements.revisionCourseLabel.textContent = `${cardCount} cards mastered`;
  elements.revisionCourseBar.style.width = `${totals.percent}%`;
}

function renderBadgeCollection() {
  elements.badgeCollectionGrid.innerHTML = REVISION_TOPICS.map((topic, index) => {
    const badge = getRevisionBadge(topic, index);
    const earnedAt = earnedRevisionBadges[topic.id];
    const earnedClass = earnedAt ? " earned" : " locked";
    const earnedLabel = earnedAt ? `Unlocked ${formatDate(earnedAt)}` : "Not yet unlocked";

    return `<article class="badge-card${earnedClass}" style="--badge-a:${escapeHtml(badge.a)}; --badge-b:${escapeHtml(badge.b)}; --badge-c:${escapeHtml(badge.c)};">
      ${renderBadgeEmblem(badge, !earnedAt)}
      <div>
        <span>${escapeHtml(topic.code)}</span>
        <h3>${escapeHtml(badge.name)}</h3>
        <small>${topic.cards.length} cards · ${escapeHtml(earnedLabel)}</small>
      </div>
    </article>`;
  }).join("");
}

function openBadgeModal() {
  renderAchievementSummary();
  renderBadgeCollection();
  elements.badgeModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeBadgeModal() {
  elements.badgeModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleBadgeModalClick(event) {
  if (event.target.closest("[data-close-badges]")) {
    closeBadgeModal();
  }
}

function showAchievementModal(topic) {
  const badge = getRevisionBadge(topic);
  elements.achievementBadge.outerHTML = renderBadgeEmblem(badge, false, "achievement-badge");
  elements.achievementBadge = document.querySelector("#achievement-badge");
  elements.achievementTitle.textContent = `${badge.name} badge unlocked`;
  elements.achievementText.textContent = `${topic.code} ${topic.title} is complete. ${topic.cards.length} Computer Science cards have been added to your total mastery.`;
  elements.achievementModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAchievementModal() {
  elements.achievementModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleAchievementModalClick(event) {
  if (event.target.closest("[data-close-achievement]")) {
    closeAchievementModal();
  }
}

function loadRevisionBadges() {
  try {
    const storedBadges = JSON.parse(localStorage.getItem(REVISION_BADGES_KEY) || "{}");
    return storedBadges && typeof storedBadges === "object" && !Array.isArray(storedBadges) ? storedBadges : {};
  } catch {
    return {};
  }
}

function saveRevisionBadges() {
  localStorage.setItem(REVISION_BADGES_KEY, JSON.stringify(earnedRevisionBadges));
}

function awardRevisionBadge(topic) {
  if (!topic || earnedRevisionBadges[topic.id]) return;

  earnedRevisionBadges = {
    ...earnedRevisionBadges,
    [topic.id]: new Date().toISOString(),
  };
  saveRevisionBadges();
  renderAchievementSummary();
  showAchievementModal(topic);
}

function getRevisionAchievementTotals() {
  const totalCards = REVISION_TOPICS.reduce((sum, topic) => sum + topic.cards.length, 0);
  const earnedTopics = REVISION_TOPICS.filter((topic) => earnedRevisionBadges[topic.id]).length;
  const earnedCards = REVISION_TOPICS.reduce(
    (sum, topic) => sum + (earnedRevisionBadges[topic.id] ? topic.cards.length : 0),
    0,
  );

  return {
    earnedCards,
    earnedTopics,
    percent: totalCards ? Math.round((earnedCards / totalCards) * 100) : 0,
    totalCards,
    totalTopics: REVISION_TOPICS.length,
  };
}

function getRevisionBadge(topic, explicitIndex) {
  const topicIndex =
    Number.isInteger(explicitIndex) && explicitIndex >= 0
      ? explicitIndex
      : Math.max(0, REVISION_TOPICS.findIndex((revisionTopic) => revisionTopic.id === topic.id));
  const blueprint = BADGE_BLUEPRINTS[topicIndex % BADGE_BLUEPRINTS.length];

  return {
    ...blueprint,
    code: topic.code,
    name: topic.title,
    topicTitle: topic.title,
  };
}

function renderBadgeEmblem(badge, locked = false, id = "") {
  const idAttribute = id ? ` id="${escapeHtml(id)}"` : "";
  const lockedClass = locked ? " locked" : "";
  return `<div${idAttribute} class="badge-emblem${lockedClass}" style="--badge-a:${escapeHtml(badge.a)}; --badge-b:${escapeHtml(badge.b)}; --badge-c:${escapeHtml(badge.c)};">
    <span>${escapeHtml(badge.mark)}</span>
    <small>${escapeHtml(badge.code)}</small>
  </div>`;
}

function renderContactPage() {
  if (!elements.contactEmail.value && currentUser?.email) {
    elements.contactEmail.value = currentUser.email;
  }

  if (!elements.contactName.value && currentUser?.name) {
    elements.contactName.value = currentUser.name;
  }

  updateContactMessageCounter();
}

function sendContactMessage(event) {
  event.preventDefault();

  const name = elements.contactName.value.trim() || "Not supplied";
  const email = elements.contactEmail.value.trim() || "Not supplied";
  const reason = elements.contactReason.value;
  const message = elements.contactMessage.value.trim();

  clearContactFieldStates();

  if (email !== "Not supplied" && !isValidContactEmail(email)) {
    elements.contactStatus.textContent = "Check the email address or leave it blank if you prefer to include it in your email app.";
    elements.contactStatus.className = "status-message error";
    elements.contactEmail.setAttribute("aria-invalid", "true");
    elements.contactEmail.focus();
    return;
  }

  if (message.length < 10) {
    elements.contactStatus.textContent = "Add a little more detail so the enquiry can be routed properly.";
    elements.contactStatus.className = "status-message error";
    elements.contactMessage.setAttribute("aria-invalid", "true");
    elements.contactMessage.focus();
    return;
  }

  const subject = `Neat Notes enquiry: ${reason}`;
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Reason: ${reason}`,
    "",
    message,
  ].join("\n");

  elements.contactStatus.textContent = "Opening your email app. A future hosted version can send this directly through BreakellSystems support.";
  elements.contactStatus.className = "status-message success";
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function updateContactMessageCounter() {
  const maxLength = Number(elements.contactMessage.getAttribute("maxlength")) || 1000;
  const currentLength = elements.contactMessage.value.length;
  elements.contactMessageCounter.textContent = `${currentLength} / ${maxLength}`;
  elements.contactMessageCounter.classList.toggle("near-limit", currentLength > maxLength * 0.85);
}

function handleContactRouteClick(event) {
  const routeButton = event.target.closest("[data-contact-route]");
  if (!routeButton) return;

  const route = routeButton.dataset.contactRoute;
  elements.contactReason.value = route;
  elements.contactStatus.textContent = `${route} selected. Add a short message and send the enquiry.`;
  elements.contactStatus.className = "status-message success";
  elements.contactMessage.focus();
  elements.contactForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearContactFieldStates() {
  elements.contactEmail.removeAttribute("aria-invalid");
  elements.contactMessage.removeAttribute("aria-invalid");
}

function isValidContactEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  appSettings.theme = nextTheme;
  saveSettings();
  applyThemePreference();
  renderSettingsControls();
}

function syncThemeToggle() {
  const isDark = document.documentElement.dataset.theme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  localStorage.setItem(THEME_KEY, appSettings.theme);
}

function applySettings() {
  applyThemePreference();
  document.body.classList.toggle("compact-density", appSettings.density === "compact");
  document.documentElement.style.setProperty("--editor-font-size", `${appSettings.editorFontSize}px`);
}

function applyThemePreference() {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = appSettings.theme === "system" ? (prefersDark ? "dark" : "light") : appSettings.theme;
  document.documentElement.dataset.theme = resolvedTheme;
  syncThemeToggle();
}

function renderSettingsControls() {
  elements.settingsDensity.value = appSettings.density;
  elements.settingsEditorFont.value = appSettings.editorFontSize;
  elements.settingsDefaultTag.value = appSettings.defaultTag;
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === appSettings.theme);
  });
}

function updateSettingsFromControls() {
  appSettings.density = elements.settingsDensity.value;
  appSettings.editorFontSize = elements.settingsEditorFont.value;
  appSettings.defaultTag = normalizeTag(elements.settingsDefaultTag.value || "inbox");
  saveSettings();
  applySettings();
  renderSettingsControls();
}

function chooseTheme(event) {
  const button = event.target.closest("[data-theme-choice]");
  if (!button) return;

  appSettings.theme = button.dataset.themeChoice;
  saveSettings();
  applySettings();
  renderSettingsControls();
}

function openSettingsModal() {
  renderSettingsControls();
  elements.settingsModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeSettingsModal() {
  elements.settingsModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleSettingsModalClick(event) {
  if (event.target.closest("[data-close-settings]")) {
    closeSettingsModal();
  }
}

function switchSettingsTab(event) {
  const button = event.target.closest("[data-settings-tab]");
  if (!button) return;

  document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab === button);
  });
  document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.settingsPanel === button.dataset.settingsTab);
  });
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const emailWasVerified = params.get("verified") === "1";
  if (emailWasVerified) {
    history.replaceState({}, "", "/");
  }

  try {
    const session = await api("/api/session");
    currentUser = session.user;
    plans = session.plans || {};
    isGuestMode = false;
    await loadApp();
  } catch {
    loadGuestApp();
    if (emailWasVerified) {
      openAuthModal("login");
      showAuthMessage("Email verified. You can log in now.", "success");
    }
  }
}

function hideLaunchOverlay() {
  if (!elements.launchOverlay || elements.launchOverlay.dataset.dismissed === "true") return;

  elements.launchOverlay.dataset.dismissed = "true";
  const elapsed = performance.now() - launchOverlayStartedAt;
  const delay = Math.max(0, MIN_LAUNCH_OVERLAY_MS - elapsed);

  window.setTimeout(() => {
    elements.launchOverlay.classList.add("dismissed");
    window.setTimeout(() => {
      elements.launchOverlay.hidden = true;
    }, 360);
  }, delay);
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(elements.loginForm);
  showAuthMessage("");
  setAuthLoading("login", true);

  try {
    const response = await api("/api/auth/login", {
      method: "POST",
      body: {
        email: form.get("login-email") || document.querySelector("#login-email").value,
        password: form.get("login-password") || document.querySelector("#login-password").value,
      },
    });
    currentUser = response.user;
    plans = response.plans || plans;
    isGuestMode = false;
    showAuthMessage("Login successful. Loading your workspace...", "success");
    closeAuthModal();
    await loadApp();
  } catch (error) {
    showAuthMessage(error.message, "error");
  } finally {
    setAuthLoading("login", false);
  }
}

async function signup(event) {
  event.preventDefault();
  showAuthMessage("");

  if (!validateSignupPassword(true)) {
    elements.signupPassword.focus();
    return;
  }

  setAuthLoading("signup", true);

  try {
    const response = await api("/api/auth/signup", {
      method: "POST",
      body: {
        name: document.querySelector("#signup-name").value,
        email: document.querySelector("#signup-email").value,
        password: document.querySelector("#signup-password").value,
      },
    });

    const devLink = response.devVerificationUrl
      ? ` Local dev link: <a href="${response.devVerificationUrl}">verify now</a>.`
      : "";
    setAuthMode("login");
    showAuthMessage(`${response.message}${devLink}`, "success", true);
  } catch (error) {
    showAuthMessage(error.message, "error");
  } finally {
    setAuthLoading("signup", false);
  }
}

async function logout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  currentUser = null;
  isGuestMode = true;
  loadGuestApp();
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  elements.loginForm.hidden = !isLogin;
  elements.signupForm.hidden = isLogin;
  elements.showLogin.classList.toggle("active", isLogin);
  elements.showSignup.classList.toggle("active", !isLogin);
  elements.showLogin.setAttribute("aria-selected", String(isLogin));
  elements.showSignup.setAttribute("aria-selected", String(!isLogin));
  elements.authCardTitle.textContent = isLogin ? "Welcome back" : "Create your study workspace";
  resetAuthFieldStates();
  setAuthLoading("login", false);
  setAuthLoading("signup", false);
  showAuthMessage("");
}

function openAuthModal(mode = "login") {
  setAuthMode(mode);
  elements.authView.hidden = false;
  document.body.classList.add("modal-open");
  const field = mode === "signup" ? document.querySelector("#signup-name") : document.querySelector("#login-email");
  setTimeout(() => field?.focus(), 0);
}

function closeAuthModal() {
  elements.authView.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleAuthModalClick(event) {
  if (event.target.closest("[data-close-auth]")) {
    closeAuthModal();
  }
}

function showAuthMessage(message, type = "", html = false) {
  elements.authMessage.className = `status-message ${type}`;
  if (html) {
    elements.authMessage.innerHTML = message;
  } else {
    elements.authMessage.textContent = message;
  }
}

function clearAuthMessageOnInput() {
  if (elements.authMessage.textContent || elements.authMessage.innerHTML) {
    showAuthMessage("");
  }
}

function togglePasswordVisibility(event) {
  const button = event.currentTarget;
  const input = document.querySelector(`#${button.dataset.togglePassword}`);
  if (!input) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  button.textContent = shouldShow ? "Hide" : "Show";
  button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  input.focus();
}

function updateCapsLockWarning(event) {
  const warning = getCapsLockWarning(event.currentTarget);
  if (!warning) return;

  warning.hidden = !event.getModifierState("CapsLock");
}

function hideCapsLockWarning(event) {
  const warning = getCapsLockWarning(event.currentTarget);
  if (warning) warning.hidden = true;
}

function getCapsLockWarning(input) {
  if (input === elements.loginPassword) return elements.loginCapsWarning;
  if (input === elements.signupPassword) return elements.signupCapsWarning;
  return null;
}

function validateSignupPassword(showMessage = true) {
  const isValid = elements.signupPassword.value.length >= 8;
  const shouldShow = showMessage && !isValid && !elements.signupForm.hidden;

  elements.signupPassword.setAttribute("aria-invalid", String(!isValid && (showMessage || elements.signupPassword.value.length > 0)));
  elements.signupPasswordError.hidden = !shouldShow;
  return isValid;
}

function resetAuthFieldStates() {
  [elements.loginPassword, elements.signupPassword].forEach((input) => {
    input.type = "password";
    input.removeAttribute("aria-invalid");
  });

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show password");
  });

  elements.loginCapsWarning.hidden = true;
  elements.signupCapsWarning.hidden = true;
  elements.signupPasswordError.hidden = true;
}

function setAuthLoading(mode, isLoading) {
  const isLogin = mode === "login";
  const form = isLogin ? elements.loginForm : elements.signupForm;
  const submitButton = isLogin ? elements.loginSubmitButton : elements.signupSubmitButton;
  const idleText = isLogin ? "Log in" : "Create account";
  const loadingText = isLogin ? "Logging in..." : "Creating account...";

  submitButton.disabled = isLoading;
  submitButton.setAttribute("aria-busy", String(isLoading));
  submitButton.textContent = isLoading ? loadingText : idleText;

  form.querySelectorAll("input, button").forEach((control) => {
    if (control !== submitButton) {
      control.disabled = isLoading;
    }
  });
}

function loadGuestApp() {
  isGuestMode = true;
  currentUser = null;
  plans = {
    ...plans,
    guest: {
      name: "Guest",
      noteLimit: "local",
      workspaceLimit: 1,
      features: {
        collaboration: false,
        classroomSpaces: false,
        pdfExport: false,
        studyPack: false,
        teacherDashboard: false,
        versionHistory: false,
      },
    },
  };

  const guestState = loadGuestState();
  workspaces = guestState.workspaces;
  activeWorkspaceId = workspaces[0]?.id || null;
  members = guestState.members;
  notes = guestState.notes.filter((note) => note.workspace_id === activeWorkspaceId);
  selectedId = notes[0]?.id || null;
  elements.authView.hidden = true;
  elements.appView.hidden = false;
  render();
  hideLaunchOverlay();
}

async function loadApp() {
  isGuestMode = false;
  elements.authView.hidden = true;
  elements.appView.hidden = false;
  elements.userName.textContent = currentUser.name;
  elements.userEmail.textContent = currentUser.email;
  renderPlan();

  await loadWorkspaces();
  await selectWorkspace(activeWorkspaceId || workspaces[0]?.id);
  hideLaunchOverlay();
}

async function loadWorkspaces() {
  if (isGuestMode) {
    const guestState = loadGuestState();
    workspaces = guestState.workspaces;
    elements.workspaceCount.textContent = workspaces.length;
    renderWorkspaces();
    return;
  }

  const response = await api("/api/workspaces");
  workspaces = response.workspaces;
  elements.workspaceCount.textContent = workspaces.length;
  renderWorkspaces();
}

async function selectWorkspace(workspaceId) {
  activeWorkspaceId = workspaceId || null;
  activeTag = "all";
  selectedId = null;

  if (!activeWorkspaceId) {
    notes = [];
    members = [];
    render();
    return;
  }

  if (isGuestMode) {
    const guestState = loadGuestState();
    notes = guestState.notes.filter((note) => note.workspace_id === activeWorkspaceId);
    members = guestState.members;
    selectedId = notes[0]?.id || null;
    render();
    return;
  }

  await Promise.all([loadNotes(), loadMembers()]);
  selectedId = notes[0]?.id || null;
  render();
}

async function loadNotes() {
  const response = await api(`/api/notes?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
  notes = response.notes;
}

async function loadMembers() {
  const response = await api(`/api/workspaces/${activeWorkspaceId}/members`);
  members = response.members;
}

function loadGuestState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_WORKSPACE_KEY) || "null");
    if (parsed?.workspaces?.length && Array.isArray(parsed.notes)) {
      return {
        workspaces: parsed.workspaces,
        members: parsed.members?.length ? parsed.members : createGuestMembers(),
        notes: parsed.notes,
      };
    }
  } catch {
    // Fall through to the default starter state.
  }

  const now = new Date().toISOString();
  const workspaceId = createLocalId("guest-space");
  const defaultState = {
    workspaces: [
      {
        id: workspaceId,
        name: "Guest notes",
        kind: "personal",
        note_count: 1,
        member_count: 1,
      },
    ],
    members: createGuestMembers(),
    notes: [
      {
        id: createLocalId("guest-note"),
        workspace_id: workspaceId,
        owner_id: "guest",
        body:
          "# Welcome to Neat Notes\n\n## Start here\n- Write a note without creating an account\n- Use the formatting toolbar\n- Create folders with tags\n\n> Guest notes are stored in this browser only.\n\nCreate an account when you want sync, collaboration, exports, and class spaces.",
        tag: appSettings.defaultTag,
        title: "Welcome To Neat Notes",
        summary: "Start writing without creating an account. Guest notes are stored in this browser only.",
        created_at: now,
        updated_at: now,
      },
    ],
  };

  saveGuestState(defaultState);
  return defaultState;
}

function saveGuestState(state = null) {
  const nextNotes = state ? state.notes : collectGuestNotesForStorage();
  const nextWorkspaces = state
    ? state.workspaces
    : workspaces.map((workspace) => ({
        ...workspace,
        note_count: nextNotes.filter((note) => note.workspace_id === workspace.id).length,
        member_count: members.length || 1,
      }));
  const nextState =
    state || {
      workspaces: nextWorkspaces,
      members: members.length ? members : createGuestMembers(),
      notes: nextNotes,
    };

  localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify(nextState));
}

function collectGuestNotesForStorage() {
  const existing = loadGuestStateWithoutDefault();
  const otherWorkspaceNotes = existing.notes.filter((note) => note.workspace_id !== activeWorkspaceId);
  return [...otherWorkspaceNotes, ...notes];
}

function loadGuestStateWithoutDefault() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_WORKSPACE_KEY) || "{}");
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { workspaces: [], members: [], notes: [] };
  }
}

function createGuestMembers() {
  return [{ id: "guest", name: "Guest", email: "Stored in this browser", role: "local" }];
}

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createWorkspace(event) {
  event.preventDefault();
  const name = elements.workspaceName.value.trim();
  if (!name) return;

  if (isGuestMode) {
    const workspace = {
      id: createLocalId("guest-space"),
      name,
      kind: "personal",
      note_count: 0,
      member_count: 1,
    };
    workspaces.unshift(workspace);
    elements.workspaceName.value = "";
    showWorkspaceMessage("Created locally. Create an account to sync spaces across devices.", "success");
    saveGuestState();
    await selectWorkspace(workspace.id);
    return;
  }

  try {
    const response = await api("/api/workspaces", {
      method: "POST",
      body: { name, kind: elements.workspaceKind.value },
    });
    elements.workspaceName.value = "";
    showWorkspaceMessage("");
    workspaces.unshift(response.workspace);
    await selectWorkspace(response.workspace.id);
  } catch (error) {
    showWorkspaceMessage(error.message, "error");
  }
}

async function addCollaborator(event) {
  event.preventDefault();
  const email = elements.shareEmail.value.trim();
  if (!email || !activeWorkspaceId) return;

  if (isGuestMode) {
    elements.shareEmail.value = "";
    renderMembers("Create an account to invite collaborators and share class spaces.");
    return;
  }

  try {
    await api(`/api/workspaces/${activeWorkspaceId}/members`, {
      method: "POST",
      body: { email },
    });
    elements.shareEmail.value = "";
    await loadMembers();
    await loadWorkspaces();
    renderMembers();
  } catch (error) {
    renderMembers(error.message);
  }
}

async function createNote() {
  if (!activeWorkspaceId) return;

  if (isGuestMode) {
    const now = new Date().toISOString();
    const note = {
      id: createLocalId("guest-note"),
      workspace_id: activeWorkspaceId,
      owner_id: "guest",
      body: "",
      tag: activeTag === "all" ? appSettings.defaultTag : activeTag,
      title: "Untitled note",
      summary: "Start writing and a tidy summary will appear here.",
      created_at: now,
      updated_at: now,
    };

    notes.unshift(note);
    selectedId = note.id;
    saveGuestState();
    recordActivityEvent({ type: "note_created" });
    render();
    elements.noteBody.focus();
    return;
  }

  try {
    const response = await api("/api/notes", {
      method: "POST",
      body: {
        workspaceId: activeWorkspaceId,
        body: "",
        tag: activeTag === "all" ? appSettings.defaultTag : activeTag,
      },
    });

    notes.unshift(response.note);
    selectedId = response.note.id;
    recordActivityEvent({ type: "note_created" });
    render();
    elements.noteBody.focus();
  } catch (error) {
    showWorkspaceMessage(error.message, "error");
  }
}

async function deleteSelectedNote() {
  if (!selectedId) return;

  if (isGuestMode) {
    notes = notes.filter((note) => note.id !== selectedId);
    selectedId = getVisibleNotes()[0]?.id || notes[0]?.id || null;
    saveGuestState();
    render();
    return;
  }

  await api(`/api/notes/${selectedId}`, { method: "DELETE" });
  notes = notes.filter((note) => note.id !== selectedId);
  selectedId = getVisibleNotes()[0]?.id || notes[0]?.id || null;
  render();
}

async function mockUpgrade(event) {
  const button = event.target.closest("[data-plan]");
  if (!button) return;

  if (isGuestMode) {
    closePlansModal();
    openAuthModal("signup");
    showAuthMessage("Create an account first, then choose a plan for sync and collaboration.", "success");
    return;
  }

  try {
    const response = await api("/api/billing/mock-upgrade", {
      method: "POST",
      body: { plan: button.dataset.plan },
    });
    currentUser = response.user;
    elements.upgradeMessage.textContent = response.message;
    elements.upgradeMessage.className = "topbar-plan-message success";
    closePlansModal();
    render();
  } catch (error) {
    elements.upgradeMessage.textContent = error.message;
    elements.upgradeMessage.className = "topbar-plan-message error";
  }
}

function openPlansModal() {
  elements.pricingModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closePlansModal() {
  elements.pricingModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handlePricingModalClick(event) {
  if (event.target.closest("[data-close-pricing]")) {
    closePlansModal();
    return;
  }

  mockUpgrade(event);
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && !elements.achievementModal.hidden) {
    closeAchievementModal();
  }
  if (event.key === "Escape" && !elements.badgeModal.hidden) {
    closeBadgeModal();
  }
  if (event.key === "Escape" && !elements.pricingModal.hidden) {
    closePlansModal();
  }
  if (event.key === "Escape" && !elements.settingsModal.hidden) {
    closeSettingsModal();
  }
  if (event.key === "Escape" && !elements.authView.hidden) {
    closeAuthModal();
  }
}

function updateActiveNote() {
  const note = getSelectedNote();
  if (!note) return;

  note.body = elements.noteBody.value;
  note.tag = normalizeTag(elements.tagInput.value);
  note.title = createTitle(note.body);
  note.summary = createSummary(note.body);
  note.updated_at = new Date().toISOString();

  setSaveState("Saving...");
  renderNotesAndFolders();
  renderEditorDetails(false);

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (isGuestMode) {
      saveGuestState();
      setSaveState("Saved just now");
      renderNotesAndFolders();
      return;
    }

    try {
      const response = await api(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: { body: note.body, tag: note.tag },
      });
      Object.assign(note, response.note);
      setSaveState("All changes synced");
      renderNotesAndFolders();
    } catch (error) {
      setSaveState("Save failed");
    }
  }, 350);
}

function applyFormattingAction(event) {
  const button = event.target.closest("[data-format]");
  if (!button || elements.noteBody.disabled) return;

  const format = button.dataset.format;
  const templates = {
    heading: { prefix: "# ", placeholder: "Topic title" },
    subheading: { prefix: "## ", placeholder: "Key point" },
    bullet: { prefix: "- ", placeholder: "Evidence, explanation, or example" },
    numbered: { prefix: "1. ", placeholder: "Step or sequence" },
    check: { prefix: "- [ ] ", placeholder: "Revision task" },
    quote: { prefix: "> ", placeholder: "Definition: explanation" },
    divider: { block: "\n---\n" },
  };

  const template = templates[format];
  if (!template) return;

  if (template.block) {
    insertAtCursor(template.block);
  } else {
    applyLinePrefix(template.prefix, template.placeholder);
  }

  updateActiveNote();
}

function handleEditorKeydown(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    adjustIndent(event.shiftKey ? -1 : 1);
    updateActiveNote();
    return;
  }

  if (event.key !== "Enter") return;

  const textarea = elements.noteBody;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
  const lineEnd = value.indexOf("\n", textarea.selectionStart);
  const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
  const match = currentLine.match(/^(\s*)(- \[[ xX]\]|\d+\.|[-*•]|>)(\s+)(.*)$/);
  if (!match) return;

  event.preventDefault();

  const [, indent, marker, spacing, content] = match;
  if (!content.trim()) {
    const before = value.slice(0, lineStart);
    const after = value.slice(textarea.selectionStart);
    textarea.value = before + after.replace(/^\n?/, "");
    textarea.selectionStart = textarea.selectionEnd = before.length;
    updateActiveNote();
    return;
  }

  const nextMarker = /^\d+\.$/.test(marker) ? `${Number.parseInt(marker, 10) + 1}.` : marker.replace(/\[[ xX]\]/, "[ ]");
  insertAtCursor(`\n${indent}${nextMarker}${spacing}`);
  updateActiveNote();
}

function insertAtCursor(text) {
  const textarea = elements.noteBody;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

function applyLinePrefix(prefix, placeholder) {
  const textarea = elements.noteBody;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split("\n");
  const nextLines = lines.map((line) => {
    if (!line.trim()) return `${prefix}${placeholder}`;
    return line.match(/^\s*(#{1,3}\s+|- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/)
      ? line.replace(/^(\s*)(#{1,3}\s+|- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/, `$1${prefix}`)
      : `${prefix}${line}`;
  });
  const replacement = nextLines.join("\n");

  textarea.value = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
  textarea.selectionStart = lineStart;
  textarea.selectionEnd = lineStart + replacement.length;
  textarea.focus();
}

function adjustIndent(direction) {
  const textarea = elements.noteBody;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const adjusted = lines
    .map((line) => (direction > 0 ? `  ${line}` : line.replace(/^ {1,2}/, "")))
    .join("\n");

  textarea.value = `${value.slice(0, lineStart)}${adjusted}${value.slice(lineEnd)}`;
  textarea.selectionStart = lineStart;
  textarea.selectionEnd = lineStart + adjusted.length;
  textarea.focus();
}

function render() {
  renderAccountChrome();
  renderPlan();
  renderWorkspaces();
  renderMembers();
  renderNotesAndFolders();
  renderEditor();
  renderDailyStudyPanel();
  renderAchievementSummary();
  renderRevisionPage();
}

function renderAccountChrome() {
  const isSignedIn = Boolean(currentUser) && !isGuestMode;
  elements.guestAccountActions.hidden = isSignedIn;
  elements.signedInAccountActions.hidden = !isSignedIn;

  if (isSignedIn) {
    elements.accountStatus.textContent = "Synced account";
    elements.topbarUserLabel.textContent = currentUser.email;
    elements.userName.textContent = currentUser.name;
    elements.userEmail.textContent = currentUser.email;
    elements.userPlanLabel.textContent = currentUser.planName || "Account workspace";
    elements.logoutButton.hidden = false;
    return;
  }

  elements.accountStatus.textContent = "Local guest workspace";
  elements.userName.textContent = "Guest workspace";
  elements.userEmail.textContent = "Stored in this browser only";
  elements.userPlanLabel.textContent = "Guest";
  elements.logoutButton.hidden = true;
}

function renderRevisionMasteryMap() {
  const recommendedTopic = getRecommendedRevisionTopic();
  const earnedCount = REVISION_TOPICS.filter((topic) => earnedRevisionBadges[topic.id]).length;

  elements.revisionMasteryMap.innerHTML = `
    <div class="mastery-map-head">
      <div>
        <span>Mastery map</span>
        <strong>${earnedCount}/${REVISION_TOPICS.length} decks complete</strong>
      </div>
      ${
        recommendedTopic
          ? `<button type="button" data-jump-topic="${escapeHtml(recommendedTopic.id)}">Next: ${escapeHtml(recommendedTopic.code)}</button>`
          : ""
      }
    </div>
    <div class="mastery-map-grid">
      ${REVISION_TOPICS.map((topic) => {
        const completed = getCompletedRevisionCount(topic);
        const earned = Boolean(earnedRevisionBadges[topic.id]);
        const percent = earned ? 100 : topic.cards.length ? Math.round((completed / topic.cards.length) * 100) : 0;
        const activeClass = topic.id === activeRevisionTopicId ? " active" : "";
        const earnedClass = earned ? " earned" : "";

        return `<button class="mastery-dot${activeClass}${earnedClass}" type="button" data-jump-topic="${escapeHtml(topic.id)}" title="${escapeHtml(topic.code)} ${escapeHtml(topic.title)} · ${percent}%">
          <span>${escapeHtml(topic.code)}</span>
          <small>${percent}%</small>
        </button>`;
      }).join("")}
    </div>`;
}

function renderLearningMode() {
  elements.revisionView.classList.toggle("teacher-mode-active", activeLearningMode === "teacher");
  document.querySelectorAll(".student-revision-section").forEach((section) => {
    section.hidden = activeLearningMode === "teacher";
  });
  elements.teacherModePanel.hidden = activeLearningMode !== "teacher";

  elements.learningModeSwitch.querySelectorAll("[data-learning-mode]").forEach((button) => {
    const isActive = button.dataset.learningMode === activeLearningMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function switchLearningMode(event) {
  const button = event.target.closest("[data-learning-mode]");
  if (!button) return;

  activeLearningMode = button.dataset.learningMode === "teacher" ? "teacher" : "student";
  localStorage.setItem(LEARNING_MODE_KEY, activeLearningMode);
  renderRevisionPage();
}

function renderStudentClassPanel() {
  const memberships = getStudentClassMemberships();
  if (memberships.length === 1 && !activeStudentClassId) {
    activeStudentClassId = memberships[0].classId;
    localStorage.setItem(ACTIVE_STUDENT_CLASS_KEY, activeStudentClassId);
  }

  if (activeStudentClassId && !memberships.some((membership) => membership.classId === activeStudentClassId)) {
    activeStudentClassId = memberships[0]?.classId || null;
    if (activeStudentClassId) {
      localStorage.setItem(ACTIVE_STUDENT_CLASS_KEY, activeStudentClassId);
    } else {
      localStorage.removeItem(ACTIVE_STUDENT_CLASS_KEY);
    }
  }

  const activeMembership = memberships.find((membership) => membership.classId === activeStudentClassId);
  const activeClass = activeMembership ? getClassById(activeMembership.classId) : null;
  const invalidCodeAttribute = studentClassJoinMessage?.type === "error" ? ` aria-invalid="true"` : "";
  const message = studentClassJoinMessage?.text
    ? `<p id="join-class-status" class="status-message ${escapeHtml(studentClassJoinMessage.type || "")}" role="status">${escapeHtml(studentClassJoinMessage.text)}</p>`
    : `<p id="join-class-status" class="status-message" role="status"></p>`;

  elements.studentClassPanel.innerHTML = `
    <div class="student-class-head">
      <div>
        <p class="eyebrow">Class</p>
        <h3>${memberships.length ? "Your teacher classes" : "Join a class"}</h3>
        <p>Enter the class code your teacher gave you. Once joined, your teacher can see your revision activity and topic confidence for that class.</p>
      </div>
      <form class="join-class-form" data-join-class-form novalidate>
        <label for="join-class-code">Class code</label>
        <div class="class-code-row">
          <input id="join-class-code" name="classCode" data-class-code-input type="text" value="${escapeHtml(studentClassCodeDraft)}" placeholder="e.g. 12B-CS-7FQ" aria-describedby="join-class-status" autocomplete="off"${invalidCodeAttribute} />
          <button type="button" data-paste-class-code>Paste</button>
        </div>
        <div class="join-class-actions">
          <button type="submit">Join class</button>
          <button type="button" data-clear-class-code>Cancel</button>
        </div>
        ${message}
      </form>
    </div>
    ${isGuestMode ? `<p class="class-membership-notice">You are joining as a guest. Create an account to keep your class membership saved across devices.</p>` : ""}
    <p class="class-membership-notice">When you join a class, your teacher can see revision activity, card confidence, and topic progress linked to that class.</p>
    ${
      memberships.length
        ? `<div class="student-class-context">
            <label for="student-class-context">Revising for</label>
            <select id="student-class-context" data-student-class-context>
              <option value="">Personal revision</option>
              ${memberships.map((membership) => {
                const group = getClassById(membership.classId);
                if (!group) return "";
                return `<option value="${escapeHtml(group.id)}" ${group.id === activeStudentClassId ? "selected" : ""}>${escapeHtml(group.name)}</option>`;
              }).join("")}
            </select>
            ${activeClass ? `<span>Current class context: ${escapeHtml(activeClass.name)}</span>` : `<span>Personal revision is not linked to a teacher class.</span>`}
          </div>
          <div class="student-class-list">
            ${memberships.map(renderStudentClassCard).join("")}
          </div>`
        : `<div class="student-class-empty"><strong>Join a class using the code your teacher gave you.</strong><span>Class-linked revision assignments will appear here when your teacher sets them.</span></div>`
    }`;
}

function handleStudentClassPanelSubmit(event) {
  const form = event.target.closest("[data-join-class-form]");
  if (!form) return;
  event.preventDefault();

  const input = form.querySelector("[data-class-code-input]");
  const rawCode = input.value;
  const normalisedCode = normaliseClassCode(rawCode);
  studentClassCodeDraft = normalisedCode || rawCode.trim();
  input.removeAttribute("aria-invalid");

  if (!normalisedCode) {
    input.setAttribute("aria-invalid", "true");
    setStudentClassMessage("Enter a class code to continue.", "error");
    return;
  }

  if (!isValidNormalisedClassCode(normalisedCode)) {
    input.setAttribute("aria-invalid", "true");
    setStudentClassMessage("That class code does not look right. Check it and try again.", "error");
    return;
  }

  const classGroup = findClassByInviteCode(normalisedCode);
  if (!classGroup) {
    input.setAttribute("aria-invalid", "true");
    setStudentClassMessage("We could not find a class with that code.", "error");
    return;
  }

  if (isAlreadyClassMember(classGroup.id)) {
    input.setAttribute("aria-invalid", "true");
    setStudentClassMessage("You have already joined this class.", "error");
    return;
  }

  const membership = createClassMembership(classGroup);
  studentClassCodeDraft = "";
  input.value = "";
  setStudentClassMessage(`You have joined ${classGroup.name}.`, "success");
  recordActivityEvent({ type: "class_joined", classId: membership.classId });
  renderStudentClassPanel();
}

function handleStudentClassPanelClick(event) {
  if (event.target.closest("[data-clear-class-code]")) {
    studentClassJoinMessage = { text: "", type: "" };
    studentClassCodeDraft = "";
    renderStudentClassPanel();
    return;
  }

  const pasteButton = event.target.closest("[data-paste-class-code]");
  if (pasteButton) {
    const input = elements.studentClassPanel.querySelector("[data-class-code-input]");
    const pasteRequest = navigator.clipboard?.readText?.();
    if (!pasteRequest) {
      setStudentClassMessage("Paste is not available in this browser. Type the code instead.", "error");
      return;
    }
    pasteRequest.then((text) => {
      input.value = text.trim();
      input.focus();
    }).catch(() => {
      setStudentClassMessage("Paste is not available in this browser. Type the code instead.", "error");
      renderStudentClassPanel();
    });
    return;
  }

  if (event.target.closest("[data-scroll-revision]")) {
    document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const leaveButton = event.target.closest("[data-leave-class]");
  if (leaveButton) {
    leaveStudentClass(leaveButton.dataset.leaveClass);
  }
}

function handleStudentClassPanelChange(event) {
  const selector = event.target.closest("[data-student-class-context]");
  if (!selector) return;

  activeStudentClassId = selector.value || null;
  if (activeStudentClassId) {
    localStorage.setItem(ACTIVE_STUDENT_CLASS_KEY, activeStudentClassId);
  } else {
    localStorage.removeItem(ACTIVE_STUDENT_CLASS_KEY);
  }
  renderStudentClassPanel();
}

function setStudentClassMessage(text, type = "") {
  studentClassJoinMessage = { text, type };
  renderStudentClassPanel();
}

function normaliseClassCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function isValidNormalisedClassCode(code) {
  return /^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+$/.test(code);
}

function findClassByInviteCode(code) {
  const target = normaliseClassCode(code);
  return classGroups.find((group) => normaliseClassCode(group.inviteCode) === target);
}

function createClassMembership(classGroup) {
  const membership = {
    id: createLocalId("membership"),
    classId: classGroup.id,
    userId: currentUser?.id,
    studentName: currentUser?.name || "Guest student",
    studentEmail: currentUser?.email || undefined,
    role: "student",
    joinedAt: new Date().toISOString(),
    status: "active",
  };

  classMemberships = [membership, ...classMemberships];
  saveClassMemberships();
  activeStudentClassId = classGroup.id;
  localStorage.setItem(ACTIVE_STUDENT_CLASS_KEY, activeStudentClassId);
  return membership;
}

function saveClassMemberships() {
  saveLocalArray(CLASS_MEMBERSHIPS_KEY, classMemberships);
}

function isAlreadyClassMember(classId) {
  return getStudentClassMemberships().some((membership) => membership.classId === classId);
}

function getStudentClassMemberships() {
  const userId = currentUser?.id;
  return classMemberships.filter((membership) => {
    const belongsToCurrentUser = userId ? membership.userId === userId : !membership.userId;
    return membership.role === "student" && membership.status === "active" && belongsToCurrentUser && getClassById(membership.classId);
  });
}

function getClassMemberships(classId) {
  if (!classId) return [];
  return classMemberships.filter((membership) => membership.classId === classId && membership.role === "student" && membership.status === "active");
}

function getClassTopicAttempts(topicId, classId) {
  return cardAttempts.filter((attempt) => attempt.topicId === topicId && (!classId || attempt.classId === classId));
}

function getActiveRevisionClassId() {
  return getStudentClassMemberships().some((membership) => membership.classId === activeStudentClassId)
    ? activeStudentClassId
    : undefined;
}

function getClassById(classId) {
  return classGroups.find((group) => group.id === classId);
}

function getCentreName(centreId) {
  return centres.find((centre) => centre.id === centreId)?.name || "";
}

function renderStudentClassCard(membership) {
  const group = getClassById(membership.classId);
  if (!group) return "";

  const centreName = getCentreName(group.centreId);
  return `<article class="student-class-card ${group.id === activeStudentClassId ? "active" : ""}">
    <div>
      <span>Class</span>
      <h4>${escapeHtml(group.name)}</h4>
      <p>${escapeHtml(group.examBoard)} ${escapeHtml(group.subject)}</p>
      ${centreName ? `<p>${escapeHtml(centreName)}</p>` : ""}
      <small>Joined ${formatDate(membership.joinedAt)} · ${escapeHtml(membership.status)}</small>
    </div>
    <div class="student-class-card-actions">
      <span>Joined via teacher code</span>
      <p>Your teacher can view revision activity and topic confidence for this class.</p>
      <button type="button" data-scroll-revision>Go to Revision</button>
      <button type="button" data-leave-class="${escapeHtml(group.id)}">Leave class</button>
    </div>
  </article>`;
}

function leaveStudentClass(classId) {
  const group = getClassById(classId);
  const confirmed = window.confirm("Leave this class? Your personal notes and revision history will stay in your workspace, but your teacher will no longer see new activity for this class.");
  if (!confirmed) return;

  classMemberships = classMemberships.map((membership) =>
    membership.classId === classId && membership.status === "active"
      ? { ...membership, status: "left", leftAt: new Date().toISOString() }
      : membership
  );
  saveClassMemberships();
  if (activeStudentClassId === classId) {
    activeStudentClassId = getStudentClassMemberships()[0]?.classId || null;
    if (activeStudentClassId) {
      localStorage.setItem(ACTIVE_STUDENT_CLASS_KEY, activeStudentClassId);
    } else {
      localStorage.removeItem(ACTIVE_STUDENT_CLASS_KEY);
    }
  }
  setStudentClassMessage(group ? `You have left ${group.name}.` : "You have left this class.", "success");
}

function renderTeacherMode() {
  if (!classGroups.some((group) => group.id === activeClassId)) {
    activeClassId = classGroups[0]?.id || null;
  }
  if (!centres.some((centre) => centre.id === activeCentreId)) {
    activeCentreId = centres[0]?.id || null;
  }

  elements.teacherModePanel.innerHTML = `
    <header class="teacher-hero">
      <div>
        <p class="eyebrow">Teacher Mode</p>
        <h2>Learning intelligence for OCR Computer Science</h2>
        <p>See class confidence, spot topics that need intervention, and prepare structured revision support.</p>
      </div>
      <div class="teacher-preview-card">
        <span>${isGuestMode ? "Preview mode" : "Teacher workspace"}</span>
        <strong>${isGuestMode ? "Create an account to save classes and invite students." : "Class data is saved locally in this MVP."}</strong>
      </div>
    </header>
    <nav class="teacher-tabs" aria-label="Teacher mode sections">
      ${["dashboard", "classes", "topic-insights", "centre-settings"].map((section) => {
        const labels = {
          dashboard: "Dashboard",
          classes: "Classes",
          "topic-insights": "Topic Insights",
          "centre-settings": "Centre Settings",
        };
        return `<button class="${section === activeTeacherSection ? "active" : ""}" type="button" data-teacher-section="${section}">${labels[section]}</button>`;
      }).join("")}
    </nav>
    ${renderTeacherSection()}`;
}

function renderTeacherSection() {
  if (activeTeacherSection === "classes") return renderTeacherClassesSection();
  if (activeTeacherSection === "topic-insights") return renderTopicInsightsSection();
  if (activeTeacherSection === "centre-settings") return renderCentreSettingsSection();
  return renderTeacherDashboardSection();
}

function renderTeacherDashboardSection() {
  const activeClass = getActiveClassGroup();
  const overview = getTeacherClassOverview(activeClass);
  const weakTopics = getClassTopicInsights().filter((topic) => topic.confidence.totalAttempts).slice(0, 4);
  const watchlist = getStudentWatchlist();

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h3>Who needs help, with what, and what should happen next?</h3>
      </div>
      ${renderClassSelector()}
    </div>
    ${
      classGroups.length
        ? `<div class="teacher-metric-grid">
            <article><span>Students</span><strong>${overview.students}</strong></article>
            <article><span>Active this week</span><strong>${overview.activeThisWeek}</strong></article>
            <article><span>Average confidence</span><strong>${overview.averageConfidenceLabel}</strong></article>
            <article><span>Cards this week</span><strong>${overview.cardsThisWeek}</strong></article>
            <article><span>Priority topic</span><strong>${escapeHtml(overview.priorityTopic)}</strong></article>
            <article><span>Need intervention</span><strong>${overview.interventionCount}</strong></article>
          </div>`
        : renderTeacherEmptyState("Create a class to start seeing student revision confidence and activity.", "Create class", "classes")
    }
    <div class="teacher-dashboard-grid">
      <article class="teacher-panel-card">
        <div class="section-title"><span>Topic weakness summary</span><span>${weakTopics.length || "Empty"}</span></div>
        ${
          weakTopics.length
            ? `<div class="topic-insight-list">${weakTopics.map(renderCompactTopicInsight).join("")}</div>`
            : `<p class="empty-copy">Topic confidence will appear once students rate flashcards.</p>`
        }
      </article>
      <article class="teacher-panel-card">
        <div class="section-title"><span>Student watchlist</span><span>${watchlist.length || "Clear"}</span></div>
        ${watchlist.length ? watchlist.map(renderWatchlistItem).join("") : `<p class="empty-copy">No students need attention yet.</p>`}
      </article>
      <article class="teacher-panel-card">
        <div class="section-title"><span>Recent activity</span><span>${activityEvents.length}</span></div>
        ${renderRecentActivityList()}
      </article>
      <article class="teacher-panel-card">
        <div class="section-title"><span>Suggested teacher actions</span><span>MVP</span></div>
        <div class="teacher-action-list">
          <button type="button" disabled>Assignments coming soon</button>
          <button type="button" disabled>Export coming soon</button>
          <button type="button" data-teacher-section="topic-insights">Review topic insights</button>
          <button type="button" data-teacher-section="classes">Invite students</button>
        </div>
      </article>
    </div>
  </section>`;
}

function renderTeacherClassesSection() {
  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Classes</p>
        <h3>Create classes and invite students with a join code.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    <div class="teacher-management-grid">
      <form class="teacher-form" data-create-class>
        <h4>Create class</h4>
        <label for="class-name">Class name</label>
        <input id="class-name" name="name" type="text" placeholder="12B Computer Science" required />
        <label for="class-subject">Subject</label>
        <input id="class-subject" name="subject" type="text" value="Computer Science" required />
        <label for="class-board">Exam board</label>
        <input id="class-board" name="examBoard" type="text" value="OCR A-Level" required />
        <label for="class-year">Year group</label>
        <input id="class-year" name="yearGroup" type="text" placeholder="Year 12" />
        <label for="class-description">Description</label>
        <textarea id="class-description" name="description" placeholder="Optional class notes"></textarea>
        <button type="submit">Create class</button>
      </form>
      <div class="teacher-panel-card">
        <div class="section-title"><span>Class list</span><span>${classGroups.length}</span></div>
        ${classGroups.length ? classGroups.map(renderClassCard).join("") : renderInlineEmpty("Create your first class and invite students with a join code.")}
      </div>
    </div>
  </section>`;
}

function renderTopicInsightsSection() {
  const insights = getClassTopicInsights();
  const hasData = insights.some((insight) => insight.confidence.totalAttempts);

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Topic Insights</p>
        <h3>OCR topic confidence across the selected class.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    ${
      hasData
        ? `<div class="topic-insight-grid">${insights.map(renderTopicInsightCard).join("")}</div>`
        : renderTeacherEmptyState("Invite students or complete revision sessions to generate topic insights.", "Create class", "classes")
    }
  </section>`;
}

function renderCentreSettingsSection() {
  const activeCentre = getActiveCentre();
  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Centre Settings</p>
        <h3>Create a centre or join an existing centre.</h3>
      </div>
      <span class="teacher-mode-note">Foundation for future Institution plans</span>
    </div>
    <div class="teacher-management-grid">
      <form class="teacher-form" data-create-centre>
        <h4>Create centre</h4>
        <label for="centre-name">Centre name</label>
        <input id="centre-name" name="name" type="text" placeholder="Breakell College" required />
        <label for="centre-type">Centre type</label>
        <select id="centre-type" name="type">
          <option value="school">School</option>
          <option value="college">College</option>
          <option value="department">Department</option>
          <option value="tutoring">Tutoring</option>
          <option value="other">Other</option>
        </select>
        <button type="submit">Create centre</button>
      </form>
      <form class="teacher-form" data-join-centre>
        <h4>Join with code</h4>
        <label for="join-centre-code">Centre code</label>
        <input id="join-centre-code" name="code" type="text" placeholder="NN-CENTRE" required />
        <button type="submit">Join centre</button>
      </form>
      <div class="teacher-panel-card">
        <div class="section-title"><span>Current centre</span><span>${centres.length}</span></div>
        ${
          activeCentre
            ? `<div class="centre-code-card"><span>${escapeHtml(activeCentre.type || "centre")}</span><strong>${escapeHtml(activeCentre.name)}</strong><code>${escapeHtml(activeCentre.code)}</code><p>${classGroups.filter((group) => group.centreId === activeCentre.id).length} associated classes</p></div>`
            : renderInlineEmpty("Continue without a centre, or create one when school or department rollout begins.")
        }
      </div>
    </div>
  </section>`;
}

function renderClassSelector() {
  if (!classGroups.length) {
    return `<button class="teacher-inline-action" type="button" data-teacher-section="classes">Create first class</button>`;
  }

  return `<label class="class-selector">
    <span>Class</span>
    <select data-class-selector>
      ${classGroups.map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === activeClassId ? "selected" : ""}>${escapeHtml(group.name)}</option>`).join("")}
    </select>
  </label>`;
}

function renderTeacherEmptyState(message, actionLabel, section) {
  return `<div class="teacher-empty-state">
    <strong>${escapeHtml(message)}</strong>
    <button type="button" data-teacher-section="${escapeHtml(section)}">${escapeHtml(actionLabel)}</button>
  </div>`;
}

function renderInlineEmpty(message) {
  return `<p class="empty-copy">${escapeHtml(message)}</p>`;
}

function getActiveClassGroup() {
  return classGroups.find((group) => group.id === activeClassId) || classGroups[0] || null;
}

function getActiveCentre() {
  return centres.find((centre) => centre.id === activeCentreId) || centres[0] || null;
}

function getTeacherClassOverview(activeClass) {
  const activeClassMemberships = getClassMemberships(activeClass?.id);
  const weeklyEvents = getRecentActivityEvents(7).filter((event) => !activeClass?.id || event.classId === activeClass.id);
  const ratedEvents = weeklyEvents.filter((event) => event.type === "card_rated");
  const confidenceValues = REVISION_TOPICS.map((topic) => calculateTopicConfidence(getClassTopicAttempts(topic.id, activeClass?.id))).filter((confidence) => confidence.totalAttempts);
  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, confidence) => sum + confidence.percent, 0) / confidenceValues.length)
    : null;
  const weakest = getClassTopicInsights().find((topic) => topic.confidence.totalAttempts);

  return {
    students: activeClassMemberships.length,
    activeThisWeek: new Set(weeklyEvents.map((event) => event.userId || "guest")).size,
    averageConfidenceLabel: averageConfidence === null ? "No data" : `${averageConfidence}%`,
    cardsThisWeek: ratedEvents.length,
    priorityTopic: weakest ? `${weakest.topic.code} ${weakest.topic.title}` : "No data yet",
    interventionCount: getStudentWatchlist().length,
  };
}

function getRecentActivityEvents(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return activityEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff);
}

function getClassTopicInsights() {
  const selectedClassId = getActiveClassGroup()?.id;
  return REVISION_TOPICS.map((topic) => {
    const topicAttempts = getClassTopicAttempts(topic.id, selectedClassId);
    const confidence = calculateTopicConfidence(topicAttempts);
    const weakCards = identifyWeakCards(topic.id, topicAttempts);
    return {
      topic,
      confidence,
      studentsBelowThreshold: confidence.totalAttempts && confidence.percent < 60 ? 1 : 0,
      weakCards,
      lastRevised: getLastTopicActivity(topic.id),
      suggestedAction: confidence.totalAttempts
        ? confidence.percent < 60
          ? "Assign review mission"
          : "Maintain practice"
        : "Await student ratings",
    };
  }).sort((a, b) => {
    if (!a.confidence.totalAttempts && b.confidence.totalAttempts) return 1;
    if (a.confidence.totalAttempts && !b.confidence.totalAttempts) return -1;
    return a.confidence.percent - b.confidence.percent;
  });
}

function getLastTopicActivity(topicId) {
  const event = activityEvents.find((activity) => activity.topicId === topicId);
  return event ? formatDate(event.createdAt) : "Not revised";
}

function getStudentWatchlist() {
  const selectedClassId = getActiveClassGroup()?.id;
  const localConfidenceValues = REVISION_TOPICS.map((topic) => ({
    topic,
    confidence: calculateTopicConfidence(getClassTopicAttempts(topic.id, selectedClassId)),
  })).filter((entry) => entry.confidence.totalAttempts);
  const lowConfidence = localConfidenceValues.sort((a, b) => a.confidence.percent - b.confidence.percent)[0];
  const repeatedNeedPractice = cardAttempts.filter((attempt) => attempt.confidence === "needs_practice").length;

  if (!lowConfidence || lowConfidence.confidence.percent >= 50 || !repeatedNeedPractice) {
    return [];
  }

  return [{
    name: currentUser?.name || "Local preview learner",
    lastAccessed: activityEvents[0]?.createdAt ? formatDate(activityEvents[0].createdAt) : "Today",
    averageConfidence: `${lowConfidence.confidence.percent}%`,
    weakestTopic: `${lowConfidence.topic.code} ${lowConfidence.topic.title}`,
    suggestedAction: "Review weak cards",
  }];
}

function renderCompactTopicInsight(insight) {
  return `<div class="compact-topic-insight ${escapeHtml(insight.confidence.statusClass)}">
    <span>${escapeHtml(insight.topic.code)}</span>
    <strong>${escapeHtml(insight.topic.title)}</strong>
    <em>${insight.confidence.totalAttempts ? `${insight.confidence.percent}% · ${escapeHtml(insight.confidence.band)}` : "No confidence data"}</em>
  </div>`;
}

function renderTopicInsightCard(insight) {
  return `<article class="topic-insight-card ${escapeHtml(insight.confidence.statusClass)}">
    <div>
      <span>${escapeHtml(insight.topic.code)}</span>
      <h4>${escapeHtml(insight.topic.title)}</h4>
    </div>
    <strong>${insight.confidence.totalAttempts ? `${insight.confidence.percent}%` : "No data"}</strong>
    <p>${escapeHtml(insight.confidence.band)}</p>
    <ul>
      <li>${insight.studentsBelowThreshold} students below threshold</li>
      <li>${insight.weakCards.length} cards most often marked Need practice</li>
      <li>Last revised: ${escapeHtml(insight.lastRevised)}</li>
    </ul>
    <button type="button" disabled>${escapeHtml(insight.suggestedAction)} · coming soon</button>
  </article>`;
}

function renderWatchlistItem(student) {
  return `<div class="watchlist-item">
    <strong>${escapeHtml(student.name)}</strong>
    <span>Last accessed: ${escapeHtml(student.lastAccessed)}</span>
    <span>Average confidence: ${escapeHtml(student.averageConfidence)}</span>
    <span>Weakest topic: ${escapeHtml(student.weakestTopic)}</span>
    <button type="button" disabled>${escapeHtml(student.suggestedAction)} · coming soon</button>
  </div>`;
}

function renderRecentActivityList() {
  if (!activityEvents.length) {
    return `<p class="empty-copy">Activity will appear when students rate cards, complete decks, join classes, or create notes.</p>`;
  }

  return `<div class="activity-list">${activityEvents.slice(0, 6).map((event) => {
    const topic = event.topicId ? getQuizTopicById(event.topicId) : null;
    return `<div class="activity-item">
      <span>${escapeHtml(formatActivityType(event.type))}</span>
      <strong>${topic ? `${escapeHtml(topic.code)} ${escapeHtml(topic.title)}` : "Workspace activity"}</strong>
      <small>${escapeHtml(formatDate(event.createdAt))}</small>
    </div>`;
  }).join("")}</div>`;
}

function formatActivityType(type) {
  return String(type || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderClassCard(group) {
  const studentCount = getClassMemberships(group.id).length;
  return `<article class="class-card ${group.id === activeClassId ? "active" : ""}">
    <div>
      <span>${escapeHtml(group.subject)} · ${escapeHtml(group.examBoard)}</span>
      <h4>${escapeHtml(group.name)}</h4>
      <p>${escapeHtml(group.yearGroup || "Year group not set")} · ${studentCount} joined student${studentCount === 1 ? "" : "s"}</p>
    </div>
    <div class="invite-code-card">
      <span>Join code</span>
      <code>${escapeHtml(group.inviteCode)}</code>
      <button type="button" data-copy-code="${escapeHtml(group.inviteCode)}">Copy code</button>
    </div>
    <p>Students can join this class using this code.</p>
  </article>`;
}

function handleTeacherModeClick(event) {
  const sectionButton = event.target.closest("[data-teacher-section]");
  if (sectionButton) {
    activeTeacherSection = sectionButton.dataset.teacherSection;
    renderTeacherMode();
    return;
  }

  const copyButton = event.target.closest("[data-copy-code]");
  if (copyButton) {
    navigator.clipboard?.writeText(copyButton.dataset.copyCode).then(() => {
      copyButton.textContent = "Copied";
    }).catch(() => {
      copyButton.textContent = "Copy unavailable";
    });
  }
}

function handleTeacherModeSubmit(event) {
  const classForm = event.target.closest("[data-create-class]");
  const centreForm = event.target.closest("[data-create-centre]");
  const joinCentreForm = event.target.closest("[data-join-centre]");
  if (!classForm && !centreForm && !joinCentreForm) return;

  event.preventDefault();

  if (classForm) {
    createClassGroup(new FormData(classForm));
    return;
  }

  if (centreForm) {
    createCentre(new FormData(centreForm));
    return;
  }

  joinCentre(new FormData(joinCentreForm));
}

function handleTeacherModeChange(event) {
  const selector = event.target.closest("[data-class-selector]");
  if (!selector) return;

  activeClassId = selector.value;
  renderTeacherMode();
}

function createClassGroup(form) {
  const now = new Date().toISOString();
  const group = {
    id: createLocalId("class"),
    centreId: activeCentreId || undefined,
    name: String(form.get("name") || "").trim(),
    subject: String(form.get("subject") || "Computer Science").trim(),
    examBoard: String(form.get("examBoard") || "OCR A-Level").trim(),
    yearGroup: String(form.get("yearGroup") || "").trim(),
    description: String(form.get("description") || "").trim(),
    inviteCode: createInviteCode("NN"),
    students: [],
    createdAt: now,
  };

  if (!group.name || !group.subject || !group.examBoard) return;

  classGroups = [group, ...classGroups];
  activeClassId = group.id;
  saveLocalArray(CLASS_GROUPS_KEY, classGroups);
  recordActivityEvent({ type: "class_joined", classId: group.id });
  renderTeacherMode();
}

function createCentre(form) {
  const centre = {
    id: createLocalId("centre"),
    name: String(form.get("name") || "").trim(),
    type: String(form.get("type") || "other"),
    code: createInviteCode("CENTRE"),
    createdAt: new Date().toISOString(),
  };

  if (!centre.name) return;

  centres = [centre, ...centres];
  activeCentreId = centre.id;
  saveLocalArray(CENTRES_KEY, centres);
  renderTeacherMode();
}

function joinCentre(form) {
  const code = String(form.get("code") || "").trim().toUpperCase();
  if (!code) return;

  const existing = centres.find((centre) => centre.code.toUpperCase() === code);
  const centre = existing || {
    id: createLocalId("centre"),
    name: "Joined centre",
    type: "other",
    code,
    createdAt: new Date().toISOString(),
  };

  if (!existing) {
    centres = [centre, ...centres];
    saveLocalArray(CENTRES_KEY, centres);
  }

  activeCentreId = centre.id;
  renderTeacherMode();
}

function createInviteCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function renderRevisionPage() {
  const topic = getActiveRevisionTopic();
  renderLearningMode();

  if (activeLearningMode === "teacher") {
    renderTeacherMode();
    return;
  }

  if (!revisionSession || revisionSession.topicId !== topic.id) {
    startRevisionSession(topic.id);
  }

  renderAchievementSummary();
  renderDailyStudyPanel();
  renderRevisionDashboard(topic);
  renderStudentClassPanel();
  const order = getRevisionCardOrder(topic);
  const sessionCardIds = revisionReviewMode?.topicId === topic.id ? new Set(revisionReviewMode.cardIds) : null;
  const deckOrder = sessionCardIds
    ? order.filter((cardIndex) => sessionCardIds.has(getRevisionCardKey(topic, topic.cards[cardIndex])))
    : order;
  const completedCount = deckOrder.filter((cardIndex) => completedRevisionCards.has(getRevisionCardKey(topic, topic.cards[cardIndex]))).length;
  const deckTotal = deckOrder.length || topic.cards.length;
  const progress = deckTotal ? Math.round((completedCount / deckTotal) * 100) : 0;
  const remainingOrder = deckOrder.filter((cardIndex) => {
    const card = topic.cards[cardIndex];
    return !completedRevisionCards.has(getRevisionCardKey(topic, card));
  });

  elements.revisionProgressPercent.textContent = `${progress}%`;
  elements.revisionProgressLabel.textContent =
    completedCount === deckTotal && deckTotal
      ? "Complete"
      : `${completedCount}/${deckTotal} done${sessionCardIds ? " · weak review" : ""}`;
  elements.revisionProgressRing.style.strokeDashoffset = String(283 - (283 * progress) / 100);
  elements.revisionTopicCode.textContent = topic.code;
  elements.revisionTopicTitle.textContent = topic.title;
  elements.revisionTopicSummary.textContent = topic.summary;
  renderRevisionMasteryMap();
  renderNeatQuestions();

  elements.revisionTopicList.innerHTML = REVISION_TOPICS.map((revisionTopic, index) => {
    const activeClass = revisionTopic.id === activeRevisionTopicId ? " active" : "";
    const earnedClass = earnedRevisionBadges[revisionTopic.id] ? " earned" : "";
    const badgeLabel = earnedRevisionBadges[revisionTopic.id] ? `<span class="revision-topic-badge">Badge</span>` : "";
    return `<button class="revision-topic-button${activeClass}${earnedClass}" type="button" data-topic-id="${escapeHtml(revisionTopic.id)}">
      <span class="revision-topic-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="revision-topic-meta">
        <span class="revision-topic-code">${escapeHtml(revisionTopic.code)}</span>
        <strong>${escapeHtml(revisionTopic.title)}</strong>
      </span>
      <span class="revision-topic-count">${revisionTopic.cards.length} cards${badgeLabel}</span>
    </button>`;
  }).join("");

  if (completedCount === deckTotal && deckTotal) {
    elements.revisionCardGrid.innerHTML = renderDeckSessionSummary(topic);
    recordDeckCompleted(topic);
    if (!sessionCardIds && getCompletedRevisionCount(topic) === topic.cards.length) {
      awardRevisionBadge(topic);
    }
    return;
  }

  clearRevisionAutoReset();

  elements.revisionCardGrid.innerHTML = remainingOrder
    .map((cardIndex) => {
      const card = topic.cards[cardIndex];
      const cardKey = getRevisionCardKey(topic, card);
      const isFlipped = flippedRevisionCards.has(cardKey);
      return `<article class="revision-card${isFlipped ? " flipped" : ""}" data-card-id="${escapeHtml(cardKey)}" role="button" tabindex="0" aria-pressed="${String(isFlipped)}">
        <span class="revision-card-inner">
          <span class="revision-card-face revision-card-front">
            <span class="revision-card-category">${escapeHtml(card.category)}</span>
            <strong>${escapeHtml(card.front)}</strong>
            <span class="revision-card-cue">Reveal answer</span>
          </span>
          <span class="revision-card-face revision-card-back">
            <span class="revision-card-category">Answer</span>
            <span class="revision-card-answer">${escapeHtml(card.back)}</span>
            <span class="revision-card-back-actions">
              <span class="revision-card-cue">Return to question</span>
              <span class="confidence-controls" aria-label="Rate your confidence for this card">
                <button class="confidence-button confident" type="button" data-card-confidence="confident" data-card-id="${escapeHtml(cardKey)}" tabindex="${isFlipped ? "0" : "-1"}">Confident</button>
                <button class="confidence-button needs-practice" type="button" data-card-confidence="needs_practice" data-card-id="${escapeHtml(cardKey)}" tabindex="${isFlipped ? "0" : "-1"}">Need practice</button>
              </span>
            </span>
          </span>
        </span>
      </article>`;
    })
    .join("");
}

function renderDeckSessionSummary(topic) {
  const sessionAttempts = getCurrentSessionAttempts(topic.id);
  const confidence = calculateTopicConfidence(sessionAttempts);
  const weakCardIds = identifyWeakCards(topic.id, sessionAttempts);
  const recommendation = generateRevisionRecommendation(topic.id);
  const weakDisabled = weakCardIds.length ? "" : " disabled";
  const weakMicrocopy = weakCardIds.length
    ? `${weakCardIds.length} card${weakCardIds.length === 1 ? "" : "s"} marked Need practice.`
    : "No need-practice cards in this session.";

  if (!confidence.totalAttempts) {
    return `<div class="deck-summary-panel">
      <div>
        <p class="eyebrow">Session complete</p>
        <h3>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</h3>
        <p>Cards were completed, but no confidence ratings were recorded. Use Confident or Need practice to generate recommendations.</p>
      </div>
      <div class="deck-summary-actions">
        <button type="button" data-summary-action="restart">Restart deck</button>
        <button type="button" data-summary-action="topic-list">Back to topic list</button>
      </div>
    </div>`;
  }

  return `<div class="deck-summary-panel ${escapeHtml(confidence.statusClass)}">
    <div class="deck-summary-copy">
      <p class="eyebrow">Session complete</p>
      <h3>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml(confidence.message)}</p>
    </div>
    <div class="deck-summary-grid" aria-label="Session confidence summary">
      <article><span>Cards reviewed</span><strong>${confidence.totalAttempts}</strong></article>
      <article><span>Confident</span><strong>${confidence.confidentAttempts}</strong></article>
      <article><span>Need practice</span><strong>${confidence.needsPracticeAttempts}</strong></article>
      <article class="confidence-score"><span>Topic confidence</span><strong>${confidence.percent}%</strong><em>${escapeHtml(confidence.band)}</em></article>
    </div>
    <article class="recommendation-card">
      <span>Recommended next</span>
      <strong>${escapeHtml(recommendation.title)}</strong>
      <p>${escapeHtml(recommendation.reason)}</p>
    </article>
    <p class="weak-review-note">${escapeHtml(weakMicrocopy)}</p>
    <div class="deck-summary-actions">
      <button type="button" data-summary-action="weak" ${weakDisabled}>Review need-practice cards</button>
      <button type="button" data-summary-action="restart">Restart deck</button>
      <button type="button" data-summary-action="recommended">${escapeHtml(recommendation.actionLabel)}</button>
      <button type="button" data-summary-action="topic-list">Back to topic list</button>
    </div>
  </div>`;
}

function handleDeckSummaryAction(action) {
  const topic = getActiveRevisionTopic();
  const recommendation = generateRevisionRecommendation(topic.id);

  if (action === "weak") {
    startWeakCardReview(topic.id);
    return;
  }

  if (action === "restart") {
    resetActiveRevisionCards();
    return;
  }

  if (action === "recommended") {
    if (recommendation.type === "weak_cards") {
      startWeakCardReview(topic.id);
      return;
    }

    if (recommendation.type === "repeat_topic") {
      resetActiveRevisionCards();
      return;
    }

    if (recommendation.type === "quiz_mode") {
      startNeatQuiz(recommendation.topicId || topic.id);
      elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (recommendation.topicId) {
      activeRevisionTopicId = recommendation.topicId;
      neatQuizState = createEmptyNeatQuizState();
      clearRevisionAutoReset();
      startRevisionSession(recommendation.topicId);
      renderRevisionPage();
    }
    return;
  }

  if (action === "topic-list") {
    elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function startWeakCardReview(topicId) {
  const topic = getQuizTopicById(topicId);
  if (!topic) return;

  const weakCardIds = identifyWeakCards(topic.id, getCurrentSessionAttempts(topic.id));
  if (!weakCardIds.length) return;

  weakCardIds.forEach((cardId) => {
    completedRevisionCards.delete(cardId);
    flippedRevisionCards.delete(cardId);
  });
  activeRevisionTopicId = topic.id;
  startRevisionSession(topic.id, "weak", weakCardIds);
  renderRevisionPage();
}

function recordDeckCompleted(topic) {
  if (!topic || revisionSession?.completedAt) return;

  revisionSession.completedAt = new Date().toISOString();
  recordActivityEvent({ type: "deck_completed", topicId: topic.id });
}

function renderRevisionDashboard(topic) {
  const today = getTodayStudyStats();
  const totals = getRevisionAchievementTotals();
  const recommendedTopic = getRecommendedRevisionTopic() || topic;
  const recommendedCompleted = recommendedTopic ? getCompletedRevisionCount(recommendedTopic) : 0;
  const recommendedTotal = recommendedTopic?.cards?.length || 0;

  elements.revisionTodayStat.textContent = `${today.cards}/${DAILY_REVIEW_GOAL}`;
  elements.revisionTodayCopy.textContent =
    today.cards >= DAILY_REVIEW_GOAL ? "Daily mission complete" : `${Math.max(0, DAILY_REVIEW_GOAL - today.cards)} cards to today's goal`;
  elements.revisionMasteryStat.textContent = `${totals.earnedCards}/${totals.totalCards}`;
  elements.revisionMasteryCopy.textContent = `${totals.earnedTopics}/${totals.totalTopics} topic badges unlocked`;

  if (recommendedTopic) {
    elements.revisionRecommendedNext.textContent = `${recommendedTopic.code} ${recommendedTopic.title}`;
    elements.revisionRecommendedMeta.textContent = `${recommendedCompleted}/${recommendedTotal} cards complete`;
    elements.revisionWeakTopic.textContent = `${recommendedTopic.code} ${recommendedTopic.title}`;
  }
}

function handleMasteryMapClick(event) {
  const button = event.target.closest("[data-jump-topic]");
  if (!button) return;

  activeRevisionTopicId = button.dataset.jumpTopic;
  neatQuizState = createEmptyNeatQuizState();
  clearRevisionAutoReset();
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
}

function renderNeatQuestions() {
  const activeTopic = getActiveRevisionTopic();
  const catalog = getNeatQuizCatalog();
  const totalQuestions = catalog.reduce((sum, quiz) => sum + quiz.questionCount, 0);

  elements.neatQuestionsCount.textContent = `${catalog.length} topic packs · ${totalQuestions} questions`;
  elements.neatQuestionsCurrentLink.textContent = "Start quick practice";
  elements.neatQuestionsCurrentLink.hidden = !activeTopic;

  elements.neatQuestionsGrid.innerHTML = catalog.map((quiz) => {
    const isActive = quiz.topic.id === activeTopic?.id;
    const isRunning = quiz.topic.id === neatQuizState.quizId && !neatQuizState.completed;
    const quizProgress = neatQuizProgress[quiz.topic.id] || {};
    const completedCards = getCompletedRevisionCount(quiz.topic);
    const topicPercent = earnedRevisionBadges[quiz.topic.id]
      ? 100
      : quiz.topic.cards.length
        ? Math.round((completedCards / quiz.topic.cards.length) * 100)
        : 0;
    const progressLabel = getNeatQuizProgressLabel(quiz.topic.id);
    const sourceLabel = quiz.sourceCount ? `${quiz.sourceCount} Forms reference${quiz.sourceCount === 1 ? "" : "s"}` : "Native Neat Notes quiz";
    const activeLabel = isActive ? `<span class="question-current">Current topic</span>` : "";
    const runningLabel = isRunning ? `<span class="question-variant">In progress</span>` : "";
    const actionLabel = isRunning ? "Continue" : quizProgress.attempts ? "Retry quiz" : "Start quiz";

    return `<article class="neat-question-card${isActive ? " active" : ""}${isRunning ? " running" : ""}">
      <div class="question-card-topline">
        <span class="question-code">${escapeHtml(quiz.topic.code)}</span>
        ${runningLabel || activeLabel}
      </div>
      <div class="neat-question-card-copy">
        <strong>${escapeHtml(quiz.topic.title)}</strong>
        <span>${quiz.questionCount} questions · ${escapeHtml(sourceLabel)}</span>
      </div>
      <div class="topic-card-meter" aria-label="${topicPercent}% flashcard progress">
        <span style="width: ${topicPercent}%"></span>
      </div>
      <div class="topic-card-meta">
        <span>${topicPercent}% deck progress</span>
        <span>${escapeHtml(progressLabel)}</span>
      </div>
      <div class="topic-card-actions">
        <button type="button" data-topic-id="${escapeHtml(quiz.topic.id)}">Open deck</button>
        <button type="button" data-start-quiz="${escapeHtml(quiz.topic.id)}">${actionLabel}</button>
      </div>
    </article>`;
  }).join("");

  renderNeatQuizPanel();
}

function getNeatQuizCatalog() {
  return REVISION_TOPICS.map((topic) => {
    const sources = NEAT_QUESTIONS.filter((question) => question.code === topic.code);
    return {
      topic,
      questionCount: topic.cards.length,
      sourceCount: sources.length,
      sources,
    };
  });
}

function getNeatQuizProgressLabel(topicId) {
  const progress = neatQuizProgress[topicId];
  if (!progress?.attempts) {
    return "No attempts yet";
  }

  const score = `${progress.bestScore || 0}/${progress.totalQuestions || 0}`;
  return `Best ${score} · ${progress.bestStreak || 0} streak`;
}

function renderNeatQuizPanel() {
  const topic = getQuizTopicById(neatQuizState.quizId);

  if (!topic || !neatQuizState.questions.length) {
    const activeTopic = getActiveRevisionTopic();
    const activeQuestionCount = activeTopic?.cards?.length || 0;
    elements.neatQuizPanel.innerHTML = `<div class="neat-quiz-empty">
      <div>
        <p class="eyebrow">Quick Practice</p>
        <h4>Practise ${escapeHtml(activeTopic?.code || "this topic")} one question at a time.</h4>
        <p>Answer one question at a time with instant marking, corrections and streak tracking.</p>
      </div>
      <button type="button" data-start-current-quiz>Start quick practice</button>
      <span class="quick-practice-note">${activeQuestionCount} questions in this topic pack</span>
    </div>`;
    return;
  }

  if (neatQuizState.completed) {
    renderNeatQuizComplete(topic);
    return;
  }

  const question = neatQuizState.questions[neatQuizState.currentIndex];
  const total = neatQuizState.questions.length;
  const currentNumber = neatQuizState.currentIndex + 1;
  const accuracy = neatQuizState.answered
    ? Math.round((neatQuizState.score / currentNumber) * 100)
    : Math.round((neatQuizState.score / Math.max(1, neatQuizState.currentIndex)) * 100);
  const feedback = neatQuizState.answered ? renderNeatQuizFeedback(question) : "";
  const nextLabel = neatQuizState.currentIndex === total - 1 ? "Finish quiz" : "Next question";

  elements.neatQuizPanel.innerHTML = `<article class="neat-quiz-player">
    <div class="neat-quiz-player-head">
      <div>
        <p class="eyebrow">Neat Questions · ${escapeHtml(topic.code)}</p>
        <h4>${escapeHtml(topic.title)}</h4>
      </div>
      <div class="neat-quiz-stats" aria-label="Quiz progress">
        <span><strong>${currentNumber}</strong>/${total}</span>
        <span><strong>${neatQuizState.score}</strong> correct</span>
        <span><strong>${neatQuizState.streak}</strong> streak</span>
        <span><strong>${accuracy}</strong>%</span>
      </div>
    </div>
    <div class="neat-quiz-meter" aria-hidden="true"><span style="width: ${(currentNumber / total) * 100}%"></span></div>
    <div class="neat-quiz-question">
      <span>${escapeHtml(question.category)}</span>
      <strong>${escapeHtml(question.prompt)}</strong>
    </div>
    <div class="neat-quiz-options">
      ${question.options.map((option, index) => renderNeatQuizOption(question, option, index)).join("")}
    </div>
    ${feedback}
    <div class="neat-quiz-controls">
      <button type="button" data-quiz-restart>Restart</button>
      <button type="button" data-quiz-next ${neatQuizState.answered ? "" : "disabled"}>${nextLabel}</button>
    </div>
  </article>`;
}

function renderNeatQuizOption(question, option, index) {
  const isSelected = neatQuizState.selectedIndex === index;
  const isCorrect = question.correctIndex === index;
  const marker = String.fromCharCode(65 + index);
  const stateClass = neatQuizState.answered
    ? isCorrect
      ? " correct"
      : isSelected
        ? " incorrect"
        : ""
    : "";

  return `<button class="neat-quiz-option${isSelected ? " selected" : ""}${stateClass}" type="button" data-quiz-option="${index}" ${neatQuizState.answered ? "disabled" : ""} aria-pressed="${String(isSelected)}">
    <span>${marker}</span>
    <strong>${escapeHtml(formatQuizOptionText(option))}</strong>
  </button>`;
}

function renderNeatQuizFeedback(question) {
  const wasCorrect = neatQuizState.selectedIndex === question.correctIndex;
  return `<div class="neat-quiz-feedback ${wasCorrect ? "correct" : "incorrect"}">
    <strong>${wasCorrect ? "Correct." : "Not quite."}</strong>
    <p>${wasCorrect ? "Nice work. Your streak continues." : `Correct answer: ${escapeHtml(formatQuizOptionText(question.answer))}`}</p>
    ${wasCorrect ? "" : `<small>${escapeHtml(question.explanation)}</small>`}
  </div>`;
}

function renderNeatQuizComplete(topic) {
  const total = neatQuizState.questions.length;
  const percent = total ? Math.round((neatQuizState.score / total) * 100) : 0;
  elements.neatQuizPanel.innerHTML = `<article class="neat-quiz-complete">
    <div>
      <p class="eyebrow">Quiz complete</p>
      <h4>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</h4>
      <p>You scored ${neatQuizState.score}/${total}. Best streak this run: ${neatQuizState.bestStreak}.</p>
    </div>
    <div class="neat-quiz-result-ring" aria-label="${percent}% correct">
      <strong>${percent}%</strong>
      <span>correct</span>
    </div>
    <div class="neat-quiz-controls">
      <button type="button" data-quiz-restart>Try again</button>
      <button type="button" data-start-current-quiz>Current topic quiz</button>
    </div>
  </article>`;
}

function handleNeatQuestionsClick(event) {
  const topicButton = event.target.closest("[data-topic-id]");
  if (topicButton) {
    activeRevisionTopicId = topicButton.dataset.topicId;
    neatQuizState = createEmptyNeatQuizState();
    clearRevisionAutoReset();
    renderRevisionPage();
    document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const button = event.target.closest("[data-start-quiz]");
  if (!button) return;

  startNeatQuiz(button.dataset.startQuiz);
}

function handleNeatQuizPanelClick(event) {
  if (event.target.closest("[data-start-current-quiz]")) {
    startActiveTopicQuiz();
    return;
  }

  if (event.target.closest("[data-quiz-restart]")) {
    startNeatQuiz(neatQuizState.quizId || getActiveRevisionTopic()?.id);
    return;
  }

  const option = event.target.closest("[data-quiz-option]");
  if (option) {
    answerNeatQuizQuestion(Number(option.dataset.quizOption));
    return;
  }

  if (event.target.closest("[data-quiz-next]")) {
    advanceNeatQuiz();
  }
}

function startActiveTopicQuiz() {
  startNeatQuiz(getActiveRevisionTopic()?.id);
}

function startNeatQuiz(topicId) {
  const topic = getQuizTopicById(topicId) || getActiveRevisionTopic();
  if (!topic) return;

  activeRevisionTopicId = topic.id;
  const questions = buildNativeQuizQuestions(topic);
  neatQuizState = {
    ...createEmptyNeatQuizState(),
    quizId: topic.id,
    questions,
    bestStreak: neatQuizProgress[topic.id]?.bestStreak || 0,
  };
  renderRevisionPage();
}

function answerNeatQuizQuestion(optionIndex) {
  if (neatQuizState.answered || neatQuizState.completed) return;

  const question = neatQuizState.questions[neatQuizState.currentIndex];
  if (!question || !Number.isInteger(optionIndex)) return;

  const wasCorrect = optionIndex === question.correctIndex;
  neatQuizState.selectedIndex = optionIndex;
  neatQuizState.answered = true;
  neatQuizState.score += wasCorrect ? 1 : 0;
  neatQuizState.streak = wasCorrect ? neatQuizState.streak + 1 : 0;
  neatQuizState.bestStreak = Math.max(neatQuizState.bestStreak, neatQuizState.streak);
  persistNeatQuizBestStreak(neatQuizState.quizId, neatQuizState.bestStreak);
  renderNeatQuestions();
}

function advanceNeatQuiz() {
  if (!neatQuizState.answered || neatQuizState.completed) return;

  if (neatQuizState.currentIndex >= neatQuizState.questions.length - 1) {
    completeNeatQuiz();
    return;
  }

  neatQuizState.currentIndex += 1;
  neatQuizState.selectedIndex = null;
  neatQuizState.answered = false;
  renderNeatQuestions();
}

function completeNeatQuiz() {
  const topicId = neatQuizState.quizId;
  if (!topicId) return;

  const previous = neatQuizProgress[topicId] || {};
  const total = neatQuizState.questions.length;
  neatQuizProgress = {
    ...neatQuizProgress,
    [topicId]: {
      attempts: (Number(previous.attempts) || 0) + 1,
      bestScore: Math.max(Number(previous.bestScore) || 0, neatQuizState.score),
      bestStreak: Math.max(Number(previous.bestStreak) || 0, neatQuizState.bestStreak),
      lastScore: neatQuizState.score,
      totalQuestions: total,
      lastCompletedAt: new Date().toISOString(),
    },
  };
  saveNeatQuizProgress();
  neatQuizState.completed = true;
  renderNeatQuestions();
}

function persistNeatQuizBestStreak(topicId, bestStreak) {
  if (!topicId) return;

  const previous = neatQuizProgress[topicId] || {};
  neatQuizProgress = {
    ...neatQuizProgress,
    [topicId]: {
      ...previous,
      bestStreak: Math.max(Number(previous.bestStreak) || 0, bestStreak),
      totalQuestions: previous.totalQuestions || getQuizTopicById(topicId)?.cards?.length || 0,
    },
  };
  saveNeatQuizProgress();
}

function buildNativeQuizQuestions(topic) {
  const allCards = REVISION_TOPICS.flatMap((revisionTopic) =>
    revisionTopic.cards.map((card) => ({
      ...card,
      topicId: revisionTopic.id,
      topicCode: revisionTopic.code,
      topicTitle: revisionTopic.title,
    }))
  );

  return topic.cards.map((card) => {
    const distractors = getQuizDistractors(card, topic, allCards);
    const options = seededSort([card.back, ...distractors], `${topic.id}:${card.id}:options`);
    return {
      id: card.id,
      category: card.category,
      prompt: card.front,
      answer: card.back,
      explanation: card.back,
      options,
      correctIndex: options.findIndex((option) => option === card.back),
    };
  });
}

function getQuizDistractors(card, topic, allCards) {
  const answerSeen = new Set([normaliseQuizAnswer(card.back)]);
  const optionSeen = new Set([normaliseQuizAnswer(formatQuizOptionText(card.back))]);
  const ranked = allCards
    .filter((candidate) => !(candidate.topicId === topic.id && candidate.id === card.id))
    .filter((candidate) => {
      const key = normaliseQuizAnswer(candidate.back);
      if (!key || answerSeen.has(key)) return false;
      answerSeen.add(key);
      return true;
    })
    .map((candidate) => ({
      answer: candidate.back,
      score: scoreQuizDistractor(card, topic, candidate),
    }))
    .sort((a, b) => b.score - a.score || hashString(`${topic.id}:${card.id}:${a.answer}`) - hashString(`${topic.id}:${card.id}:${b.answer}`));

  const selected = [];
  ranked.forEach((candidate) => {
    const displayKey = normaliseQuizAnswer(formatQuizOptionText(candidate.answer));
    if (selected.length >= 3 || optionSeen.has(displayKey)) return;
    optionSeen.add(displayKey);
    selected.push(candidate.answer);
  });

  return selected;
}

function scoreQuizDistractor(card, topic, candidate) {
  const sameTopic = candidate.topicId === topic.id;
  const sameCategory = normaliseQuizAnswer(candidate.category) === normaliseQuizAnswer(card.category);
  const sameQuestionType = getQuizQuestionType(candidate.front) === getQuizQuestionType(card.front);
  const sameStem = getQuizQuestionStem(candidate.front) === getQuizQuestionStem(card.front);
  const lengthDifference = Math.abs(normaliseQuizAnswer(candidate.back).length - normaliseQuizAnswer(card.back).length);

  let score = 0;
  score += sameTopic ? 80 : 10;
  score += sameCategory ? 68 : 0;
  score += sameQuestionType ? 36 : 0;
  score += sameStem ? 18 : 0;
  score += getQuizKeywordOverlapScore(card, topic, candidate);
  score += Math.max(0, 24 - Math.floor(lengthDifference / 8));

  if (!sameTopic && !sameCategory) score -= 14;
  if (lengthDifference > 260) score -= 12;

  return score;
}

function getQuizQuestionType(prompt) {
  const text = normaliseQuizAnswer(prompt);
  if (/\b(advantage|benefit|strength|why is it useful)\b/.test(text)) return "benefit";
  if (/\b(disadvantage|drawback|limitation|weakness|problem)\b/.test(text)) return "limitation";
  if (/\b(example|give|name|state)\b/.test(text)) return "example";
  if (/\b(store|hold|contain)\b/.test(text)) return "storage";
  if (/\b(role|do|used for|purpose|function)\b/.test(text)) return "role";
  if (/\b(stage|step|cycle|process|during|happen)\b/.test(text)) return "process";
  if (/\b(compare|difference|distinguish)\b/.test(text)) return "comparison";
  if (/\b(factor|affect|improve|performance)\b/.test(text)) return "factor";
  if (/\b(what is|define|mean|describe|explain)\b/.test(text)) return "definition";
  return "general";
}

function getQuizQuestionStem(prompt) {
  const text = normaliseQuizAnswer(prompt);
  const match = text.match(/^(what is|what are|what does|what do|why|how|which|give|name|state|describe|explain|compare|define)\b/);
  return match?.[1] || getQuizQuestionType(text);
}

function getQuizKeywordOverlapScore(card, topic, candidate) {
  const targetWords = new Set(getQuizKeywords(`${card.front} ${card.category} ${topic.title}`));
  const candidateWords = new Set(getQuizKeywords(`${candidate.front} ${candidate.category} ${candidate.topicTitle || ""}`));
  let overlap = 0;
  targetWords.forEach((word) => {
    if (candidateWords.has(word)) overlap += 1;
  });
  return Math.min(32, overlap * 8);
}

function getQuizKeywords(value) {
  const stopWords = new Set([
    "about",
    "after",
    "answer",
    "are",
    "can",
    "does",
    "for",
    "from",
    "how",
    "into",
    "the",
    "this",
    "used",
    "what",
    "when",
    "where",
    "which",
    "with",
  ]);

  return normaliseQuizAnswer(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function formatQuizOptionText(value) {
  let text = String(value || "").trim();
  text = text.replace(/^it\s+/i, "");
  text = text.replace(/^they\s+/i, "");
  text = text.replace(
    /^the\s+(?:[A-Z0-9][A-Za-z0-9()/-]*\s+){0,6}(stores|holds|executes|performs|decodes|retrieves|coordinates|manages|contains|uses|allows|provides|controls|represents|converts|translates|checks|carries|temporarily)\b/i,
    "$1"
  );
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function seededSort(items, seed) {
  return [...items].sort((a, b) => hashString(`${seed}:${a}`) - hashString(`${seed}:${b}`));
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normaliseQuizAnswer(value) {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function getQuizTopicById(topicId) {
  return REVISION_TOPICS.find((topic) => topic.id === topicId);
}

function selectRevisionTopic(event) {
  const button = event.target.closest("[data-topic-id]");
  if (!button) return;

  activeRevisionTopicId = button.dataset.topicId;
  neatQuizState = createEmptyNeatQuizState();
  clearRevisionAutoReset();
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
}

function flipRevisionCard(event) {
  const summaryAction = event.target.closest("[data-summary-action]");
  if (summaryAction) {
    handleDeckSummaryAction(summaryAction.dataset.summaryAction);
    return;
  }

  const confidenceButton = event.target.closest("[data-card-confidence]");
  if (confidenceButton) {
    rateRevisionCard(confidenceButton.dataset.cardId, confidenceButton.dataset.cardConfidence);
    return;
  }

  const doneButton = event.target.closest("[data-card-done]");
  if (doneButton) {
    markRevisionCardDone(doneButton.dataset.cardDone);
    return;
  }

  const card = event.target.closest("[data-card-id]");
  if (!card) return;

  const cardId = card.dataset.cardId;
  if (flippedRevisionCards.has(cardId)) {
    flippedRevisionCards.delete(cardId);
  } else {
    flippedRevisionCards.add(cardId);
  }
  renderRevisionPage();
}

function handleRevisionCardKeydown(event) {
  if (event.target.closest("[data-card-done], [data-card-confidence]")) return;
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest("[data-card-id]");
  if (!card) return;

  event.preventDefault();
  const cardId = card.dataset.cardId;
  if (flippedRevisionCards.has(cardId)) {
    flippedRevisionCards.delete(cardId);
  } else {
    flippedRevisionCards.add(cardId);
  }
  renderRevisionPage();
}

function rateRevisionCard(cardId, confidence) {
  if (!cardId || !["confident", "needs_practice"].includes(confidence)) return;

  const topic = getRevisionTopicFromCardId(cardId);
  recordCardAttempt(cardId, topic?.id, confidence);
  markRevisionCardDone(cardId, { recordStudy: true, awardBadge: false });
}

function markRevisionCardDone(cardId, options = {}) {
  if (!cardId) return;

  flippedRevisionCards.delete(cardId);
  completedRevisionCards.add(cardId);
  const topic = getRevisionTopicFromCardId(cardId);
  if (options.recordStudy !== false) {
    recordStudyCard(topic);
  }
  if (options.awardBadge !== false && topic && getCompletedRevisionCount(topic) === topic.cards.length) {
    awardRevisionBadge(topic);
  }
  renderRevisionPage();
}

function resetActiveRevisionCards() {
  const topic = getActiveRevisionTopic();
  clearRevisionAutoReset();
  topic.cards.forEach((card) => {
    const cardKey = getRevisionCardKey(topic, card);
    flippedRevisionCards.delete(cardKey);
    completedRevisionCards.delete(cardKey);
  });
  startRevisionSession(topic.id);
  renderRevisionPage();
}

function shuffleActiveRevisionCards() {
  const topic = getActiveRevisionTopic();
  const order = getRevisionCardOrder(topic);
  clearRevisionAutoReset();

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  topic.cards.forEach((card) => flippedRevisionCards.delete(getRevisionCardKey(topic, card)));
  startRevisionSession(topic.id);
  renderRevisionPage();
}

function getActiveRevisionTopic() {
  return REVISION_TOPICS.find((topic) => topic.id === activeRevisionTopicId) || REVISION_TOPICS[0];
}

function getRevisionTopicFromCardId(cardId) {
  const topicId = String(cardId).split(":")[0];
  return REVISION_TOPICS.find((topic) => topic.id === topicId);
}

function getRevisionCardOrder(topic) {
  if (!revisionCardOrder[topic.id] || revisionCardOrder[topic.id].length !== topic.cards.length) {
    revisionCardOrder[topic.id] = topic.cards.map((_, index) => index);
  }
  return revisionCardOrder[topic.id];
}

function getRevisionCardKey(topic, card) {
  return `${topic.id}:${card.id}`;
}

function getCompletedRevisionCount(topic) {
  return topic.cards.filter((card) => completedRevisionCards.has(getRevisionCardKey(topic, card))).length;
}

function scheduleRevisionAutoReset(topicId) {
  if (revisionAutoResetTimer) return;

  revisionAutoResetTimer = setTimeout(() => {
    revisionAutoResetTimer = null;
    if (activeRevisionTopicId !== topicId) return;

    const topic = getActiveRevisionTopic();
    if (getCompletedRevisionCount(topic) === topic.cards.length) {
      resetActiveRevisionCards();
    }
  }, 1400);
}

function clearRevisionAutoReset() {
  if (!revisionAutoResetTimer) return;

  clearTimeout(revisionAutoResetTimer);
  revisionAutoResetTimer = null;
}

function renderPlan() {
  if (isGuestMode || !currentUser) {
    elements.userPlanLabel.textContent = "Guest";
    elements.workspaceKind.disabled = true;
    elements.instantCardsButton.disabled = !selectedId;
    elements.studyPackButton.disabled = true;
    elements.exportPdfButton.disabled = true;
    elements.historyButton.disabled = true;
    elements.dashboardButton.hidden = true;
    return;
  }

  const plan = currentUser.entitlements || plans[currentUser.plan] || plans.free || {};

  elements.userPlanLabel.textContent = currentUser.planName || plan.name || "Free";
  elements.workspaceKind.disabled = !hasFeature("classroomSpaces");
  elements.instantCardsButton.disabled = !selectedId;
  elements.studyPackButton.disabled = !selectedId || !hasFeature("studyPack");
  elements.exportPdfButton.disabled = !selectedId || !hasFeature("pdfExport");
  elements.historyButton.disabled = !selectedId || !hasFeature("versionHistory");
  elements.dashboardButton.hidden = !hasFeature("teacherDashboard");
}

function renderWorkspaces() {
  elements.workspaceCount.textContent = workspaces.length;
  elements.workspaceList.innerHTML = workspaces
    .map((workspace) => {
      const activeClass = workspace.id === activeWorkspaceId ? " active" : "";
      const noteCount = workspace.id === activeWorkspaceId ? notes.length : workspace.note_count || 0;
      const memberCount = workspace.id === activeWorkspaceId ? members.length || workspace.member_count || 1 : workspace.member_count || 1;
      return `<button class="workspace-button${activeClass}" data-id="${workspace.id}">
        <span>${escapeHtml(workspace.name)}</span>
        <small>${escapeHtml(workspace.kind || "project")} · ${noteCount} notes · ${memberCount} members</small>
      </button>`;
    })
    .join("");

  document.querySelectorAll(".workspace-button").forEach((button) => {
    button.addEventListener("click", () => {
      setAppSection("notes");
      selectWorkspace(button.dataset.id);
    });
  });
}

function renderMembers(error = "") {
  if (error) {
    elements.memberList.innerHTML = `<p class="status-message error">${escapeHtml(error)}</p>`;
    return;
  }

  if (isGuestMode) {
    elements.shareForm.classList.add("locked");
    elements.memberList.innerHTML = `<p class="status-message">Create an account to invite collaborators and share class spaces.</p>`;
    return;
  }

  elements.shareForm.classList.toggle("locked", !hasFeature("collaboration"));
  elements.memberList.innerHTML = members
    .map((member) => `<span title="${escapeHtml(member.email)}">${escapeHtml(member.name)} · ${member.role}</span>`)
    .join("") + (!hasFeature("collaboration") ? `<p class="status-message">Upgrade to Pro to invite collaborators.</p>` : "");
}

function renderNotesAndFolders() {
  const visibleNotes = getVisibleNotes();
  if (!selectedId || !notes.some((note) => note.id === selectedId)) {
    selectedId = visibleNotes[0]?.id || notes[0]?.id || null;
  }

  renderFolders();
  renderNotes(visibleNotes);
  renderRecentNotes();
}

function renderFolders() {
  const tagCounts = notes.reduce((counts, note) => {
    counts[note.tag] = (counts[note.tag] || 0) + 1;
    return counts;
  }, {});

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  elements.workspaceTitle.textContent = activeWorkspace?.name || "Your notes";
  elements.noteCount.textContent = notes.length;
  elements.allCount.textContent = notes.length;
  elements.activeFolderLabel.textContent = activeTag === "all" ? "All notes" : `#${activeTag}`;

  document.querySelector('[data-tag="all"]').classList.toggle("active", activeTag === "all");
  elements.tagList.innerHTML = Object.entries(tagCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, count]) => {
      const activeClass = tag === activeTag ? " active" : "";
      return `<button class="folder-button${activeClass}" data-tag="${escapeHtml(tag)}">
        <span>#${escapeHtml(tag)}</span>
        <span class="folder-count">${count}</span>
      </button>`;
    })
    .join("");

  document.querySelectorAll(".folder-button").forEach((button) => {
    button.addEventListener("click", () => {
      setAppSection("notes");
      activeTag = button.dataset.tag;
      selectedId = getVisibleNotes()[0]?.id || null;
      renderNotesAndFolders();
      renderEditor();
    });
  });
}

function renderNotes(visibleNotes) {
  if (!activeWorkspaceId) {
    elements.notesList.innerHTML = `<div class="empty-state">Create a collaboration space to begin.</div>`;
    return;
  }

  if (!visibleNotes.length) {
    elements.notesList.innerHTML = `<div class="empty-state">No notes here yet.</div>`;
    return;
  }

  elements.notesList.innerHTML = visibleNotes
    .map((note) => {
      const activeClass = note.id === selectedId ? " active" : "";
      const badges = getNoteStatusBadges(note);
      return `<button class="note-card${activeClass}" data-id="${note.id}">
        <div class="note-card-head">
          <h3>${escapeHtml(note.title || createTitle(note.body))}</h3>
          ${badges.length ? `<span class="note-status-dot" aria-label="${escapeHtml(badges[0].label)}"></span>` : ""}
        </div>
        <p>${escapeHtml(note.summary || createSummary(note.body))}</p>
        <div class="note-badges" aria-label="Note status">
          ${badges.map((badge) => `<span class="note-badge ${badge.type}">${escapeHtml(badge.label)}</span>`).join("")}
        </div>
        <div class="note-meta">
          <span>#${escapeHtml(note.tag)}</span>
          <span>${getRelativeEditLabel(note.updated_at || note.created_at)}</span>
        </div>
      </button>`;
    })
    .join("");

  document.querySelectorAll(".note-card").forEach((card) => {
    card.addEventListener("click", () => {
      setAppSection("notes");
      selectedId = card.dataset.id;
      renderNotesAndFolders();
      renderEditor();
    });
  });
}

function renderRecentNotes() {
  if (!elements.recentNoteList) return;

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 4);

  if (!recentNotes.length) {
    elements.recentNoteList.innerHTML = `<p class="status-message">Recent notes will appear after you start writing.</p>`;
    return;
  }

  elements.recentNoteList.innerHTML = recentNotes
    .map((note) => {
      const activeClass = note.id === selectedId ? " active" : "";
      return `<button class="recent-note-button${activeClass}" type="button" data-recent-note="${escapeHtml(note.id)}">
        <span>${escapeHtml(note.title || createTitle(note.body))}</span>
        <small>${getRelativeEditLabel(note.updated_at || note.created_at)}</small>
      </button>`;
    })
    .join("");
}

function getNoteStatusBadges(note) {
  const plainLines = getPlainNoteLines(note.body || "");
  const badges = [];
  const updatedAt = new Date(note.updated_at || note.created_at);
  const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / 36e5;

  if (hoursSinceUpdate <= 24) {
    badges.push({ label: "Edited today", type: "recent" });
  }

  if (plainLines.length >= 4 || createInstantNoteCards(note.body || "").length >= 3) {
    badges.push({ label: "Revision ready", type: "revision" });
  }

  if ((note.summary || createSummary(note.body || "")).length > 38 && plainLines.length) {
    badges.push({ label: "Auto-summary", type: "summary" });
  }

  if (plainLines.length > 0 && plainLines.length < 3) {
    badges.push({ label: "Draft", type: "draft" });
  }

  if (members.length > 1) {
    badges.push({ label: "Shared", type: "shared" });
  }

  return badges.slice(0, 3);
}

function getRelativeEditLabel(value) {
  if (!value) return "Not edited yet";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "Edited just now";
  if (minutes < 60) return `Edited ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Edited ${hours}h ago`;

  return formatDate(value);
}

function handleNotesSidebarClick(event) {
  const recentNote = event.target.closest("[data-recent-note]");
  if (recentNote) {
    setAppSection("notes");
    selectedId = recentNote.dataset.recentNote;
    renderNotesAndFolders();
    renderEditor();
    return;
  }

  if (event.target.closest("[data-open-sidebar-settings]")) {
    openSettingsModal();
  }
}

function setSaveState(message) {
  elements.saveState.textContent = message;
}

function renderSummaryContent(note) {
  const lines = getPlainNoteLines(note.body || "");
  if (!lines.length) {
    return renderSummaryEmptyState(
      "Start writing and Neat Notes will shape this into a study summary.",
      "Use headings, bullets, definitions, and tasks to unlock cleaner revision outputs."
    );
  }

  const summary = note.summary || createSummary(note.body);
  const cardCount = createInstantNoteCards(note.body || "").length;
  const signals = [
    `${lines.length} learning point${lines.length === 1 ? "" : "s"}`,
    cardCount ? `${cardCount} instant card${cardCount === 1 ? "" : "s"} ready` : "Add bullets for cards",
  ];

  return `<p>${escapeHtml(summary)}</p>
    <div class="summary-signals">
      ${signals.map((signal) => `<span>${escapeHtml(signal)}</span>`).join("")}
    </div>`;
}

function renderSummaryEmptyState(title, detail) {
  return `<div class="summary-empty-state">
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(detail)}</p>
    <ul>
      <li>Key points become summaries</li>
      <li>Bullets become flashcards</li>
      <li>Tasks become revision actions</li>
    </ul>
  </div>`;
}

function renderFormattedPreviewEmptyState() {
  return `<div class="formatted-empty-state">
    <strong>Your formatted preview will appear here.</strong>
    <p>Try a topic heading, a short definition, and three bullets to see the note become revision-ready.</p>
    <div>
      <span># Topic title</span>
      <span>- Key learning point</span>
      <span>&gt; Definition: explanation</span>
    </div>
  </div>`;
}

function renderEditor() {
  const note = getSelectedNote();
  elements.deleteButton.disabled = !note;
  elements.insightsPanel.hidden = true;
  elements.insightsPanel.innerHTML = "";

  if (!note) {
    elements.autoTitle.textContent = "No note selected";
    elements.noteDate.textContent = activeWorkspaceId ? "Create a note" : "Create a workspace";
    elements.noteBody.value = "";
    elements.noteBody.disabled = true;
    elements.tagInput.value = "";
    elements.tagInput.disabled = true;
    setSaveState("No note selected");
    elements.summaryText.innerHTML = renderSummaryEmptyState("Create a note to begin.", "Your summary, key terms, and revision prompts will appear as you write.");
    elements.formattedPreview.innerHTML = renderFormattedPreviewEmptyState();
    renderPlan();
    return;
  }

  elements.noteBody.disabled = false;
  elements.tagInput.disabled = false;
  elements.noteBody.value = note.body;
  elements.tagInput.value = note.tag;
  renderEditorDetails(true);
  renderPlan();
}

function renderEditorDetails(updateBody) {
  const note = getSelectedNote();
  if (!note) return;

  elements.autoTitle.textContent = note.title || createTitle(note.body);
  elements.noteDate.textContent = `Created ${formatDate(note.created_at)} · Updated ${formatDate(note.updated_at)}`;
  elements.summaryText.innerHTML = renderSummaryContent(note);
  elements.formattedPreview.innerHTML = formatNote(note.body);

  if (updateBody) {
    setSaveState(`Last edited ${getRelativeEditLabel(note.updated_at || note.created_at).replace(/^Edited\s*/i, "")}`);
  }

  if (updateBody && document.activeElement !== elements.noteBody) {
    elements.noteBody.value = note.body;
  }
}

function handleStudyPaneClick(event) {
  const generator = event.target.closest("[data-generator-action]");
  if (!generator) return;

  const action = generator.dataset.generatorAction;

  if (action === "flashcards") {
    showInstantCards();
    return;
  }

  if (action === "summary") {
    showInsightsMessage("Summary is already live. Add more bullets, definitions, or tasks to improve the study output.", "success");
    return;
  }

  const labels = {
    quiz: "self-marking quiz generation",
    exam: "OCR-style exam question generation",
    organiser: "knowledge organiser creation",
    "mind-map": "mind map generation",
  };

  showInsightsMessage(`${labels[action] || "This generator"} is prepared for a future Student Pro or Teacher tier.`, "success");
}

async function exportSelectedPdf() {
  const note = getSelectedNote();
  if (!note) return;

  if (!hasFeature("pdfExport")) {
    showInsightsMessage("PDF export is part of Pro and Teacher plans.", "error");
    return;
  }

  window.open(`/api/notes/${note.id}/export.pdf`, "_blank", "noopener");
}

function showInstantCards() {
  const note = getSelectedNote();
  if (!note) return;

  generatedCardFlips.clear();
  generatedNoteCards = createInstantNoteCards(note.body);

  if (!generatedNoteCards.length) {
    showInsightsMessage("Add a few headings, bullet points, definitions, or tasks and Instant cards will turn them into a revision sprint.", "error");
    return;
  }

  elements.insightsPanel.hidden = false;
  elements.insightsPanel.innerHTML = `
    <div class="section-title">
      <span>Instant cards</span>
      <span>${generatedNoteCards.length} generated</span>
    </div>
    <div class="instant-card-lab">
      <div class="instant-card-lab-head">
        <div>
          <strong>Revision sprint from this note</strong>
          <p>Generated locally from your headings, lists, definitions, and tasks. Click a card to reveal the answer.</p>
        </div>
        <button type="button" data-insert-generated-cards>Save draft cards</button>
      </div>
      <div class="instant-card-grid">
        ${generatedNoteCards
          .map(
            (card, index) => `<button class="generated-flashcard" type="button" data-generated-card="${index}" aria-pressed="false">
              <span class="generated-face generated-front">
                <small>${escapeHtml(card.category)}</small>
                <strong>${escapeHtml(card.front)}</strong>
                <em>Reveal answer</em>
              </span>
              <span class="generated-face generated-back">
                <small>Answer</small>
                <strong>${escapeHtml(card.back)}</strong>
                <em>Hide answer</em>
              </span>
            </button>`,
          )
          .join("")}
      </div>
      <p class="instant-card-note">Future paid versions can save these as synced custom decks with AI refinement and teacher-set review dates.</p>
    </div>`;
}

function handleInsightsPanelClick(event) {
  const insertButton = event.target.closest("[data-insert-generated-cards]");
  if (insertButton) {
    insertGeneratedCardsIntoNote();
    return;
  }

  const card = event.target.closest("[data-generated-card]");
  if (!card) return;

  const cardIndex = card.dataset.generatedCard;
  if (generatedCardFlips.has(cardIndex)) {
    generatedCardFlips.delete(cardIndex);
  } else {
    generatedCardFlips.add(cardIndex);
  }

  card.classList.toggle("flipped", generatedCardFlips.has(cardIndex));
  card.setAttribute("aria-pressed", String(generatedCardFlips.has(cardIndex)));
}

function insertGeneratedCardsIntoNote() {
  const note = getSelectedNote();
  if (!note || !generatedNoteCards.length) return;

  const cardDraft = generatedNoteCards
    .map((card, index) => `${index + 1}. Q: ${card.front}\n   A: ${card.back}`)
    .join("\n");
  const addition = `\n\n## Instant revision cards\n${cardDraft}`;

  elements.noteBody.value = `${note.body.trimEnd()}${addition}`;
  updateActiveNote();
  showInsightsMessage("Draft revision cards added to the note. You can edit them before exporting or sharing.", "success");
}

function createInstantNoteCards(body) {
  const rawLines = body.split("\n");
  const cards = [];
  const seen = new Set();
  let currentSection = createTitle(body);

  const addCard = (category, front, back) => {
    const cleanFront = front.replace(/\s+/g, " ").trim();
    const cleanBack = back.replace(/\s+/g, " ").trim();
    const key = `${cleanFront.toLowerCase()}::${cleanBack.toLowerCase()}`;

    if (!cleanFront || !cleanBack || cleanBack.length < 4 || seen.has(key) || cards.length >= 10) return;

    seen.add(key);
    cards.push({ category, front: cleanFront, back: cleanBack });
  };

  rawLines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || /^---+$/.test(trimmed)) return;

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      currentSection = heading[2].trim();
      const answer = collectNextPlainLines(rawLines, index + 1, 2).join(" ");
      addCard("Topic", `What are the key ideas in ${currentSection}?`, answer);
      return;
    }

    const cleaned = cleanNoteLine(trimmed);
    const definition = cleaned.match(/^([^:]{3,48}):\s+(.{4,})$/);
    if (definition) {
      addCard("Definition", `What does ${definition[1].trim()} mean?`, definition[2].trim());
      return;
    }

    const task = trimmed.match(/^- \[[ xX]\]\s+(.+)$/);
    if (task) {
      addCard("Action", `What action is linked to ${currentSection}?`, task[1].trim());
      return;
    }

    if (/^([-*•]|\d+\.)\s+/.test(trimmed)) {
      addCard("Key point", `What should you remember about ${currentSection}?`, cleaned);
    }
  });

  if (cards.length < 4) {
    getPlainNoteLines(body).slice(0, 8).forEach((line) => {
      addCard("Recall", `Recall one useful point from ${currentSection}.`, line);
    });
  }

  return cards;
}

function collectNextPlainLines(lines, startIndex, limit) {
  const collected = [];

  for (let index = startIndex; index < lines.length && collected.length < limit; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) break;

    const cleaned = cleanNoteLine(line);
    if (cleaned) {
      collected.push(cleaned);
    }
  }

  return collected;
}

async function showStudyPack() {
  const note = getSelectedNote();
  if (!note) return;

  try {
    const response = await api(`/api/notes/${note.id}/study-pack`);
    const pack = response.studyPack;
    elements.insightsPanel.hidden = false;
    elements.insightsPanel.innerHTML = `
      <div class="section-title">
        <span>Study pack</span>
        <span>${pack.questions.length} questions</span>
      </div>
      <article>
        <strong>Key points</strong>
        <ul>${pack.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      </article>
      <article>
        <strong>Revision questions</strong>
        <ol>${pack.questions
          .map((question) => `<li><span>${escapeHtml(question.prompt)}</span><p>${escapeHtml(question.answer)}</p></li>`)
          .join("")}</ol>
      </article>
      <article>
        <strong>Flashcards</strong>
        <div class="flashcard-list">${pack.flashcards
          .map((card) => `<div><span>${escapeHtml(card.front)}</span><p>${escapeHtml(card.back)}</p></div>`)
          .join("")}</div>
      </article>
      ${
        pack.tasks.length
          ? `<article><strong>Action list</strong><ul>${pack.tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul></article>`
          : ""
      }
    `;
  } catch (error) {
    showInsightsMessage(error.message, "error");
  }
}

async function showVersionHistory() {
  const note = getSelectedNote();
  if (!note) return;

  try {
    const response = await api(`/api/notes/${note.id}/versions`);
    elements.insightsPanel.hidden = false;
    elements.insightsPanel.innerHTML = `
      <div class="section-title">
        <span>Version history</span>
        <span>${response.versions.length}</span>
      </div>
      ${
        response.versions.length
          ? response.versions
              .map(
                (version) => `<article>
                  <strong>${escapeHtml(version.title)}</strong>
                  <span>${formatDate(version.created_at)} · ${escapeHtml(version.saved_by_name)}</span>
                  <p>${escapeHtml(version.summary)}</p>
                </article>`,
              )
              .join("")
          : `<p>No previous versions yet. Make an edit and save to create one.</p>`
      }
    `;
  } catch (error) {
    showInsightsMessage(error.message, "error");
  }
}

async function showTeacherDashboard() {
  if (!activeWorkspaceId) return;

  try {
    const response = await api(`/api/workspaces/${activeWorkspaceId}/dashboard`);
    elements.insightsPanel.hidden = false;
    elements.insightsPanel.innerHTML = `
      <div class="section-title">
        <span>Teacher dashboard</span>
        <span>${escapeHtml(response.workspace.kind)}</span>
      </div>
      <div class="dashboard-grid">
        <strong>${response.summary.note_count || 0}<span>notes</span></strong>
        <strong>${response.summary.active_authors || 0}<span>authors</span></strong>
        <strong>${response.contributors.length}<span>members</span></strong>
      </div>
      ${response.contributors
        .map(
          (person) => `<article>
            <strong>${escapeHtml(person.name)}</strong>
            <span>${escapeHtml(person.email)}</span>
            <p>${person.note_count || 0} notes${person.last_activity ? ` · last active ${formatDate(person.last_activity)}` : ""}</p>
          </article>`,
        )
        .join("")}
    `;
  } catch (error) {
    showInsightsMessage(error.message, "error");
  }
}

function showInsightsMessage(message, type = "") {
  elements.insightsPanel.hidden = false;
  elements.insightsPanel.innerHTML = `<p class="status-message ${type}">${escapeHtml(message)}</p>`;
}

function getSelectedNote() {
  return notes.find((note) => note.id === selectedId);
}

function getVisibleNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  return notes
    .filter((note) => activeTag === "all" || note.tag === activeTag)
    .filter((note) => {
      const haystack = `${note.title} ${note.summary} ${note.tag} ${note.body}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

function hasFeature(feature) {
  const plan = currentUser?.entitlements || plans[currentUser?.plan] || plans.free || {};
  return Boolean(plan.features?.[feature]);
}

function showWorkspaceMessage(message, type = "") {
  elements.workspaceMessage.textContent = message;
  elements.workspaceMessage.className = `status-message ${type}`;
}

function downloadWorkspaceData() {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const payload = {
    exportedAt: new Date().toISOString(),
    user: currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.name } : null,
    workspace: activeWorkspace || null,
    members,
    notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(activeWorkspace?.name || "neat-notes-workspace")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  elements.settingsMessage.textContent = "Workspace export prepared.";
  elements.settingsMessage.className = "status-message success";
}

function resetLocalPreferences() {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(THEME_KEY);
  appSettings = { ...DEFAULT_SETTINGS, theme: "system" };
  saveSettings();
  applySettings();
  renderSettingsControls();
  elements.settingsMessage.textContent = "Local preferences reset.";
  elements.settingsMessage.className = "status-message success";
}

async function api(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      method: options.method || "GET",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error("Cannot reach the local server. Make sure npm start is still running, then refresh the page.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function createTitle(body) {
  const firstMeaningfulLine = body
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

function cleanNoteLine(line) {
  return line
    .trim()
    .replace(/^(#{1,3}\s+|- \[[ xX]\]\s+|[-*•]\s+|\d+\.\s+|>\s+)/, "")
    .replace(/^---+$/, "")
    .trim();
}

function getPlainNoteLines(body) {
  return body
    .split("\n")
    .map(cleanNoteLine)
    .filter(Boolean);
}

function formatNote(body) {
  const lines = body.split("\n");
  const sections = [];
  let list = null;

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      return;
    }

    if (/^---+$/.test(trimmed)) {
      closeList();
      sections.push("<hr />");
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      sections.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      return;
    }

    const task = line.match(/^(\s*)- \[([ xX])\]\s+(.+)$/);
    if (task) {
      addListItem("task", task[1].length, `<span class="task-box">${task[2].trim() ? "✓" : ""}</span>${formatInline(task[3])}`);
      return;
    }

    const unordered = line.match(/^(\s*)[-*•]\s+(.+)$/);
    if (unordered) {
      addListItem("ul", unordered[1].length, formatInline(unordered[2]));
      return;
    }

    const ordered = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (ordered) {
      addListItem("ol", ordered[1].length, formatInline(ordered[2]));
      return;
    }

    const quote = trimmed.match(/^>\s+(.+)$/);
    if (quote) {
      closeList();
      sections.push(`<blockquote>${formatInline(quote[1])}</blockquote>`);
      return;
    }

    closeList();
    sections.push(`<p>${formatInline(trimmed)}</p>`);
  });

  closeList();

  return sections.length ? sections.join("") : renderFormattedPreviewEmptyState();

  function addListItem(type, indent, html) {
    const listClass = type === "task" ? "task-list" : "";
    if (!list || list.type !== type || list.indent !== indent) {
      closeList();
      list = { type, indent, items: [], className: listClass };
    }
    list.items.push(html);
  }

  function closeList() {
    if (!list) return;
    const tag = list.type === "ol" ? "ol" : "ul";
    const classAttribute = list.className ? ` class="${list.className}"` : "";
    sections.push(`<${tag}${classAttribute}>${list.items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
    list = null;
  }
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function normalizeTag(tag) {
  return (
    tag
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "inbox"
  );
}

function titleCase(text) {
  return text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "notes";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
