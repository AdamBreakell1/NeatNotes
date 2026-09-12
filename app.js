const SETTINGS_KEY = "neat-notes-settings";
const THEME_KEY = "neat-notes-theme";
const GUEST_WORKSPACE_KEY = "neat-notes-guest-workspace";
const LANDING_DISMISSED_KEY = "neat-notes-landing-dismissed";
const REVISION_BADGES_KEY = "neat-notes-revision-badges";
const STUDY_HISTORY_KEY = "neat-notes-study-history";
const NEAT_QUIZ_PROGRESS_KEY = "neat-notes-quiz-progress";
const FREE_REVISION_DECK_KEY = "neat-notes-free-revision-deck";
const CARD_ATTEMPTS_KEY = "neat-notes-card-attempts";
const ACTIVITY_EVENTS_KEY = "neat-notes-activity-events";
const APP_EVENT_LOG_KEY = "neat-notes-event-log";
const REVIEW_SCHEDULES_KEY = "neat-notes-review-schedules";
const MISTAKE_JOURNAL_KEY = "neat-notes-mistake-journal";
const DAILY_REVIEW_GOAL = 10;
const DEFAULT_GUEST_REVISION_DECK_ID = "cs-1-1-1";
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
  { mark: "ABS", a: "#2dd4bf", b: "#0891b2", c: "#134e4a" },
  { mark: "PLAN", a: "#a3e635", b: "#16a34a", c: "#14532d" },
  { mark: "STEP", a: "#38bdf8", b: "#2563eb", c: "#1e3a8a" },
  { mark: "IF", a: "#fbbf24", b: "#e11d48", c: "#881337" },
  { mark: "SYNC", a: "#f472b6", b: "#7c3aed", c: "#4c1d95" },
  { mark: "CODE", a: "#22d3ee", b: "#4f46e5", c: "#312e81" },
  { mark: "SOLVE", a: "#fda4af", b: "#db2777", c: "#831843" },
  { mark: "ALG", a: "#facc15", b: "#0d9488", c: "#134e4a" },
];
const PROFILE_AVATARS = [
  { id: "notebook", mark: "NB", label: "Notebook", tone: "teal" },
  { id: "code", mark: "CS", label: "Computer Science", tone: "blue" },
  { id: "formula", mark: "FX", label: "Calculator", tone: "amber" },
  { id: "revision", mark: "RV", label: "Revision", tone: "green" },
  { id: "exam", mark: "A*", label: "Exam ready", tone: "rose" },
  { id: "lab", mark: "LB", label: "Study lab", tone: "violet" },
];
const DEFAULT_SETTINGS = {
  theme: localStorage.getItem(THEME_KEY) || "system",
  density: "default",
  editorFontSize: "16",
  defaultTag: "inbox",
  profileAvatar: "notebook",
  profileAvatars: {},
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
let activeAppSection = "home";
let activeRevisionTopicId = "cs-1-1-1";
let activeComponentId = localStorage.getItem("neat-active-component") === "h446-02" ? "h446-02" : "h446-01";
let revisionCardOrder = {};
let earnedRevisionBadges = loadRevisionBadges();
let studyHistory = loadStudyHistory();
let freeRevisionTopicId = loadFreeRevisionTopicId();
const flippedRevisionCards = new Set();
const completedRevisionCards = new Set();
const generatedCardFlips = new Set();
let generatedNoteCards = [];
let revisionAutoResetTimer = null;
let neatQuizProgress = loadNeatQuizProgress();
let neatQuizState = createEmptyNeatQuizState();
let cardAttempts = loadLocalArray(CARD_ATTEMPTS_KEY);
let serverLearningEvidence = [];
let liveLearningAttemptIds = new Set();
let activityEvents = loadLocalArray(ACTIVITY_EVENTS_KEY);
let revisionSession = createRevisionSession(activeRevisionTopicId);
let revisionReviewMode = null;
let reviewSchedules = loadLocalObject(REVIEW_SCHEDULES_KEY);
let mistakeJournal = loadLocalArray(MISTAKE_JOURNAL_KEY);
let activeAdaptiveSession = null;
let adaptivePlanPreview = null;
let accountProfile = null;
let focusBeforeGlobalSearch = null;
let focusBeforeSettings = null;
let globalSearchSelection = 0;
let onboardingStep = 1;
let focusBeforeOnboarding = null;
let activePracticeMode = "quick";
let examPracticeState = null;
let miniMockState = null;
let miniMockTimer = null;
let practiceRequestId = 0;
let csLabState = null;
let activePasswordResetToken = "";
let authReturnTask = null;
let repairState = null;
let recallPracticeState = null;
const practiceDraftStore = window.PracticeDrafts.createStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});

const REVISION_TOPICS = window.REVISION_TOPICS || [];
const NEAT_QUESTIONS = window.NEAT_QUESTIONS || [];
const LEARNING_MODEL = window.NEAT_LEARNING_MODEL;

function getComponentTopics() {
  return REVISION_TOPICS.filter((topic) => (topic.componentId || "h446-01") === activeComponentId);
}

function renderComponentContext() {
  const topics = getComponentTopics();
  document.querySelectorAll("[data-component]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.component === activeComponentId)));
  const select = document.querySelector("#component-topic-select");
  select.innerHTML = topics.map((topic) => `<option value="${escapeHtml(topic.id)}" ${activeRevisionTopicId === topic.id ? "selected" : ""}>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</option>`).join("");
  const pendingCount = topics.filter((topic) => topic.reviewStatus === "review_pending").length;
  const previewAvailable = topics.some((topic) => topic.reviewStatus === "review_pending" && topic.contentAvailable);
  document.querySelector("#component-content-status").textContent = pendingCount
    ? `${topics.length} topic packs · Academic review pending for ${pendingCount}. ${previewAvailable ? "Local editorial preview; draft packs are not yet approved for public release." : "Only reviewed new packs become available; Pro does not bypass review."}`
    : `${topics.length} topic packs · OCR H446. Completion reflects the available study material, not full specification mastery.`;
  document.querySelector("#progress-component-label").textContent = `OCR Component ${activeComponentId === "h446-02" ? "2" : "1"}`;
}

function changeComponent(componentId) {
  repairState = null;
  recallPracticeState = null;
  practiceRequestId += 1;
  activeComponentId = componentId === "h446-02" ? "h446-02" : "h446-01";
  localStorage.setItem("neat-active-component", activeComponentId);
  const topics = getComponentTopics();
  activeRevisionTopicId = topics.find((topic) => topic.id === getSelectedFreeRevisionTopicId())?.id || topics[0]?.id;
  activeAdaptiveSession = null;
  revisionReviewMode = null;
  adaptivePlanPreview = null;
  neatQuizState = createEmptyNeatQuizState();
  examPracticeState = null;
  miniMockState = null;
  csLabState = null;
  clearInterval(miniMockTimer);
  renderRevisionPage();
  if (activeAppSection === "practice") {
    if (activePracticeMode === "exam") loadExamPracticeQuestion();
    if (activePracticeMode === "mock") loadMiniMock();
    if (activePracticeMode === "labs") loadCsLabs();
  }
}

const elements = {
  activeFolderLabel: document.querySelector("#active-folder-label"),
  allCount: document.querySelector("#all-count"),
  appView: document.querySelector("#app-view"),
  accountStatus: document.querySelector("#account-status"),
  accountProfileButton: document.querySelector("#account-profile-button"),
  authMessage: document.querySelector("#auth-message"),
  authView: document.querySelector("#auth-view"),
  authCardTitle: document.querySelector("#auth-card-title"),
  avatarChoiceGroup: document.querySelector("#avatar-choice-group"),
  landingView: document.querySelector("#landing-view"),
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
  deleteButton: document.querySelector("#delete-note-button"),
  exportPdfButton: document.querySelector("#export-pdf-button"),
  editorPanel: document.querySelector(".editor"),
  formattedPreview: document.querySelector("#formatted-preview"),
  formatToolbar: document.querySelector(".format-toolbar"),
  historyButton: document.querySelector("#history-button"),
  globalSearchButton: document.querySelector("#global-search-button"),
  globalSearchInput: document.querySelector("#global-search-input"),
  globalSearchModal: document.querySelector("#global-search-modal"),
  globalSearchResults: document.querySelector("#global-search-results"),
  insightsPanel: document.querySelector("#insights-panel"),
  launchOverlay: document.querySelector("#launch-overlay"),
  loginForm: document.querySelector("#login-form"),
  loginPassword: document.querySelector("#login-password"),
  loginSubmitButton: document.querySelector("#login-submit-button"),
  loginCapsWarning: document.querySelector("#login-caps-warning"),
  passwordRecoveryForm: document.querySelector("#password-recovery-form"),
  recoverySubmitButton: document.querySelector("#recovery-submit-button"),
  passwordResetForm: document.querySelector("#password-reset-form"),
  resetPasswordSubmitButton: document.querySelector("#reset-password-submit-button"),
  authProviderList: document.querySelector("#auth-provider-list"),
  logoutButton: document.querySelector("#logout-button"),
  memberList: document.querySelector("#member-list"),
  mistakeJournalPanel: document.querySelector("#mistake-journal-panel"),
  mobileNotesButton: document.querySelector("#mobile-notes-button"),
  mobileSidebarClose: document.querySelector("#mobile-sidebar-close"),
  neatQuestionsCount: document.querySelector("#neat-questions-count"),
  neatQuestionsCurrentLink: document.querySelector("#neat-questions-current-link"),
  neatQuestionsGrid: document.querySelector("#neat-questions-grid"),
  neatQuizPanel: document.querySelector("#neat-quiz-panel"),
  newButton: document.querySelector("#new-note-button"),
  notesSidebarContext: document.querySelector("#notes-sidebar-context"),
  onboardingModal: document.querySelector("#onboarding-modal"),
  onboardingForm: document.querySelector("#onboarding-form"),
  onboardingBack: document.querySelector("#onboarding-back"),
  onboardingNext: document.querySelector("#onboarding-next"),
  onboardingProgressBar: document.querySelector("#onboarding-progress-bar"),
  onboardingProgressLabel: document.querySelector("#onboarding-progress-label"),
  onboardingTopicGrid: document.querySelector("#onboarding-topic-grid"),
  onboardingMessage: document.querySelector("#onboarding-message"),
  noteBody: document.querySelector("#note-body"),
  noteCount: document.querySelector("#note-count"),
  noteDate: document.querySelector("#note-date"),
  noteIntelligencePanel: document.querySelector("#note-intelligence-panel"),
  studyOutputDisclosure: document.querySelector("#study-output-disclosure"),
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
  revisionFocusButton: document.querySelector("#revision-focus-button"),
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
  practiceModeBar: document.querySelector("#practice-mode-bar"),
  examPracticeSection: document.querySelector("#exam-practice-section"),
  examPracticePanel: document.querySelector("#exam-practice-panel"),
  examLoadQuestionButton: document.querySelector("#exam-load-question-button"),
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
  settingsAccountEmail: document.querySelector("#settings-account-email"),
  settingsAccountName: document.querySelector("#settings-account-name"),
  settingsAccountPlan: document.querySelector("#settings-account-plan"),
  settingsAccountEmailField: document.querySelector("#settings-account-email-field"),
  settingsAvatarId: document.querySelector("#settings-avatar-id"),
  settingsDisplayName: document.querySelector("#settings-display-name"),
  settingsIdentityForm: document.querySelector("#settings-identity-form"),
  settingsIdentityMessage: document.querySelector("#settings-identity-message"),
  settingsProfileGuestNote: document.querySelector("#settings-profile-guest-note"),
  settingsProfileSync: document.querySelector("#settings-profile-sync"),
  settingsSaveIdentity: document.querySelector("#settings-save-identity"),
  settingsProfileAvatar: document.querySelector("#settings-profile-avatar"),
  accountSessionTools: document.querySelector("#account-session-tools"),
  accountSessionSummary: document.querySelector("#account-session-summary"),
  revokeOtherSessionsButton: document.querySelector("#revoke-other-sessions-button"),
  accountDangerZone: document.querySelector("#account-danger-zone"),
  deleteAccountButton: document.querySelector("#delete-account-button"),
  usageAnalyticsConsent: document.querySelector("#usage-analytics-consent"),
  settingsRevisionForm: document.querySelector("#settings-revision-form"),
  settingsRevisionMessage: document.querySelector("#settings-revision-message"),
  settingsRevisionGuestNote: document.querySelector("#settings-revision-guest-note"),
  settingsPersonalTargetCounter: document.querySelector("#settings-personal-target-counter"),
  settingsTabs: document.querySelector(".settings-tabs"),
  legalModal: document.querySelector("#legal-modal"),
  legalContent: document.querySelector("#legal-content"),
  legalTitle: document.querySelector("#legal-title"),
  siteFooter: document.querySelector(".site-footer"),
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
  studentDashboardPanel: document.querySelector("#student-dashboard-panel"),
  studyPane: document.querySelector(".study-pane"),
  summaryText: document.querySelector("#summary-text"),
  tagInput: document.querySelector("#tag-input"),
  tagList: document.querySelector("#tag-list"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeChoiceGroup: document.querySelector("#theme-choice-group"),
  topbarLoginButton: document.querySelector("#topbar-login-button"),
  topbarLogoutButton: document.querySelector("#topbar-logout-button"),
  topbarBrandButton: document.querySelector("#topbar-brand-button"),
  topbarProfileAvatar: document.querySelector("#topbar-profile-avatar"),
  topbarSignupButton: document.querySelector("#topbar-signup-button"),
  topbarDate: document.querySelector("#topbar-date"),
  topbarSectionSwitch: document.querySelector(".topbar-section-switch"),
  topbarTime: document.querySelector("#topbar-time"),
  topbarUtilities: document.querySelector(".topbar-utilities"),
  topbarUserMeta: document.querySelector("#topbar-user-meta"),
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
elements.landingView.addEventListener("click", handleLandingClick);
elements.loginForm.addEventListener("submit", login);
elements.signupForm.addEventListener("submit", signup);
elements.passwordRecoveryForm.addEventListener("submit", requestPasswordReset);
elements.passwordResetForm.addEventListener("submit", completePasswordReset);
document.querySelector("[data-auth-recovery]").addEventListener("click", openPasswordRecovery);
document.querySelector("[data-auth-back-login]").addEventListener("click", () => setAuthMode("login"));
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
elements.topbarBrandButton.addEventListener("click", handleTopbarBrandAction);
elements.globalSearchButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openGlobalSearch();
});
elements.globalSearchInput.addEventListener("input", renderGlobalSearchResults);
elements.globalSearchInput.addEventListener("keydown", handleGlobalSearchKeydown);
elements.globalSearchModal.addEventListener("keydown", trapGlobalSearchFocus);
elements.globalSearchModal.addEventListener("click", handleGlobalSearchClick);
elements.mobileNotesButton.addEventListener("click", toggleMobileNotesSidebar);
elements.mobileSidebarClose.addEventListener("click", closeMobileNotesSidebar);
elements.accountProfileButton.addEventListener("click", () => openSettingsModal("account"));
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
elements.settingsButton.addEventListener("click", () => openSettingsModal());
elements.closeSettingsButton.addEventListener("click", closeSettingsModal);
elements.settingsModal.addEventListener("click", handleSettingsModalClick);
elements.settingsModal.addEventListener("keydown", trapSettingsFocus);
elements.legalModal.addEventListener("click", handleLegalModalClick);
elements.siteFooter.addEventListener("click", handleFooterClick);
elements.settingsTabs.addEventListener("click", switchSettingsTab);
elements.themeChoiceGroup.addEventListener("click", chooseTheme);
elements.avatarChoiceGroup.addEventListener("click", chooseProfileAvatar);
elements.avatarChoiceGroup.addEventListener("keydown", handleAvatarChoiceKeydown);
elements.settingsDensity.addEventListener("change", updateSettingsFromControls);
elements.settingsEditorFont.addEventListener("change", updateSettingsFromControls);
elements.settingsDefaultTag.addEventListener("input", updateSettingsFromControls);
elements.onboardingBack.addEventListener("click", () => moveOnboardingStep(-1));
elements.onboardingNext.addEventListener("click", () => moveOnboardingStep(1));
elements.onboardingForm.addEventListener("submit", completeOnboarding);
elements.onboardingModal.addEventListener("keydown", trapOnboardingFocus);
elements.downloadDataButton.addEventListener("click", downloadWorkspaceData);
elements.resetPreferencesButton.addEventListener("click", resetLocalPreferences);
elements.revokeOtherSessionsButton.addEventListener("click", revokeOtherSessions);
elements.deleteAccountButton.addEventListener("click", deleteAccount);
elements.usageAnalyticsConsent.addEventListener("change", updateAnalyticsConsent);
elements.settingsRevisionForm.addEventListener("submit", saveRevisionProfile);
elements.settingsRevisionForm.elements.personalTarget.addEventListener("input", updatePersonalTargetCounter);
elements.settingsIdentityForm.addEventListener("submit", saveAccountProfile);
elements.settingsDisplayName.addEventListener("input", () => {
  elements.settingsDisplayName.removeAttribute("aria-invalid");
  elements.settingsIdentityMessage.textContent = "";
});
document.addEventListener("keydown", handleGlobalKeydown);
elements.themeToggle.addEventListener("click", toggleTheme);
elements.topbarSectionSwitch.addEventListener("click", switchAppSection);
elements.topbarUtilities.addEventListener("click", switchAppSection);
elements.startDailyReviewButton.addEventListener("click", startDailyReview);
elements.instantCardsButton.addEventListener("click", showInstantCards);
elements.insightsPanel.addEventListener("click", handleInsightsPanelClick);
elements.revisionCardGrid.addEventListener("click", flipRevisionCard);
elements.revisionCardGrid.addEventListener("keydown", handleRevisionCardKeydown);
elements.studentDashboardPanel.addEventListener("click", handleStudentDashboardClick);
elements.mistakeJournalPanel.addEventListener("click", handleMistakeJournalClick);
elements.revisionTopicList.addEventListener("click", selectRevisionTopic);
elements.revisionMasteryMap.addEventListener("click", handleMasteryMapClick);
elements.revisionResetButton.addEventListener("click", resetActiveRevisionCards);
elements.revisionFocusButton.addEventListener("click", toggleRevisionFocusMode);
elements.revisionShuffleButton.addEventListener("click", shuffleActiveRevisionCards);
elements.revisionContinueButton.addEventListener("click", continueRevisionJourney);
elements.revisionProgressJumpButton.addEventListener("click", scrollToRevisionProgress);
elements.neatQuestionsCurrentLink.addEventListener("click", startActiveTopicQuiz);
elements.neatQuestionsGrid.addEventListener("click", handleNeatQuestionsClick);
elements.neatQuizPanel.addEventListener("click", handleNeatQuizPanelClick);
elements.practiceModeBar.addEventListener("click", handlePracticeModeChange);
elements.practiceModeBar.addEventListener("keydown", (event) => {
  const tabs = [...elements.practiceModeBar.querySelectorAll("[data-practice-mode]")];
  const index = tabs.indexOf(event.target);
  if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
});
elements.examLoadQuestionButton.addEventListener("click", () => {
  if (activePracticeMode === "mock") loadMiniMock({ restart: true });
  else if (activePracticeMode === "labs") loadCsLabs(true);
  else loadExamPracticeQuestion({ next: true });
});
elements.examPracticePanel.addEventListener("submit", submitExamPracticeAnswer);
elements.examPracticePanel.addEventListener("submit", submitCsLab);
elements.examPracticePanel.addEventListener("click", handleExamPracticeClick);
elements.examPracticePanel.addEventListener("input", handleMiniMockInput);
document.querySelectorAll("[data-global-action]").forEach((button) => button.addEventListener("click", () => {
  button.closest("details").open = false;
  const actions = { settings: () => openSettingsModal(), plans: openPlansModal, contact: () => setAppSection("contact"), login: () => openAuthModal("login"), signup: () => openAuthModal("signup"), logout: () => elements.topbarLogoutButton.click(), theme: () => document.querySelector(".theme-toggle").click() };
  actions[button.dataset.globalAction]?.();
}));
document.addEventListener("click", (event) => {
  const component = event.target.closest("[data-component]");
  if (component) changeComponent(component.dataset.component);
  const accountMenu = document.querySelector(".global-account-menu");
  if (accountMenu.open && !accountMenu.contains(event.target)) accountMenu.open = false;
});
document.addEventListener("keydown", (event) => {
  const accountMenu = document.querySelector(".global-account-menu");
  if (event.key === "Escape" && accountMenu.open) {
    accountMenu.open = false;
    accountMenu.querySelector("summary").focus();
  }
});
window.addEventListener("online", () => {
  if (!currentUser || isGuestMode) return;
  Object.values(loadLocalObject(`neat-pending-attempts:${currentUser.id}`)).slice(0, 30).forEach(syncRevisionAttempt);
});
document.querySelector("#component-topic-select").addEventListener("change", (event) => {
  repairState = null;
  recallPracticeState = null;
  activeRevisionTopicId = event.target.value;
  activeAdaptiveSession = null;
  revisionReviewMode = null;
  neatQuizState = createEmptyNeatQuizState();
  examPracticeState = null;
  renderRevisionPage();
  if (activeAppSection === "practice" && activePracticeMode === "exam") loadExamPracticeQuestion();
});
elements.examPracticePanel.addEventListener("input", (event) => {
  if (event.target.id !== "exam-answer" || !examPracticeState?.question || !currentUser) return;
  examPracticeState.answer = event.target.value;
  localStorage.setItem(`neat-exam-draft:${currentUser.id}:${examPracticeState.question.id}`, event.target.value);
});
elements.newButton.addEventListener("click", () => {
  setAppSection("notes");
  createNote();
});
elements.deleteButton.addEventListener("click", deleteSelectedNote);
elements.studyPackButton.addEventListener("click", showStudyPack);
elements.exportPdfButton.addEventListener("click", exportSelectedPdf);
elements.historyButton.addEventListener("click", showVersionHistory);
elements.formatToolbar.addEventListener("click", applyFormattingAction);
elements.autoTitle.addEventListener("keydown", handleTitleKeydown);
elements.autoTitle.addEventListener("blur", renameSelectedNoteFromTitle);
elements.noteBody.addEventListener("input", updateActiveNote);
elements.noteBody.addEventListener("keydown", handleEditorKeydown);
elements.tagInput.addEventListener("input", updateActiveNote);
elements.searchInput.addEventListener("input", renderNotesAndFolders);
elements.notesList.addEventListener("click", handleNotesListClick);
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
  closeMobileNotesSidebar();
  const previousSection = activeAppSection;
  const normalizedSection = section === "revision" ? "revise" : section;
  activeAppSection = ["home", "revise", "practice", "progress", "notes", "contact"].includes(normalizedSection)
    ? normalizedSection
    : "home";
  const isNotes = activeAppSection === "notes";
  const isStudent = ["home", "revise", "practice", "progress"].includes(activeAppSection);
  const isRevision = isStudent;
  const isContact = activeAppSection === "contact";

  elements.notesColumn.hidden = !isNotes;
  elements.editorPanel.hidden = !isNotes;
  elements.revisionView.hidden = !isRevision;
  elements.contactView.hidden = !isContact;
  elements.notesSidebarContext.hidden = !isNotes;
  elements.appView.classList.toggle("notes-mode", isNotes);
  elements.appView.classList.toggle("revision-mode", isRevision);
  elements.appView.classList.toggle("contact-mode", isContact);
  elements.revisionView.dataset.studentView = isStudent ? activeAppSection : "";

  document.querySelectorAll("[data-app-section]").forEach((button) => {
    const buttonSection = button.dataset.appSection === "revision" ? "revise" : button.dataset.appSection;
    const isActiveSection = buttonSection === activeAppSection;
    button.classList.toggle("active", isActiveSection);
    if (button.closest(".topbar-section-switch")) {
      button.setAttribute("aria-current", isActiveSection ? "page" : "false");
    }
  });

  if (isRevision) {
    recordActivityEvent({ type: "revision_started", topicId: activeRevisionTopicId });
    renderRevisionPage();
  }

  if (isContact) {
    renderContactPage();
  }

  if (previousSection !== activeAppSection) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    [elements.revisionView, elements.contactView, elements.editorPanel, elements.notesColumn]
      .filter(Boolean)
      .forEach((panel) => { panel.scrollTop = 0; });
  }
}

function handlePracticeModeChange(event) {
  const button = event.target.closest("[data-practice-mode]");
  if (!button) return;
  practiceRequestId += 1;
  activePracticeMode = ["exam", "mock", "labs"].includes(button.dataset.practiceMode) ? button.dataset.practiceMode : "quick";
  renderPracticeMode();
  clearInterval(miniMockTimer);
  elements.examLoadQuestionButton.disabled = false;
  elements.examPracticePanel.removeAttribute("aria-busy");
  if (activePracticeMode === "exam") examPracticeState ? renderExamPracticeQuestion() : loadExamPracticeQuestion();
  if (activePracticeMode === "mock") {
    if (miniMockState) {
      renderMiniMock();
      if (!miniMockState.submitted) miniMockTimer = window.setInterval(updateMiniMockTimer, 1000);
    } else loadMiniMock();
  }
  if (activePracticeMode === "labs") csLabState ? renderCsLab() : loadCsLabs();
}

function renderPracticeMode() {
  if (!elements.practiceModeBar) return;
  updatePracticeFocus();
  const inPractice = activeAppSection === "practice";
  elements.practiceModeBar.hidden = !inPractice;
  if (!inPractice) {
    elements.quickPracticeSection.hidden = true;
    elements.examPracticeSection.hidden = true;
    return;
  }
  elements.quickPracticeSection.hidden = activePracticeMode !== "quick";
  elements.examPracticeSection.hidden = activePracticeMode === "quick";
  if (activePracticeMode === "mock") {
    document.querySelector("#exam-practice-title").textContent = "Timed mini mock";
    document.querySelector("#exam-practice-description").textContent = "Practise a short mixed-topic set at your own pace, then review your reasoning. Drafts resume on this device for seven days.";
    elements.examLoadQuestionButton.textContent = "New mini mock";
  } else if (activePracticeMode === "labs") {
    document.querySelector("#exam-practice-title").textContent = "Computer Science Labs";
    document.querySelector("#exam-practice-description").textContent = "Make a prediction or test a constrained query, then use the explanation to correct your reasoning.";
    elements.examLoadQuestionButton.textContent = "Choose another lab";
  } else {
    document.querySelector("#exam-practice-title").textContent = "Exam Answer Coach";
    document.querySelector("#exam-practice-description").textContent = "Write an answer, compare its reasoning with a rubric, then improve the same response.";
    elements.examLoadQuestionButton.textContent = "Start exam practice";
  }
  elements.practiceModeBar.querySelectorAll("[data-practice-mode]").forEach((button) => {
    const active = button.dataset.practiceMode === activePracticeMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function toggleMobileNotesSidebar() {
  const isOpen = elements.appView.classList.toggle("mobile-sidebar-open");
  elements.mobileNotesButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    elements.mobileSidebarClose.focus();
  }
}

function closeMobileNotesSidebar() {
  elements.appView.classList.remove("mobile-sidebar-open");
  elements.mobileNotesButton.setAttribute("aria-expanded", "false");
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

  elements.dailyGoalCount.textContent = today.cards >= DAILY_REVIEW_GOAL ? `${today.cards} reviewed · goal met` : `${today.cards} / ${DAILY_REVIEW_GOAL}`;
  elements.dailyGoalBar.style.width = `${progress}%`;
  elements.dailyStreakLabel.textContent = `${streak} day${streak === 1 ? "" : "s"} streak`;

  if (today.cards >= DAILY_REVIEW_GOAL) {
    elements.dailyMissionCopy.textContent = "Daily mission complete. Push on for additional practice or bank the win.";
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
    const history = JSON.parse(localStorage.getItem(learningStorageKey(STUDY_HISTORY_KEY)) || "{}");
    return history && typeof history === "object" && !Array.isArray(history) ? history : {};
  } catch {
    return {};
  }
}

function saveStudyHistory() {
  localStorage.setItem(learningStorageKey(STUDY_HISTORY_KEY), JSON.stringify(studyHistory));
}

function loadNeatQuizProgress() {
  try {
    const progress = JSON.parse(localStorage.getItem(learningStorageKey(NEAT_QUIZ_PROGRESS_KEY)) || "{}");
    return progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  } catch {
    return {};
  }
}

function saveNeatQuizProgress() {
  localStorage.setItem(learningStorageKey(NEAT_QUIZ_PROGRESS_KEY), JSON.stringify(neatQuizProgress));
}

function loadFreeRevisionTopicId() {
  return localStorage.getItem(FREE_REVISION_DECK_KEY) || "";
}

function saveFreeRevisionTopicId(topicId) {
  freeRevisionTopicId = topicId || "";
  if (freeRevisionTopicId) {
    localStorage.setItem(FREE_REVISION_DECK_KEY, freeRevisionTopicId);
  } else {
    localStorage.removeItem(FREE_REVISION_DECK_KEY);
  }
}

function loadLocalArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(learningStorageKey(key)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function learningStorageKey(key) {
  return [CARD_ATTEMPTS_KEY, ACTIVITY_EVENTS_KEY, REVIEW_SCHEDULES_KEY, MISTAKE_JOURNAL_KEY,
    STUDY_HISTORY_KEY, REVISION_BADGES_KEY, NEAT_QUIZ_PROGRESS_KEY].includes(key)
    ? `${key}:${currentUser?.id || "guest"}` : key;
}

function selectAccountLearningState() {
  repairState = null;
  recallPracticeState = null;
  cardAttempts = loadLocalArray(CARD_ATTEMPTS_KEY).filter((attempt) => !String(attempt.source).startsWith("demo"));
  activityEvents = loadLocalArray(ACTIVITY_EVENTS_KEY);
  reviewSchedules = loadLocalObject(REVIEW_SCHEDULES_KEY);
  mistakeJournal = loadLocalArray(MISTAKE_JOURNAL_KEY);
  studyHistory = loadStudyHistory();
  earnedRevisionBadges = loadRevisionBadges();
  neatQuizProgress = loadNeatQuizProgress();
  serverLearningEvidence = [];
  liveLearningAttemptIds = new Set();
  activeAdaptiveSession = null;
  adaptivePlanPreview = null;
  neatQuizState = createEmptyNeatQuizState();
  examPracticeState = null;
  miniMockState = null;
  csLabState = null;
  clearInterval(miniMockTimer);
  completedRevisionCards.clear();
  flippedRevisionCards.clear();
}

function loadLocalObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(learningStorageKey(key)) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveLocalArray(key, value) {
  localStorage.setItem(learningStorageKey(key), JSON.stringify(value));
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
  const attempt = {
    id: createLocalId("attempt"),
    userId: currentUser?.id,
    cardId,
    topicId,
    deckId: topicId,
    classId: null,
    confidence,
    revealedAnswer: true,
    responseTimeMs: options.responseTimeMs,
    quizCorrect: options.quizCorrect,
    source: options.source || "flashcard",
    difficulty: options.difficulty,
    sessionId: revisionSession?.id,
    createdAt: new Date().toISOString(),
  };

  cardAttempts = [attempt, ...cardAttempts].slice(0, 1200);
  liveLearningAttemptIds.add(attempt.id);
  saveLocalArray(CARD_ATTEMPTS_KEY, cardAttempts);
  updateLocalLearningState(attempt);
  recordActivityEvent({ type: "card_rated", topicId, classId: attempt.classId });
  if (currentUser && !isGuestMode) {
    void syncRevisionAttempt(attempt);
  }
  return attempt;
}

function updateLocalLearningState(attempt) {
  if (!LEARNING_MODEL || !attempt?.cardId) return;
  const rating = ["again", "hard", "good", "easy"].includes(attempt.difficulty)
    ? attempt.difficulty
    : attempt.confidence === "needs_practice" ? "again" : "good";
  const previous = reviewSchedules[attempt.cardId] || {};
  const memoryState = LEARNING_MODEL.updateMemoryState(previous, rating, attempt.createdAt);
  reviewSchedules = { ...reviewSchedules, [attempt.cardId]: memoryState };
  localStorage.setItem(learningStorageKey(REVIEW_SCHEDULES_KEY), JSON.stringify(reviewSchedules));

  const incorrect = attempt.quizCorrect === false || rating === "again";
  const existingIndex = mistakeJournal.findIndex((entry) => entry.conceptId === attempt.cardId && !entry.correctedAt);
  if (incorrect) {
    const topic = getQuizTopicById(attempt.topicId);
    const cardId = String(attempt.cardId).split(":").slice(1).join(":");
    const card = getTopicCards(topic).find((candidate) => candidate.id === cardId);
    const entry = {
      id: existingIndex >= 0 ? mistakeJournal[existingIndex].id : createLocalId("mistake"),
      conceptId: attempt.cardId,
      topicId: attempt.topicId,
      prompt: card?.front || "Revision question",
      explanation: card?.back || "Review this concept, then try a nearby question.",
      activityType: attempt.source || "flashcard",
      createdAt: existingIndex >= 0 ? mistakeJournal[existingIndex].createdAt : attempt.createdAt,
      updatedAt: attempt.createdAt,
      correctedAt: null,
    };
    if (existingIndex >= 0) mistakeJournal.splice(existingIndex, 1, entry);
    else mistakeJournal.unshift(entry);
  } else if (existingIndex >= 0) {
    mistakeJournal[existingIndex] = { ...mistakeJournal[existingIndex], correctedAt: attempt.createdAt, updatedAt: attempt.createdAt };
  }
  mistakeJournal = mistakeJournal.slice(0, 100);
  saveLocalArray(MISTAKE_JOURNAL_KEY, mistakeJournal);
}

function getLearningActivityType(attempt) {
  const types = {
    quick_practice: "multiple_choice",
    quick_quiz: "multiple_choice",
    free_recall: "free_recall",
    short_answer: "short_answer",
    exam_response: "exam_response",
  };
  return types[attempt.source] || "flashcard_rating";
}

function getAdaptiveLearningItems() {
  if (!LEARNING_MODEL) return [];
  return getComponentTopics()
    .filter((topic) => canAccessRevisionTopic(topic.id))
    .flatMap((topic) => getTopicCards(topic).map((card) => {
      const conceptId = getRevisionCardKey(topic, card);
      const evidence = cardAttempts
        .filter((attempt) => attempt.cardId === conceptId && !String(attempt.source).startsWith("demo")
          && (!currentUser || liveLearningAttemptIds.has(attempt.id)))
        .map((attempt) => ({
          activityType: getLearningActivityType(attempt),
          score: typeof attempt.quizCorrect === "boolean"
            ? (attempt.quizCorrect ? 1 : 0)
            : ({ again: 0.18, hard: 0.5, good: 0.72, easy: 0.86 }[attempt.difficulty] || (attempt.confidence === "confident" ? 0.72 : 0.18)),
          confidence: attempt.difficulty || attempt.confidence,
          difficulty: 1,
          occurredAt: attempt.createdAt,
          memoryState: reviewSchedules[conceptId],
        }));
      if (currentUser) evidence.push(...serverLearningEvidence.filter((entry) => entry.conceptId === conceptId));
      const memoryState = reviewSchedules[conceptId] || {};
      return {
        conceptId,
        cardId: conceptId,
        topicId: topic.id,
        deckId: topic.id,
        code: topic.code,
        topicTitle: topic.title,
        category: card.category,
        prompt: card.front,
        answer: card.back,
        nextReviewAt: memoryState.nextReviewAt || null,
        memoryState,
        evidence,
        mastery: LEARNING_MODEL.calculateMastery(evidence),
      };
    }));
}

function getAdaptiveSessionPlan(durationMinutes = 15) {
  if (!LEARNING_MODEL) return { durationMinutes, itemBudget: 0, items: [], reasons: [] };
  const items = getAdaptiveLearningItems();
  const saved = restoreAdaptiveSession(loadLocalObject(`neat-adaptive:${currentUser?.id || "guest"}`), items);
  if (saved && !saved.completedAt && saved.durationMinutes === durationMinutes) return { ...saved, resuming: true, items: saved.items.filter((item) => !saved.completedConceptIds.includes(item.cardId)) };
  const fingerprint = `${currentUser?.id || "guest"}:${durationMinutes}:${cardAttempts[0]?.id}:${items.map((item) => item.cardId).join(",")}`;
  if (adaptivePlanPreview?.fingerprint === fingerprint) return adaptivePlanPreview.plan;
  const plan = LEARNING_MODEL.buildSession({ items, durationMinutes });
  adaptivePlanPreview = { fingerprint, plan };
  return plan;
}

function startAdaptiveRevisionSession(durationMinutes = 15) {
  const saved = loadLocalObject(`neat-adaptive:${currentUser?.id || "guest"}`);
  const restored = restoreAdaptiveSession(saved, getAdaptiveLearningItems());
  if (restored && !restored.completedAt && restored.durationMinutes === durationMinutes) {
    activeAdaptiveSession = restored;
    openNextAdaptiveSessionTopic();
    setAppSection("revise");
    return;
  }
  const plan = getAdaptiveSessionPlan(durationMinutes);
  if (!plan.items.length) {
    setAppSection("revise");
    return;
  }

  activeAdaptiveSession = window.NEAT_REVISION_SESSION.create(plan, createLocalId("adaptive"));
  persistAdaptiveSession();
  openNextAdaptiveSessionTopic();
  setAppSection("revise");
  trackEvent("adaptive_session_started", { durationMinutes, itemCount: plan.items.length });
}

function openNextAdaptiveSessionTopic() {
  const nextItem = window.NEAT_REVISION_SESSION.next(activeAdaptiveSession);
  if (!nextItem) {
    if (activeAdaptiveSession) activeAdaptiveSession.completedAt = new Date().toISOString();
    return false;
  }

  activeRevisionTopicId = nextItem.topicId;
  const topicCardIds = [nextItem.cardId];
  completedRevisionCards.delete(nextItem.cardId);
  startRevisionSession(nextItem.topicId, "adaptive", topicCardIds);
  revisionReviewMode = { topicId: nextItem.topicId, cardIds: topicCardIds, mode: "adaptive" };
  return true;
}

function persistAdaptiveSession() {
  if (!activeAdaptiveSession) return;
  const items = activeAdaptiveSession.items.map(({ cardId, topicId, reason, due }) => ({ cardId, topicId, reason, due }));
  localStorage.setItem(`neat-adaptive:${currentUser?.id || "guest"}`, JSON.stringify({ ...activeAdaptiveSession, items }));
}

function restoreAdaptiveSession(saved, availableItems) {
  const restored = window.NEAT_REVISION_SESSION.restore(saved, new Set(availableItems.map((item) => item.cardId)));
  if (!restored) return null;
  return { ...restored, items: restored.items.map((item) => ({
    ...availableItems.find((available) => available.cardId === item.cardId), reason: item.reason, due: item.due,
  })) };
}

async function syncRevisionAttempt(attempt) {
  if (!currentUser || attempt.userId !== currentUser.id) return;
  const pendingKey = `neat-pending-attempts:${currentUser.id}`;
  const pending = loadLocalObject(pendingKey);
  pending[attempt.id] = attempt;
  localStorage.setItem(pendingKey, JSON.stringify(pending));
  const topic = getQuizTopicById(attempt.topicId);
  const localCardId = String(attempt.cardId || "").split(":").slice(1).join(":");
  const card = getTopicCards(topic).find((candidate) => candidate.id === localCardId || candidate.serverCardId === localCardId);
  const serverCardId = card?.serverCardId || (localCardId ? `${attempt.topicId}__${localCardId}` : "");
  if (!topic || !serverCardId) return;

  try {
    await api("/api/revision/attempts", {
      method: "POST",
      body: {
        deckId: topic.id,
        clientAttemptId: attempt.id,
        cardId: serverCardId,
        classId: null,
        confidence: attempt.confidence,
        quizCorrect: attempt.quizCorrect,
        responseTimeMs: attempt.responseTimeMs,
        source: attempt.source || "flashcard",
        rating: attempt.difficulty || undefined,
      },
    });
    const remaining = loadLocalObject(pendingKey);
    delete remaining[attempt.id];
    localStorage.setItem(pendingKey, JSON.stringify(remaining));
  } catch (error) {
    trackEvent("revision_attempt_sync_failed", {
      topicId: topic.id,
      source: attempt.source,
      reason: error.message,
    });
  }
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
  const classId = null;
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

function trackEvent(name, details = {}) {
  try {
    const existing = JSON.parse(localStorage.getItem(APP_EVENT_LOG_KEY) || "[]");
    const events = Array.isArray(existing) ? existing : [];
    events.unshift({
      name,
      details,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(APP_EVENT_LOG_KEY, JSON.stringify(events.slice(0, 250)));
  } catch {
    // Product analytics should never block the learner workflow.
  }

  const preferences = parseClientJson(accountProfile?.studentProfile?.notification_preferences, {});
  if (isGuestMode || !currentUser || preferences.usageAnalytics !== true) return;
  fetch("/api/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, details }),
  }).catch(() => {
    // Analytics delivery is intentionally non-blocking.
  });
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
    missedIds: [],
  };
}

function quizSessionKey(topicId) {
  return `neat-quiz-session:${currentUser?.id || "guest"}:${topicId}`;
}

function persistQuizSession() {
  if (!neatQuizState.quizId) return;
  const { questions, ...state } = neatQuizState;
  localStorage.setItem(quizSessionKey(state.quizId), JSON.stringify({
    ...state, questionIds: questions.map((question) => question.id),
    signature: hashString(JSON.stringify(questions)),
  }));
}

function restoreQuizSession(topic, bank) {
  const saved = loadLocalObject(quizSessionKey(topic.id));
  if (saved.completed || !Array.isArray(saved.questionIds) || !saved.questionIds.length) return null;
  const questions = saved.questionIds.map((id) => bank.find((question) => question.id === id));
  if (questions.some((question) => !question) || saved.signature !== hashString(JSON.stringify(questions))) return null;
  if (!Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= questions.length) return null;
  return { ...createEmptyNeatQuizState(), ...saved, questions };
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
    if (recommendedTopic && isRevisionTopicRecommendable(recommendedTopic.id)) return recommendedTopic;
  }

  const availableTopics = getComponentTopics().filter((topic) => isRevisionTopicRecommendable(topic.id));
  const candidates = availableTopics.filter((topic) => !earnedRevisionBadges[topic.id]);
  const topicPool = candidates.length ? candidates : availableTopics;

  return topicPool
    .map((topic, index) => ({
      index,
      progress: getRevisionTopicCardCount(topic) ? getCompletedRevisionCount(topic) / getRevisionTopicCardCount(topic) : 1,
      topic,
    }))
    .sort((a, b) => a.progress - b.progress || a.index - b.index)[0]?.topic;
}

function isRevisionTopicRecommendable(topicId) {
  return canAccessRevisionTopic(topicId) || canClaimFreeRevisionTopic(topicId);
}

function startDailyReview() {
  startAdaptiveRevisionSession(15);
  setTimeout(() => {
    elements.revisionCardGrid.querySelector("[data-card-id]")?.focus();
  }, 0);
}

async function continueRevisionJourney() {
  startAdaptiveRevisionSession(15);
  window.setTimeout(() => elements.revisionCardGrid.querySelector("[data-card-id]")?.focus(), 80);
}

function scrollToRevisionProgress() {
  setAppSection("progress");
  window.setTimeout(() => elements.revisionProgressSection.focus?.(), 0);
}

function renderAchievementSummary() {
  const totals = getRevisionAchievementTotals();
  const badgeCount = `${totals.earnedTopics} / ${totals.totalTopics}`;
  const cardCount = `${totals.earnedCards} / ${totals.totalCards}`;

  elements.badgeCount.textContent = badgeCount;
  elements.badgeProgressPercent.textContent = `${totals.percent}%`;
  elements.badgeProgressLabel.textContent = `${cardCount} cards completed`;
  elements.badgeProgressBar.style.width = `${totals.percent}%`;

  elements.badgeCoursePercent.textContent = `${totals.percent}%`;
  elements.badgeCourseCount.textContent = cardCount;
  elements.badgeCourseBar.style.width = `${totals.percent}%`;
  elements.badgeCollectionSummary.textContent =
    totals.earnedTopics === totals.totalTopics && totals.totalTopics
      ? "Every deck in this component has been completed. Return for spaced retrieval to strengthen recall."
      : `${totals.earnedTopics} of ${totals.totalTopics} deck badges unlocked. Complete decks to fill the collection.`;

  elements.revisionCoursePercent.textContent = `${totals.percent}%`;
  elements.revisionCourseLabel.textContent = `${cardCount} cards completed`;
  elements.revisionCourseBar.style.width = `${totals.percent}%`;
}

function renderBadgeCollection() {
  elements.badgeCollectionGrid.innerHTML = getComponentTopics().map((topic) => {
    const badge = getRevisionBadge(topic);
    const earnedAt = earnedRevisionBadges[topic.id];
    const earnedClass = earnedAt ? " earned" : " locked";
    const earnedLabel = earnedAt ? `Unlocked ${formatDate(earnedAt)}` : "Not yet unlocked";

    return `<article class="badge-card${earnedClass}" style="--badge-a:${escapeHtml(badge.a)}; --badge-b:${escapeHtml(badge.b)}; --badge-c:${escapeHtml(badge.c)};">
      ${renderBadgeEmblem(badge, !earnedAt)}
      <div>
        <span>${escapeHtml(topic.code)}</span>
        <h3>${escapeHtml(badge.name)}</h3>
        <small>${getRevisionTopicCardCount(topic)} cards · ${escapeHtml(earnedLabel)}</small>
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
  elements.achievementText.textContent = `${topic.code} ${topic.title}: ${getRevisionTopicCardCount(topic)} cards completed. This badge celebrates completing the deck; delayed retrieval builds stronger evidence of recall.`;
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
    const storedBadges = JSON.parse(localStorage.getItem(learningStorageKey(REVISION_BADGES_KEY)) || "{}");
    return storedBadges && typeof storedBadges === "object" && !Array.isArray(storedBadges) ? storedBadges : {};
  } catch {
    return {};
  }
}

function saveRevisionBadges() {
  localStorage.setItem(learningStorageKey(REVISION_BADGES_KEY), JSON.stringify(earnedRevisionBadges));
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
  const topics = getComponentTopics();
  const totalCards = topics.reduce((sum, topic) => sum + getRevisionTopicCardCount(topic), 0);
  const earnedTopics = topics.filter((topic) => earnedRevisionBadges[topic.id]).length;
  const earnedCards = topics.reduce(
    (sum, topic) => sum + (earnedRevisionBadges[topic.id] ? getRevisionTopicCardCount(topic) : getCompletedRevisionCount(topic)),
    0,
  );

  return {
    earnedCards,
    earnedTopics,
    percent: totalCards ? Math.round((earnedCards / totalCards) * 100) : 0,
    totalCards,
    totalTopics: topics.length,
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

async function sendContactMessage(event) {
  event.preventDefault();

  const name = elements.contactName.value.trim();
  const email = elements.contactEmail.value.trim();
  const reason = elements.contactReason.value;
  const message = elements.contactMessage.value.trim();
  const submitButton = elements.contactForm.querySelector(".contact-submit-button");

  clearContactFieldStates();

  if (!name) {
    elements.contactStatus.textContent = "Add your name so we know who the enquiry is from.";
    elements.contactStatus.className = "status-message error";
    elements.contactName.setAttribute("aria-invalid", "true");
    elements.contactName.focus();
    return;
  }

  if (!isValidContactEmail(email)) {
    elements.contactStatus.textContent = "Enter a valid email address so we can reply.";
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

  submitButton.disabled = true;
  submitButton.textContent = "Sending...";
  elements.contactStatus.textContent = "Sending your enquiry...";
  elements.contactStatus.className = "status-message";

  try {
    const response = await api("/api/contact", {
      method: "POST",
      body: { name, email, reason, message },
    });
    elements.contactStatus.textContent = response.message || "Thanks. Your enquiry has been sent.";
    elements.contactStatus.className = "status-message success";
    elements.contactMessage.value = "";
    updateContactMessageCounter();
    trackEvent("contact_enquiry_sent", { reason });
  } catch (error) {
    elements.contactStatus.textContent = error.message;
    elements.contactStatus.className = "status-message error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send enquiry";
  }
}

function updateContactMessageCounter() {
  const maxLength = Number(elements.contactMessage.getAttribute("maxlength")) || 1000;
  const currentLength = elements.contactMessage.value.length;
  elements.contactMessageCounter.textContent = `${currentLength} / ${maxLength}`;
  elements.contactMessageCounter.classList.toggle("near-limit", currentLength > maxLength * 0.85);
}

function handleContactRouteClick(event) {
  const focusButton = event.target.closest("[data-contact-focus]");
  if (focusButton) {
    elements.contactStatus.textContent = "Use the form below to send the enquiry directly in RecallStride.";
    elements.contactStatus.className = "status-message success";
    elements.contactForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.contactName.focus();
    return;
  }

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
  elements.contactName.removeAttribute("aria-invalid");
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
  renderSettingsAccountPanel();
  renderAvatarChoiceGroup();
  const notificationPreferences = parseClientJson(accountProfile?.studentProfile?.notification_preferences, {});
  elements.usageAnalyticsConsent.checked = notificationPreferences.usageAnalytics === true;
  elements.usageAnalyticsConsent.disabled = isGuestMode || !currentUser;
  renderRevisionProfileSettings();
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === appSettings.theme);
  });
}

function renderRevisionProfileSettings() {
  const profile = accountProfile?.studentProfile || {};
  const examDates = parseClientJson(profile.exam_dates, {});
  elements.settingsRevisionForm.elements.learnerType.value = profile.learner_type || "independent";
  elements.settingsRevisionForm.elements.targetGrade.value = profile.target_grade || "";
  elements.settingsRevisionForm.elements.revisionGoal.value = profile.revision_goal || "keep_up";
  elements.settingsRevisionForm.elements.paper1.value = examDates.paper1 || examDates.component1 || "";
  elements.settingsRevisionForm.elements.paper2.value = examDates.paper2 || examDates.component2 || "";
  elements.settingsRevisionForm.elements.personalTarget.value = profile.personal_target || "";
  elements.settingsRevisionGuestNote.hidden = Boolean(currentUser) && !isGuestMode;
  [...elements.settingsRevisionForm.elements].forEach((control) => {
    control.disabled = isGuestMode || !currentUser;
  });
  updatePersonalTargetCounter();
}

function updatePersonalTargetCounter() {
  const length = elements.settingsRevisionForm.elements.personalTarget.value.length;
  elements.settingsPersonalTargetCounter.textContent = `${length} / 240`;
}

async function saveRevisionProfile(event) {
  event.preventDefault();
  if (isGuestMode || !currentUser) return;
  const data = new FormData(elements.settingsRevisionForm);
  const submitButton = elements.settingsRevisionForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  elements.settingsRevisionMessage.textContent = "Saving revision profile...";
  elements.settingsRevisionMessage.className = "status-message";
  try {
    const response = await api("/api/profile", {
      method: "PATCH",
      body: {
        learnerType: data.get("learnerType"),
        targetGrade: data.get("targetGrade") || null,
        personalTarget: data.get("personalTarget") || "",
        revisionGoal: data.get("revisionGoal"),
        examDates: {
          paper1: data.get("paper1") || null,
          paper2: data.get("paper2") || null,
        },
      },
    });
    accountProfile = response;
    elements.settingsRevisionMessage.textContent = "Revision profile saved.";
    elements.settingsRevisionMessage.className = "status-message success";
    renderRevisionPage();
  } catch (error) {
    elements.settingsRevisionMessage.textContent = error.message;
    elements.settingsRevisionMessage.className = "status-message error";
  } finally {
    submitButton.disabled = false;
  }
}

async function updateAnalyticsConsent() {
  if (isGuestMode || !currentUser) return;
  const existing = parseClientJson(accountProfile?.studentProfile?.notification_preferences, {});
  elements.usageAnalyticsConsent.disabled = true;
  try {
    const response = await api("/api/profile", {
      method: "PATCH",
      body: {
        notificationPreferences: {
          ...existing,
          usageAnalytics: elements.usageAnalyticsConsent.checked,
        },
      },
    });
    accountProfile = response;
    elements.settingsMessage.textContent = elements.usageAnalyticsConsent.checked
      ? "Privacy-safe product analytics enabled."
      : "Product analytics disabled.";
    elements.settingsMessage.className = "status-message success";
  } catch (error) {
    elements.usageAnalyticsConsent.checked = !elements.usageAnalyticsConsent.checked;
    elements.settingsMessage.textContent = error.message;
    elements.settingsMessage.className = "status-message error";
  } finally {
    elements.usageAnalyticsConsent.disabled = false;
  }
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

function chooseProfileAvatar(event) {
  const button = event.target.closest("[data-avatar-choice]");
  if (!button) return;

  const avatarId = getProfileAvatar(button.dataset.avatarChoice).id;
  elements.settingsAvatarId.value = avatarId;
  if (!currentUser?.id || isGuestMode) {
    appSettings.profileAvatar = avatarId;
    saveSettings();
    renderAccountChrome();
    elements.settingsIdentityMessage.textContent = "Profile image saved on this device.";
    elements.settingsIdentityMessage.className = "status-message success";
  } else {
    elements.settingsIdentityMessage.textContent = "Profile image selected. Save your profile to sync it.";
    elements.settingsIdentityMessage.className = "status-message";
  }
  renderAvatarChoiceGroup(avatarId);
  renderProfileAvatar(elements.settingsProfileAvatar, avatarId);
}

function handleAvatarChoiceKeydown(event) {
  if (!event.target.matches("[data-avatar-choice]")) return;
  const choices = [...elements.avatarChoiceGroup.querySelectorAll("[data-avatar-choice]")];
  const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!offset) return;
  event.preventDefault();
  const next = choices[(choices.indexOf(event.target) + offset + choices.length) % choices.length];
  next.focus();
  next.click();
}

function renderAvatarChoiceGroup(selectedId = elements.settingsAvatarId?.value || getActiveProfileAvatarId()) {
  if (!elements.avatarChoiceGroup) return;

  const selectedAvatar = getProfileAvatar(selectedId);
  elements.avatarChoiceGroup.innerHTML = PROFILE_AVATARS.map((avatar) => {
    const isActive = avatar.id === selectedAvatar.id;
    return `<button class="${isActive ? "active" : ""}" type="button" role="radio" aria-checked="${String(isActive)}" tabindex="${isActive ? "0" : "-1"}" data-avatar-choice="${escapeHtml(avatar.id)}">
      <span class="profile-avatar profile-avatar-choice" data-avatar="${escapeHtml(avatar.id)}">${escapeHtml(avatar.mark)}</span>
      <strong>${escapeHtml(avatar.label)}</strong>
      <span class="avatar-selected-label">${isActive ? "Selected" : "Choose"}</span>
    </button>`;
  }).join("");
}

function renderSettingsAccountPanel() {
  if (!elements.settingsAccountName) return;

  const isSignedIn = Boolean(currentUser) && !isGuestMode;
  const planName = getCurrentPlanLabel();
  const avatarId = getActiveProfileAvatarId();
  elements.settingsAvatarId.value = avatarId;
  renderProfileAvatar(elements.settingsProfileAvatar);
  elements.settingsAccountName.textContent = isSignedIn ? currentUser.name || "RecallStride account" : "Guest workspace";
  elements.settingsAccountEmail.textContent = isSignedIn ? currentUser.email : "Not signed in";
  elements.settingsAccountPlan.textContent = isSignedIn
    ? `${planName} · synced workspace`
    : "Local browser storage · create an account to sync";
  elements.settingsProfileSync.textContent = isSignedIn ? "Synced account" : "Stored locally";
  elements.settingsProfileSync.classList.toggle("is-synced", isSignedIn);
  elements.settingsDisplayName.value = isSignedIn ? currentUser.name || "" : "Guest";
  elements.settingsDisplayName.disabled = !isSignedIn;
  elements.settingsAccountEmailField.value = isSignedIn ? currentUser.email : "Not signed in";
  elements.settingsSaveIdentity.disabled = !isSignedIn;
  elements.settingsSaveIdentity.textContent = isSignedIn ? "Save profile" : "Sign in to sync";
  elements.settingsProfileGuestNote.hidden = isSignedIn;
  elements.accountSessionTools.hidden = !isSignedIn;
  elements.accountDangerZone.hidden = !isSignedIn;
}

async function saveAccountProfile(event) {
  event.preventDefault();
  if (!currentUser || isGuestMode) return;

  const name = elements.settingsDisplayName.value.trim();
  if (name.length < 2) {
    elements.settingsDisplayName.setAttribute("aria-invalid", "true");
    elements.settingsIdentityMessage.textContent = "Enter a display name with at least 2 characters.";
    elements.settingsIdentityMessage.className = "status-message error";
    elements.settingsDisplayName.focus();
    return;
  }

  const originalLabel = elements.settingsSaveIdentity.textContent;
  elements.settingsSaveIdentity.disabled = true;
  elements.settingsSaveIdentity.textContent = "Saving...";
  elements.settingsIdentityMessage.textContent = "Saving your profile...";
  elements.settingsIdentityMessage.className = "status-message";
  try {
    const response = await api("/api/profile", {
      method: "PATCH",
      body: { name, avatarId: elements.settingsAvatarId.value },
    });
    accountProfile = response;
    currentUser = { ...currentUser, ...response.user };
    appSettings.profileAvatars = {
      ...(appSettings.profileAvatars || {}),
      [currentUser.id]: response.studentProfile?.avatar_id || elements.settingsAvatarId.value,
    };
    saveSettings();
    renderSettingsAccountPanel();
    renderAvatarChoiceGroup();
    renderAccountChrome();
    elements.settingsIdentityMessage.textContent = "Profile saved and synced to your account.";
    elements.settingsIdentityMessage.className = "status-message success";
    trackEvent("profile_updated", { avatar: response.studentProfile?.avatar_id || "notebook" });
  } catch (error) {
    elements.settingsIdentityMessage.textContent = error.message;
    elements.settingsIdentityMessage.className = "status-message error";
  } finally {
    elements.settingsSaveIdentity.disabled = false;
    elements.settingsSaveIdentity.textContent = originalLabel;
  }
}

function getActiveProfileAvatarId() {
  if (currentUser?.id && !isGuestMode) {
    return accountProfile?.studentProfile?.avatar_id
      || appSettings.profileAvatars?.[currentUser.id]
      || appSettings.profileAvatar;
  }
  return appSettings.profileAvatar;
}

function getProfileAvatar(avatarId = getActiveProfileAvatarId()) {
  return PROFILE_AVATARS.find((avatar) => avatar.id === avatarId) || PROFILE_AVATARS[0];
}

function renderProfileAvatar(target = elements.topbarProfileAvatar, avatarId = getActiveProfileAvatarId()) {
  if (!target) return;
  const avatar = getProfileAvatar(avatarId);
  target.dataset.avatar = avatar.id;
  target.textContent = avatar.mark;
  target.title = avatar.label;
}

function getCurrentPlanLabel() {
  if (isGuestMode || !currentUser) return "Guest";
  const plan = currentUser.entitlements || plans[currentUser.plan] || plans.free || {};
  return currentUser.planName || plan.name || "Free";
}

function openSettingsModal(tab = "general") {
  if (typeof tab !== "string") tab = "general";
  focusBeforeSettings = document.activeElement;
  renderSettingsControls();
  selectSettingsTab(tab);
  elements.settingsModal.hidden = false;
  document.body.classList.add("modal-open");
  if (tab === "account" && currentUser && !isGuestMode) loadAccountSessions();
  window.setTimeout(() => document.querySelector(`[data-settings-tab="${tab}"]`)?.focus(), 0);
}

async function loadAccountSessions() {
  elements.accountSessionSummary.textContent = "Checking signed-in devices...";
  try {
    const response = await api("/api/account/sessions");
    const otherCount = response.sessions.filter((session) => !session.current).length;
    elements.accountSessionSummary.textContent = otherCount
      ? `${response.sessions.length} active sessions, including ${otherCount} other device${otherCount === 1 ? "" : "s"}.`
      : "Only this browser is currently signed in.";
    elements.revokeOtherSessionsButton.disabled = otherCount === 0;
  } catch (error) {
    elements.accountSessionSummary.textContent = error.message;
  }
}

async function revokeOtherSessions() {
  elements.revokeOtherSessionsButton.disabled = true;
  try {
    const response = await api("/api/account/sessions/others", { method: "DELETE" });
    elements.settingsMessage.textContent = response.message;
    elements.settingsMessage.className = "status-message success";
    await loadAccountSessions();
  } catch (error) {
    elements.settingsMessage.textContent = error.message;
    elements.settingsMessage.className = "status-message error";
  }
}

async function deleteAccount() {
  const confirmation = window.prompt("This permanently deletes your account and personal data. Type DELETE MY ACCOUNT to continue.");
  if (confirmation !== "DELETE MY ACCOUNT") return;
  const password = window.prompt("Enter your current password. Google-only accounts must have signed in again within the last 15 minutes and can leave this blank.") || "";
  elements.deleteAccountButton.disabled = true;
  try {
    const ownerId = currentUser.id;
    await api("/api/account", { method: "DELETE", body: { confirmation, password } });
    try {
      const ownedKeys = window.PracticeDrafts.accountStorageKeys(Object.keys(localStorage), ownerId,
        [CARD_ATTEMPTS_KEY, ACTIVITY_EVENTS_KEY, REVIEW_SCHEDULES_KEY, MISTAKE_JOURNAL_KEY, STUDY_HISTORY_KEY, REVISION_BADGES_KEY, NEAT_QUIZ_PROGRESS_KEY]);
      ownedKeys.forEach((key) => localStorage.removeItem(key));
      delete appSettings.profileAvatars[ownerId];
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
    } catch { /* Server deletion succeeded even if browser storage is unavailable. */ }
    window.location.assign("/");
  } catch (error) {
    elements.settingsMessage.textContent = error.message;
    elements.settingsMessage.className = "status-message error";
    elements.deleteAccountButton.disabled = false;
  }
}

function closeSettingsModal() {
  elements.settingsModal.hidden = true;
  document.body.classList.remove("modal-open");
  focusBeforeSettings?.focus?.();
}

function trapSettingsFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = [...elements.settingsModal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((control) => !control.closest("[hidden]"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleSettingsModalClick(event) {
  if (event.target.closest("[data-close-settings]")) {
    closeSettingsModal();
  }
}

function handleFooterClick(event) {
  const legalButton = event.target.closest("[data-legal-page]");
  if (legalButton) {
    openLegalModal(legalButton.dataset.legalPage);
    return;
  }

  if (event.target.closest("[data-open-pricing-footer]")) {
    openPlansModal();
    return;
  }

  const sectionButton = event.target.closest("[data-app-section]");
  if (sectionButton) {
    localStorage.setItem(LANDING_DISMISSED_KEY, "true");
    elements.landingView.hidden = true;
    elements.appView.hidden = false;
    setAppSection(sectionButton.dataset.appSection);
  }
}

function handleLegalModalClick(event) {
  if (event.target.closest("[data-close-legal]")) {
    closeLegalModal();
  }
}

function openLegalModal(page = "privacy") {
  const legalPage = getLegalPageContent(page);
  elements.legalTitle.textContent = legalPage.title;
  elements.legalContent.innerHTML = legalPage.html;
  elements.legalModal.hidden = false;
  document.body.classList.add("modal-open");
  trackEvent("legal_page_opened", { page });
}

function closeLegalModal() {
  elements.legalModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function getLegalPageContent(page) {
  const pages = {
    privacy: {
      title: "Privacy Policy",
      html: `<p>RecallStride uses account details, notes and revision activity to provide the workspace, save progress and support enquiries.</p>
        <ul>
          <li>Contact enquiries are routed to the RecallStride support inbox.</li>
          <li>Student workspace data is used to run personal notes and revision features.</li>
          <li>Recall and worked-example drafts are saved for your account in this browser, not synced to other devices. They stop resuming after 30 days without an update and are removed when next checked.</li>
          <li>Payment processing is handled securely by Stripe when subscriptions are enabled.</li>
        </ul>
        <p>This is a summary of how your personal revision workspace handles data.</p>`,
    },
    terms: {
      title: "Terms of Service",
      html: `<p>RecallStride is a personal OCR A-Level Computer Science revision workspace.</p>
        <ul>
          <li>Users are responsible for the content they add to notes and collaboration spaces.</li>
          <li>Accounts may be limited or suspended if the service is misused.</li>
          <li>Subscription features depend on the active plan attached to the account.</li>
        </ul>`,
    },
    cookies: {
      title: "Cookie Policy",
      html: `<p>RecallStride uses essential cookies and local browser storage to keep users signed in, remember preferences and save local guest progress and account-scoped practice drafts.</p>
        <p>Analytics and marketing cookies should only be added with clear consent controls.</p>`,
    },
    "data-protection": {
      title: "Data Protection",
      html: `<p>BreakellSystems is building RecallStride with UK education workflows in mind.</p>
        <ul>
          <li>Only collect data needed to run accounts, notes, revision progress, payments and support.</li>
          <li>Review your account data and export personal notes and revision history in Settings.</li>
        </ul>`,
    },
    billing: {
      title: "Cancellation and Billing",
      html: `<p>Subscriptions use Stripe Checkout and the Stripe billing portal when payment settings are active.</p>
        <ul>
          <li>Students can start on the Free plan and upgrade to Pro.</li>
          <li>Subscribers manage payment methods, invoices and cancellation through Stripe.</li>
          <li>Contact support if you need help with an existing subscription.</li>
        </ul>`,
    },
  };

  return pages[page] || pages.privacy;
}

function switchSettingsTab(event) {
  const button = event.target.closest("[data-settings-tab]");
  if (!button) return;

  selectSettingsTab(button.dataset.settingsTab);
  if (button.dataset.settingsTab === "account" && currentUser && !isGuestMode) loadAccountSessions();
}

function selectSettingsTab(tabName = "general") {
  document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
    const isActive = tab.dataset.settingsTab === tabName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
    const isActive = panel.dataset.settingsPanel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

async function boot() {
  api("/api/auth/providers").then((providers) => {
    document.querySelector(".google-button").hidden = !providers.google;
  }).catch(() => {});
  const params = new URLSearchParams(location.search);
  const passwordResetToken = params.get("reset");
  const emailWasVerified = params.get("verified") === "1";
  const checkoutStatus = params.get("checkout");
  const billingReturned = params.get("billing") === "returned";
  const publicSignup = params.get("signup") === "1";
  const publicDemo = params.get("demo") === "1";
  if (passwordResetToken) {
    history.replaceState({}, "", location.pathname || "/");
  } else if (emailWasVerified || checkoutStatus || billingReturned) {
    history.replaceState({}, "", "/");
  }

  try {
    const session = await api("/api/session");
    applyAuthenticatedSession(session.user, session.plans);
    try {
      await loadApp();
    } catch (error) {
      handleAuthenticatedLoadError(error);
    }
    if (checkoutStatus === "success") {
      elements.upgradeMessage.textContent = "Payment received. Your subscription will unlock as soon as Stripe confirms it.";
      elements.upgradeMessage.className = "topbar-plan-message success";
    } else if (checkoutStatus === "cancelled") {
      elements.upgradeMessage.textContent = "Checkout cancelled. You can choose a plan when you are ready.";
      elements.upgradeMessage.className = "topbar-plan-message";
    } else if (billingReturned) {
      elements.upgradeMessage.textContent = "Billing portal closed. Your account is up to date.";
      elements.upgradeMessage.className = "topbar-plan-message success";
    }
    if (passwordResetToken) openPasswordReset(passwordResetToken);
  } catch {
    loadGuestApp({ showLanding: !publicDemo && !localStorage.getItem(LANDING_DISMISSED_KEY) && !emailWasVerified });
    if (publicDemo) openDemoWorkspace({ section: "home" });
    if (publicSignup) openAuthModal("signup");
    if (emailWasVerified) {
      openAuthModal("login", { captureTask: false });
      showAuthMessage("Email verified. Log in to return to your study workspace.", "success");
    }
    if (passwordResetToken) openPasswordReset(passwordResetToken);
  }
}

function handleLandingClick(event) {
  const scrollButton = event.target.closest("[data-landing-scroll]");
  if (scrollButton) {
    const target = document.querySelector(`#landing-${scrollButton.dataset.landingScroll}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const actionButton = event.target.closest("[data-landing-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.landingAction;
  if (action === "signup") {
    openAuthModal("signup");
    return;
  }

  if (action === "login") {
    openAuthModal("login");
    return;
  }

  if (action === "contact") {
    openDemoWorkspace({ section: "contact" });
    window.setTimeout(() => {
      elements.contactName?.focus();
    }, 80);
    return;
  }

  openDemoWorkspace({ section: "home" });
}

function showLandingPage() {
  elements.landingView.hidden = false;
  elements.appView.hidden = true;
  elements.authView.hidden = true;
  hideLaunchOverlay();
}

function handleTopbarBrandAction() {
  if (isGuestMode || !currentUser) {
    exitDemoWorkspace();
    return;
  }

  setAppSection("home");
}

function exitDemoWorkspace() {
  localStorage.removeItem(LANDING_DISMISSED_KEY);
  activeAppSection = "home";
  elements.authView.hidden = true;
  elements.appView.hidden = true;
  elements.landingView.hidden = false;
  hideLaunchOverlay();
  window.scrollTo({ top: 0, behavior: "smooth" });
  trackEvent("demo_exited_to_landing");
}

function openDemoWorkspace(options = {}) {
  localStorage.setItem(LANDING_DISMISSED_KEY, "true");
  ensureDemoWorkspace({ reset: false });
  elements.landingView.hidden = true;
  elements.appView.hidden = false;
  activeComponentId = "h446-01";
  setAppSection(options.section === "contact" ? "contact" : "revise");
  if (options.section !== "contact") {
    const plan = getAdaptiveSessionPlan(5);
    activeAdaptiveSession = window.NEAT_REVISION_SESSION.create({ ...plan, items: plan.items.slice(0, 4) }, createLocalId("demo"));
    openNextAdaptiveSessionTopic();
  }
  render();
  trackEvent("demo_workspace_opened", { section: options.section || "home" });
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
        returnTask: authReturnTask,
      },
    });
    applyAuthenticatedSession(response.user, response.plans);
    showAuthMessage("Login successful. Loading your workspace...", "success");
    closeAuthModal();
    try {
      await loadApp();
    } catch (error) {
      handleAuthenticatedLoadError(error);
    }
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
        returnTask: authReturnTask,
      },
    });

    const devLink = response.devVerificationUrl
      ? ` Local dev link: <a href="${response.devVerificationUrl}">verify now</a>.`
      : "";
    setAuthMode("login");
    document.querySelector("#login-email").value = document.querySelector("#signup-email").value;
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
  window.location.assign("/");
}

function applyAuthenticatedSession(user, nextPlans = null) {
  currentUser = user;
  selectAccountLearningState();
  plans = nextPlans || plans;
  isGuestMode = false;
  elements.authView.hidden = true;
  elements.landingView.hidden = true;
  elements.appView.hidden = false;
  elements.userName.textContent = currentUser?.name || "Account";
  elements.userEmail.textContent = currentUser?.email || "";
  renderAccountChrome();
  renderPlan();
}

function handleAuthenticatedLoadError(error) {
  renderAccountChrome();
  hideLaunchOverlay();
  showWorkspaceMessage(`Signed in, but your workspace did not finish loading. Refresh the page or try again in a moment. ${error.message}`, "error");
  trackEvent("authenticated_workspace_load_failed", { reason: error.message });
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  elements.loginForm.hidden = !isLogin;
  elements.signupForm.hidden = isLogin;
  elements.passwordRecoveryForm.hidden = true;
  elements.passwordResetForm.hidden = true;
  elements.authProviderList.hidden = false;
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

function openPasswordRecovery() {
  elements.loginForm.hidden = true;
  elements.signupForm.hidden = true;
  elements.passwordResetForm.hidden = true;
  elements.passwordRecoveryForm.hidden = false;
  elements.authProviderList.hidden = true;
  elements.authCardTitle.textContent = "Reset your password";
  showAuthMessage("");
  document.querySelector("#recovery-email").value = document.querySelector("#login-email").value;
  document.querySelector("#recovery-email").focus();
}

function openPasswordReset(token) {
  openAuthModal("login");
  elements.loginForm.hidden = true;
  elements.signupForm.hidden = true;
  elements.passwordRecoveryForm.hidden = true;
  elements.passwordResetForm.hidden = false;
  elements.authProviderList.hidden = true;
  activePasswordResetToken = token;
  elements.authCardTitle.textContent = "Choose a new password";
  document.querySelector("#reset-password").focus();
}

async function requestPasswordReset(event) {
  event.preventDefault();
  const button = elements.recoverySubmitButton;
  button.disabled = true;
  button.textContent = "Sending...";
  showAuthMessage("");
  try {
    const response = await api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: document.querySelector("#recovery-email").value },
    });
    showAuthMessage(response.message, "success");
  } catch (error) {
    showAuthMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Send reset link";
  }
}

async function completePasswordReset(event) {
  event.preventDefault();
  const password = document.querySelector("#reset-password").value;
  if (password.length < 8) {
    showAuthMessage("Use at least 8 characters.", "error");
    return;
  }
  const button = elements.resetPasswordSubmitButton;
  button.disabled = true;
  button.textContent = "Updating...";
  try {
    const response = await api("/api/auth/reset-password", {
      method: "POST",
      body: { token: activePasswordResetToken, password },
    });
    activePasswordResetToken = "";
    history.replaceState({}, "", "/");
    setAuthMode("login");
    showAuthMessage(response.message, "success");
  } catch (error) {
    showAuthMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Update password";
  }
}

function openAuthModal(mode = "login", { captureTask = true } = {}) {
  authReturnTask = captureTask && elements.landingView.hidden ? {
    section: activeAppSection,
    topicId: activeRevisionTopicId,
    practiceMode: activePracticeMode,
  } : null;
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

function loadGuestApp(options = {}) {
  isGuestMode = true;
  currentUser = null;
  selectAccountLearningState();
  plans = {
    ...plans,
    guest: {
      name: "Guest",
      noteLimit: "local",
      workspaceLimit: 1,
      features: {
        collaboration: false,
        pdfExport: false,
        studyPack: false,
        versionHistory: false,
        fullRevisionLibrary: false,
        quickPractice: true,
      },
    },
  };

  const guestState = loadGuestState();
  workspaces = guestState.workspaces;
  activeWorkspaceId = workspaces[0]?.id || null;
  members = guestState.members;
  notes = guestState.notes.filter((note) => note.workspace_id === activeWorkspaceId);
  selectedId = notes[0]?.id || null;
  pruneRevisionTopicCardsForCurrentPlan();
  if (activeWorkspaceId === "demo-ocr-workspace") {
    activeRevisionTopicId = DEFAULT_GUEST_REVISION_DECK_ID;
    saveFreeRevisionTopicId(DEFAULT_GUEST_REVISION_DECK_ID);
    // Old sample records remain on disk but are excluded from learning evidence.
  }
  elements.authView.hidden = true;
  elements.appView.hidden = Boolean(options.showLanding);
  elements.landingView.hidden = !options.showLanding;
  render();
  if (options.showLanding) {
    showLandingPage();
  } else {
    hideLaunchOverlay();
  }
}

async function loadApp() {
  isGuestMode = false;
  elements.authView.hidden = true;
  elements.landingView.hidden = true;
  elements.appView.hidden = false;
  elements.userName.textContent = currentUser.name;
  elements.userEmail.textContent = currentUser.email;
  const profileResponse = await api("/api/profile");
  accountProfile = profileResponse;
  if (profileResponse.user) currentUser = profileResponse.user;
  await refreshAccessibleRevisionContent();
  for (const attempt of Object.values(loadLocalObject(`neat-pending-attempts:${currentUser.id}`)).slice(0, 30)) await syncRevisionAttempt(attempt);
  await loadAccountLearningHistory();
  pruneRevisionTopicCardsForCurrentPlan();
  renderPlan();

  await loadWorkspaces();
  const accountWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  await selectWorkspace(accountWorkspace?.id);
  renderAccountChrome();
  hideLaunchOverlay();
  await restoreAuthDestination();
  maybeOpenOnboarding();
}

async function restoreAuthDestination() {
  const userId = currentUser?.id;
  const { task } = await api("/api/auth/continuation");
  if (!task || currentUser?.id !== userId) return;
  const topic = REVISION_TOPICS.find((item) => item.id === task.topicId);
  if (topic) {
    activeComponentId = topic.componentId || "h446-01";
    activeRevisionTopicId = topic.id;
    activePracticeMode = task.practiceMode;
    // Only navigation crosses verification. Guest answers and notes are never imported.
    setAppSection(task.section);
  }
  await api("/api/auth/continuation", { method: "DELETE" });
  authReturnTask = null;
}


async function loadAccountLearningHistory() {
  const userId = currentUser?.id;
  if (!userId) return;
  const history = await api("/api/revision/history");
  if (currentUser?.id !== userId) return;
  serverLearningEvidence = history.evidence;
  mistakeJournal = history.mistakes.map((row) => ({ id: row.id, conceptId: row.concept_id, topicId: row.deck_id,
    prompt: row.front, explanation: row.explanation, activityType: row.activity_type,
    createdAt: row.created_at, updatedAt: row.updated_at, correctedAt: row.corrected_at }));
  saveLocalArray(MISTAKE_JOURNAL_KEY, mistakeJournal);
  const pending = Object.values(loadLocalObject(`neat-pending-attempts:${userId}`));
  liveLearningAttemptIds = new Set(pending.map((attempt) => attempt.id));
  cardAttempts = [...pending, ...history.attempts.map((attempt) => ({
    id: attempt.id, userId, cardId: `${attempt.deck_id}:${attempt.card_key}`, topicId: attempt.deck_id,
    confidence: attempt.confidence, quizCorrect: attempt.quiz_correct === null ? undefined : Boolean(attempt.quiz_correct),
    source: attempt.source, createdAt: attempt.created_at, classId: attempt.class_id,
  }))];
  reviewSchedules = Object.fromEntries(history.schedules.map((row) => [row.concept_id, {
    difficulty: row.difficulty, stabilityDays: row.stability_days, retrievability: row.retrievability,
    lastReviewAt: row.last_review_at, nextReviewAt: row.next_review_at, successfulRetrievals: row.successful_retrievals, lapses: row.lapses,
  }]));
  studyHistory = {};
  for (const attempt of cardAttempts) {
    const key = getStudyDayKey(new Date(attempt.createdAt));
    const day = studyHistory[key] ||= { cards: 0, topics: [] };
    day.cards += 1;
    if (!day.topics.includes(attempt.topicId)) day.topics.push(attempt.topicId);
    completedRevisionCards.add(attempt.cardId);
  }
  for (const topic of REVISION_TOPICS) {
    if (topic.cards.length && topic.cards.every((card) => completedRevisionCards.has(`${topic.id}:${card.id}`))) {
      earnedRevisionBadges[topic.id] ||= cardAttempts.find((attempt) => attempt.topicId === topic.id)?.createdAt;
    }
  }
  saveStudyHistory();
  saveRevisionBadges();
  saveLocalArray(CARD_ATTEMPTS_KEY, cardAttempts);
  localStorage.setItem(learningStorageKey(REVIEW_SCHEDULES_KEY), JSON.stringify(reviewSchedules));
  adaptivePlanPreview = null;
}


function maybeOpenOnboarding() {
  if (isGuestMode || !currentUser || accountProfile?.studentProfile?.onboarding_completed_at) return;
  openOnboarding();
}

function openOnboarding() {
  const profile = accountProfile?.studentProfile || {};
  focusBeforeOnboarding = document.activeElement;
  onboardingStep = 1;
  elements.onboardingTopicGrid.innerHTML = REVISION_TOPICS.map((topic) => `
    <label>
      <input type="checkbox" name="taught-topic" value="${escapeHtml(topic.id)}" />
      <span><strong>${escapeHtml(topic.code)}</strong><small>${escapeHtml(topic.title)}</small></span>
    </label>`).join("");

  const learnerType = profile.learner_type || "";
  const revisionGoal = profile.revision_goal || "";
  if (learnerType) {
    elements.onboardingForm.querySelector(`[name="learner-type"][value="${learnerType}"]`)?.setAttribute("checked", "");
  }
  if (revisionGoal) {
    elements.onboardingForm.querySelector(`[name="revision-goal"][value="${revisionGoal}"]`)?.setAttribute("checked", "");
  }
  document.querySelector("#onboarding-target-grade").value = profile.target_grade || "";
  document.querySelector("#onboarding-personal-target").value = profile.personal_target || "";
  const examDates = parseClientJson(profile.exam_dates, {});
  document.querySelector("#onboarding-component-1-date").value = examDates.paper1 || examDates.component1 || "";
  document.querySelector("#onboarding-component-2-date").value = examDates.paper2 || examDates.component2 || "";
  const taughtTopics = parseClientJson(profile.taught_topic_ids, []);
  taughtTopics.forEach((topicId) => {
    const input = elements.onboardingTopicGrid.querySelector(`input[value="${topicId}"]`);
    if (input) input.checked = true;
  });

  elements.onboardingMessage.textContent = "";
  elements.onboardingModal.hidden = false;
  document.body.classList.add("modal-open");
  renderOnboardingStep();
}

function renderOnboardingStep() {
  elements.onboardingForm.querySelectorAll("[data-onboarding-step]").forEach((section) => {
    section.hidden = Number(section.dataset.onboardingStep) !== onboardingStep;
  });
  elements.onboardingProgressLabel.textContent = `Step ${onboardingStep === 1 ? 1 : 2} of 2`;
  elements.onboardingProgressBar.style.width = `${onboardingStep === 1 ? 50 : 100}%`;
  elements.onboardingBack.hidden = onboardingStep === 1;
  elements.onboardingNext.hidden = onboardingStep === 6;
  const heading = elements.onboardingForm.querySelector(`[data-onboarding-step="${onboardingStep}"] h3`);
  heading?.setAttribute("tabindex", "-1");
  heading?.focus();
}

function moveOnboardingStep(direction) {
  onboardingStep = direction > 0 ? 6 : 1;
  elements.onboardingMessage.textContent = "";
  renderOnboardingStep();
}

function validateOnboardingStep() {
  const requiredName = onboardingStep === 1 ? "learner-type" : onboardingStep === 5 ? "revision-goal" : null;
  if (!requiredName || elements.onboardingForm.querySelector(`[name="${requiredName}"]:checked`)) return true;
  elements.onboardingMessage.textContent = "Choose one option to continue.";
  elements.onboardingMessage.className = "status-message error";
  elements.onboardingForm.querySelector(`[name="${requiredName}"]`)?.focus();
  return false;
}

async function completeOnboarding(event) {
  event.preventDefault();
  const action = event.submitter?.value || "explore";
  const data = new FormData(elements.onboardingForm);
  const submitButtons = elements.onboardingForm.querySelectorAll("button[type='submit']");
  submitButtons.forEach((button) => { button.disabled = true; });
  elements.onboardingMessage.textContent = "Saving your revision setup...";
  elements.onboardingMessage.className = "status-message";

  try {
    const response = await api("/api/profile", {
      method: "PATCH",
      body: {
        learnerType: data.get("learner-type") || "independent",
        targetGrade: data.get("target-grade") || null,
        personalTarget: data.get("personal-target") || "",
        taughtTopicIds: data.getAll("taught-topic"),
        taughtTopicSource: "self",
        revisionGoal: data.get("revision-goal") || "keep_up",
        examDates: {
          paper1: data.get("component-1-date") || null,
          paper2: data.get("component-2-date") || null,
        },
        completeOnboarding: true,
      },
    });
    accountProfile = response;
    if (response.user) currentUser = response.user;
    elements.onboardingModal.hidden = true;
    document.body.classList.remove("modal-open");
    setAppSection(action === "diagnostic" ? "home" : activeAppSection);
    renderRevisionPage();
    focusBeforeOnboarding?.focus?.();
    trackEvent("onboarding_completed", { action, learnerType: data.get("learner-type"), revisionGoal: data.get("revision-goal") });
    if (action === "diagnostic") startAdaptiveRevisionSession(5);
  } catch (error) {
    elements.onboardingMessage.textContent = error.message || "Your setup could not be saved. Try again.";
    elements.onboardingMessage.className = "status-message error";
  } finally {
    submitButtons.forEach((button) => { button.disabled = false; });
  }
}

function parseClientJson(value, fallback) {
  if (value && typeof value !== "string") return value;
  try {
    return JSON.parse(value || "") ?? fallback;
  } catch {
    return fallback;
  }
}

function trapOnboardingFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = [...elements.onboardingModal.querySelectorAll(
    "button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex='0']",
  )].filter((control) => !control.closest("[hidden]"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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

  const defaultState = createDemoGuestState();
  saveGuestState(defaultState);
  return defaultState;
}

function createDemoGuestState() {
  const now = new Date().toISOString();
  const workspaceId = "demo-ocr-workspace";
  return {
    workspaces: [
      {
        id: workspaceId,
        name: "OCR demo workspace",
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
        body: getDemoNoteBody(),
        tag: "processor",
        title: "1.1.1 Structure of the Processor",
        summary: "CPU components, registers, buses, the fetch-decode-execute cycle and performance factors.",
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

function ensureDemoWorkspace(options = {}) {
  if (options.reset) {
    const resetState = createDemoGuestState();
    saveGuestState(resetState);
  } else {
    const existing = loadGuestStateWithoutDefault();
    const hasDemo = existing.workspaces.some((workspace) => workspace.id === "demo-ocr-workspace");
    if (!hasDemo) {
      const demo = createDemoGuestState();
      saveGuestState({
        workspaces: [...demo.workspaces, ...existing.workspaces],
        members: existing.members.length ? existing.members : createGuestMembers(),
        notes: [...demo.notes, ...existing.notes],
      });
    }
  }

  const guestState = loadGuestState();
  workspaces = guestState.workspaces;
  activeWorkspaceId = "demo-ocr-workspace";
  members = guestState.members;
  notes = guestState.notes.filter((note) => note.workspace_id === activeWorkspaceId);
  selectedId = notes[0]?.id || null;
  activeRevisionTopicId = "cs-1-1-1";
  saveFreeRevisionTopicId("cs-1-1-1");
  // Start a real short activity without inventing a study history.
}

function getDemoNoteBody() {
  return `# 1.1.1 Structure of the Processor

## Topic overview
- The CPU fetches, decodes and executes instructions.
- The Control Unit coordinates the movement of data and sends control signals.
- The ALU performs arithmetic and logical operations.
- Registers are small, fast storage locations inside the processor.
- Buses carry addresses, data and control signals between CPU, memory and devices.

## Key definitions
CPU: The central processing unit executes program instructions using the fetch-decode-execute cycle.
Program Counter: A register that stores the address of the next instruction to fetch.
Accumulator: A register that temporarily stores calculation results from the ALU.
Cache: Fast memory close to the CPU that stores frequently used data and instructions.

## Example
During fetch, the address in the Program Counter is copied to the MAR. The instruction is fetched from memory into the MDR and copied into the CIR so the Control Unit can decode it.

## Exam tip
When explaining performance, link clock speed, cores and cache to how quickly instructions can be processed.

- [ ] Draw the fetch-decode-execute cycle.
- [ ] Explain why cache improves processor performance.
- [ ] Compare Von Neumann and Harvard architecture.`;
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
    renderMembers("Create an account to share notes with collaborators.");
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
      summary: "Start writing and a tidy summary is built here.",
      created_at: now,
      updated_at: now,
    };

    notes.unshift(note);
    selectedId = note.id;
    saveGuestState();
    recordActivityEvent({ type: "note_created" });
    trackEvent("note_created", { mode: "guest" });
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
    trackEvent("note_created", { mode: "account" });
    render();
    elements.noteBody.focus();
  } catch (error) {
    showWorkspaceMessage(error.message, "error");
  }
}

async function deleteSelectedNote() {
  if (!selectedId) return;
  if (!window.confirm("Delete this note? This cannot be undone.")) return;

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

async function handleBillingAction(event) {
  const portalButton = event.target.closest("[data-billing-portal]");
  if (portalButton) {
    if (isGuestMode) {
      closePlansModal();
      openAuthModal("login");
      showAuthMessage("Log in first, then you can manage billing.", "success");
      return;
    }

    try {
      portalButton.disabled = true;
      portalButton.textContent = "Opening...";
      const response = await api("/api/billing/customer-portal", { method: "POST" });
      window.location.href = response.url;
    } catch (error) {
      elements.upgradeMessage.textContent = error.message;
      elements.upgradeMessage.className = "topbar-plan-message error";
      portalButton.disabled = false;
      portalButton.textContent = "Manage billing";
    }
    return;
  }

  const button = event.target.closest("[data-plan]");
  if (!button) return;
  const plan = button.dataset.plan;


  if (isGuestMode) {
    closePlansModal();
    openAuthModal("signup");
    showAuthMessage("Create an account first, then choose a plan for sync and collaboration.", "success");
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Opening checkout...";
    const response = await api("/api/billing/checkout-session", {
      method: "POST",
      body: { plan },
    });
    window.location.href = response.url;
  } catch (error) {
    elements.upgradeMessage.textContent = error.message;
    elements.upgradeMessage.className = "topbar-plan-message error";
    button.disabled = false;
    button.textContent = "Upgrade to Pro";
  }
}

function openPlansModal() {
  elements.pricingModal.hidden = false;
  document.body.classList.add("modal-open");
  trackEvent("pricing_opened", { section: activeAppSection });
}

function closePlansModal() {
  elements.pricingModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handlePricingModalClick(event) {
  if (event.target.closest("[data-auth-mode]")) {
    closePlansModal();
    openAuthModal("signup");
    return;
  }
  if (event.target.closest("[data-close-pricing]")) {
    closePlansModal();
    return;
  }

  handleBillingAction(event);
}

function handleGlobalKeydown(event) {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openGlobalSearch();
    return;
  }
  if (!isTyping && event.key === "/" && elements.globalSearchModal.hidden) {
    event.preventDefault();
    openGlobalSearch();
    return;
  }
  if (!isTyping && elements.appView.classList.contains("revision-focus-active")) {
    const activeCard = elements.revisionCardGrid.querySelector(".focused-retrieval-card");
    const confidenceIndex = { Digit1: 0, Digit2: 1, Digit3: 2 }[event.code];
    if (confidenceIndex !== undefined) {
      const confidenceButton = activeCard?.querySelectorAll("[data-card-confidence]")[confidenceIndex];
      if (confidenceButton && confidenceButton.tabIndex === 0) {
        event.preventDefault();
        confidenceButton.click();
        return;
      }
    }
  }
  if (event.key === "Escape" && elements.appView.classList.contains("mobile-sidebar-open")) {
    closeMobileNotesSidebar();
    elements.mobileNotesButton.focus();
  }
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
  if (event.key === "Escape" && !elements.legalModal.hidden) {
    closeLegalModal();
  }
  if (event.key === "Escape" && !elements.globalSearchModal.hidden) {
    closeGlobalSearch();
  }
  if (event.key === "Escape" && elements.appView.classList.contains("revision-focus-active")) {
    setRevisionFocusMode(false);
  }
}

function openGlobalSearch() {
  if (!elements.globalSearchModal.hidden) return;
  focusBeforeGlobalSearch = document.activeElement;
  globalSearchSelection = 0;
  elements.globalSearchModal.hidden = false;
  document.body.classList.add("modal-open");
  elements.globalSearchInput.value = "";
  renderGlobalSearchResults();
  window.setTimeout(() => elements.globalSearchInput.focus(), 0);
}

function closeGlobalSearch() {
  elements.globalSearchModal.hidden = true;
  document.body.classList.remove("modal-open");
  focusBeforeGlobalSearch?.focus?.();
}

function renderGlobalSearchResults() {
  const query = elements.globalSearchInput.value.trim().toLowerCase();
  if (!query) {
    elements.globalSearchResults.innerHTML = `<div class="global-search-empty"><strong>Search the OCR course and your current workspace</strong><p>Use a topic code, concept, card prompt, note title or folder tag.</p></div>`;
    return;
  }

  const results = buildGlobalSearchResults(query);
  globalSearchSelection = Math.min(globalSearchSelection, Math.max(0, results.length - 1));
  elements.globalSearchResults.innerHTML = results.length
    ? results.map((result, index) => `<button class="global-search-result ${index === globalSearchSelection ? "selected" : ""}" type="button" data-search-kind="${escapeHtml(result.kind)}" data-search-id="${escapeHtml(result.id)}" data-search-index="${index}">
        <span class="global-search-result-type">${escapeHtml(result.type)}</span>
        <span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.detail)}</small></span>
        <span class="global-search-result-action">Open</span>
      </button>`).join("")
    : `<div class="global-search-empty"><strong>No matching result</strong><p>Try a topic code, a shorter term, or search your note text.</p></div>`;
}

function buildGlobalSearchResults(query) {
  const results = [];
  const aliases = {
    mar: "memory address register",
    mdr: "memory data register",
    pc: "program counter",
    cir: "current instruction register",
    acc: "accumulator",
    alu: "arithmetic logic unit",
    cu: "control unit",
    fde: "fetch decode execute",
  };
  const searchTerms = [...new Set([query, aliases[query]].filter(Boolean))];
  REVISION_TOPICS.forEach((topic) => {
    const matchingCard = (topic.cards || []).find((card) => {
      const cardText = `${card.front} ${card.back} ${card.category}`.toLowerCase();
      return searchTerms.some((term) => cardText.includes(term));
    });
    const topicText = `${topic.code} ${topic.title} ${topic.summary}`.toLowerCase();
    if (searchTerms.some((term) => topicText.includes(term)) || matchingCard) {
      results.push({
        kind: "topic",
        id: topic.id,
        type: matchingCard ? "Concept" : "OCR topic",
        title: matchingCard?.front || `${topic.code} ${topic.title}`,
        detail: matchingCard ? `${topic.code} ${topic.title}` : topic.summary,
      });
    }
  });
  notes.forEach((note) => {
    const noteText = `${note.title} ${note.summary} ${note.tag} ${note.body}`.toLowerCase();
    if (noteText.includes(query)) {
      results.push({ kind: "note", id: note.id, type: "Note", title: note.title || createTitle(note.body), detail: `#${note.tag} · ${note.summary || createSummary(note.body)}` });
    }
  });
  return results.slice(0, 12);
}

function handleGlobalSearchKeydown(event) {
  const results = [...elements.globalSearchResults.querySelectorAll("[data-search-index]")];
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    globalSearchSelection = (globalSearchSelection + direction + results.length) % results.length;
    renderGlobalSearchResults();
    elements.globalSearchResults.querySelector(`[data-search-index="${globalSearchSelection}"]`)?.scrollIntoView({ block: "nearest" });
  }
  if (event.key === "Enter" && results.length) {
    event.preventDefault();
    openGlobalSearchResult(results[globalSearchSelection]);
  }
}

function trapGlobalSearchFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = [...elements.globalSearchModal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleGlobalSearchClick(event) {
  if (event.target.closest("[data-close-global-search]")) {
    closeGlobalSearch();
    return;
  }
  const result = event.target.closest("[data-search-kind]");
  if (result) openGlobalSearchResult(result);
}

function openGlobalSearchResult(result) {
  const kind = result.dataset.searchKind;
  const id = result.dataset.searchId;
  closeGlobalSearch();
  if (kind === "note") {
    setAppSection("notes");
    selectedId = id;
    renderNotesAndFolders();
    renderEditor();
    elements.noteBody.focus();
    return;
  }
  activeRevisionTopicId = id;
  setAppSection("revise");
  renderRevisionPage();
  document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleRevisionFocusMode() {
  setRevisionFocusMode(!elements.appView.classList.contains("revision-focus-active"));
}

function setRevisionFocusMode(enabled) {
  elements.appView.classList.toggle("revision-focus-active", enabled);
  document.body.classList.toggle("revision-focus-mode", enabled);
  elements.revisionFocusButton.setAttribute("aria-pressed", String(enabled));
  elements.revisionFocusButton.textContent = enabled ? "Exit focus" : "Focus mode";
  if (enabled) elements.revisionCardGrid.querySelector(".revision-card")?.focus();
}

function handleTitleKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    elements.autoTitle.blur();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    const note = getSelectedNote();
    elements.autoTitle.textContent = note?.title || createTitle(note?.body || "");
    elements.autoTitle.blur();
  }
}

function renameSelectedNoteFromTitle() {
  const note = getSelectedNote();
  if (!note) return;

  const nextTitle = elements.autoTitle.textContent.replace(/\s+/g, " ").trim();
  const currentTitle = note.title || createTitle(note.body);
  if (!nextTitle || nextTitle === currentTitle) {
    elements.autoTitle.textContent = currentTitle;
    return;
  }

  const nextHeading = `# ${nextTitle}`;
  elements.noteBody.value = /^#{1,3}\s+.+$/m.test(note.body || "")
    ? (note.body || "").replace(/^#{1,3}\s+.+$/m, nextHeading)
    : `${nextHeading}\n\n${note.body || ""}`.trim();
  updateActiveNote();
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
    definition: { prefix: "> ", placeholder: "Definition: concise explanation" },
    example: { prefix: "- Example: ", placeholder: "How this appears in a question or scenario" },
    examtip: { prefix: "- Exam tip: ", placeholder: "Link the point to OCR wording or marks" },
    bullet: { prefix: "- ", placeholder: "Evidence, explanation, or example" },
    numbered: { prefix: "1. ", placeholder: "Step or sequence" },
    check: { prefix: "- [ ] ", placeholder: "Revision task" },
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
  const menuLabel = document.querySelector("#global-menu-label");
  menuLabel.innerHTML = isSignedIn ? `<span class="profile-avatar profile-avatar-small" id="menu-profile-avatar"></span><span>${escapeHtml((currentUser.name || "My account").split(" ")[0])}</span>` : "Account";
  if (isSignedIn) renderProfileAvatar(document.querySelector("#menu-profile-avatar"));
  menuLabel.setAttribute("aria-label", isSignedIn ? `Signed in as ${currentUser.name || "your account"}. Open account menu` : "Open account and help menu");
  document.querySelectorAll('[data-global-action="login"], [data-global-action="signup"]').forEach((button) => { button.hidden = isSignedIn; });
  document.querySelector('[data-global-action="logout"]').hidden = !isSignedIn;
  elements.guestAccountActions.hidden = isSignedIn;
  elements.signedInAccountActions.hidden = !isSignedIn;
  elements.topbarBrandButton.setAttribute("aria-label", isSignedIn ? "Return to Today" : "Exit demo and return to the RecallStride homepage");
  elements.topbarBrandButton.title = isSignedIn ? "Return to Today" : "Exit demo";
  renderProfileAvatar(elements.topbarProfileAvatar);

  if (isSignedIn) {
    const planLabel = getCurrentPlanLabel();
    const displayName = currentUser.name || currentUser.email || "Account";
    elements.accountStatus.textContent = `Signed in as ${displayName}`;
    elements.topbarUserLabel.textContent = displayName;
    elements.topbarUserMeta.textContent = `${planLabel} · synced`;
    elements.userName.textContent = currentUser.name;
    elements.userEmail.textContent = currentUser.email;
    const freeDeck = getSelectedFreeRevisionTopicId();
    const planSuffix = !hasFeature("fullRevisionLibrary") && freeDeck ? " · 1 deck" : "";
    elements.userPlanLabel.textContent = `${planLabel || "Account workspace"}${planSuffix}`;
    elements.logoutButton.hidden = false;
    renderSettingsAccountPanel();
    return;
  }

  elements.accountStatus.textContent = "Local guest workspace";
  elements.topbarUserLabel.textContent = "Guest";
  elements.topbarUserMeta.textContent = "Local only";
  elements.userName.textContent = "Guest workspace";
  elements.userEmail.textContent = "Stored in this browser only";
  elements.userPlanLabel.textContent = "Guest";
  elements.logoutButton.hidden = true;
  renderSettingsAccountPanel();
}

function renderRevisionMasteryMap() {
  const recommendedTopic = getRecommendedRevisionTopic();
  const learningItems = getAdaptiveLearningItems();
  const topics = getComponentTopics();
  const secureTopics = topics.filter((topic) => getTopicLearningSummary(topic.id, learningItems).state === "Secure").length;

  elements.revisionMasteryMap.innerHTML = `
    <div class="mastery-map-head">
      <div>
        <span>Evidence estimate · Component ${activeComponentId === "h446-02" ? "2" : "1"}</span>
        <strong>${secureTopics}/${topics.length} topics currently secure</strong>
        <p>Exposure shows what you have attempted. Ratings report confidence. Secure estimates require varied, spaced retrieval evidence; they do not predict a grade.</p>
      </div>
      ${
        recommendedTopic
          ? `<button type="button" data-jump-topic="${escapeHtml(recommendedTopic.id)}">Next: ${escapeHtml(recommendedTopic.code)}</button>`
          : ""
      }
    </div>
    <div class="mastery-map-grid">
      ${topics.map((topic) => {
        const summary = getTopicLearningSummary(topic.id, learningItems);
        const activeClass = topic.id === activeRevisionTopicId ? " active" : "";
        const earnedClass = summary.state === "Secure" ? " earned" : "";
        const access = getRevisionTopicAccessState(topic.id);
        const accessClass = access.locked ? " locked" : access.canClaim ? " claimable" : access.selectedFreeDeck ? " free-selected" : "";
        const title = `${topic.code} ${topic.title} · ${summary.state} · ${access.label}`;

        return `<button class="mastery-dot${activeClass}${earnedClass}${accessClass}" type="button" data-jump-topic="${escapeHtml(topic.id)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
          <span>${escapeHtml(topic.code)}</span>
          <small>${escapeHtml(summary.state)}</small>
        </button>`;
      }).join("")}
    </div>`;
}

function getTopicLearningSummary(topicId, items = getAdaptiveLearningItems()) {
  const topicItems = items.filter((item) => item.topicId === topicId);
  const started = topicItems.filter((item) => item.mastery.evidenceCount > 0);
  if (!started.length) return { state: "New", score: 0, conceptsDue: topicItems.length };
  if (started.some((item) => item.mastery.state === "Misconception detected")) {
    return { state: "Misconception", score: 0, conceptsDue: started.length };
  }
  const score = Math.round(started.reduce((sum, item) => sum + item.mastery.score, 0) / started.length);
  const conceptsDue = topicItems.filter((item) => !item.nextReviewAt || new Date(item.nextReviewAt) <= new Date()).length;
  if (conceptsDue && score >= 52) return { state: "Due", score, conceptsDue };
  if (score >= 78 && started.some((item) => item.mastery.state === "Secure")) return { state: "Secure", score, conceptsDue };
  if (score >= 52) return { state: "Fragile", score, conceptsDue };
  return { state: "Learning", score, conceptsDue };
}


function formatActivityType(type) {
  return String(type || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderRevisionPage() {
  if (!getComponentTopics().some((topic) => topic.id === activeRevisionTopicId)) activeRevisionTopicId = getComponentTopics()[0]?.id;
  renderComponentContext();
  let topic = getActiveRevisionTopic();
  renderPracticeMode();

  if (!topic) {
    elements.revisionTopicTitle.textContent = "Revision content is unavailable";
    elements.revisionCardGrid.innerHTML = `<section class="exam-empty-state"><h3>Reconnect to load your course</h3><p>Account-protected revision content is not cached for offline access. Your local notes remain on this device.</p><button type="button" data-reload-content>Try again</button></section>`;
    elements.revisionCardGrid.querySelector("[data-reload-content]").addEventListener("click", () => location.reload());
    document.querySelector("#component-content-status").textContent = "A connection is needed to load revision content.";
    return;
  }

  const selectedFreeDeck = getSelectedFreeRevisionTopicId();
  if (!canAccessRevisionTopic(topic.id) && selectedFreeDeck && getComponentTopics().some((item) => item.id === selectedFreeDeck) && !getComponentTopics().some((item) => item.id === activeRevisionTopicId)) {
    activeRevisionTopicId = selectedFreeDeck;
    topic = getActiveRevisionTopic();
  }

  const access = getRevisionTopicAccessState(topic.id);

  renderAchievementSummary();
  renderDailyStudyPanel();
  renderRevisionDashboard(topic);
  renderStudentDashboard(topic);
  renderMistakeJournal();
  elements.revisionTopicCode.textContent = topic.code;
  elements.revisionTopicTitle.textContent = topic.title;
  elements.revisionTopicSummary.textContent = topic.summary;
  renderRevisionMasteryMap();
  renderNeatQuestions();
  renderRevisionTopicList();

  if (activeAdaptiveSession?.completedAt && revisionReviewMode?.mode === "adaptive") {
    const total = activeAdaptiveSession.items.length;
    elements.revisionProgressPercent.textContent = "100%";
    elements.revisionProgressLabel.textContent = `${total}/${total} reviewed`;
    elements.revisionProgressRing.style.strokeDashoffset = "0";
    elements.revisionCardGrid.innerHTML = `<section class="deck-summary-panel"><p class="eyebrow">Session complete</p><h3>${total} retrieval activities reviewed</h3><p>Your confidence ratings schedule the next review. They are self-reported confidence, not exam marks or a predicted grade.</p><p>Return to Today for your next manageable session.</p><button type="button" data-app-section="home">Back to Today</button></section>`;
    return;
  }

  if (!access.canAccess) {
    elements.revisionProgressPercent.textContent = "0%";
    elements.revisionProgressLabel.textContent = topic.contentAvailable === false ? "In review" : access.canClaim ? "Choose free deck" : "Pro required";
    elements.revisionProgressRing.style.strokeDashoffset = "283";
    elements.revisionCardGrid.innerHTML = renderRevisionAccessPanel(topic, access);
    return;
  }

  if (!revisionSession || revisionSession.topicId !== topic.id) {
    startRevisionSession(topic.id);
  }

  const order = getRevisionCardOrder(topic);
  const topicCards = getTopicCards(topic);
  const sessionCardIds = revisionReviewMode?.topicId === topic.id ? new Set(revisionReviewMode.cardIds) : null;
  const deckOrder = sessionCardIds
    ? order.filter((cardIndex) => sessionCardIds.has(getRevisionCardKey(topic, topicCards[cardIndex])))
    : order;
  const completedCount = deckOrder.filter((cardIndex) => completedRevisionCards.has(getRevisionCardKey(topic, topicCards[cardIndex]))).length;
  const deckTotal = deckOrder.length || getRevisionTopicCardCount(topic);
  const progress = deckTotal ? Math.round((completedCount / deckTotal) * 100) : 0;
  const remainingOrder = deckOrder.filter((cardIndex) => {
    const card = topicCards[cardIndex];
    return !completedRevisionCards.has(getRevisionCardKey(topic, card));
  });

  elements.revisionProgressPercent.textContent = `${progress}%`;
  elements.revisionProgressLabel.textContent =
    completedCount === deckTotal && deckTotal
      ? "Complete"
      : `${completedCount}/${deckTotal} done`;
  elements.revisionProgressRing.style.strokeDashoffset = String(283 - (283 * progress) / 100);

  if (completedCount === deckTotal && deckTotal) {
    elements.revisionCardGrid.innerHTML = renderDeckSessionSummary(topic);
    recordDeckCompleted(topic);
    if (!sessionCardIds && getCompletedRevisionCount(topic) === getRevisionTopicCardCount(topic)) {
      awardRevisionBadge(topic);
    }
    return;
  }

  clearRevisionAutoReset();

  elements.revisionCardGrid.innerHTML = remainingOrder.slice(0, 1)
    .map((cardIndex) => {
      const card = topicCards[cardIndex];
      const cardKey = getRevisionCardKey(topic, card);
      const isFlipped = flippedRevisionCards.has(cardKey);
      return `<article class="focused-retrieval-card" aria-label="Revision activity">
        <div class="retrieval-meta"><span>${escapeHtml(card.category)}</span><span>${activeAdaptiveSession && !activeAdaptiveSession.completedAt ? `${activeAdaptiveSession.completedConceptIds.length + 1} of ${activeAdaptiveSession.items.length} in session` : `${completedCount + 1} of ${deckTotal}`}</span></div>
        <h3>${escapeHtml(card.front)}</h3>
        ${isFlipped ? `<section class="retrieval-answer"><h4>Reasoning guide</h4><p>${escapeHtml(card.back)}</p></section><div class="confidence-controls" role="group" aria-label="How well did you recall this before revealing?">
          <button type="button" data-card-confidence="again" data-card-id="${escapeHtml(cardKey)}">Again</button>
          <button type="button" data-card-confidence="good" data-card-id="${escapeHtml(cardKey)}">Good</button>
          <button type="button" data-card-confidence="easy" data-card-id="${escapeHtml(cardKey)}">Easy</button>
        </div>` : `<button class="primary-button" type="button" data-card-id="${escapeHtml(cardKey)}">Reveal answer</button>`}
      </article>`;
    })
    .join("");
}

function renderMistakeJournal() {
  if (!elements.mistakeJournalPanel) return;
  const openEntries = mistakeJournal.filter((entry) => !entry.correctedAt).slice(0, 8);
  const correctedCount = mistakeJournal.filter((entry) => entry.correctedAt).length;

  elements.mistakeJournalPanel.innerHTML = `
    <div class="mistake-journal-head">
      <div>
        <p class="eyebrow">Mistake journal</p>
        <h3>Repair what went wrong</h3>
        <p>Incorrect and “Again” responses are collected automatically. A successful retry marks the entry as corrected.</p>
      </div>
      <span>${openEntries.length} to repair · ${correctedCount} corrected</span>
    </div>
    ${openEntries.length ? `<div class="mistake-journal-list">
      ${openEntries.map((entry) => {
        const topic = getQuizTopicById(entry.topicId);
        return `<article>
          <div>
            <span>${escapeHtml(topic?.code || "OCR")} · ${escapeHtml(formatActivityType(entry.activityType))}</span>
            <strong>${escapeHtml(entry.prompt)}</strong>
            <p>${escapeHtml(entry.explanation)}</p>
          </div>
          <button type="button" data-review-mistake="${escapeHtml(entry.id)}">Retry</button>
        </article>`;
      }).join("")}
    </div>` : `<div class="mistake-journal-empty">
      <strong>No mistakes waiting for repair</strong>
      <p>When an answer needs another attempt, it will appear here with the correct reasoning and a scheduled retry.</p>
      <button type="button" data-app-section="practice">Start Quick Practice</button>
    </div>`}`;
}

function handleMistakeJournalClick(event) {
  const button = event.target.closest("[data-review-mistake]");
  if (!button) return;
  const entry = mistakeJournal.find((candidate) => candidate.id === button.dataset.reviewMistake);
  if (!entry) return;

  const topic = getQuizTopicById(entry.topicId);
  if (!topic || !canAccessRevisionTopic(topic.id)) {
    promptRevisionUpgrade(topic);
    return;
  }
  completedRevisionCards.delete(entry.conceptId);
  flippedRevisionCards.delete(entry.conceptId);
  activeRevisionTopicId = topic.id;
  startRevisionSession(topic.id, "mistake", [entry.conceptId]);
  revisionReviewMode = { topicId: topic.id, cardIds: [entry.conceptId], mode: "mistake" };
  setAppSection("revise");
}

function renderRevisionTopicList() {
  elements.revisionTopicList.innerHTML = getComponentTopics().map((revisionTopic, index) => {
    const activeClass = revisionTopic.id === activeRevisionTopicId ? " active" : "";
    const earnedClass = earnedRevisionBadges[revisionTopic.id] ? " earned" : "";
    const access = getRevisionTopicAccessState(revisionTopic.id);
    const lockedClass = access.locked ? " locked" : access.canClaim ? " claimable" : "";
    const badgeLabel = earnedRevisionBadges[revisionTopic.id] ? `<span class="revision-topic-badge">Badge</span>` : "";
    const accessLabel = access.locked
      ? `<span class="revision-topic-badge pro">Pro</span>`
      : access.canClaim
        ? `<span class="revision-topic-badge free">Free pick</span>`
        : access.selectedFreeDeck
          ? `<span class="revision-topic-badge free">Free deck</span>`
          : badgeLabel;
    return `<button class="revision-topic-button${activeClass}${earnedClass}${lockedClass}" type="button" data-topic-id="${escapeHtml(revisionTopic.id)}" aria-label="${escapeHtml(`${revisionTopic.code} ${revisionTopic.title}. ${access.label}.`)}">
      <span class="revision-topic-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="revision-topic-meta">
        <span class="revision-topic-code">${escapeHtml(revisionTopic.code)}</span>
        <strong>${escapeHtml(revisionTopic.title)}</strong>
      </span>
      <span class="revision-topic-count">${getRevisionTopicCardCount(revisionTopic)} cards${accessLabel}</span>
    </button>`;
  }).join("");
}

function renderRevisionAccessPanel(topic, access) {
  if (topic.contentAvailable === false) return `<section class="revision-paywall-panel"><p class="eyebrow">Academic review</p><h3>This topic is being reviewed</h3><p>Component 2 material is prepared, but has not yet passed its publication review. A paid plan does not bypass this review.</p><button type="button" data-component="h446-01">Browse Component 1</button></section>`;
  const title = access.canClaim ? "Choose your free revision deck" : "This deck is part of Pro";
  const copy = access.canClaim
    ? "Free accounts can unlock one complete OCR topic deck with flashcards, instant marking and streak tracking. Pick carefully: Pro unlocks every released deck."
    : "Your free OCR deck is already selected. Upgrade to Pro for all released Computer Science packs, Quick Practice across every topic and complete progress tracking.";
  const button = access.canClaim
    ? `<button type="button" data-claim-free-topic="${escapeHtml(topic.id)}">Use ${escapeHtml(topic.code)} as my free deck</button>`
    : `<button type="button" data-upgrade-revision="${escapeHtml(topic.id)}">Unlock with Pro</button>`;
  const secondary = access.canClaim
    ? `<button class="secondary" type="button" data-summary-action="topic-list">Compare topics first</button>`
    : `<button class="secondary" type="button" data-summary-action="topic-list">Back to topic packs</button>`;

  return `<section class="revision-paywall-panel" aria-label="${escapeHtml(title)}">
    <div>
      <p class="eyebrow">${access.canClaim ? "Free starter" : "Pro library"}</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
    </div>
    <article>
      <span>${escapeHtml(topic.code)}</span>
      <strong>${escapeHtml(topic.title)}</strong>
      <small>${getRevisionTopicCardCount(topic)} cards · ${access.canClaim ? "available as your free pick" : "locked on Free"}</small>
    </article>
    <div class="revision-paywall-actions">
      ${button}
      ${secondary}
    </div>
  </section>`;
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

async function handleDeckSummaryAction(action) {
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
      await startNeatQuiz(recommendation.topicId || topic.id);
      elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (recommendation.topicId) {
      if (!canAccessRevisionTopic(recommendation.topicId)) {
        promptRevisionUpgrade(getQuizTopicById(recommendation.topicId));
        return;
      }
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
  const learningItems = getAdaptiveLearningItems();
  const startedItems = learningItems.filter((item) => item.mastery.evidenceCount > 0);
  const session = getAdaptiveSessionPlan(15);
  const recommended = session.items[0];

  elements.revisionTodayStat.textContent = today.cards >= DAILY_REVIEW_GOAL ? String(today.cards) : `${today.cards}/${DAILY_REVIEW_GOAL}`;
  elements.revisionTodayCopy.textContent =
    today.cards >= DAILY_REVIEW_GOAL ? "Reviewed today · goal met" : `${Math.max(0, DAILY_REVIEW_GOAL - today.cards)} activities to today’s goal`;
  elements.revisionMasteryStat.textContent = `${startedItems.length}/${learningItems.length}`;
  elements.revisionMasteryCopy.textContent = "Concepts with learning evidence";

  if (recommended) {
    elements.revisionRecommendedNext.textContent = `${recommended.code} ${recommended.topicTitle}`;
    elements.revisionRecommendedMeta.textContent = recommended.reason;
    elements.revisionWeakTopic.textContent = `${recommended.code} ${recommended.topicTitle}`;
  }
}

function renderStudentDashboard(topic) {
  if (!elements.studentDashboardPanel) return;

  const today = getTodayStudyStats();
  const streak = getStudyStreak();
  const session = getAdaptiveSessionPlan(15);
  const recommended = session.items[0];
  const dueItems = session.items.filter((item) => item.due);
  const openMistakes = mistakeJournal.filter((entry) => !entry.correctedAt);
  const recentNote = [...notes].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
  const recentQuiz = getMostRecentQuizProgress();
  const savedPractice = getLatestPracticeDraft();
  const sessionPreview = session.items.slice(0, 4);
  const examCountdown = getNearestExamCountdown();

  elements.studentDashboardPanel.innerHTML = `
    <section class="today-session" aria-labelledby="today-session-title">
      <div class="today-session-copy">
        <p class="eyebrow">Recommended session</p>
        <h3 id="today-session-title">${session.items.length ? `${session.resuming ? "Pick up where you left off" : "Make time for a little progress"}` : "Choose your first topic"}</h3>
        <p class="today-session-size">${session.items.length ? `About 15 minutes · ${session.items.length} retrieval activities` : "Your free deck includes retrieval, feedback and practice."}</p>
        <p>${recommended ? escapeHtml(recommended.reason) : "Choose your free OCR deck to create a revision plan."}</p>
        <div class="today-session-actions">
          <button type="button" data-session-duration="15">${session.resuming ? "Resume revision" : session.items.length ? "Start revision" : "Choose a deck"}</button>
          <details class="session-duration-menu">
            <summary>Change length</summary>
            <div>
              <button type="button" data-session-duration="5">Quick · 5 min</button>
              <button type="button" data-session-duration="25">Focused · 25 min</button>
            </div>
          </details>
        </div>
      </div>
      <details class="today-preview"><summary>Preview this session</summary><ol class="today-session-list" aria-label="Session preview">
        ${sessionPreview.length ? sessionPreview.map((item) => `<li>
          <span>${escapeHtml(item.code)} · ${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.prompt)}</strong>
        </li>`).join("") : `<li><strong>Choose a topic to begin</strong><small>Your first completed activity creates the learning baseline.</small></li>`}
      </ol></details>
    </section>
    <details class="today-tools"><summary>More study tools${openMistakes.length ? ` · ${openMistakes.length} mistake${openMistakes.length === 1 ? "" : "s"} to revisit` : ""}</summary><div class="student-home-sections">
      <section>
        <div class="section-title"><span>Due for review</span><span>${dueItems.length}</span></div>
        ${dueItems.length ? `<p><strong>${escapeHtml(dueItems[0].code)} ${escapeHtml(dueItems[0].topicTitle)}</strong><br>${dueItems.length} concept${dueItems.length === 1 ? " is" : "s are"} ready for retrieval.</p>` : `<p>Nothing is overdue. New activity will be scheduled as you revise.</p>`}
        <button type="button" data-session-duration="5">Review due knowledge</button>
      </section>
      <section>
        <div class="section-title"><span>Continue</span><span>${streak} day streak</span></div>
        <p><strong>${savedPractice ? `${escapeHtml(savedPractice.topic.code)} ${savedPractice.kind === "repair" ? "worked example" : "recall practice"}` : recentQuiz ? `${escapeHtml(recentQuiz.topic.code)} Quick Practice` : recentNote ? escapeHtml(recentNote.title || createTitle(recentNote.body)) : "Start your first activity"}</strong><br>${savedPractice ? "Your place is saved on this device." : `${today.cards} retrieval activities completed today.`}</p>
        <button type="button" data-student-action="${savedPractice ? "saved-practice" : recentQuiz ? "quick" : recentNote ? "note" : "cards"}">${savedPractice ? "Resume saved practice" : recentQuiz ? "Continue practice" : recentNote ? "Open note" : "Choose a topic"}</button>
      </section>
      <section>
        <div class="section-title"><span>Mistake repair</span><span>${openMistakes.length}</span></div>
        <p>${openMistakes.length ? `<strong>${escapeHtml(openMistakes[0].prompt)}</strong><br>Revisit an answer that needs correcting.` : "Mistakes you make in revision will be collected here automatically."}</p>
        <button type="button" data-student-action="progress">Open progress</button>
      </section>
      <section>
        <div class="section-title"><span>Exam plan</span><span>${examCountdown ? `${examCountdown.days} days` : "Not set"}</span></div>
        <p>${examCountdown ? `<strong>${escapeHtml(examCountdown.label)}</strong><br>${escapeHtml(examCountdown.message)}` : "Add exam dates to shape the balance of retrieval and exam practice."}</p>
        <button type="button" data-student-action="exam-settings">${examCountdown ? "Review exam plan" : "Add exam dates"}</button>
      </section>
    </div></details>`;
}

function getNearestExamCountdown() {
  const examDates = parseClientJson(accountProfile?.studentProfile?.exam_dates, {});
  const options = [
    { key: "paper1", label: "Component 01" },
    { key: "paper2", label: "Component 02" },
  ].map((item) => ({ ...item, date: examDates[item.key] ? new Date(`${examDates[item.key]}T12:00:00`) : null }))
    .filter((item) => item.date && !Number.isNaN(item.date.getTime()) && item.date.getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.date - b.date);
  if (!options.length) return null;
  const nearest = options[0];
  const days = Math.max(0, Math.ceil((nearest.date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return {
    ...nearest,
    days,
    message: "Your chosen date is a planning reminder. Combine spaced retrieval with written and applied practice.",
  };
}

function getMostRecentQuizProgress() {
  return Object.entries(neatQuizProgress)
    .map(([topicId, progress]) => ({
      topic: getQuizTopicById(topicId),
      progress,
      time: new Date(progress.lastCompletedAt || 0).getTime(),
    }))
    .filter((entry) => entry.topic && entry.progress?.attempts)
    .sort((a, b) => b.time - a.time)[0] || null;
}

async function handleStudentDashboardClick(event) {
  const sessionButton = event.target.closest("[data-session-duration]");
  if (sessionButton) {
    startAdaptiveRevisionSession(Number(sessionButton.dataset.sessionDuration) || 15);
    return;
  }
  const button = event.target.closest("[data-student-action]");
  if (!button) return;

  const action = button.dataset.studentAction;
  if (action === "saved-practice") {
    const saved = getLatestPracticeDraft();
    if (!saved) return;
    changeComponent(saved.topic.componentId);
    activeRevisionTopicId = saved.topic.id;
    activePracticeMode = "quick";
    setAppSection("practice");
    if (saved.kind === "repair") await openRepairLessons();
    else startRecallPractice(saved.topic, 10);
    return;
  }
  if (action === "continue") {
    await continueRevisionJourney();
    return;
  }

  if (action === "cards") {
    const topic = getRecommendedRevisionTopic() || getActiveRevisionTopic();
    if (topic?.id) {
      activeRevisionTopicId = topic.id;
      if (canAccessRevisionTopic(topic.id)) startRevisionSession(topic.id);
      setAppSection("revise");
      renderRevisionPage();
    }
    document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "quick") {
    setAppSection("practice");
    await startActiveTopicQuiz();
    elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "note") {
    setAppSection("notes");
    if (!selectedId) {
      createNote();
    } else {
      elements.noteBody.focus();
    }
    return;
  }

  if (action === "progress") {
    scrollToRevisionProgress();
    return;
  }

  if (action === "weak") {
    const topic = getRecommendedRevisionTopic() || getActiveRevisionTopic();
    if (topic && identifyWeakCards(topic.id).length) {
      startWeakCardReview(topic.id);
    }
    return;
  }

  if (action === "exam-settings") {
    openSettingsModal("revision");
  }
}


async function handleMasteryMapClick(event) {
  const button = event.target.closest("[data-jump-topic]");
  if (!button) return;

  const topicId = button.dataset.jumpTopic;
  if (!canAccessRevisionTopic(topicId)) {
    if (canClaimFreeRevisionTopic(topicId)) {
      const claimed = await claimFreeRevisionTopic(topicId);
      if (!claimed) return;
    } else {
      promptRevisionUpgrade(getQuizTopicById(topicId));
      return;
    }
  }

  activeRevisionTopicId = topicId;
  neatQuizState = createEmptyNeatQuizState();
  clearRevisionAutoReset();
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
}

function renderNeatQuestions() {
  const activeTopic = getActiveRevisionTopic();
  const catalog = getNeatQuizCatalog();
  const totalQuestions = catalog.reduce((sum, quiz) => sum + quiz.questionCount, 0);

  elements.neatQuestionsCount.textContent = `${catalog.length} topic packs · ${totalQuestions ? "recall and quiz practice" : "recall practice"}`;
  elements.neatQuestionsCurrentLink.textContent = "Start quick practice";
  elements.neatQuestionsCurrentLink.hidden = !activeTopic;
  elements.neatQuestionsCurrentLink.disabled = activeTopic?.contentAvailable === false;

  elements.neatQuestionsGrid.innerHTML = catalog.map((quiz) => {
    const isActive = quiz.topic.id === activeTopic?.id;
    const isRunning = quiz.topic.id === neatQuizState.quizId && !neatQuizState.completed;
    const access = getRevisionTopicAccessState(quiz.topic.id);
    const locked = access.locked;
    const quizLocked = !access.canAccess || !hasFeature("quickPractice");
    const quizProgress = neatQuizProgress[quiz.topic.id] || {};
    const completedCards = getCompletedRevisionCount(quiz.topic);
    const topicCardCount = getRevisionTopicCardCount(quiz.topic);
    const topicPercent = earnedRevisionBadges[quiz.topic.id]
      ? 100
      : topicCardCount
        ? Math.round((completedCards / topicCardCount) * 100)
        : 0;
    const progressLabel = getNeatQuizProgressLabel(quiz.topic.id);
    const sourceLabel = "authored checks";
    const activeLabel = isActive ? `<span class="question-current">Current topic</span>` : "";
    const runningLabel = isRunning ? `<span class="question-variant">In progress</span>` : "";
    const inReview = quiz.topic.contentAvailable === false;
    const lockLabel = inReview ? `<span class="question-variant">In review</span>` : locked
      ? `<span class="question-variant pro">Pro library</span>`
      : access.canClaim
        ? `<span class="question-variant free">Free pick</span>`
        : access.selectedFreeDeck
          ? `<span class="question-variant free">Your free deck</span>`
          : !hasFeature("quickPractice")
            ? `<span class="question-variant pro">Pro quiz</span>`
            : "";
    const openLabel = access.canClaim ? "Choose deck" : locked ? "Preview plan" : "Flashcards";
    const actionLabel = access.canClaim ? "Choose + practise" : quizLocked ? "Unlock Pro" : isRunning ? "Continue" : !quiz.questionCount ? "Recall practice" : quizProgress.attempts ? "Retry quiz" : "Start quiz";
    const lockedNote = locked
      ? `<div class="topic-lock-note" aria-label="Locked topic">
          <strong>Locked</strong>
          <span>${escapeHtml(access.reason || "Upgrade to Pro to open this deck.")}</span>
        </div>`
      : "";

    return `<article class="neat-question-card${isActive ? " active" : ""}${isRunning ? " running" : ""}${locked ? " locked" : ""}${access.canClaim ? " claimable" : ""}">
      <div class="question-card-topline">
        <span class="question-code">${escapeHtml(quiz.topic.code)}</span>
        ${lockLabel || runningLabel || activeLabel}
      </div>
      <div class="neat-question-card-copy">
        <strong>${escapeHtml(quiz.topic.title)}</strong>
        <span>${inReview ? `${topicCardCount} draft cards · awaiting review` : quiz.questionCount ? `${quiz.questionCount} ${escapeHtml(sourceLabel)} · ${topicCardCount} cards` : `${topicCardCount} recall prompts · self-assessed`}</span>
      </div>
      ${lockedNote}
      <div class="topic-card-meter" aria-label="${topicPercent}% flashcard progress">
        <span style="width: ${topicPercent}%"></span>
      </div>
      <div class="topic-card-meta">
        <span>${topicPercent}% deck progress</span>
        <span>${escapeHtml(quiz.questionCount ? progressLabel : "Self-assessed · no quiz score")}</span>
      </div>
      <div class="topic-card-actions">
        <button type="button" data-topic-id="${escapeHtml(quiz.topic.id)}" ${inReview ? "disabled" : ""}>${inReview ? "Awaiting review" : openLabel}</button>
        <button type="button" data-start-quiz="${escapeHtml(quiz.topic.id)}" ${inReview ? "disabled" : ""}>${inReview ? "Awaiting review" : actionLabel}</button>
      </div>
    </article>`;
  }).join("");

  renderNeatQuizPanel();
}

function getNeatQuizCatalog() {
  return getComponentTopics().map((topic) => {
    const sources = NEAT_QUESTIONS.filter((question) => question.code === topic.code);
    return {
      topic,
      questionCount: topic.quizCount ?? getRevisionTopicCardCount(topic),
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
  if (repairState && repairState.topicId !== activeRevisionTopicId) repairState = null;
  if (recallPracticeState && recallPracticeState.topicId !== activeRevisionTopicId) recallPracticeState = null;
  updatePracticeFocus();
  if (repairState) { elements.quickPracticeSection.classList.add("quiz-active"); renderRepairLesson(); return; }
  if (recallPracticeState) { elements.quickPracticeSection.classList.add("quiz-active"); renderRecallPractice(); return; }
  elements.quickPracticeSection.classList.toggle("quiz-active", Boolean(neatQuizState.questions.length && !neatQuizState.completed));
  const topic = getQuizTopicById(neatQuizState.quizId);

  if (!topic || !neatQuizState.questions.length) {
    const activeTopic = getActiveRevisionTopic();
    const activeQuestionCount = activeTopic?.quizCount ?? getRevisionTopicCardCount(activeTopic);
    const access = getRevisionTopicAccessState(activeTopic?.id);
    const inReview = activeTopic?.contentAvailable === false;
    const recallMode = !activeQuestionCount && !inReview;
    const recallDraft = activeTopic && window.PracticeDrafts.restoreRecall(practiceDraftStore.read(currentUser?.id, "recall", activeTopic.id), getTopicCards(activeTopic));
    const resumable = activeTopic && (recallMode
      ? recallDraft && recallDraft.index < recallDraft.cards.length
      : restoreQuizSession(activeTopic, buildNativeQuizQuestions(activeTopic)));
    const actionLabel = access.canClaim ? "Choose free deck" : access.locked ? "Unlock Pro" : resumable ? "Continue quick practice" : "Start quick practice";
    const description = access.canAccess
      ? recallMode ? "Recall an answer, compare it with the explanation, then decide what to revisit. This is self-assessment, not an automatically marked quiz." : "Answer one question at a time with instant marking, corrections and streak tracking."
      : access.canClaim
        ? "Choose this as your one free deck to unlock flashcards and Quick Practice."
        : "Upgrade to Pro to practise this deck and all released OCR Computer Science packs.";
    elements.neatQuizPanel.innerHTML = `<div class="neat-quiz-empty">
      <div>
        <p class="eyebrow">Quick Practice</p>
        <h4>Practise ${escapeHtml(activeTopic?.code || "this topic")} one question at a time.</h4>
        <p>${escapeHtml(inReview ? "This topic is awaiting academic review. Choose a released topic to practise; upgrading does not bypass review." : description)}</p>
      </div>
      <button type="button" data-start-current-quiz ${inReview ? "disabled" : ""}>${escapeHtml(inReview ? "Topic in review" : actionLabel)}</button>
      ${currentUser && access.canAccess ? `<button type="button" data-open-repair>${practiceDraftStore.read(currentUser.id, "repair", activeTopic.id) ? "Resume worked example" : "Worked examples"}</button>` : ""}
      <span class="quick-practice-note">${recallMode ? "Released flashcards · self-assessed recall" : `${activeQuestionCount} quiz checks`}${access.locked ? " · Pro" : ""}</span>
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
        <p class="eyebrow">Practice · ${escapeHtml(topic.code)}</p>
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
      <button type="button" data-quiz-pause>Pause</button>
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
    <strong>${escapeHtml(option)}</strong>
  </button>`;
}

function renderNeatQuizFeedback(question) {
  const wasCorrect = neatQuizState.selectedIndex === question.correctIndex;
  return `<div class="neat-quiz-feedback ${wasCorrect ? "correct" : "incorrect"}">
    <strong>${wasCorrect ? "Correct." : "Not quite."}</strong>
    <p>${escapeHtml(question.explanation)}</p>
    ${wasCorrect ? "" : `<small>Use the explanation to repair the idea before returning to retrieval.</small>${currentUser ? `<button type="button" data-open-repair>Work through an example</button>` : ""}`}
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
      ${neatQuizState.missedIds.length ? `<button type="button" data-quiz-repair>Review ${neatQuizState.missedIds.length} missed concepts</button>` : `<button type="button" data-quiz-today>Back to Today</button>`}
    </div>
  </article>`;
}

async function handleNeatQuestionsClick(event) {
  const topicButton = event.target.closest("[data-topic-id]");
  if (topicButton) {
    const topicId = topicButton.dataset.topicId;
    if (!canAccessRevisionTopic(topicId)) {
      if (canClaimFreeRevisionTopic(topicId)) {
        const claimed = await claimFreeRevisionTopic(topicId);
        if (!claimed) return;
      } else {
        promptRevisionUpgrade(getQuizTopicById(topicId));
        return;
      }
    }

    activeRevisionTopicId = topicId;
    neatQuizState = createEmptyNeatQuizState();
    clearRevisionAutoReset();
    startRevisionSession(activeRevisionTopicId);
    setAppSection("revise");
    document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const button = event.target.closest("[data-start-quiz]");
  if (!button) return;

  await startNeatQuiz(button.dataset.startQuiz);
}

async function handleNeatQuizPanelClick(event) {
  if (event.target.closest("[data-quiz-pause]")) { neatQuizState = createEmptyNeatQuizState(); renderNeatQuizPanel(); return; }
  if (event.target.closest("[data-recall-pause]")) { recallPracticeState = null; renderNeatQuizPanel(); return; }
  if (event.target.closest("[data-recall-reveal]") && recallPracticeState) {
    recallPracticeState.revealed = true;
    saveRecallPractice();
    renderRecallPractice();
    elements.neatQuizPanel.querySelector(".recall-comparison")?.focus();
    return;
  }
  const rating = event.target.closest("[data-recall-rating]")?.dataset.recallRating;
  if (["revisit", "recalled"].includes(rating) && recallPracticeState?.revealed && recallPracticeState.index < recallPracticeState.cards.length) {
    recallPracticeState.ratings.push(rating);
    recallPracticeState.index++;
    recallPracticeState.revealed = false;
    recallPracticeState.answer = "";
    saveRecallPractice();
    renderRecallPractice();
    elements.neatQuizPanel.querySelector("h4")?.focus();
    return;
  }
  if (event.target.closest("[data-recall-retry]") && recallPracticeState) {
    const cards = recallPracticeState.cards.filter((_, index) => recallPracticeState.ratings[index] === "revisit");
    if (cards.length) { recallPracticeState = { ...recallPracticeState, cards, index: 0, ratings: [], revealed: false, answer: "" }; saveRecallPractice(); renderRecallPractice(); }
    return;
  }
  if (event.target.closest("[data-open-repair]")) { await openRepairLessons(); return; }
  if (event.target.closest("[data-repair-reload]")) { await openRepairLessons(); return; }
  if (event.target.closest("[data-close-repair]")) { repairState = null; renderNeatQuizPanel(); return; }
  if (event.target.closest("[data-repair-picker]") && repairState) { repairState.current = null; renderRepairLesson(); return; }
  const lessonButton = event.target.closest("[data-repair-id]");
  if (lessonButton && repairState) {
    repairState.current = repairState.lessons.find((item) => item.id === lessonButton.dataset.repairId);
    repairState.step = 0;
    repairState.result = null;
    repairState.answer = "";
    repairState.checked = false;
    repairState.submitError = "";
    saveRepairDraft();
    renderRepairLesson();
    return;
  }
  if (event.target.closest("[data-repair-step]") && repairState?.current) {
    repairState.step = Math.min(repairState.step + 1, repairState.current.steps.length);
    saveRepairDraft();
    renderRepairLesson();
    elements.neatQuizPanel.querySelector("[data-repair-step], #repair-response")?.focus();
    return;
  }
  if (event.target.closest("[data-repair-next]") && repairState?.result?.next) {
    repairState.current = repairState.result.next;
    repairState.result = null;
    repairState.answer = "";
    repairState.checked = false;
    repairState.submitError = "";
    saveRepairDraft();
    renderRepairLesson();
    elements.neatQuizPanel.querySelector("#repair-response")?.focus();
    return;
  }
  if (event.target.closest("[data-quiz-today]")) { setAppSection("home"); return; }
  if (event.target.closest("[data-quiz-repair]")) {
    const cardIds = [...new Set(neatQuizState.missedIds)].map((id) => `${neatQuizState.quizId}:${id}`);
    cardIds.forEach((id) => { completedRevisionCards.delete(id); flippedRevisionCards.delete(id); });
    activeRevisionTopicId = neatQuizState.quizId;
    activeAdaptiveSession = null;
    startRevisionSession(activeRevisionTopicId, "mistake", cardIds);
    revisionReviewMode = { topicId: activeRevisionTopicId, cardIds, mode: "mistake" };
    setAppSection("revise");
    return;
  }
  if (event.target.closest("[data-start-current-quiz]")) {
    await startActiveTopicQuiz();
    return;
  }

  if (event.target.closest("[data-quiz-restart]")) {
    await startNeatQuiz(neatQuizState.quizId || getActiveRevisionTopic()?.id, { restart: true });
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

async function startActiveTopicQuiz() {
  await startNeatQuiz(getActiveRevisionTopic()?.id);
}

function startRecallPractice(topic, length, restart = false) {
  const saved = !restart && window.PracticeDrafts.restoreRecall(practiceDraftStore.read(currentUser?.id, "recall", topic.id), getTopicCards(topic));
  const bank = getTopicCards(topic);
  const offset = saved ? (bank.findIndex((card) => card.id === saved.cards.at(-1)?.id) + 1) % bank.length : 0;
  recallPracticeState = { topicId: topic.id, ...(saved && saved.index < saved.cards.length ? saved : {
    cards: [...bank.slice(offset), ...bank.slice(0, offset)].slice(0, Math.min(20, length)), index: 0, ratings: [], revealed: false, answer: "",
  }) };
  neatQuizState = createEmptyNeatQuizState();
  saveRecallPractice();
  renderRevisionPage();
  elements.neatQuizPanel.querySelector("h4")?.focus({ preventScroll: true });
}

function updatePracticeFocus() {
  const active = repairState || recallPracticeState || (neatQuizState.questions.length && !neatQuizState.completed);
  elements.appView.classList.toggle("practice-focused", Boolean(active && activeAppSection === "practice" && activePracticeMode === "quick"));
}

function saveRecallPractice() {
  const state = recallPracticeState;
  if (!state) return;
  const { cards, ...draft } = state;
  state.saved = practiceDraftStore.save(currentUser?.id, "recall", state.topicId, {
    ...draft, updatedAt: Date.now(), ids: cards.map((card) => card.id), signature: window.PracticeDrafts.recallSignature(cards),
  });
}

function renderRecallPractice() {
  const state = recallPracticeState;
  const topic = getQuizTopicById(state?.topicId);
  if (!state || !topic) return;
  if (!canAccessRevisionTopic(topic.id) || topic.contentAvailable === false) { recallPracticeState = null; renderNeatQuizPanel(); return; }
  const card = state.cards[state.index];
  const revisit = state.ratings.filter((rating) => rating === "revisit").length;
  elements.neatQuizPanel.innerHTML = `<article class="recall-player">
    <header><div><p class="eyebrow">${escapeHtml(topic.code)} · ${escapeHtml(topic.title)}</p><h4 tabindex="-1">${card ? escapeHtml(card.front) : "A short session, completed"}</h4></div><button type="button" data-recall-pause>${card ? "Pause" : "Back to practice"}</button></header>
    <p class="recall-position">${card ? `Question ${state.index + 1} of ${state.cards.length}` : `${state.cards.length} questions reviewed`} · Self-assessed, not scored</p>
    ${card ? `<label for="recall-response">Recall the answer before revealing it. Write it here or say it to yourself.</label><textarea id="recall-response" rows="3" maxlength="2000" ${state.revealed ? "readonly" : ""} placeholder="Your answer (optional)">${escapeHtml(state.answer)}</textarea>
      ${state.revealed ? `<section class="recall-comparison" tabindex="-1" aria-label="Compare your answer"><h5>Compare with the explanation</h5><p>${escapeHtml(card.back)}</p><p>How well did you recall the key ideas? This choice is your reflection, not a verified result.</p><div class="recall-actions"><button type="button" data-recall-rating="revisit">Needs another look</button><button type="button" data-recall-rating="recalled">I recalled the key ideas</button></div></section>` : `<button type="button" data-recall-reveal>Reveal and compare</button>`}` : `<p>You chose to revisit ${revisit} ${revisit === 1 ? "question" : "questions"}. These reflections do not change quiz accuracy, correct-answer streaks or mastery.</p><div class="recall-actions">${revisit ? `<button type="button" data-recall-retry>Revisit those questions</button>` : ""}<button type="button" data-quiz-today>Back to Today</button></div>`}
    <p class="practice-save-note" role="status">${currentUser ? state.saved ? "Place and response saved in this browser for your account. Connect after reloading to check access and resume." : "Browser saving is unavailable. Keep this page open to retain your place." : "Demo responses stay in this session and are not copied into an account."}</p>
  </article>`;
  elements.neatQuizPanel.querySelector("#recall-response")?.addEventListener("input", (event) => {
    state.answer = event.target.value;
    saveRecallPractice();
  });
}

function saveRepairDraft() {
  const state = repairState;
  if (!state?.current) return;
  state.saved = practiceDraftStore.save(currentUser?.id, "repair", activeRevisionTopicId, {
    lessonId: state.current.id, contentVersion: state.current.contentVersion, variant: state.current.variant,
    step: state.step, answer: state.answer || "", checked: state.checked === true,
    finished: state.result?.next === null, updatedAt: Date.now(),
  });
}

function getLatestPracticeDraft() {
  if (!currentUser || isGuestMode) return null;
  return REVISION_TOPICS.filter((topic) => topic.contentAvailable !== false && canAccessRevisionTopic(topic.id)).flatMap((topic) =>
    ["recall", "repair"].map((kind) => ({ topic, kind, draft: practiceDraftStore.read(currentUser.id, kind, topic.id) })))
    .filter(({ kind, draft, topic }) => draft && !draft.finished && (kind !== "recall" || (() => {
      const restored = window.PracticeDrafts.restoreRecall(draft, getTopicCards(topic));
      return restored && restored.index < restored.cards.length;
    })()))
    .sort((a, b) => (Number(b.draft.updatedAt) || 0) - (Number(a.draft.updatedAt) || 0))[0] || null;
}

async function openRepairLessons() {
  const userId = currentUser?.id;
  const topicId = activeRevisionTopicId;
  const requestState = { topicId, loading: true, lessons: [], current: null, step: 0, result: null, answer: "", checked: false };
  repairState = requestState;
  renderNeatQuizPanel();
  try {
    const response = await api(`/api/revision/repairs?topicId=${encodeURIComponent(topicId)}`);
    if (repairState !== requestState || currentUser?.id !== userId || activeRevisionTopicId !== topicId) return;
    const saved = practiceDraftStore.read(userId, "repair", topicId);
    const restored = window.PracticeDrafts.restoreRepair(saved, response.lessons);
    repairState = { ...repairState, ...response, ...restored, saved: Boolean(restored), loading: false,
      resumeNotice: restored ? "Your place and response are restored. Check your answer again to show feedback." : saved ? "The saved example has changed or is no longer available. Choose a current example." : "" };
  } catch (error) {
    if (repairState !== requestState || currentUser?.id !== userId || activeRevisionTopicId !== topicId) return;
    repairState = { ...repairState, loading: false, error: navigator.onLine ? error.message : "You are offline. Your saved place is still in this browser. Reconnect to check access and resume the current example." };
  }
  renderRepairLesson();
}

function renderRepairLesson() {
  const state = repairState;
  if (!state) return;
  const item = state.current;
  const step = item?.steps[state.step];
  let body;
  if (state.loading) body = '<p role="status">Loading examples...</p>';
  else if (state.error) body = `<p role="alert">${escapeHtml(state.error)}</p><button type="button" data-repair-reload>Retry and resume</button>`;
  else if (!item) body = `<div class="repair-picker">${state.lessons.length
    ? state.lessons.map((lesson) => `<button type="button" data-repair-id="${escapeHtml(lesson.id)}">${escapeHtml(lesson.title)}<span>${lesson.steps.length} steps, then a related question</span></button>`).join("")
    : `<p>${state.pendingCount ? "Worked examples for this topic are awaiting academic review. A subscription does not bypass review." : "No worked example is ready for this topic yet. Review the explanation, then revisit the concept in Revise."}</p>`}</div>`;
  else if (step) body = `<p class="repair-step-count">Step ${state.step + 1} of ${item.steps.length}</p><h5>${escapeHtml(step.title)}</h5><p class="repair-step-copy">${escapeHtml(step.body)}</p><button type="button" data-repair-step>${state.step + 1 === item.steps.length ? "Try a related question" : "Next step"}</button>`;
  else if (state.result) body = `<div class="repair-result" role="status"><h5>${state.result.assessment.correct ? "Correct application" : "Check the reasoning"}</h5><p>${escapeHtml(state.result.assessment.explanation)}</p>${!state.result.assessment.correct ? `<p>Expected answer: <strong>${escapeHtml(state.result.assessment.answer)}</strong></p>` : ""}<p class="repair-notice">${escapeHtml(state.result.assessment.notice)} Revisit this idea in a later session without the example.</p>${state.result.next ? '<button type="button" data-repair-next>Try a different question</button>' : '<button type="button" data-close-repair>Return to practice</button>'}</div>`;
  else body = `<form id="repair-answer-form"><label for="repair-response">${escapeHtml(item.prompt)}</label><input id="repair-response" name="response" autocomplete="off" maxlength="80" value="${escapeHtml(state.answer || "")}" required><button type="submit" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Checking..." : "Check answer"}</button><p data-repair-status role="status">${escapeHtml(state.submitError || (state.checked ? "Your last response is saved. Check it again to restore feedback." : ""))}</p></form>`;
  elements.neatQuizPanel.innerHTML = `<article class="repair-player">
    <header><div><p class="eyebrow">Understand, then apply</p><h4>${escapeHtml(item?.title || "Worked examples")}</h4></div><button type="button" data-close-repair>Back to practice</button></header>
    ${state.resumeNotice ? `<p class="practice-save-note" role="status">${escapeHtml(state.resumeNotice)}</p>` : ""}
    ${body}
    ${item ? `<footer><button type="button" data-repair-picker>Other examples</button><p class="practice-save-note" data-repair-save-status role="status">${state.saved ? "Place and response saved in this browser for your account." : "Browser saving is unavailable. Keep this page open to retain your place."}</p></footer>` : ""}
  </article>`;
  elements.neatQuizPanel.querySelector("#repair-answer-form")?.addEventListener("submit", submitRepairAnswer);
  elements.neatQuizPanel.querySelector("#repair-response")?.addEventListener("input", (event) => {
    state.answer = event.target.value;
    state.checked = false;
    state.resumeNotice = "";
    state.submitError = "";
    saveRepairDraft();
    elements.neatQuizPanel.querySelector("[data-repair-save-status]").textContent = state.saved
      ? "Response saved in this browser for your account."
      : "Browser saving is unavailable. Keep this page open to retain your response.";
  });
}

async function submitRepairAnswer(event) {
  event.preventDefault();
  const state = repairState;
  const item = state?.current;
  if (!item || state.submitting) return;
  state.submitting = true;
  state.submitError = "";
  state.answer = String(new FormData(event.target).get("response") || "");
  saveRepairDraft();
  const button = event.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Checking...";
  try {
    const response = await api(`/api/revision/repairs/${encodeURIComponent(item.id)}/check`, { method: "POST", body: { variant: item.variant, response: new FormData(event.target).get("response") } });
    if (repairState !== state) return;
    state.result = response;
    state.checked = true;
    state.resumeNotice = "";
    saveRepairDraft();
  } catch (error) {
    if (repairState !== state) return;
    state.submitError = navigator.onLine ? error.message : "You are offline. Your response is saved in this browser. Reconnect, then check it again.";
  } finally {
    state.submitting = false;
    if (repairState === state) renderRepairLesson();
  }
}

async function loadExamPracticeQuestion({ next = false } = {}) {
  const requestId = ++practiceRequestId;
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Save written-answer progress to your account</strong><p>Create a free account to submit an original exam question from your chosen OCR deck.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  elements.examLoadQuestionButton.disabled = true;
  elements.examLoadQuestionButton.textContent = "Loading...";
  elements.examPracticePanel.setAttribute("aria-busy", "true");
  try {
    const response = await api(`/api/exam/questions?topicId=${encodeURIComponent(activeRevisionTopicId)}`);
    if (requestId !== practiceRequestId || !currentUser) return;
    const historyKey = `neat-written-index:${currentUser.id}:${activeRevisionTopicId}`;
    const previousIndex = Number(localStorage.getItem(historyKey) ?? -1);
    const resumeIndex = response.questions.findIndex((question) => question.id === localStorage.getItem(`neat-written-current:${currentUser.id}:${activeRevisionTopicId}`));
    const nextIndex = !next && resumeIndex >= 0 ? resumeIndex : (previousIndex + 1) % Math.max(1, response.questions.length);
    const question = response.questions[nextIndex];
    if (!question) {
      const topic = getQuizTopicById(activeRevisionTopicId) || getActiveRevisionTopic();
      elements.examPracticePanel.innerHTML = topic?.contentAvailable === false
        ? renderRevisionAccessPanel(topic, getRevisionTopicAccessState(topic.id))
        : `<div class="exam-empty-state exam-locked-state"><strong>No written question is available for this selection</strong><p>Choose an accessible topic from the selector. Free includes written practice for your chosen deck; Pro includes all released packs.</p><button type="button" data-exam-upgrade>Compare plans</button></div>`;
      examPracticeState = null;
      return;
    }
    const savedDraft = localStorage.getItem(`neat-exam-draft:${currentUser.id}:${question.id}`) || "";
    localStorage.setItem(historyKey, String(nextIndex));
    localStorage.setItem(`neat-written-current:${currentUser.id}:${activeRevisionTopicId}`, question.id);
    examPracticeState = { question, startedAt: performance.now(), answer: savedDraft, originalAttemptId: null, result: null };
    renderExamPracticeQuestion();
    trackEvent("exam_question_started", { questionId: question.id, topicId: question.topicId });
  } catch (error) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state error-state"><strong>Exam Practice could not load</strong><p>${escapeHtml(error.message)}</p><button type="button" data-exam-retry>Try again</button></div>`;
  } finally {
    if (requestId === practiceRequestId) {
      elements.examPracticePanel.removeAttribute("aria-busy");
      elements.examLoadQuestionButton.disabled = false;
      elements.examLoadQuestionButton.textContent = "Another question";
    }
  }
}

function renderExamPracticeQuestion() {
  const state = examPracticeState;
  if (!state?.question) return;
  const question = state.question;
  if (state.result) {
    const { result, notice } = state.result;
    elements.examPracticePanel.innerHTML = `<article class="guided-answer-review"><p class="eyebrow">Guided answer review</p><h3>Check the reasoning, then improve it</h3><p>${escapeHtml(result.feedback)}</p><div class="guided-review-columns"><section><h4>Your answer</h4><p class="preserve-lines">${escapeHtml(state.answer)}</p></section><section><h4>Review checklist</h4><ul>${(result.checklist || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section></div><section class="exam-reasoning"><h4>Worked reasoning</h4><p>${escapeHtml(result.modelReasoning)}</p></section><p class="exam-result-notice">${escapeHtml(notice)}</p><div class="exam-feedback-actions"><button class="primary-button" type="button" data-exam-improve>Improve my answer</button><button type="button" data-exam-next>Try another</button></div></article>`;
    return;
  }

  elements.examPracticePanel.innerHTML = `<article class="exam-question-card"><header><div><span>${escapeHtml(question.topicCode)}</span><strong>${escapeHtml(question.topicTitle)}</strong></div><div class="exam-question-meta"><span>${question.marks} marks</span><span>About ${question.expectedMinutes} min</span></div></header><div class="exam-command-row"><span>${escapeHtml(question.commandWord)}</span><details><summary>Command-word help</summary><p>${escapeHtml(getCommandWordHelp(question.commandWord))}</p></details></div><h3>${escapeHtml(question.prompt)}</h3><form class="exam-answer-form" data-exam-answer-form><label for="exam-answer">Your answer</label><textarea id="exam-answer" name="answer" rows="8" maxlength="4000" required placeholder="Build a clear answer before checking the rubric.">${escapeHtml(state.answer || "")}</textarea><div class="exam-answer-footer"><label for="exam-confidence">Confidence<select id="exam-confidence" name="confidence"><option value="">Prefer not to say</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button class="primary-button" type="submit">${state.originalAttemptId ? "Submit improved answer" : "Check against rubric"}</button></div><p class="status-message" data-exam-status role="status" aria-live="polite"></p></form></article>`;
}

function getCommandWordHelp(commandWord) {
  const help = {
    Compare: "Make paired similarities or differences. Use both subjects in each comparison where possible.",
    Discuss: "Develop relevant points and consider more than one side or consequence where the question invites it.",
    Explain: "Make the reason or process clear, linking cause to effect rather than listing facts.",
    Apply: "Use the knowledge in the specific expression, data or scenario given.",
  };
  return help[commandWord] || "Respond directly to the command word and use precise Computer Science terminology.";
}

async function submitExamPracticeAnswer(event) {
  const form = event.target.closest("[data-exam-answer-form]");
  if (!form || !examPracticeState?.question) return;
  event.preventDefault();
  const formData = new FormData(form);
  const answer = String(formData.get("answer") || "").trim();
  const status = form.querySelector("[data-exam-status]");
  const button = form.querySelector("button[type='submit']");
  examPracticeState.answer = answer;
  button.disabled = true;
  button.textContent = "Checking...";
  status.textContent = "";
  try {
    const response = await api("/api/exam/attempts", { method: "POST", body: { questionId: examPracticeState.question.id, answer, confidence: formData.get("confidence"), originalAttemptId: examPracticeState.originalAttemptId, responseTimeMs: Math.round(performance.now() - examPracticeState.startedAt) } });
    examPracticeState.originalAttemptId ||= response.attemptId;
    examPracticeState.result = response;
    renderExamPracticeQuestion();
    trackEvent("exam_question_submitted", { questionId: examPracticeState.question.id, mark: response.result.proposedMark, maximum: response.result.maximumMark });
  } catch (error) {
    status.textContent = error.message;
    status.className = "status-message error";
    button.disabled = false;
    button.textContent = examPracticeState.originalAttemptId ? "Submit improved answer" : "Check against rubric";
  }
}

function handleExamPracticeClick(event) {
  if (event.target.closest("[data-exam-auth]")) return openAuthModal("signup");
  if (event.target.closest("[data-exam-upgrade]")) return openPlansModal();
  if (event.target.closest("[data-lab-retry]")) return loadCsLabs();
  if (event.target.closest("[data-lab-picker]")) return renderCsLabPicker();
  const labChoice = event.target.closest("[data-lab-id]");
  if (labChoice && csLabState) {
    csLabState.current = csLabState.labs.find((labItem) => labItem.id === labChoice.dataset.labId) || csLabState.current;
    csLabState.result = null;
    csLabState.startedAt = performance.now();
    renderCsLab();
    return;
  }
  if (event.target.closest("[data-lab-again]") && csLabState) {
    if (csLabState.result?.assessment?.correct) return renderCsLabPicker();
    csLabState.result = null;
    csLabState.startedAt = performance.now();
    renderCsLab();
    return;
  }
  if (event.target.closest("[data-mock-new]")) return loadMiniMock({ restart: true });
  if (event.target.closest("[data-mock-retry]")) return loadMiniMock();
  const navigator = event.target.closest("[data-mock-question]");
  if (navigator && miniMockState) {
    miniMockState.currentIndex = Number(navigator.dataset.mockQuestion);
    renderMiniMock();
    return;
  }
  if (event.target.closest("[data-mock-previous]") && miniMockState) {
    miniMockState.currentIndex = Math.max(0, miniMockState.currentIndex - 1);
    renderMiniMock();
    return;
  }
  if (event.target.closest("[data-mock-next]") && miniMockState) {
    miniMockState.currentIndex = Math.min(miniMockState.questions.length - 1, miniMockState.currentIndex + 1);
    renderMiniMock();
    return;
  }
  if (event.target.closest("[data-mock-flag]") && miniMockState) {
    const questionId = miniMockState.questions[miniMockState.currentIndex].id;
    if (miniMockState.flags.has(questionId)) miniMockState.flags.delete(questionId);
    else miniMockState.flags.add(questionId);
    renderMiniMock();
    return;
  }
  if (event.target.closest("[data-mock-submit]")) return submitMiniMock(false);
  const reviewTopic = event.target.closest("[data-mock-review-topic]");
  if (reviewTopic) {
    activeRevisionTopicId = reviewTopic.dataset.topicId;
    startRevisionSession(activeRevisionTopicId);
    setAppSection("revise");
    return;
  }
  if (event.target.closest("[data-exam-next]")) return loadExamPracticeQuestion({ next: true });
  if (event.target.closest("[data-exam-retry]")) return loadExamPracticeQuestion();
  if (event.target.closest("[data-exam-improve]") && examPracticeState) {
    examPracticeState.result = null;
    examPracticeState.startedAt = performance.now();
    renderExamPracticeQuestion();
    document.querySelector("#exam-answer")?.focus();
    trackEvent("exam_answer_improvement_started", { questionId: examPracticeState.question.id });
  }
}

function persistMiniMock() {
  if (!currentUser || !miniMockState) return;
  const { questions, flags, submitting, ...state } = miniMockState;
  localStorage.setItem(`neat-mock-session:${currentUser.id}:${activeComponentId}`, JSON.stringify({
    ...state, questionIds: questions.map((question) => question.id),
    contentSignature: hashString(JSON.stringify(questions)), flags: [...flags],
  }));
}

function restoreMiniMock(available) {
  const saved = loadLocalObject(`neat-mock-session:${currentUser.id}:${activeComponentId}`);
  if (!Array.isArray(saved.questionIds) || !saved.questionIds.length || !Number.isFinite(saved.startedAt)
      || Date.now() - saved.startedAt > 7 * 86400000 || !Number.isInteger(saved.currentIndex)
      || saved.currentIndex < 0 || saved.currentIndex >= saved.questionIds.length) return null;
  const questions = saved.questionIds.map((id) => available.find((question) => question.id === id));
  if (questions.some((question) => !question) || saved.contentSignature !== hashString(JSON.stringify(questions))) return null;
  return { ...saved, questions, flags: new Set(saved.flags || []), submitting: false };
}

async function loadMiniMock({ restart = false } = {}) {
  clearInterval(miniMockTimer);
  const requestId = ++practiceRequestId;
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Practise a short timed set</strong><p>Log in to use original written questions and review your reasoning afterwards. This is not a full OCR paper or an automatically marked assessment.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  elements.examPracticePanel.innerHTML = `<div class="exam-empty-state"><strong>Building your paper...</strong><p>Selecting a balanced set of original RecallStride questions.</p></div>`;
  try {
    const response = await api("/api/exam/questions");
    if (requestId !== practiceRequestId || !currentUser) return;
    response.questions = response.questions.filter((question) => getComponentTopics().some((topic) => topic.id === question.topicId));
    if (response.questions.length < 3) {
      elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-locked-state"><span class="pro-badge">Pro</span><strong>Mixed-topic mini mocks use the full question bank</strong><p>Your free deck still includes the complete single-question feedback and improvement loop. Pro unlocks enough topics to build a balanced paper.</p><button type="button" data-exam-upgrade>View Pro</button></div>`;
      miniMockState = null;
      return;
    }
    const resumed = !restart && restoreMiniMock(response.questions);
    if (resumed) {
      miniMockState = resumed;
      renderMiniMock();
      if (!resumed.submitted) miniMockTimer = window.setInterval(updateMiniMockTimer, 1000);
      return;
    }
    const previouslyUsed = loadLocalArray(`neat-mock-previous:${currentUser.id}:${activeComponentId}`);
    const fresh = shuffleArray(response.questions.filter((question) => !previouslyUsed.includes(question.id)));
    const repeated = shuffleArray(response.questions.filter((question) => previouslyUsed.includes(question.id)));
    const questions = [...fresh, ...repeated].slice(0, 5);
    saveLocalArray(`neat-mock-previous:${currentUser.id}:${activeComponentId}`, questions.map((question) => question.id));
    miniMockState = {
      id: createLocalId("mock"), questions, currentIndex: 0, answers: {}, confidence: {}, flags: new Set(),
      startedAt: Date.now(), durationSeconds: questions.reduce((sum, item) => sum + item.expectedMinutes * 60, 0),
      submitted: false, results: [],
    };
    renderMiniMock();
    miniMockTimer = window.setInterval(updateMiniMockTimer, 1000);
    trackEvent("mini_mock_started", { questions: questions.length });
  } catch (error) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state error-state"><strong>Mini mock could not load</strong><p>${escapeHtml(error.message)}</p><button type="button" data-mock-retry>Try again</button></div>`;
  }
}

function shuffleArray(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function renderMiniMock() {
  const state = miniMockState;
  if (!state) return;
  persistMiniMock();
  if (state.submitted) return renderMiniMockResults();
  const question = state.questions[state.currentIndex];
  const answer = state.answers[question.id] || "";
  const confidence = state.confidence[question.id] || "";
  elements.examPracticePanel.innerHTML = `<article class="mini-mock-shell">
    <header class="mini-mock-head"><div><p class="eyebrow">Original mixed-topic practice</p><h3>Component ${activeComponentId === "h446-02" ? "2" : "1"} mini mock</h3></div><div class="mini-mock-clock" aria-label="Time remaining"><span>Time remaining</span><strong id="mini-mock-time">${formatMockTime(getMiniMockSecondsRemaining())}</strong></div></header>
    <nav class="mini-mock-navigator" aria-label="Question navigator">${state.questions.map((item, index) => `<button class="${index === state.currentIndex ? "active" : ""} ${state.answers[item.id]?.trim() ? "answered" : ""} ${state.flags.has(item.id) ? "flagged" : ""}" type="button" data-mock-question="${index}" aria-label="Question ${index + 1}${state.answers[item.id]?.trim() ? ", answered" : ", unanswered"}${state.flags.has(item.id) ? ", flagged" : ""}">${index + 1}</button>`).join("")}</nav>
    <section class="mini-mock-question"><div class="exam-question-meta"><span>Question ${state.currentIndex + 1} of ${state.questions.length}</span><span>${question.topicCode}</span><span>${question.marks} marks</span></div><p class="exam-command-label">${escapeHtml(question.commandWord)}</p><h3>${escapeHtml(question.prompt)}</h3><label for="mini-mock-answer">Your answer</label><textarea id="mini-mock-answer" data-mock-answer data-question-id="${escapeHtml(question.id)}" rows="8" maxlength="4000">${escapeHtml(answer)}</textarea><label class="mini-mock-confidence" for="mini-mock-confidence">Confidence<select id="mini-mock-confidence" data-mock-confidence data-question-id="${escapeHtml(question.id)}"><option value="" ${confidence ? "" : "selected"}>Prefer not to say</option><option value="low" ${confidence === "low" ? "selected" : ""}>Low</option><option value="medium" ${confidence === "medium" ? "selected" : ""}>Medium</option><option value="high" ${confidence === "high" ? "selected" : ""}>High</option></select></label></section>
    <footer class="mini-mock-actions"><button type="button" data-mock-flag>${state.flags.has(question.id) ? "Remove flag" : "Flag question"}</button><div><button type="button" data-mock-previous ${state.currentIndex === 0 ? "disabled" : ""}>Previous</button><button type="button" data-mock-next ${state.currentIndex === state.questions.length - 1 ? "disabled" : ""}>Next</button><button class="primary-button" type="button" data-mock-submit>Submit paper</button></div></footer>
    <p class="status-message" data-mock-status role="status" aria-live="polite"></p>
  </article>`;
}

function handleMiniMockInput(event) {
  if (!miniMockState || miniMockState.submitted) return;
  const answer = event.target.closest("[data-mock-answer]");
  if (answer) miniMockState.answers[answer.dataset.questionId] = answer.value;
  const confidence = event.target.closest("[data-mock-confidence]");
  if (confidence) miniMockState.confidence[confidence.dataset.questionId] = confidence.value;
  persistMiniMock();
}

function updateMiniMockTimer() {
  if (activeAppSection !== "practice" || activePracticeMode !== "mock") return;
  const time = document.querySelector("#mini-mock-time");
  if (time) time.textContent = formatMockTime(getMiniMockSecondsRemaining());
  if (getMiniMockSecondsRemaining() <= 0 && miniMockState && !miniMockState.submitted) submitMiniMock(true);
}

function getMiniMockSecondsRemaining() {
  if (!miniMockState) return 0;
  return Math.max(0, miniMockState.durationSeconds - Math.floor((Date.now() - miniMockState.startedAt) / 1000));
}

function formatMockTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

async function submitMiniMock(automatic = false) {
  if (!miniMockState || miniMockState.submitted || miniMockState.submitting) return;
  const state = miniMockState;
  const unanswered = state.questions.filter((item) => !state.answers[item.id]?.trim()).length;
  if (!automatic && !window.confirm(`Submit this paper? ${unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.` : "Every question has an answer."}`)) return;
  clearInterval(miniMockTimer);
  state.submitting = true;
  elements.examPracticePanel.querySelectorAll("button, textarea, select").forEach((control) => { control.disabled = true; });
  const status = elements.examPracticePanel.querySelector("[data-mock-status]");
  if (status) status.textContent = "Submitting answers and building your feedback...";
  const results = [];
  for (const question of state.questions) {
    const answer = state.answers[question.id]?.trim();
    if (!answer) {
      results.push({ question, skipped: true, result: { proposedMark: 0, maximumMark: question.marks, missing: [], awarded: [] } });
      continue;
    }
    try {
      const response = await api("/api/exam/attempts", { method: "POST", body: { questionId: question.id, answer, confidence: state.confidence[question.id], responseTimeMs: null } });
      results.push({ question, ...response });
    } catch (error) {
      results.push({ question, error: error.message, result: { proposedMark: 0, maximumMark: question.marks, missing: [], awarded: [] } });
    }
  }
  state.results = results;
  state.submitting = false;
  state.submitted = true;
  if (state !== miniMockState) return;
  persistMiniMock();
  if (activeAppSection !== "practice" || activePracticeMode !== "mock") return;
  renderMiniMockResults();
  trackEvent("mini_mock_completed", { answered: miniMockState.questions.length - unanswered, total: miniMockState.questions.length });
}

function renderMiniMockResults() {
  const results = miniMockState.results;
  elements.examPracticePanel.innerHTML = `<article class="mini-mock-results"><header><div><p class="eyebrow">Timed practice complete</p><h3>Review your reasoning</h3><p>This short set is not a full OCR paper. Written responses have not been automatically marked and do not create validated mastery evidence.</p></div></header><div class="guided-mock-results">${results.map((item, index) => `<details><summary>Question ${index + 1} · ${escapeHtml(item.question.topicCode)} · ${item.skipped ? "Unanswered" : item.error ? "Not saved" : "Saved for review"}</summary><p>${escapeHtml(item.question.prompt)}</p><h4>Your answer</h4><p class="preserve-lines">${escapeHtml(miniMockState.answers?.[item.question.id] || "No answer saved")}</p>${item.error ? `<p role="alert">${escapeHtml(item.error)}</p>` : `<ul>${(item.result.checklist || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul><p>${escapeHtml(item.result.modelReasoning || "Return to this question for its reasoning guide.")}</p>`}</details>`).join("")}</div><button type="button" data-mock-new>Build another practice set</button></article>`;
}

async function loadCsLabs(showPicker = false) {
  clearInterval(miniMockTimer);
  const requestId = ++practiceRequestId;
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Interactive practice builds mastery evidence</strong><p>Create an account to use a Computer Science lab from your chosen free deck.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  try {
    const response = await api("/api/labs");
    if (requestId !== practiceRequestId || !currentUser) return;
    response.labs = response.labs.filter((lab) => getComponentTopics().some((topic) => topic.id === lab.topicId));
    if (!response.labs.length) {
      elements.examPracticePanel.innerHTML = `<div class="exam-empty-state"><strong>No lab is published for your chosen free topic yet</strong><p>Quick Practice and Exam Practice remain available. Pro unlocks ${response.lockedCount} interactive labs across CPU tracing, Boolean logic, algorithms, data structures, SQL, normalisation, pseudocode and networks.</p><button type="button" data-exam-upgrade>View Pro</button></div>`;
      csLabState = null;
      return;
    }
    csLabState = { labs: response.labs, current: response.labs.find((lab) => lab.id === csLabState?.current?.id) || response.labs.find((lab) => lab.topicId === activeRevisionTopicId) || response.labs[0], result: null, startedAt: performance.now() };
    if (showPicker || response.labs.length > 1 && !csLabState.current) renderCsLabPicker();
    else renderCsLab();
  } catch (error) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state error-state"><strong>CS Labs could not load</strong><p>${escapeHtml(error.message)}</p><button type="button" data-lab-retry>Try again</button></div>`;
  }
}

function renderCsLabPicker() {
  if (!csLabState) return;
  elements.examPracticePanel.innerHTML = `<section class="cs-lab-picker"><header><p class="eyebrow">Choose a lab</p><h3>Practise Computer Science by doing</h3><p>Each task requires a prediction or construction before feedback is revealed.</p></header><div>${csLabState.labs.map((labItem) => `<button type="button" data-lab-id="${escapeHtml(labItem.id)}"><span>${escapeHtml(getQuizTopicById(labItem.topicId)?.code || "OCR")}</span><strong>${escapeHtml(labItem.title)}</strong><small>${escapeHtml(labItem.responseType === "sql" ? "Write and test a query" : "Interactive prediction")}</small></button>`).join("")}</div></section>`;
}

function renderCsLab() {
  const state = csLabState;
  const labItem = state?.current;
  if (!labItem) return;
  if (state.result) {
    const feedback = state.result.assessment;
    elements.examPracticePanel.innerHTML = `<article class="cs-lab-feedback ${feedback.correct ? "correct" : "incorrect"}"><div class="cs-lab-feedback-mark"><span>${feedback.correct ? "Correct" : "Not yet"}</span><strong>${feedback.correct ? "✓" : "→"}</strong></div><div><p class="eyebrow">${escapeHtml(labItem.title)}</p><h3>${escapeHtml(feedback.explanation)}</h3>${feedback.correct ? "" : `<p><strong>Expected:</strong> ${escapeHtml(feedback.expectedAnswer)}</p>`}<div class="exam-feedback-actions"><button class="primary-button" type="button" data-lab-again>${feedback.correct ? "Try another lab" : "Try this again"}</button><button type="button" data-lab-picker>View all labs</button></div></div></article>`;
    return;
  }
  const responseControl = labItem.responseType === "sql"
    ? `<label for="cs-lab-response">SQL query</label><textarea id="cs-lab-response" name="response" rows="5" spellcheck="false" required placeholder="SELECT ..."></textarea><p class="cs-lab-schema">Available table: Student(Name, Score)</p>`
    : `<fieldset><legend>Choose your prediction</legend>${labItem.options.map((option, index) => `<label><input type="radio" name="response" value="${escapeHtml(option)}" required><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option)}</strong></label>`).join("")}</fieldset>`;
  elements.examPracticePanel.innerHTML = `<article class="cs-lab-shell"><header><div><p class="eyebrow">Interactive practice</p><h3>${escapeHtml(labItem.title)}</h3></div><span>${escapeHtml(getQuizTopicById(labItem.topicId)?.code || "OCR H446")}</span></header><form data-lab-form><h4>${escapeHtml(labItem.prompt)}</h4>${responseControl}<button class="primary-button" type="submit">Check prediction</button><p class="status-message" data-lab-status role="status" aria-live="polite"></p></form></article>`;
}

async function submitCsLab(event) {
  const form = event.target.closest("[data-lab-form]");
  if (!form || !csLabState?.current) return;
  event.preventDefault();
  const response = String(new FormData(form).get("response") || "").trim();
  const button = form.querySelector("button[type='submit']");
  const status = form.querySelector("[data-lab-status]");
  button.disabled = true;
  button.textContent = "Checking...";
  try {
    csLabState.result = await api("/api/labs/attempts", { method: "POST", body: { labId: csLabState.current.id, response, responseTimeMs: Math.round(performance.now() - csLabState.startedAt) } });
    renderCsLab();
    trackEvent("cs_lab_completed", { labId: csLabState.current.id, correct: csLabState.result.assessment.correct });
  } catch (error) {
    status.textContent = error.message;
    status.className = "status-message error";
    button.disabled = false;
    button.textContent = "Check prediction";
  }
}

async function startNeatQuiz(topicId, options = {}) {
  repairState = null;
  recallPracticeState = null;
  const topic = getQuizTopicById(topicId) || getActiveRevisionTopic();
  if (!topic) return;
  if (!canAccessRevisionTopic(topic.id)) {
    if (canClaimFreeRevisionTopic(topic.id)) {
      const claimed = await claimFreeRevisionTopic(topic.id);
      if (!claimed) return;
    } else {
      promptRevisionUpgrade(topic);
      return;
    }
  }

  if (!hasFeature("quickPractice")) {
    promptRevisionUpgrade(topic);
    return;
  }

  activeRevisionTopicId = topic.id;
  const length = Number(document.querySelector("#practice-length")?.value) || 10;
  const bank = buildNativeQuizQuestions(topic);
  if (!bank.length) {
    if (topic.contentAvailable !== false && getTopicCards(topic).length) startRecallPractice(topic, length, options.restart);
    else renderNeatQuestions();
    return;
  }
  const saved = !options.restart && restoreQuizSession(topic, bank);
  if (saved) { neatQuizState = saved; renderRevisionPage(); return; }
  const offset = ((neatQuizProgress[topic.id]?.attempts || 0) * length) % (bank.length || 1);
  const questions = [...bank.slice(offset), ...bank.slice(0, offset)].slice(0, length);
  neatQuizState = {
    ...createEmptyNeatQuizState(),
    quizId: topic.id,
    questions,
    bestStreak: 0,
  };
  persistQuizSession();
  trackEvent("quick_practice_started", { topicId: topic.id, questionCount: questions.length });
  renderRevisionPage();
}

function answerNeatQuizQuestion(optionIndex) {
  if (neatQuizState.answered || neatQuizState.completed) return;

  const question = neatQuizState.questions[neatQuizState.currentIndex];
  if (!question || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) return;

  const wasCorrect = optionIndex === question.correctIndex;
  neatQuizState.selectedIndex = optionIndex;
  neatQuizState.answered = true;
  neatQuizState.score += wasCorrect ? 1 : 0;
  neatQuizState.streak = wasCorrect ? neatQuizState.streak + 1 : 0;
  neatQuizState.bestStreak = Math.max(neatQuizState.bestStreak, neatQuizState.streak);
  if (!wasCorrect) neatQuizState.missedIds.push(question.id);
  persistQuizSession();
  recordCardAttempt(`${neatQuizState.quizId}:${question.id}`, neatQuizState.quizId, wasCorrect ? "confident" : "needs_practice", {
    quizCorrect: wasCorrect,
    source: "quick_practice",
  });
  persistNeatQuizBestStreak(neatQuizState.quizId, neatQuizState.bestStreak);
  trackEvent("quick_practice_answered", { topicId: neatQuizState.quizId, correct: wasCorrect });
  renderNeatQuestions();
  elements.neatQuizPanel.querySelector("[data-quiz-next]")?.focus({ preventScroll: true });
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
  persistQuizSession();
  renderNeatQuestions();
  elements.neatQuizPanel.querySelector("[data-quiz-option]")?.focus({ preventScroll: true });
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
      bestScore: previous.totalQuestions === total ? Math.max(Number(previous.bestScore) || 0, neatQuizState.score) : neatQuizState.score,
      bestStreak: Math.max(Number(previous.bestStreak) || 0, neatQuizState.bestStreak),
      lastScore: neatQuizState.score,
      totalQuestions: total,
      lastCompletedAt: new Date().toISOString(),
    },
  };
  saveNeatQuizProgress();
  neatQuizState.completed = true;
  persistQuizSession();
  recordActivityEvent({ type: "quiz_completed", topicId });
  trackEvent("quick_practice_completed", { topicId, score: neatQuizState.score, total });
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
      totalQuestions: previous.totalQuestions || getRevisionTopicCardCount(getQuizTopicById(topicId)) || 0,
    },
  };
  saveNeatQuizProgress();
}

function buildNativeQuizQuestions(topic) {
  return getTopicCards(topic).filter((card) => card.quiz?.options?.length >= 2).map((card) => {
    const quiz = card.quiz;
    const answer = quiz.options[0];
    const options = seededSort(quiz.options, `${topic.id}:${card.id}:options`);
    return {
      id: card.id,
      category: card.category,
      prompt: quiz.prompt,
      answer,
      explanation: quiz.explanation,
      options,
      correctIndex: options.indexOf(answer),
    };
  });
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

function getQuizTopicById(topicId) {
  return REVISION_TOPICS.find((topic) => topic.id === topicId);
}

function getTopicCards(topic) {
  return Array.isArray(topic?.cards) ? topic.cards : [];
}

function getRevisionTopicCardCount(topic) {
  return Number(topic?.cardCount) || getTopicCards(topic).length;
}

function hasLoadedRevisionCards(topic) {
  return getTopicCards(topic).length > 0;
}

function hydrateRevisionTopicFromDeck(deck) {
  if (!deck?.id && !deck?.topicId) return;

  const topic = getQuizTopicById(deck.topicId || deck.id);
  if (!topic || !Array.isArray(deck.cards)) return;

  topic.cardCount = Number(deck.cardCount) || deck.cards.length;
  topic.lockedPreview = false;
  topic.cards = deck.cards.map((card) => ({
    id: card.cardKey || String(card.id || "").replace(`${topic.id}__`, ""),
    serverCardId: card.id,
    category: card.category || "Revision",
    front: card.front || "",
    back: card.back || "",
    quiz: card.quiz || null,
  }));
}

async function refreshAccessibleRevisionContent() {
  if (!currentUser || isGuestMode) return;

  const targetDeckIds = hasFeature("fullRevisionLibrary")
    ? REVISION_TOPICS.map((topic) => topic.id)
    : currentUser.freeRevisionDeckId
      ? [currentUser.freeRevisionDeckId]
      : [];

  const missingDeckIds = targetDeckIds.filter((topicId) => !hasLoadedRevisionCards(getQuizTopicById(topicId)));
  if (!missingDeckIds.length) return;

  await Promise.all(missingDeckIds.map(async (topicId) => {
    try {
      const response = await api(`/api/revision/decks/${encodeURIComponent(topicId)}`);
      hydrateRevisionTopicFromDeck(response.deck);
    } catch (error) {
      trackEvent("revision_deck_hydration_failed", { topicId, reason: error.message });
    }
  }));
}

function pruneRevisionTopicCardsForCurrentPlan() {
  if (currentUser && !isGuestMode && hasFeature("fullRevisionLibrary")) return;

  const allowedTopicId = currentUser && !isGuestMode
    ? currentUser.freeRevisionDeckId
    : DEFAULT_GUEST_REVISION_DECK_ID;
  const allowedTopics = allowedTopicId ? new Set([allowedTopicId]) : new Set();

  REVISION_TOPICS.forEach((topic) => {
    if (allowedTopics.has(topic.id)) return;

    topic.cards = [];
    topic.lockedPreview = true;
    revisionCardOrder[topic.id] = [];
  });
}

async function selectRevisionTopic(event) {
  const button = event.target.closest("[data-topic-id]");
  if (!button) return;

  const topicId = button.dataset.topicId;
  if (!canAccessRevisionTopic(topicId)) {
    if (canClaimFreeRevisionTopic(topicId)) {
      const claimed = await claimFreeRevisionTopic(topicId);
      if (!claimed) return;
    } else {
      promptRevisionUpgrade(getQuizTopicById(topicId));
      return;
    }
  }

  activeRevisionTopicId = topicId;
  activeAdaptiveSession = null;
  neatQuizState = createEmptyNeatQuizState();
  clearRevisionAutoReset();
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
}

async function flipRevisionCard(event) {
  const navigation = event.target.closest("[data-app-section]");
  if (navigation) { setAppSection(navigation.dataset.appSection); return; }
  const claimButton = event.target.closest("[data-claim-free-topic]");
  if (claimButton) {
    const claimed = await claimFreeRevisionTopic(claimButton.dataset.claimFreeTopic);
    if (claimed) {
      activeRevisionTopicId = claimButton.dataset.claimFreeTopic;
      neatQuizState = createEmptyNeatQuizState();
      clearRevisionAutoReset();
      startRevisionSession(activeRevisionTopicId);
      renderRevisionPage();
    }
    return;
  }

  const upgradeButton = event.target.closest("[data-upgrade-revision]");
  if (upgradeButton) {
    promptRevisionUpgrade(getQuizTopicById(upgradeButton.dataset.upgradeRevision));
    return;
  }

  const summaryAction = event.target.closest("[data-summary-action]");
  if (summaryAction) {
    await handleDeckSummaryAction(summaryAction.dataset.summaryAction);
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

  const card = event.target.closest("button[data-card-id]");
  if (!card) return;

  const cardId = card.dataset.cardId;
  if (flippedRevisionCards.has(cardId)) {
    flippedRevisionCards.delete(cardId);
  } else {
    flippedRevisionCards.add(cardId);
    trackEvent("flashcard_flipped", { cardId, topicId: getRevisionTopicFromCardId(cardId)?.id });
  }
  renderRevisionPage();
  elements.revisionCardGrid.querySelector("[data-card-confidence], button[data-card-id]")?.focus({ preventScroll: true });
}

function handleRevisionCardKeydown(event) {
  if (event.target.closest("button")) return;
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
  const confidenceMap = {
    again: "needs_practice",
    needs_practice: "needs_practice",
    good: "confident",
    easy: "confident",
    confident: "confident",
  };
  const storedConfidence = confidenceMap[confidence];
  if (!cardId || !storedConfidence || !flippedRevisionCards.has(cardId)) return;
  if (activeAdaptiveSession && !activeAdaptiveSession.completedAt && window.NEAT_REVISION_SESSION.next(activeAdaptiveSession)?.cardId !== cardId) return;

  const topic = getRevisionTopicFromCardId(cardId);
  recordCardAttempt(cardId, topic?.id, storedConfidence, { difficulty: confidence });
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
  if (options.awardBadge !== false && topic && getCompletedRevisionCount(topic) === getRevisionTopicCardCount(topic)) {
    awardRevisionBadge(topic);
  }
  if (activeAdaptiveSession && activeAdaptiveSession.items.some((item) => item.cardId === cardId)) {
    activeAdaptiveSession = window.NEAT_REVISION_SESSION.complete(activeAdaptiveSession, cardId);
    persistAdaptiveSession();
    openNextAdaptiveSessionTopic();
  }
  renderRevisionPage();
  elements.revisionCardGrid.querySelector("button")?.focus({ preventScroll: true });
}

function resetActiveRevisionCards() {
  const topic = getActiveRevisionTopic();
  clearRevisionAutoReset();
  getTopicCards(topic).forEach((card) => {
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

  getTopicCards(topic).forEach((card) => flippedRevisionCards.delete(getRevisionCardKey(topic, card)));
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
  const cards = getTopicCards(topic);
  if (!revisionCardOrder[topic.id] || revisionCardOrder[topic.id].length !== cards.length) {
    revisionCardOrder[topic.id] = cards.map((_, index) => index);
  }
  return revisionCardOrder[topic.id];
}

function getRevisionCardKey(topic, card) {
  return `${topic.id}:${card.id}`;
}

function getCompletedRevisionCount(topic) {
  return getTopicCards(topic).filter((card) => completedRevisionCards.has(getRevisionCardKey(topic, card))).length;
}

function scheduleRevisionAutoReset(topicId) {
  if (revisionAutoResetTimer) return;

  revisionAutoResetTimer = setTimeout(() => {
    revisionAutoResetTimer = null;
    if (activeRevisionTopicId !== topicId) return;

    const topic = getActiveRevisionTopic();
    if (getCompletedRevisionCount(topic) === getRevisionTopicCardCount(topic)) {
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
    return;
  }

  const plan = currentUser.entitlements || plans[currentUser.plan] || plans.free || {};

  const freeDeck = getSelectedFreeRevisionTopicId();
  const planSuffix = !hasFeature("fullRevisionLibrary") && freeDeck ? " · 1 deck" : "";
  elements.userPlanLabel.textContent = `${currentUser.planName || plan.name || "Free"}${planSuffix}`;
  elements.workspaceKind.disabled = false;
  elements.instantCardsButton.disabled = !selectedId;
  elements.studyPackButton.disabled = !selectedId || !hasFeature("studyPack");
  elements.exportPdfButton.disabled = !selectedId || !hasFeature("pdfExport");
  elements.historyButton.disabled = !selectedId || !hasFeature("versionHistory");
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
    elements.memberList.innerHTML = `<p class="status-message">Create an account to share notes with collaborators.</p>`;
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
    elements.notesList.innerHTML = `<div class="empty-state">
      <strong>Create a workspace or open the OCR demo.</strong>
      <p>The demo shows notes, generated revision material, and progress tracking with real OCR Computer Science content.</p>
      <button type="button" data-reset-demo>Open OCR demo</button>
    </div>`;
    return;
  }

  if (!visibleNotes.length) {
    elements.notesList.innerHTML = `<div class="empty-state">
      <strong>No notes here yet.</strong>
      <p>Create a note, change folder, or reset the OCR demo workspace to see the full study workflow.</p>
      <button type="button" data-reset-demo>Load demo note</button>
    </div>`;
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
    elements.recentNoteList.innerHTML = `<p class="status-message">Recent notes are shown after you start writing.</p>`;
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
    return;
  }

  if (event.target.closest("[data-reset-demo]")) {
    const shouldReset = window.confirm("Reset the OCR demo workspace? This refreshes the demo note and progress sample.");
    if (!shouldReset) return;
    ensureDemoWorkspace({ reset: true });
    setAppSection("notes");
    render();
    showWorkspaceMessage("OCR demo workspace reset.", "success");
  }
}

function handleNotesListClick(event) {
  if (!event.target.closest("[data-reset-demo]")) return;

  ensureDemoWorkspace({ reset: true });
  setAppSection("notes");
  render();
  showWorkspaceMessage("OCR demo workspace loaded.", "success");
}

function setSaveState(message) {
  elements.saveState.textContent = message;
}

function renderSummaryContent(note) {
  const lines = getPlainNoteLines(note.body || "");
  if (!lines.length) {
    return renderSummaryEmptyState(
      "Start writing and RecallStride will shape this into a study summary.",
      "Use headings, bullets, definitions, and tasks to unlock cleaner revision outputs."
    );
  }

  const pack = getRevisionGenerator().generateStudyPack(note.body || "");
  const summary = pack.summary || note.summary || createSummary(note.body);
  const cardCount = pack.flashcards.length;
  const signals = [
    `${lines.length} learning point${lines.length === 1 ? "" : "s"}`,
    cardCount ? `${cardCount} instant card${cardCount === 1 ? "" : "s"} ready` : "Add bullets for cards",
    `${pack.quality.score}% structural checklist coverage (not factual accuracy)`,
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

function renderNoteIntelligenceEmptyState() {
  return `<div class="note-quality-empty">
    <div class="section-title"><span>Note intelligence</span><span>Waiting</span></div>
    <p>Add a heading, definitions, examples and revision tasks to see a readiness score.</p>
  </div>`;
}

function renderNoteIntelligencePanel(note) {
  if (!elements.noteIntelligencePanel) return;

  const body = note?.body || "";
  if (!getPlainNoteLines(body).length) {
    elements.noteIntelligencePanel.innerHTML = renderNoteIntelligenceEmptyState();
    return;
  }

  const generator = getRevisionGenerator();
  const pack = generator.generateStudyPack(body);
  const signals = pack.quality.signals;
  const qualityClass =
    pack.quality.score >= 70 ? "strong" : pack.quality.score >= 38 ? "developing" : "thin";
  const nextStep =
    pack.quality.score >= 70
      ? "Ready for revision generation."
      : signals.definitions < 2
        ? "Add two precise definitions."
        : signals.examples < 1
          ? "Add one concrete example."
        : signals.revisionTasks < 2
          ? "Add revision tasks for follow-up."
          : "Add more OCR-linked examples.";

  elements.noteIntelligencePanel.innerHTML = `
    <div class="section-title"><span>Note structure</span><span>${escapeHtml(pack.quality.label)}</span></div>
    <p>This checklist checks structure, not factual accuracy or exam readiness.</p>
    <div class="note-quality-score ${qualityClass}">
      <strong>${pack.quality.score}%</strong>
      <div>
        <span>${escapeHtml(nextStep)}</span>
        <i aria-hidden="true"><b style="width:${Math.max(4, pack.quality.score)}%"></b></i>
      </div>
    </div>
    <div class="intelligence-grid">
      <article><span>Words</span><strong>${signals.words}</strong></article>
      <article><span>Headings</span><strong>${signals.headings}</strong></article>
      <article><span>Definitions</span><strong>${signals.definitions}</strong></article>
      <article><span>Examples</span><strong>${signals.examples || 0}</strong></article>
      <article><span>Tasks</span><strong>${signals.revisionTasks}</strong></article>
    </div>
    ${
      pack.keyTerms.length
        ? `<div class="key-term-cloud">${pack.keyTerms.slice(0, 6).map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</div>`
        : ""
    }`;
}

function renderFormattedPreviewEmptyState() {
  return `<div class="formatted-empty-state">
    <strong>Your formatted preview is shown here.</strong>
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
    elements.summaryText.innerHTML = renderSummaryEmptyState("Create a note to begin.", "Your summary, key terms, and revision prompts are built as you write.");
    elements.formattedPreview.innerHTML = renderFormattedPreviewEmptyState();
    elements.noteIntelligencePanel.innerHTML = renderNoteIntelligenceEmptyState();
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
  renderNoteIntelligencePanel(note);

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

  const note = getSelectedNote();
  if (!note) return;

  const pack = getRevisionGenerator().generateStudyPack(note.body || "");
  renderGeneratedStudyAction(action, pack);
  trackEvent("note_revision_generated", { action, noteQuality: pack.quality.score });
}

async function exportSelectedPdf() {
  const note = getSelectedNote();
  if (!note) return;

  if (!hasFeature("pdfExport")) {
    showInsightsMessage("PDF export is part of Pro.", "error");
    return;
  }

  window.open(`/api/notes/${note.id}/export.pdf`, "_blank", "noopener");
}

function showInstantCards() {
  const note = getSelectedNote();
  if (!note) return;
  revealStudyOutput();

  generatedCardFlips.clear();
  generatedNoteCards = getRevisionGenerator().generateFlashcards(note.body || "");

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
          <strong>Review your draft cards</strong>
          <p>Edit each question and answer before saving. Extraction from your notes does not verify the facts.</p>
        </div>
        <button type="button" data-insert-generated-cards>Save draft cards</button>
      </div>
      <div class="instant-card-grid">
        ${generatedNoteCards
          .map(
            (card, index) => `<article class="draft-card-editor" data-draft-card="${index}">
              <label><input type="checkbox" data-draft-include checked> Include card ${index + 1}</label>
              <label for="draft-question-${index}">Question</label><input id="draft-question-${index}" data-draft-question maxlength="240" value="${escapeHtml(card.front)}">
              <label for="draft-answer-${index}">Answer</label><textarea id="draft-answer-${index}" data-draft-answer rows="3" maxlength="1500">${escapeHtml(card.back)}</textarea>
            </article>`,
          )
          .join("")}
      </div>
      <p class="instant-card-note">These are generated locally from the note. Save them into the note, refine the wording, then use them for a revision sprint.</p>
    </div>`;
  trackEvent("instant_cards_generated", { count: generatedNoteCards.length });
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

  const reviewed = [...elements.insightsPanel.querySelectorAll("[data-draft-card]")].filter((item) => item.querySelector("[data-draft-include]").checked).map((item) => ({ front: item.querySelector("[data-draft-question]").value.trim(), back: item.querySelector("[data-draft-answer]").value.trim() })).filter((item) => item.front && item.back);
  const seen = new Set();
  const cardDraft = reviewed.filter((card) => {
    const key = card.front.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
    .map((card, index) => `${index + 1}. Q: ${card.front}\n   A: ${card.back}`)
    .join("\n");
  const addition = `\n\n## Instant revision cards\n${cardDraft}`;
  if (!cardDraft) return;

  elements.noteBody.value = `${note.body.trimEnd()}${addition}`;
  updateActiveNote();
  showInsightsMessage("Draft revision cards added to the note. You can edit them before exporting or sharing.", "success");
}

function getRevisionGenerator() {
  const generator = window.NeatRevisionGenerator || window.NeetRevisionGenerator;
  if (generator) return generator;

  return {
    generateStudyPack(body) {
      const flashcards = createInstantNoteCards(body);
      return {
        summary: createSummary(body),
        flashcards,
        quiz: flashcards.slice(0, 8).map((card, index) => ({
          id: `fallback-${index + 1}`,
          type: "short-answer",
          prompt: card.front,
          answer: card.back,
          explanation: "Generated from your note content.",
          options: [card.back],
        })),
        keyTerms: getPlainNoteLines(body)
          .map((line) => line.match(/^([^:]{3,52}):/)?.[1])
          .filter(Boolean)
          .slice(0, 8),
        checklist: getPlainNoteLines(body).filter((line) => /^- \[[ xX]\]/.test(line)).slice(0, 8),
        examPrompts: [createTitle(body)].filter(Boolean).map((title) => `Explain ${title} in an OCR-style answer.`),
        quality: assessFallbackNoteQuality(body),
      };
    },
    generateFlashcards: createInstantNoteCards,
    generateSummary: createSummary,
    extractKeyTerms(body) {
      return this.generateStudyPack(body).keyTerms;
    },
    assessNoteQuality: assessFallbackNoteQuality,
  };
}

function assessFallbackNoteQuality(body = "") {
  const lines = getPlainNoteLines(body);
  const headings = (body.match(/^#{1,3}\s+/gm) || []).length;
  const definitions = lines.filter((line) => /^([^:]{3,52}):\s+(.{4,})$/.test(line)).length;
  const tasks = (body.match(/^- \[[ xX]\]\s+/gm) || []).length;
  const score = Math.min(100, lines.length * 8 + headings * 10 + definitions * 12 + tasks * 10);
  return {
    score,
    label: score >= 70 ? "Revision-ready" : score >= 38 ? "Developing" : "Too brief",
    signals: {
      words: body.split(/\s+/).filter(Boolean).length,
      headings,
      definitions,
      keyTerms: definitions,
      revisionTasks: tasks,
    },
  };
}

function normalizeStudyPack(pack, body = "") {
  if (!pack) return getRevisionGenerator().generateStudyPack(body);
  const localPack = getRevisionGenerator().generateStudyPack(body);
  return {
    summary: pack.summary || localPack.summary,
    flashcards: Array.isArray(pack.flashcards) ? pack.flashcards : localPack.flashcards,
    quiz: Array.isArray(pack.quiz)
      ? pack.quiz
      : Array.isArray(pack.questions)
        ? pack.questions.map((question, index) => ({
            id: `server-${index + 1}`,
            prompt: question.prompt,
            answer: question.answer,
            explanation: question.explanation || "Generated from your note content.",
            options: question.options || [question.answer],
          }))
        : localPack.quiz,
    keyTerms: Array.isArray(pack.keyTerms) ? pack.keyTerms : pack.keyPoints || localPack.keyTerms,
    checklist: Array.isArray(pack.checklist) ? pack.checklist : pack.tasks || localPack.checklist,
    examPrompts: Array.isArray(pack.examPrompts) ? pack.examPrompts : localPack.examPrompts,
    quality: pack.quality || localPack.quality,
  };
}

function renderGeneratedStudyAction(action, pack) {
  const views = {
    quiz: {
      title: "Quick quiz",
      count: `${pack.quiz.length} checks`,
      html: renderQuizList(pack.quiz),
    },
    exam: {
      title: "Exam prompts",
      count: `${pack.examPrompts.length} prompts`,
      html: renderSimpleList(pack.examPrompts),
    },
    organiser: {
      title: "Knowledge organiser",
      count: `${pack.keyTerms.length} terms`,
      html: `<article><strong>Summary</strong><p>${escapeHtml(pack.summary)}</p></article>
        <article><strong>Key terms</strong><div class="key-term-cloud">${pack.keyTerms.map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</div></article>
        <article><strong>Checklist</strong>${renderSimpleList(pack.checklist)}</article>`,
    },
    "mind-map": {
      title: "Study map",
      count: `${pack.keyTerms.length} nodes`,
      html: renderStudyMap(pack),
    },
  };
  const view = views[action] || views.quiz;
  elements.insightsPanel.hidden = false;
  elements.insightsPanel.innerHTML = `
    <div class="section-title"><span>${escapeHtml(view.title)}</span><span>${escapeHtml(view.count)}</span></div>
    <div class="generated-study-panel">${view.html}</div>`;
}

function renderGeneratedStudyPack(pack, title = "Study pack", provenance = null) {
  revealStudyOutput();
  elements.insightsPanel.hidden = false;
  elements.insightsPanel.innerHTML = `
    <div class="section-title">
      <span>${escapeHtml(title)}</span>
      <span>${pack.flashcards.length} cards · ${pack.quiz.length} checks</span>
    </div>
    <div class="generated-study-panel">
      ${provenance ? `<aside class="generated-provenance" aria-label="Generated resource provenance">
        <span>Generated resource · Review required</span>
        <p>${escapeHtml(provenance.notice || "Generated from your note. Review accuracy before revising from it.")}</p>
        <small>Source note saved ${escapeHtml(formatDate(provenance.sourceNoteUpdatedAt || provenance.generatedAt))} · ${escapeHtml(provenance.method || "RecallStride generator")}</small>
      </aside>` : ""}
      <article><strong>Summary</strong><p>${escapeHtml(pack.summary)}</p></article>
      <article><strong>Key terms</strong><div class="key-term-cloud">${pack.keyTerms.map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</div></article>
      <article><strong>Flashcards</strong><div class="flashcard-list">${pack.flashcards
        .map((card) => `<div><span>${escapeHtml(card.front)}</span><p>${escapeHtml(card.back)}</p></div>`)
        .join("")}</div></article>
      <article><strong>Quick quiz</strong>${renderQuizList(pack.quiz)}</article>
      <article><strong>OCR exam prompts</strong>${renderSimpleList(pack.examPrompts)}</article>
      <article><strong>Revision checklist</strong>${renderSimpleList(pack.checklist)}</article>
    </div>`;
}

function renderQuizList(questions = []) {
  if (!questions.length) return `<p class="empty-copy">Add more note detail to generate checks.</p>`;
  return `<ol class="generated-quiz-list">${questions
    .map((question) => `<li>
      <span>${escapeHtml(question.prompt)}</span>
      <p>${escapeHtml(question.answer)}</p>
    </li>`)
    .join("")}</ol>`;
}

function renderSimpleList(items = []) {
  if (!items.length) return `<p class="empty-copy">Add more note detail to generate this section.</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderStudyMap(pack) {
  const nodes = [pack.summary, ...pack.keyTerms, ...pack.checklist].filter(Boolean).slice(0, 9);
  if (!nodes.length) return `<p class="empty-copy">Add headings and key terms to generate a study map.</p>`;
  return `<div class="study-map" aria-label="Generated study map">
    ${nodes.map((node, index) => `<span class="${index === 0 ? "central" : ""}">${escapeHtml(node)}</span>`).join("")}
  </div>`;
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

  if (isGuestMode || !hasFeature("studyPack")) {
    showInsightsMessage("Study Packs are included with Student Pro. Upgrade to generate synced revision resources from your notes.", "upgrade");
    openPlansModal();
    return;
  }

  let pack = null;
  let source = "server";

  try {
    const response = await api(`/api/notes/${note.id}/study-pack`);
    pack = normalizeStudyPack(response.studyPack, note.body || "");
  } catch (error) {
    showInsightsMessage(error.message || "The Study Pack could not be generated.", "error");
    return;
  }

  renderGeneratedStudyPack(pack, "Synced study pack", response.provenance);
  trackEvent("study_pack_generated", { source, noteQuality: pack.quality.score });
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


function showInsightsMessage(message, type = "") {
  revealStudyOutput();
  elements.insightsPanel.hidden = false;
  elements.insightsPanel.innerHTML = `<p class="status-message ${type}">${escapeHtml(message)}</p>`;
}

function revealStudyOutput() {
  if (elements.studyOutputDisclosure) elements.studyOutputDisclosure.open = true;
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
  const plan = isGuestMode
    ? plans.guest || plans.free || {}
    : currentUser?.entitlements || plans[currentUser?.plan] || plans.free || {};
  return Boolean(plan.features?.[feature]);
}

function getSelectedFreeRevisionTopicId() {
  return isGuestMode || !currentUser ? freeRevisionTopicId || "" : currentUser.freeRevisionDeckId || "";
}

function getRevisionTopicAccessState(topicId) {
  const topic = getQuizTopicById(topicId);
  if (topic?.contentAvailable === false) return { canAccess: false, canClaim: false, locked: true, selectedFreeDeck: false, label: "In review", reason: "Academic review is required before this topic is released." };
  if (!topic) {
    return {
      canAccess: false,
      canClaim: false,
      locked: true,
      selectedFreeDeck: false,
      label: "Locked",
      reason: "This revision deck is not available.",
    };
  }

  if (hasFeature("fullRevisionLibrary")) {
    return {
      canAccess: hasLoadedRevisionCards(topic),
      canClaim: false,
      locked: !hasLoadedRevisionCards(topic),
      selectedFreeDeck: false,
      label: "Included",
      reason: hasLoadedRevisionCards(topic)
        ? "Your plan includes all released OCR revision packs."
        : "This deck needs to be refreshed before it can be opened.",
    };
  }

  const selectedFreeDeck = getSelectedFreeRevisionTopicId();
  if (selectedFreeDeck === topic.id && hasLoadedRevisionCards(topic)) {
    return {
      canAccess: true,
      canClaim: false,
      locked: false,
      selectedFreeDeck: true,
      label: "Free deck",
      reason: "This is your selected free revision deck.",
    };
  }

  if (selectedFreeDeck === topic.id && !hasLoadedRevisionCards(topic)) {
    return {
      canAccess: false,
      canClaim: false,
      locked: true,
      selectedFreeDeck: true,
      label: "Pro",
      reason: "This deck is not loaded in this browser session. Log in or upgrade to unlock it securely.",
    };
  }

  if (!selectedFreeDeck) {
    const canClaim = Boolean(currentUser && !isGuestMode) || hasLoadedRevisionCards(topic);
    return {
      canAccess: false,
      canClaim,
      locked: !canClaim,
      selectedFreeDeck: false,
      label: canClaim ? "Free pick" : "Pro",
      reason: canClaim
        ? "Choose one OCR deck to revise for free. Pro unlocks the rest."
        : "Create a free account to choose this as your one included OCR deck.",
    };
  }

  return {
    canAccess: false,
    canClaim: false,
    locked: true,
    selectedFreeDeck: false,
    label: "Pro",
    reason: "Upgrade to Pro to unlock every OCR Computer Science deck.",
  };
}

function canAccessRevisionTopic(topicId) {
  return getRevisionTopicAccessState(topicId).canAccess;
}

function canClaimFreeRevisionTopic(topicId) {
  return getRevisionTopicAccessState(topicId).canClaim;
}

async function claimFreeRevisionTopic(topicId) {
  const topic = getQuizTopicById(topicId);
  if (!topic) return false;

  const access = getRevisionTopicAccessState(topic.id);
  if (access.canAccess) return true;
  if (!access.canClaim) {
    promptRevisionUpgrade(topic);
    return false;
  }

  if (isGuestMode || !currentUser) {
    saveFreeRevisionTopicId(topic.id);
    elements.upgradeMessage.textContent = `${topic.code} ${topic.title} is now your free revision deck. Pro unlocks all released OCR packs.`;
    elements.upgradeMessage.className = "topbar-plan-message success";
    return true;
  }

  try {
    const response = await api("/api/revision/free-deck", {
      method: "POST",
      body: { deckId: topic.id },
    });
    currentUser = response.user || currentUser;
    hydrateRevisionTopicFromDeck(response.deck);
    saveFreeRevisionTopicId(currentUser.freeRevisionDeckId || topic.id);
    elements.upgradeMessage.textContent = response.message || `${topic.code} ${topic.title} is now your free revision deck.`;
    elements.upgradeMessage.className = "topbar-plan-message success";
    renderAccountChrome();
    renderPlan();
    return true;
  } catch (error) {
    elements.upgradeMessage.textContent = error.message;
    elements.upgradeMessage.className = "topbar-plan-message error";
    if (/upgrade/i.test(error.message)) {
      openPlansModal();
    }
    return false;
  }
}

function promptRevisionUpgrade(topic = null) {
  const topicName = topic ? `${topic.code} ${topic.title}` : "this deck";
  elements.upgradeMessage.textContent = `Upgrade to Pro to unlock ${topicName}, Quick Practice, badges and all released OCR revision packs.`;
  elements.upgradeMessage.className = "topbar-plan-message error";
  openPlansModal();
}

function showWorkspaceMessage(message, type = "") {
  elements.workspaceMessage.textContent = message;
  elements.workspaceMessage.className = `status-message ${type}`;
}

async function downloadWorkspaceData() {
  if (currentUser && !isGuestMode) {
    elements.downloadDataButton.disabled = true;
    try {
      const response = await fetch("/api/account/export", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "The account export could not be prepared.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `neat-notes-account-export-${new Date().toISOString().slice(0, 10)}.json`);
      elements.settingsMessage.textContent = "Account export downloaded.";
      elements.settingsMessage.className = "status-message success";
    } catch (error) {
      elements.settingsMessage.textContent = error.message;
      elements.settingsMessage.className = "status-message error";
    } finally {
      elements.downloadDataButton.disabled = false;
    }
    return;
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const payload = {
    exportedAt: new Date().toISOString(),
    user: currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.name } : null,
    workspace: activeWorkspace || null,
    members,
    notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${slugify(activeWorkspace?.name || "neat-notes-workspace")}.json`);
  elements.settingsMessage.textContent = "Workspace export prepared.";
  elements.settingsMessage.className = "status-message success";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
      credentials: "same-origin",
      cache: "no-store",
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
  if (!lines.length) return "Start writing and a tidy summary is built here.";

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

if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Offline installation is optional; the core web app remains available.
    });
  });
}
