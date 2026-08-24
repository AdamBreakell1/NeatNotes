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
const CLASS_GROUPS_KEY = "neat-notes-class-groups";
const CLASS_MEMBERSHIPS_KEY = "neat-notes-class-memberships";
const ACTIVE_STUDENT_CLASS_KEY = "neat-notes-active-student-class";
const CENTRES_KEY = "neat-notes-centres";
const TEACHER_ASSIGNMENTS_KEY = "neat-notes-teacher-assignments";
const LEARNING_MODE_KEY = "neat-notes-learning-mode";
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
let activityEvents = loadLocalArray(ACTIVITY_EVENTS_KEY);
let classGroups = loadLocalArray(CLASS_GROUPS_KEY);
let classMemberships = loadLocalArray(CLASS_MEMBERSHIPS_KEY);
let centres = loadLocalArray(CENTRES_KEY);
let teacherAssignments = loadLocalArray(TEACHER_ASSIGNMENTS_KEY);
let activeLearningMode = localStorage.getItem(LEARNING_MODE_KEY) === "teacher" ? "teacher" : "student";
let activeTeacherSection = "dashboard";
let teacherActionMessage = { text: "", type: "" };
let activeClassId = classGroups[0]?.id || null;
let activeStudentClassId = localStorage.getItem(ACTIVE_STUDENT_CLASS_KEY) || null;
let activeCentreId = centres[0]?.id || null;
let revisionSession = createRevisionSession(activeRevisionTopicId);
let revisionReviewMode = null;
let studentClassJoinMessage = { text: "", type: "" };
let studentClassCodeDraft = "";
let reviewSchedules = loadLocalObject(REVIEW_SCHEDULES_KEY);
let mistakeJournal = loadLocalArray(MISTAKE_JOURNAL_KEY);
let activeAdaptiveSession = null;
let accountProfile = null;
let serverStudentTopicConfidence = new Map();
let focusBeforeGlobalSearch = null;
let globalSearchSelection = 0;
let onboardingStep = 1;
let focusBeforeOnboarding = null;
let activePracticeMode = "quick";
let examPracticeState = null;
let miniMockState = null;
let miniMockTimer = null;
let csLabState = null;
let activePasswordResetToken = "";

const REVISION_TOPICS = window.REVISION_TOPICS || [];
const NEAT_QUESTIONS = window.NEAT_QUESTIONS || [];
const LEARNING_MODEL = window.NEAT_LEARNING_MODEL;

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
  dashboardButton: document.querySelector("#dashboard-button"),
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
  learningModeSwitch: document.querySelector("#learning-mode-switch"),
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
  settingsProfileAvatar: document.querySelector("#settings-profile-avatar"),
  accountSessionTools: document.querySelector("#account-session-tools"),
  accountSessionSummary: document.querySelector("#account-session-summary"),
  revokeOtherSessionsButton: document.querySelector("#revoke-other-sessions-button"),
  accountDangerZone: document.querySelector("#account-danger-zone"),
  deleteAccountButton: document.querySelector("#delete-account-button"),
  usageAnalyticsConsent: document.querySelector("#usage-analytics-consent"),
  settingsRevisionForm: document.querySelector("#settings-revision-form"),
  settingsRevisionMessage: document.querySelector("#settings-revision-message"),
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
  studentClassPanel: document.querySelector("#student-class-panel"),
  studentDashboardPanel: document.querySelector("#student-dashboard-panel"),
  studyPane: document.querySelector(".study-pane"),
  summaryText: document.querySelector("#summary-text"),
  tagInput: document.querySelector("#tag-input"),
  tagList: document.querySelector("#tag-list"),
  teacherModePanel: document.querySelector("#teacher-mode-panel"),
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
elements.settingsButton.addEventListener("click", openSettingsModal);
elements.closeSettingsButton.addEventListener("click", closeSettingsModal);
elements.settingsModal.addEventListener("click", handleSettingsModalClick);
elements.legalModal.addEventListener("click", handleLegalModalClick);
elements.siteFooter.addEventListener("click", handleFooterClick);
elements.settingsTabs.addEventListener("click", switchSettingsTab);
elements.themeChoiceGroup.addEventListener("click", chooseTheme);
elements.avatarChoiceGroup.addEventListener("click", chooseProfileAvatar);
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
elements.studentDashboardPanel.addEventListener("click", handleStudentDashboardClick);
elements.mistakeJournalPanel.addEventListener("click", handleMistakeJournalClick);
elements.teacherModePanel.addEventListener("click", handleTeacherModeClick);
elements.teacherModePanel.addEventListener("submit", handleTeacherModeSubmit);
elements.teacherModePanel.addEventListener("change", handleTeacherModeChange);
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
elements.examLoadQuestionButton.addEventListener("click", () => {
  if (activePracticeMode === "mock") loadMiniMock();
  else if (activePracticeMode === "labs") loadCsLabs(true);
  else loadExamPracticeQuestion();
});
elements.examPracticePanel.addEventListener("submit", submitExamPracticeAnswer);
elements.examPracticePanel.addEventListener("submit", submitCsLab);
elements.examPracticePanel.addEventListener("click", handleExamPracticeClick);
elements.examPracticePanel.addEventListener("input", handleMiniMockInput);
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
  activeAppSection = ["home", "revise", "practice", "progress", "notes", "teacher", "contact"].includes(normalizedSection)
    ? normalizedSection
    : "home";
  const isNotes = activeAppSection === "notes";
  const isStudent = ["home", "revise", "practice", "progress"].includes(activeAppSection);
  const isRevision = isStudent || activeAppSection === "teacher";
  const isTeacher = activeAppSection === "teacher";
  const isContact = activeAppSection === "contact";

  if (isTeacher) {
    activeLearningMode = "teacher";
  } else if (isStudent) {
    activeLearningMode = "student";
  }
  localStorage.setItem(LEARNING_MODE_KEY, activeLearningMode);

  elements.notesColumn.hidden = !isNotes;
  elements.editorPanel.hidden = !isNotes;
  elements.revisionView.hidden = !isRevision;
  elements.contactView.hidden = !isContact;
  elements.notesSidebarContext.hidden = !isNotes;
  elements.appView.classList.toggle("notes-mode", isNotes);
  elements.appView.classList.toggle("revision-mode", isRevision);
  elements.appView.classList.toggle("teacher-app-mode", isTeacher);
  elements.appView.classList.toggle("contact-mode", isContact);
  elements.revisionView.dataset.studentView = isStudent ? activeAppSection : "";

  document.querySelectorAll("[data-app-section]").forEach((button) => {
    const buttonSection = button.dataset.appSection === "revision" ? "revise" : button.dataset.appSection;
    const isActiveSection = buttonSection === activeAppSection;
    button.classList.toggle("active", isActiveSection);
    if (button.closest(".topbar-section-switch")) {
      button.setAttribute("aria-current", isActiveSection ? "page" : "false");
    }
    button.classList.toggle("locked-section", button.dataset.appSection === "teacher" && !canUseTeacherMode());
  });

  if (isRevision) {
    if (!isTeacher) {
      recordActivityEvent({ type: "revision_started", topicId: activeRevisionTopicId });
    }
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
  activePracticeMode = ["exam", "mock", "labs"].includes(button.dataset.practiceMode) ? button.dataset.practiceMode : "quick";
  renderPracticeMode();
  if (activePracticeMode === "exam" && !examPracticeState) loadExamPracticeQuestion();
  if (activePracticeMode === "mock" && !miniMockState) loadMiniMock();
  if (activePracticeMode === "labs" && !csLabState) loadCsLabs();
}

function renderPracticeMode() {
  if (!elements.practiceModeBar) return;
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
    elements.examLoadQuestionButton.textContent = "New mini mock";
  } else if (activePracticeMode === "labs") {
    document.querySelector("#exam-practice-title").textContent = "Computer Science Labs";
    elements.examLoadQuestionButton.textContent = "Choose another lab";
  } else {
    document.querySelector("#exam-practice-title").textContent = "Exam Answer Coach";
    elements.examLoadQuestionButton.textContent = "Start exam practice";
  }
  elements.practiceModeBar.querySelectorAll("[data-practice-mode]").forEach((button) => {
    const active = button.dataset.practiceMode === activePracticeMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
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
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function loadLocalObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
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
    difficulty: options.difficulty,
    sessionId: revisionSession?.id,
    createdAt: new Date().toISOString(),
  };

  cardAttempts = [attempt, ...cardAttempts].slice(0, 1200);
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
  localStorage.setItem(REVIEW_SCHEDULES_KEY, JSON.stringify(reviewSchedules));

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
  return REVISION_TOPICS
    .filter((topic) => canAccessRevisionTopic(topic.id))
    .flatMap((topic) => getTopicCards(topic).map((card) => {
      const conceptId = getRevisionCardKey(topic, card);
      const evidence = cardAttempts
        .filter((attempt) => attempt.cardId === conceptId)
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
  return LEARNING_MODEL.buildSession({ items: getAdaptiveLearningItems(), durationMinutes });
}

function startAdaptiveRevisionSession(durationMinutes = 15) {
  const plan = getAdaptiveSessionPlan(durationMinutes);
  if (!plan.items.length) {
    setAppSection("revise");
    return;
  }

  activeAdaptiveSession = {
    ...plan,
    id: createLocalId("adaptive"),
    startedAt: new Date().toISOString(),
    completedConceptIds: [],
  };
  openNextAdaptiveSessionTopic();
  setAppSection("revise");
  trackEvent("adaptive_session_started", { durationMinutes, itemCount: plan.items.length });
}

function openNextAdaptiveSessionTopic() {
  const nextItem = activeAdaptiveSession?.items.find((item) => !completedRevisionCards.has(item.cardId));
  if (!nextItem) {
    if (activeAdaptiveSession) activeAdaptiveSession.completedAt = new Date().toISOString();
    return false;
  }

  activeRevisionTopicId = nextItem.topicId;
  const topicCardIds = activeAdaptiveSession.items
    .filter((item) => item.topicId === nextItem.topicId && !completedRevisionCards.has(item.cardId))
    .map((item) => item.cardId);
  startRevisionSession(nextItem.topicId, "adaptive", topicCardIds);
  revisionReviewMode = { topicId: nextItem.topicId, cardIds: topicCardIds, mode: "adaptive" };
  return true;
}

async function syncRevisionAttempt(attempt) {
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
        cardId: serverCardId,
        classId: attempt.classId || null,
        confidence: attempt.confidence,
        quizCorrect: attempt.quizCorrect,
        responseTimeMs: attempt.responseTimeMs,
        source: attempt.source || "flashcard",
        rating: attempt.difficulty || undefined,
      },
    });
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
    if (recommendedTopic && isRevisionTopicRecommendable(recommendedTopic.id)) return recommendedTopic;
  }

  const availableTopics = REVISION_TOPICS.filter((topic) => isRevisionTopicRecommendable(topic.id));
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
  elements.achievementText.textContent = `${topic.code} ${topic.title} is complete. ${getRevisionTopicCardCount(topic)} Computer Science cards have been added to your total mastery.`;
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
  const totalCards = REVISION_TOPICS.reduce((sum, topic) => sum + getRevisionTopicCardCount(topic), 0);
  const earnedTopics = REVISION_TOPICS.filter((topic) => earnedRevisionBadges[topic.id]).length;
  const earnedCards = REVISION_TOPICS.reduce(
    (sum, topic) => sum + (earnedRevisionBadges[topic.id] ? getRevisionTopicCardCount(topic) : getCompletedRevisionCount(topic)),
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
    elements.contactStatus.textContent = "Use the form below to send the enquiry directly in Neat Notes.";
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
  renderAvatarChoiceGroup();
  renderSettingsAccountPanel();
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
  elements.settingsRevisionForm.elements.component1.value = examDates.component1 || "";
  elements.settingsRevisionForm.elements.component2.value = examDates.component2 || "";
  elements.settingsRevisionForm.elements.personalTarget.value = profile.personal_target || "";
  [...elements.settingsRevisionForm.elements].forEach((control) => {
    control.disabled = isGuestMode || !currentUser;
  });
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
          component1: data.get("component1") || null,
          component2: data.get("component2") || null,
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
  if (currentUser?.id && !isGuestMode) {
    appSettings.profileAvatars = {
      ...(appSettings.profileAvatars || {}),
      [currentUser.id]: avatarId,
    };
  } else {
    appSettings.profileAvatar = avatarId;
  }
  saveSettings();
  renderSettingsControls();
  renderAccountChrome();
}

function renderAvatarChoiceGroup() {
  if (!elements.avatarChoiceGroup) return;

  const selectedAvatar = getProfileAvatar(getActiveProfileAvatarId());
  elements.avatarChoiceGroup.innerHTML = PROFILE_AVATARS.map((avatar) => {
    const isActive = avatar.id === selectedAvatar.id;
    return `<button class="${isActive ? "active" : ""}" type="button" role="radio" aria-checked="${String(isActive)}" data-avatar-choice="${escapeHtml(avatar.id)}">
      <span class="profile-avatar profile-avatar-choice" data-avatar="${escapeHtml(avatar.id)}">${escapeHtml(avatar.mark)}</span>
      <strong>${escapeHtml(avatar.label)}</strong>
    </button>`;
  }).join("");
}

function renderSettingsAccountPanel() {
  if (!elements.settingsAccountName) return;

  const isSignedIn = Boolean(currentUser) && !isGuestMode;
  const planName = getCurrentPlanLabel();
  renderProfileAvatar(elements.settingsProfileAvatar);
  elements.settingsAccountName.textContent = isSignedIn ? currentUser.name || "Neat Notes account" : "Guest workspace";
  elements.settingsAccountEmail.textContent = isSignedIn ? currentUser.email : "Not signed in";
  elements.settingsAccountPlan.textContent = isSignedIn
    ? `${planName} · synced workspace`
    : "Local browser storage · create an account to sync";
  elements.accountSessionTools.hidden = !isSignedIn;
  elements.accountDangerZone.hidden = !isSignedIn;
}

function getActiveProfileAvatarId() {
  if (currentUser?.id && !isGuestMode) {
    return appSettings.profileAvatars?.[currentUser.id] || appSettings.profileAvatar;
  }
  return appSettings.profileAvatar;
}

function getProfileAvatar(avatarId = getActiveProfileAvatarId()) {
  return PROFILE_AVATARS.find((avatar) => avatar.id === avatarId) || PROFILE_AVATARS[0];
}

function renderProfileAvatar(target = elements.topbarProfileAvatar) {
  if (!target) return;
  const avatar = getProfileAvatar(getActiveProfileAvatarId());
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
  renderSettingsControls();
  selectSettingsTab(tab);
  elements.settingsModal.hidden = false;
  document.body.classList.add("modal-open");
  if (tab === "account" && currentUser && !isGuestMode) loadAccountSessions();
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
    await api("/api/account", { method: "DELETE", body: { confirmation, password } });
    localStorage.clear();
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
      html: `<p>Neat Notes uses account details, notes and revision activity to provide the workspace, save progress and support enquiries.</p>
        <ul>
          <li>Contact enquiries are routed to the Neat Notes support inbox.</li>
          <li>Student workspace data is used to run notes, revision and class features.</li>
          <li>Payment processing is handled securely by Stripe when subscriptions are enabled.</li>
        </ul>
        <p>This page is a product-facing summary. Formal legal wording should be reviewed for larger school agreements.</p>`,
    },
    terms: {
      title: "Terms of Service",
      html: `<p>Neat Notes is an education workspace for note taking, OCR Computer Science revision and classroom support.</p>
        <ul>
          <li>Users are responsible for the content they add to notes and collaboration spaces.</li>
          <li>Accounts may be limited or suspended if the service is misused.</li>
          <li>Subscription features depend on the active plan attached to the account.</li>
        </ul>`,
    },
    cookies: {
      title: "Cookie Policy",
      html: `<p>Neat Notes uses essential cookies and local browser storage to keep users signed in, remember preferences and save local guest progress.</p>
        <p>Analytics and marketing cookies should only be added with clear consent controls.</p>`,
    },
    "data-protection": {
      title: "Data Protection",
      html: `<p>BreakellSystems is building Neat Notes with UK education workflows in mind.</p>
        <ul>
          <li>Only collect data needed to run accounts, notes, revision progress, payments and support.</li>
          <li>Use school-facing exports and teacher dashboards carefully, with clear class membership context.</li>
          <li>Review GDPR documentation, retention rules and processor agreements before institution rollout.</li>
        </ul>`,
    },
    billing: {
      title: "Cancellation and Billing",
      html: `<p>Subscriptions use Stripe Checkout and the Stripe billing portal when payment settings are active.</p>
        <ul>
          <li>Students can start on the Free plan and upgrade to Pro.</li>
          <li>Subscribers manage payment methods, invoices and cancellation through Stripe.</li>
          <li>School and institution billing can be handled by enquiry until a full sales workflow is added.</li>
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
      openAuthModal("login");
      showAuthMessage("Email verified. You can log in now.", "success");
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

  if (action === "teacher") {
    openDemoWorkspace({ section: "teacher", teacher: true });
    return;
  }

  if (action === "contact" || action === "school-contact") {
    openDemoWorkspace({ section: "contact" });
    window.setTimeout(() => {
      if (action === "school-contact" && elements.contactReason) {
        elements.contactReason.value = "School setup";
      }
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
  activeLearningMode = "student";
  localStorage.setItem(LEARNING_MODE_KEY, activeLearningMode);
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
  if (options.teacher) {
    activeLearningMode = "teacher";
    localStorage.setItem(LEARNING_MODE_KEY, "teacher");
  }
  setAppSection(options.section || "home");
  render();
  if (options.teacher) {
    renderRevisionPage();
  }
  trackEvent("demo_workspace_opened", { section: options.section || "home", teacher: Boolean(options.teacher) });
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
  window.location.assign("/");
}

function applyAuthenticatedSession(user, nextPlans = null) {
  currentUser = user;
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

function loadGuestApp(options = {}) {
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
    seedDemoProgress();
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
  pruneRevisionTopicCardsForCurrentPlan();
  renderPlan();

  await loadAccountLearningWorkspace();

  await loadWorkspaces();
  await selectWorkspace(activeWorkspaceId || workspaces[0]?.id);
  renderAccountChrome();
  hideLaunchOverlay();
  maybeOpenOnboarding();
}

async function loadAccountLearningWorkspace() {
  if (isGuestMode || !currentUser) return;
  const [classResponse, assignmentResponse, centreResponse] = await Promise.all([
    api("/api/classes"),
    api("/api/assignments"),
    currentUser.isTeacher ? api("/api/centres") : Promise.resolve({ centres: [] }),
  ]);
  classGroups = (classResponse.classes || []).map(normaliseServerClass);
  teacherAssignments = assignmentResponse.assignments || [];
  centres = centreResponse.centres || [];
  activeClassId = classGroups.some((group) => group.id === activeClassId) ? activeClassId : classGroups[0]?.id || null;
  activeStudentClassId = classGroups.some((group) => group.id === activeStudentClassId) ? activeStudentClassId : classGroups[0]?.id || null;
  classMemberships = currentUser.isTeacher ? [] : classGroups.map((group) => ({
    id: `server-membership-${group.id}`,
    classId: group.id,
    userId: currentUser.id,
    studentName: currentUser.name,
    studentEmail: currentUser.email,
    role: "student",
    status: "active",
    joinedAt: group.membership?.joined_at || group.createdAt,
  }));
  if (currentUser.isTeacher && activeClassId) {
    await loadTeacherClassEvidence(activeClassId);
  } else if (currentUser.isTeacher) {
    activityEvents = [];
    serverStudentTopicConfidence = new Map();
  }
}

function normaliseServerClass(group) {
  return {
    id: group.id,
    centreId: group.centreId,
    teacherId: group.teacherId,
    name: group.name,
    subject: group.subject,
    examBoard: group.examBoard,
    yearGroup: group.yearGroup,
    description: group.description,
    inviteCode: group.joinCode,
    joinCodeEnabled: group.joinCodeEnabled,
    studentCount: group.studentCount,
    membership: group.membership,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

async function loadTeacherClassEvidence(classId) {
  const response = await api(`/api/classes/${encodeURIComponent(classId)}/insights`);
  const dashboard = response.dashboard || {};
  const students = response.students || [];
  classMemberships = students.map((student) => ({
    id: `server-membership-${classId}-${student.id}`,
    classId,
    userId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    role: "student",
    status: "active",
    joinedAt: student.joined_at,
  }));
  activityEvents = dashboard.recentActivity || [];
  serverStudentTopicConfidence = new Map();
  const studentDashboards = response.studentProfiles || [];
  studentDashboards.filter(Boolean).forEach((studentDashboard) => {
    studentDashboard.topics.forEach((topic) => {
      serverStudentTopicConfidence.set(`${studentDashboard.student.id}:${topic.topicId || topic.id}`, topic.confidence);
    });
  });
}

function maybeOpenOnboarding() {
  if (isGuestMode || !currentUser || currentUser.isTeacher || accountProfile?.studentProfile?.onboarding_completed_at) return;
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
  document.querySelector("#onboarding-component-1-date").value = examDates.component1 || "";
  document.querySelector("#onboarding-component-2-date").value = examDates.component2 || "";
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
  elements.onboardingProgressLabel.textContent = `Step ${onboardingStep} of 6`;
  elements.onboardingProgressBar.style.width = `${(onboardingStep / 6) * 100}%`;
  elements.onboardingBack.hidden = onboardingStep === 1;
  elements.onboardingNext.hidden = onboardingStep === 6;
  const heading = elements.onboardingForm.querySelector(`[data-onboarding-step="${onboardingStep}"] h3`);
  heading?.setAttribute("tabindex", "-1");
  heading?.focus();
}

function moveOnboardingStep(direction) {
  if (direction > 0 && !validateOnboardingStep()) return;
  onboardingStep = Math.max(1, Math.min(6, onboardingStep + direction));
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
          component1: data.get("component-1-date") || null,
          component2: data.get("component-2-date") || null,
        },
        completeOnboarding: true,
      },
    });
    accountProfile = response;
    if (response.user) currentUser = response.user;
    elements.onboardingModal.hidden = true;
    document.body.classList.remove("modal-open");
    setAppSection("home");
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
  seedDemoProgress();
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

function seedDemoProgress() {
  const topic = REVISION_TOPICS.find((item) => item.id === "cs-1-1-1");
  if (!topic) return;

  const todayKey = getStudyDayKey();
  const now = Date.now();
  const demoClassId = seedDemoTeacherWorkspace();

  getTopicCards(topic).slice(0, 18).forEach((card, index) => {
    const cardKey = getRevisionCardKey(topic, card);
    completedRevisionCards.add(cardKey);
    if (!cardAttempts.some((attempt) => attempt.cardId === cardKey && attempt.source === "demo")) {
      cardAttempts.unshift({
        id: createLocalId("demo-attempt"),
        userId: "guest",
        cardId: cardKey,
        topicId: topic.id,
        deckId: topic.id,
        classId: null,
        confidence: index < 12 ? "confident" : "needs_practice",
        quizCorrect: index < 12,
        source: "demo",
        sessionId: revisionSession?.id,
        createdAt: new Date(now - index * 42 * 60 * 1000).toISOString(),
      });
    }
  });

  getTopicCards(topic).slice(0, 12).forEach((card, index) => {
    const cardKey = getRevisionCardKey(topic, card);
    if (!cardAttempts.some((attempt) => attempt.cardId === cardKey && attempt.source === "demo-class")) {
      cardAttempts.unshift({
        id: createLocalId("demo-class-attempt"),
        userId: index % 2 === 0 ? "demo-student-ava" : "demo-student-sam",
        cardId: cardKey,
        topicId: topic.id,
        deckId: topic.id,
        classId: demoClassId,
        confidence: index < 7 ? "confident" : "needs_practice",
        quizCorrect: index < 7,
        source: "demo-class",
        sessionId: "demo-class-session",
        createdAt: new Date(now - index * 75 * 60 * 1000).toISOString(),
      });
    }
  });

  studyHistory = {
    ...studyHistory,
    [todayKey]: {
      cards: Math.max(Number(studyHistory[todayKey]?.cards) || 0, 6),
      topics: Array.from(new Set([...(studyHistory[todayKey]?.topics || []), topic.id])),
      updatedAt: new Date().toISOString(),
    },
  };
  saveStudyHistory();

  neatQuizProgress = {
    ...neatQuizProgress,
    [topic.id]: {
      attempts: Math.max(Number(neatQuizProgress[topic.id]?.attempts) || 0, 1),
      bestScore: Math.max(Number(neatQuizProgress[topic.id]?.bestScore) || 0, 4),
      bestStreak: Math.max(Number(neatQuizProgress[topic.id]?.bestStreak) || 0, 3),
      lastScore: Math.max(Number(neatQuizProgress[topic.id]?.lastScore) || 0, 4),
      totalQuestions: Math.max(Number(neatQuizProgress[topic.id]?.totalQuestions) || 0, 5),
      lastCompletedAt: neatQuizProgress[topic.id]?.lastCompletedAt || new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
  };
  saveNeatQuizProgress();

  if (!activityEvents.some((event) => event.source === "demo-onboarding")) {
    activityEvents = [
      {
        id: createLocalId("demo-activity"),
        userId: "guest",
        classId: demoClassId,
        type: "quiz_completed",
        topicId: topic.id,
        source: "demo-onboarding",
        createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        id: createLocalId("demo-activity"),
        userId: "guest",
        classId: demoClassId,
        type: "note_created",
        topicId: topic.id,
        source: "demo-onboarding",
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      },
      ...activityEvents,
    ].slice(0, 800);
  }

  cardAttempts = cardAttempts.slice(0, 1200);
  saveLocalArray(CARD_ATTEMPTS_KEY, cardAttempts);
  saveLocalArray(ACTIVITY_EVENTS_KEY, activityEvents);
}

function seedDemoTeacherWorkspace() {
  const centreId = "demo-centre-breakell";
  const classId = "demo-class-ocr-y12";
  const now = new Date().toISOString();

  if (!centres.some((centre) => centre.id === centreId)) {
    centres = [
      {
        id: centreId,
        name: "BreakellSystems Demo College",
        type: "college",
        code: "CENTRE-DEMO",
        createdAt: now,
      },
      ...centres,
    ];
    saveLocalArray(CENTRES_KEY, centres);
  }

  if (!classGroups.some((group) => group.id === classId)) {
    classGroups = [
      {
        id: classId,
        centreId,
        name: "Year 12 OCR Computer Science",
        subject: "Computer Science",
        examBoard: "OCR A-Level",
        yearGroup: "Year 12",
        description: "Demo class for teacher insight, topic confidence and assignment workflows.",
        inviteCode: "NN-DEMO",
        students: [],
        createdAt: now,
        updatedAt: now,
      },
      ...classGroups,
    ];
    saveLocalArray(CLASS_GROUPS_KEY, classGroups);
  }

  const demoStudents = [
    { id: "demo-membership-ava", userId: "demo-student-ava", studentName: "Ava Patel", studentEmail: "ava.demo@example.com" },
    { id: "demo-membership-sam", userId: "demo-student-sam", studentName: "Sam Taylor", studentEmail: "sam.demo@example.com" },
    { id: "demo-membership-mia", userId: "demo-student-mia", studentName: "Mia Jones", studentEmail: "mia.demo@example.com" },
  ];
  const existingMembershipIds = new Set(classMemberships.map((membership) => membership.id));
  const missingMemberships = demoStudents
    .filter((student) => !existingMembershipIds.has(student.id))
    .map((student, index) => ({
      ...student,
      classId,
      role: "student",
      status: "active",
      joinedAt: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000).toISOString(),
    }));

  if (missingMemberships.length) {
    classMemberships = [...missingMemberships, ...classMemberships];
    saveClassMemberships();
  }

  if (!teacherAssignments.some((assignment) => assignment.id === "demo-assignment-111")) {
    teacherAssignments = [
      {
        id: "demo-assignment-111",
        classId,
        topicId: "cs-1-1-1",
        title: "Structure of the processor recovery task",
        taskType: "flashcards_quiz",
        instructions: "Complete the remaining flashcards, then score 4/5 or better in Quick Practice.",
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        createdAt: now,
      },
      ...teacherAssignments,
    ];
    saveLocalArray(TEACHER_ASSIGNMENTS_KEY, teacherAssignments);
  }

  activeClassId = activeClassId || classId;
  activeCentreId = activeCentreId || centreId;
  return classId;
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

  if (plan === "institution") {
    closePlansModal();
    setAppSection("contact");
    elements.upgradeMessage.textContent = "Institution plans are handled as school partnership enquiries.";
    elements.upgradeMessage.className = "topbar-plan-message success";
    return;
  }

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
    button.textContent = plan === "teacher" ? "Start Teacher plan" : "Upgrade to Pro";
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
    const activeCard = elements.revisionCardGrid.querySelector(".revision-card");
    const confidenceIndex = { Digit1: 0, Digit2: 1, Digit3: 2 }[event.code];
    if (confidenceIndex !== undefined) {
      const confidenceButton = activeCard?.querySelectorAll(".confidence-button")[confidenceIndex];
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
  elements.guestAccountActions.hidden = isSignedIn;
  elements.signedInAccountActions.hidden = !isSignedIn;
  elements.topbarBrandButton.setAttribute("aria-label", isSignedIn ? "Return to Notes" : "Exit demo and return to the Neat Notes homepage");
  elements.topbarBrandButton.title = isSignedIn ? "Return to Notes" : "Exit demo";
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
  const secureTopics = REVISION_TOPICS.filter((topic) => getTopicLearningSummary(topic.id, learningItems).state === "Secure").length;

  elements.revisionMasteryMap.innerHTML = `
    <div class="mastery-map-head">
      <div>
        <span>OCR Component 01 evidence map</span>
        <strong>${secureTopics}/${REVISION_TOPICS.length} topics currently secure</strong>
      </div>
      ${
        recommendedTopic
          ? `<button type="button" data-jump-topic="${escapeHtml(recommendedTopic.id)}">Next: ${escapeHtml(recommendedTopic.code)}</button>`
          : ""
      }
    </div>
    <div class="mastery-map-grid">
      ${REVISION_TOPICS.map((topic) => {
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

function renderLearningMode() {
  elements.revisionView.classList.toggle("teacher-mode-active", activeLearningMode === "teacher");
  const legacyModeBar = elements.learningModeSwitch.closest(".learning-mode-bar");
  if (legacyModeBar) {
    legacyModeBar.hidden = true;
  }
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
        : `<div class="student-class-empty"><strong>Join a class using the code your teacher gave you.</strong><span>Class-linked revision assignments are shown here when your teacher sets them.</span></div>`
    }`;
}

async function handleStudentClassPanelSubmit(event) {
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

  if (!isGuestMode && currentUser) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStudentClassMessage("Checking class code...", "");
    try {
      const preview = await api("/api/classes/preview", { method: "POST", body: { code: normalisedCode } });
      const classPreview = preview.class;
      const confirmed = window.confirm(
        `Join ${classPreview.name}?\n\n${classPreview.examBoard} ${classPreview.subject}${classPreview.teacherName ? `\nTeacher: ${classPreview.teacherName}` : ""}`,
      );
      if (!confirmed) {
        setStudentClassMessage("Class join cancelled.", "");
        return;
      }
      const response = await api("/api/classes/join", { method: "POST", body: { code: normalisedCode } });
      await loadAccountLearningWorkspace();
      studentClassCodeDraft = "";
      input.value = "";
      setStudentClassMessage(response.message || `You have joined ${classPreview.name}.`, "success");
      renderRevisionPage();
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      setStudentClassMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
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
  if (!classId && currentUser?.isTeacher && !isGuestMode) return [];
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

async function leaveStudentClass(classId) {
  const group = getClassById(classId);
  const confirmed = window.confirm("Leave this class? Your personal notes and revision history will stay in your workspace, but your teacher will no longer see new activity for this class.");
  if (!confirmed) return;

  if (!isGuestMode && currentUser) {
    try {
      await api(`/api/classes/${encodeURIComponent(classId)}/members/me`, { method: "DELETE" });
      await loadAccountLearningWorkspace();
      if (activeStudentClassId === classId) {
        activeStudentClassId = classGroups[0]?.id || null;
      }
      setStudentClassMessage(group ? `You have left ${group.name}.` : "You have left this class.", "success");
      renderRevisionPage();
    } catch (error) {
      setStudentClassMessage(error.message, "error");
    }
    return;
  }

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
  if (!canUseTeacherMode()) {
    renderTeacherUpgradePanel();
    return;
  }

  if (!classGroups.some((group) => group.id === activeClassId)) {
    activeClassId = classGroups[0]?.id || null;
  }
  if (!centres.some((centre) => centre.id === activeCentreId)) {
    activeCentreId = centres[0]?.id || null;
  }
  if (activeTeacherSection === "topic-insights" || activeTeacherSection === "centre-settings") {
    activeTeacherSection = activeTeacherSection === "topic-insights" ? "heatmap" : "settings";
  }

  const teacherSections = [
    ["dashboard", "Overview"],
    ["classes", "Classes"],
    ["students", "Students"],
    ["assignments", "Assignments"],
    ["heatmap", "Insights"],
    ["content", "Content"],
    ["reports", "Reports"],
    ["settings", "Settings"],
  ];

  elements.teacherModePanel.innerHTML = `
    <header class="teacher-hero">
      <div>
        <p class="eyebrow">Teacher workspace</p>
        <h2>Plan the next useful intervention</h2>
        <p>Review class evidence, identify misconceptions and set focused OCR Computer Science practice.</p>
      </div>
      <div class="teacher-preview-card">
        <span>${isGuestMode ? "Preview mode" : "Teacher workspace"}</span>
        <strong>${isGuestMode ? "Create an account to save classes and invite students." : "Class data is saved in your workspace."}</strong>
      </div>
    </header>
    <nav class="teacher-tabs" aria-label="Teacher mode sections">
      ${teacherSections.map(([section, label]) => {
        return `<button class="${section === activeTeacherSection ? "active" : ""}" type="button" data-teacher-section="${section}">${label}</button>`;
      }).join("")}
    </nav>
    ${teacherActionMessage.text ? `<p class="teacher-action-message ${escapeHtml(teacherActionMessage.type)}" role="status">${escapeHtml(teacherActionMessage.text)}</p>` : ""}
    ${renderTeacherSection()}`;
}

function canUseTeacherMode() {
  return Boolean(currentUser && !isGuestMode && hasFeature("teacherDashboard"));
}

function renderTeacherUpgradePanel() {
  const isSignedIn = Boolean(currentUser) && !isGuestMode;
  const primaryAction = isSignedIn
    ? `<button type="button" data-open-teacher-plan>View Teacher plan</button>`
    : `<button type="button" data-teacher-auth="signup">Create account</button>`;
  const secondaryAction = isSignedIn
    ? `<button class="secondary" type="button" data-app-section="revision">Back to student revision</button>`
    : `<button class="secondary" type="button" data-teacher-auth="login">Log in</button>`;

  elements.teacherModePanel.innerHTML = `
    <section class="teacher-upgrade-panel" aria-label="Teacher mode locked">
      <div>
        <p class="eyebrow">Teacher Mode · Locked</p>
        <h2>Classroom intelligence is part of the Teacher plan.</h2>
        <p>Create classes, issue revision tasks, view weak-topic heatmaps, and export intervention reports once a Teacher or Institution plan is active.</p>
      </div>
      <div class="teacher-upgrade-actions">
        ${primaryAction}
        ${secondaryAction}
      </div>
      <div class="teacher-upgrade-grid" aria-label="Teacher plan preview">
        <article>
          <span>Classes</span>
          <strong>Teacher-controlled groups</strong>
          <p>Create OCR Computer Science classes and manage student joins securely.</p>
        </article>
        <article>
          <span>Assignments</span>
          <strong>Structured revision tasks</strong>
          <p>Set deck-based tasks and track completion without opening the full teacher dashboard.</p>
        </article>
        <article>
          <span>Insights</span>
          <strong>Weak-topic heatmaps</strong>
          <p>Spot whole-class misconceptions and individual students who need support.</p>
        </article>
      </div>
    </section>`;
}

function renderTeacherSection() {
  if (activeTeacherSection === "classes") return renderTeacherClassesSection();
  if (activeTeacherSection === "assignments") return renderTeacherAssignmentsSection();
  if (activeTeacherSection === "students") return renderTeacherStudentsSection();
  if (activeTeacherSection === "heatmap") return renderTeacherHeatmapSection();
  if (activeTeacherSection === "content") return renderTeacherContentSection();
  if (activeTeacherSection === "reports") return renderTeacherReportsSection();
  if (activeTeacherSection === "settings") return renderCentreSettingsSection();
  return renderTeacherDashboardSection();
}

function renderTeacherDashboardSection() {
  const activeClass = getActiveClassGroup();
  const overview = getTeacherClassOverview(activeClass);
  const weakTopics = activeClass ? getClassTopicInsights().filter((topic) => topic.confidence.totalAttempts).slice(0, 4) : [];
  const watchlist = activeClass ? getStudentWatchlist() : [];

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h3>Who needs help, with what, and what should happen next?</h3>
      </div>
      ${activeClass ? renderClassSelector() : ""}
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
            : `<p class="empty-copy">Topic confidence is shown once students rate flashcards.</p>`
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
        <div class="section-title"><span>Suggested teacher actions</span><span>Next steps</span></div>
        <div class="teacher-action-list">
          <button type="button" data-create-assignment>Prepare review assignment</button>
          <button type="button" data-export-interventions>Export intervention CSV</button>
          <button type="button" data-teacher-section="heatmap">Open topic heatmap</button>
          <button type="button" data-teacher-section="assignments">Manage assignments</button>
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

function renderTeacherAssignmentsSection() {
  const activeClass = getActiveClassGroup();
  const activeAssignments = teacherAssignments
    .filter((assignment) => !activeClass?.id || assignment.classId === activeClass.id)
    .sort((a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0));

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Assignments</p>
        <h3>Set focused revision tasks and monitor class follow-through.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    <div class="teacher-management-grid">
      <form class="teacher-form" data-create-assignment-form>
        <h4>Create assignment</h4>
        <label for="assignment-class">Class</label>
        <select id="assignment-class" name="classId" required>
          ${classGroups.map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === activeClass?.id ? "selected" : ""}>${escapeHtml(group.name)}</option>`).join("")}
        </select>
        <label for="assignment-topic">OCR topic</label>
        <select id="assignment-topic" name="topicId" required>
          ${REVISION_TOPICS.map((topic) => `<option value="${escapeHtml(topic.id)}" ${topic.id === activeRevisionTopicId ? "selected" : ""}>${escapeHtml(topic.code)} ${escapeHtml(topic.title)}</option>`).join("")}
        </select>
        <label for="assignment-task">Task type</label>
        <select id="assignment-task" name="taskType">
          <option value="topic_revision">Flashcards + Quick Practice</option>
          <option value="adaptive_session">Adaptive revision session</option>
          <option value="flashcards">Flashcards only</option>
          <option value="quick_quiz">Quick Practice only</option>
          <option value="exam_questions">Exam questions</option>
          <option value="mini_mock">Mini mock</option>
          <option value="interactive_lab">Interactive lab</option>
        </select>
        <div class="teacher-form-row">
          <label for="assignment-start">Start date
            <input id="assignment-start" name="startAt" type="date" />
          </label>
          <label for="assignment-duration">Estimated minutes
            <input id="assignment-duration" name="estimatedMinutes" type="number" min="5" max="120" step="5" value="15" />
          </label>
        </div>
        <label for="assignment-due">Due date</label>
        <input id="assignment-due" name="dueAt" type="date" />
        <label for="assignment-instructions">Instructions</label>
        <textarea id="assignment-instructions" name="instructions" placeholder="Example: complete the deck, then score 80% or better in Quick Practice."></textarea>
        <button type="submit" ${classGroups.length ? "" : "disabled"}>Set assignment</button>
      </form>
      <div class="teacher-panel-card">
        <div class="section-title"><span>Active assignments</span><span>${activeAssignments.length}</span></div>
        ${activeAssignments.length ? `<div class="teacher-assignment-list">${activeAssignments.map(renderTeacherAssignmentCard).join("")}</div>` : renderInlineEmpty("Assignments will appear here after you create a class task.")}
      </div>
    </div>
  </section>`;
}

function renderTeacherStudentsSection() {
  const activeClass = getActiveClassGroup();
  const students = getClassMemberships(activeClass?.id);

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Students</p>
        <h3>Review learner activity, confidence and intervention priority.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    ${
      students.length
        ? `<div class="teacher-table-wrap">
            <table class="teacher-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Average confidence</th>
                  <th scope="col">Cards rated</th>
                  <th scope="col">Last active</th>
                  <th scope="col">Weakest topic</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>${students.map(renderTeacherStudentRow).join("")}</tbody>
            </table>
          </div>`
        : renderTeacherEmptyState("No students have joined this class yet. Share the join code from Classes.", "Open classes", "classes")
    }
  </section>`;
}

function renderTeacherHeatmapSection() {
  const activeClass = getActiveClassGroup();
  const students = getClassMemberships(activeClass?.id);
  const topics = REVISION_TOPICS;

  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Topic Heatmap</p>
        <h3>Scan class confidence across the OCR specification.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    ${
      students.length
        ? `<div class="topic-heatmap-wrap" role="region" aria-label="Class topic heatmap" tabindex="0">
            <table class="topic-heatmap">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  ${topics.map((topic) => `<th scope="col" title="${escapeHtml(topic.title)}">${escapeHtml(topic.code)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${students.map((student) => `<tr>
                  <th scope="row">${escapeHtml(student.studentName || "Student")}</th>
                  ${topics.map((topic) => renderTeacherHeatmapCell(student, topic, activeClass?.id)).join("")}
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="heatmap-legend"><span class="secure">Secure</span><span class="developing">Developing</span><span class="priority">Priority</span><span class="empty">No data</span></div>`
        : renderTeacherEmptyState("Add students to generate a class heatmap.", "Invite students", "classes")
    }
  </section>`;
}

function renderTeacherReportsSection() {
  const activeClass = getActiveClassGroup();
  return `<section class="teacher-section">
    <div class="teacher-section-head">
      <div>
        <p class="eyebrow">Reports</p>
        <h3>Export intervention and progress evidence for the selected class.</h3>
      </div>
      ${renderClassSelector()}
    </div>
    <div class="teacher-report-grid">
      <article class="teacher-panel-card">
        <span>Interventions</span>
        <strong>Topic weaknesses CSV</strong>
        <p>Export low-confidence topics, weak-card counts and suggested teacher actions.</p>
        <button type="button" data-export-interventions>Export interventions</button>
      </article>
      <article class="teacher-panel-card">
        <span>Assignments</span>
        <strong>Completion CSV</strong>
        <p>Export assignment titles, due dates, class names and current completion signals.</p>
        <button type="button" data-export-report="assignments" ${activeClass ? "" : "disabled"}>Export assignments</button>
      </article>
      <article class="teacher-panel-card">
        <span>Mastery</span>
        <strong>Topic mastery CSV</strong>
        <p>Export every OCR topic with class confidence and latest activity.</p>
        <button type="button" data-export-report="mastery" ${activeClass ? "" : "disabled"}>Export mastery</button>
      </article>
    </div>
  </section>`;
}

function renderTeacherContentSection() {
  const weakTopics = getClassTopicInsights().filter((item) => item.confidence.totalAttempts).slice(0, 3);
  const selected = weakTopics.length ? weakTopics : REVISION_TOPICS.slice(0, 3).map((topic) => ({ topic, confidence: { totalAttempts: 0, percent: 0 } }));
  return `<section class="teacher-section">
    <div class="teacher-section-head"><div><p class="eyebrow">Content</p><h3>Build a five-minute retrieval starter from class evidence.</h3><p>Review the selected topics before turning the draft into an assignment.</p></div>${renderClassSelector()}</div>
    <div class="teacher-content-builder">
      <article class="teacher-panel-card">
        <div class="section-title"><span>Suggested starter</span><span>${weakTopics.length ? "Based on class weakness" : "Course starter"}</span></div>
        <ol>${selected.map((item) => `<li><span>${escapeHtml(item.topic.code)}</span><strong>${escapeHtml(item.topic.title)}</strong><small>${item.confidence.totalAttempts ? `${item.confidence.percent}% current confidence` : "No class evidence yet"}</small></li>`).join("")}</ol>
        <p>The draft uses published Neat Notes retrieval content. Check suitability against what your class has been taught.</p>
      </article>
      <article class="teacher-panel-card teacher-content-actions">
        <span>Teacher review required</span>
        <strong>Prepare the highest-priority topic</strong>
        <p>This opens the assignment builder with the topic selected. Nothing is sent to students until you submit it.</p>
        <button type="button" data-create-assignment data-topic-id="${escapeHtml(selected[0].topic.id)}">Review assignment draft</button>
      </article>
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
      <span class="teacher-mode-note">Institution-ready structure</span>
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
          <option value="trust">Multi-academy trust</option>
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
  if (!classGroups.length) return "";

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
    <button type="button" data-create-assignment data-topic-id="${escapeHtml(insight.topic.id)}">${escapeHtml(insight.suggestedAction)}</button>
  </article>`;
}

function renderWatchlistItem(student) {
  return `<div class="watchlist-item">
    <strong>${escapeHtml(student.name)}</strong>
    <span>Last accessed: ${escapeHtml(student.lastAccessed)}</span>
    <span>Average confidence: ${escapeHtml(student.averageConfidence)}</span>
    <span>Weakest topic: ${escapeHtml(student.weakestTopic)}</span>
    <button type="button" data-create-assignment>${escapeHtml(student.suggestedAction)}</button>
  </div>`;
}

function renderRecentActivityList() {
  if (!activityEvents.length) {
    return `<p class="empty-copy">Activity is shown when students rate cards, complete decks, join classes, or create notes.</p>`;
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
      <button type="button" data-regenerate-code="${escapeHtml(group.id)}">Regenerate</button>
    </div>
    <p>Students can join this class using this code.</p>
    <div class="class-card-actions">
      <button type="button" data-teacher-section="students">View students</button>
      <button type="button" data-teacher-section="assignments">Set assignment</button>
      <button type="button" data-archive-class="${escapeHtml(group.id)}">${group.archivedAt ? "Archived" : "Archive"}</button>
    </div>
  </article>`;
}

function renderTeacherAssignmentCard(assignment) {
  const topic = getQuizTopicById(assignment.topicId);
  const group = getClassById(assignment.classId);
  const completion = getAssignmentCompletionSummary(assignment);
  return `<article class="teacher-assignment-card ${escapeHtml(assignment.status || "active")}">
    <div>
      <span>${escapeHtml(assignment.taskType || "assignment")}</span>
      <strong>${escapeHtml(assignment.title || `${topic?.code || ""} ${topic?.title || "Revision assignment"}`)}</strong>
      <p>${escapeHtml(assignment.instructions || "Complete the assigned revision task.")}</p>
    </div>
    <div class="assignment-meta-grid">
      <span>Class: ${escapeHtml(group?.name || "No class")}</span>
      <span>Topic: ${topic ? `${escapeHtml(topic.code)} ${escapeHtml(topic.title)}` : "Unknown"}</span>
      <span>Due: ${assignment.dueAt ? escapeHtml(formatDate(assignment.dueAt)) : "No due date"}</span>
      <span>${completion.completed}/${completion.total} showing progress</span>
    </div>
  </article>`;
}

function getAssignmentCompletionSummary(assignment) {
  if (Number.isFinite(Number(assignment.studentCount)) && Number.isFinite(Number(assignment.completedCount))) {
    return {
      total: Number(assignment.studentCount),
      completed: Number(assignment.completedCount),
    };
  }

  const students = getClassMemberships(assignment.classId);
  const completed = students.filter((student) => {
    const attempts = cardAttempts.filter((attempt) =>
      attempt.userId === student.userId &&
      attempt.classId === assignment.classId &&
      attempt.topicId === assignment.topicId
    );
    return attempts.length >= 3 || calculateTopicConfidence(attempts).percent >= 70;
  }).length;

  return {
    total: students.length,
    completed,
  };
}

function renderTeacherStudentRow(student) {
  const activeClass = getActiveClassGroup();
  const attempts = cardAttempts.filter((attempt) => attempt.userId === student.userId && attempt.classId === activeClass?.id);
  const confidence = calculateTopicConfidence(attempts);
  const weakest = getWeakestTopicForStudent(student, activeClass?.id);
  const lastAttempt = attempts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return `<tr>
    <td><strong>${escapeHtml(student.studentName || "Student")}</strong><span>${escapeHtml(student.studentEmail || "No email")}</span></td>
    <td>${confidence.totalAttempts ? `${confidence.percent}% · ${escapeHtml(confidence.band)}` : "No data"}</td>
    <td>${confidence.totalAttempts}</td>
    <td>${lastAttempt ? escapeHtml(formatDate(lastAttempt.createdAt)) : "Not active yet"}</td>
    <td>${weakest ? `${escapeHtml(weakest.topic.code)} ${escapeHtml(weakest.topic.title)}` : "None yet"}</td>
    <td><button type="button" data-remove-student="${escapeHtml(student.userId || student.id)}">Remove</button></td>
  </tr>`;
}

function getWeakestTopicForStudent(student, classId) {
  return REVISION_TOPICS.map((topic) => {
    const serverConfidence = serverStudentTopicConfidence.get(`${student.userId}:${topic.id}`);
    const attempts = cardAttempts.filter((attempt) =>
      attempt.userId === student.userId &&
      attempt.classId === classId &&
      attempt.topicId === topic.id
    );
    return {
      topic,
      confidence: serverConfidence || calculateTopicConfidence(attempts),
    };
  })
    .filter((entry) => entry.confidence.totalAttempts)
    .sort((a, b) => a.confidence.percent - b.confidence.percent)[0] || null;
}

function renderTeacherHeatmapCell(student, topic, classId) {
  const attempts = cardAttempts.filter((attempt) =>
    attempt.userId === student.userId &&
    attempt.classId === classId &&
    attempt.topicId === topic.id
  );
  const confidence = serverStudentTopicConfidence.get(`${student.userId}:${topic.id}`) || calculateTopicConfidence(attempts);
  const heatClass = !confidence.totalAttempts
    ? "empty"
    : confidence.percent >= 75
      ? "secure"
      : confidence.percent >= 45
        ? "developing"
        : "priority";

  return `<td class="${heatClass}" title="${escapeHtml(student.studentName || "Student")} · ${escapeHtml(topic.code)} ${escapeHtml(topic.title)} · ${confidence.totalAttempts ? `${confidence.percent}% confidence` : "No data"}">
    ${confidence.totalAttempts ? `${confidence.percent}%` : "—"}
  </td>`;
}

function prepareTeacherAssignment(topicId = "") {
  const topic = getQuizTopicById(topicId) || getRecommendedRevisionTopic() || getActiveRevisionTopic();
  activeRevisionTopicId = topic.id;
  activeTeacherSection = classGroups.length ? "assignments" : "classes";
  renderTeacherMode();
  window.setTimeout(() => {
    elements.teacherModePanel.querySelector(".teacher-section")?.insertAdjacentHTML(
      "afterbegin",
      `<div class="teacher-assignment-draft" role="status">
        <strong>Review assignment prepared</strong>
        <p>${escapeHtml(topic.code)} ${escapeHtml(topic.title)} is selected. ${classGroups.length ? "Complete the assignment form to set the task for your class." : "Create a class first, then set this as a revision task."}</p>
      </div>`
    );
  }, 0);
  trackEvent("teacher_assignment_prepared", { topicId: topic.id });
}

function exportInterventionCsv() {
  const insights = getClassTopicInsights();
  const rows = [
    ["Topic code", "Topic title", "Confidence", "Band", "Weak cards", "Last revised", "Suggested action"],
    ...insights.map((insight) => [
      insight.topic.code,
      insight.topic.title,
      insight.confidence.totalAttempts ? `${insight.confidence.percent}%` : "No data",
      insight.confidence.band,
      String(insight.weakCards.length),
      insight.lastRevised,
      insight.suggestedAction,
    ]),
  ];
  const activeClass = getActiveClassGroup();
  downloadCsv(rows, `${slugify(activeClass?.name || "neat-notes-interventions")}-interventions.csv`);
  trackEvent("teacher_interventions_exported", { classId: activeClass?.id || "none" });
}

function exportAssignmentsCsv() {
  const activeClass = getActiveClassGroup();
  const assignments = teacherAssignments.filter((assignment) => !activeClass?.id || assignment.classId === activeClass.id);
  const rows = [
    ["Class", "Topic code", "Topic title", "Task type", "Due", "Status", "Students showing progress", "Students total", "Instructions"],
    ...assignments.map((assignment) => {
      const topic = getQuizTopicById(assignment.topicId);
      const group = getClassById(assignment.classId);
      const completion = getAssignmentCompletionSummary(assignment);
      return [
        group?.name || "",
        topic?.code || "",
        topic?.title || "",
        assignment.taskType || "",
        assignment.dueAt ? formatDate(assignment.dueAt) : "",
        assignment.status || "active",
        String(completion.completed),
        String(completion.total),
        assignment.instructions || "",
      ];
    }),
  ];
  downloadCsv(rows, `${slugify(activeClass?.name || "neat-notes-assignments")}-assignments.csv`);
  trackEvent("teacher_assignments_exported", { classId: activeClass?.id || "none" });
}

function exportMasteryCsv() {
  const activeClass = getActiveClassGroup();
  const rows = [
    ["Topic code", "Topic title", "Class confidence", "Band", "Attempts", "Weak cards", "Last activity", "Suggested action"],
    ...getClassTopicInsights().map((insight) => [
      insight.topic.code,
      insight.topic.title,
      insight.confidence.totalAttempts ? `${insight.confidence.percent}%` : "No data",
      insight.confidence.band,
      String(insight.confidence.totalAttempts),
      String(insight.weakCards.length),
      insight.lastRevised,
      insight.suggestedAction,
    ]),
  ];
  downloadCsv(rows, `${slugify(activeClass?.name || "neat-notes-mastery")}-topic-mastery.csv`);
  trackEvent("teacher_mastery_exported", { classId: activeClass?.id || "none" });
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function handleTeacherModeClick(event) {
  const teacherPlanButton = event.target.closest("[data-open-teacher-plan]");
  if (teacherPlanButton) {
    openPlansModal();
    return;
  }

  const teacherAuthButton = event.target.closest("[data-teacher-auth]");
  if (teacherAuthButton) {
    openAuthModal(teacherAuthButton.dataset.teacherAuth);
    return;
  }

  const appSectionButton = event.target.closest("[data-app-section]");
  if (appSectionButton) {
    setAppSection(appSectionButton.dataset.appSection);
    return;
  }

  if (!canUseTeacherMode()) return;

  if (event.target.closest("[data-export-interventions]")) {
    exportInterventionCsv();
    return;
  }

  const reportButton = event.target.closest("[data-export-report]");
  if (reportButton) {
    if (reportButton.dataset.exportReport === "assignments") {
      exportAssignmentsCsv();
    } else if (reportButton.dataset.exportReport === "mastery") {
      exportMasteryCsv();
    }
    return;
  }

  const assignmentButton = event.target.closest("[data-create-assignment]");
  if (assignmentButton) {
    prepareTeacherAssignment(assignmentButton.dataset.topicId);
    return;
  }

  const sectionButton = event.target.closest("[data-teacher-section]");
  if (sectionButton) {
    activeTeacherSection = sectionButton.dataset.teacherSection;
    renderTeacherMode();
    return;
  }

  const regenerateButton = event.target.closest("[data-regenerate-code]");
  if (regenerateButton) {
    await regenerateClassCode(regenerateButton.dataset.regenerateCode);
    return;
  }

  const archiveButton = event.target.closest("[data-archive-class]");
  if (archiveButton) {
    await archiveClassGroup(archiveButton.dataset.archiveClass);
    return;
  }

  const removeStudentButton = event.target.closest("[data-remove-student]");
  if (removeStudentButton) {
    await removeClassStudent(removeStudentButton.dataset.removeStudent);
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

async function handleTeacherModeSubmit(event) {
  const classForm = event.target.closest("[data-create-class]");
  const assignmentForm = event.target.closest("[data-create-assignment-form]");
  const centreForm = event.target.closest("[data-create-centre]");
  const joinCentreForm = event.target.closest("[data-join-centre]");
  if (!classForm && !assignmentForm && !centreForm && !joinCentreForm) return;
  if (!canUseTeacherMode()) {
    event.preventDefault();
    openPlansModal();
    return;
  }

  event.preventDefault();
  teacherActionMessage = { text: "", type: "" };

  const form = classForm || assignmentForm || centreForm || joinCentreForm;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
  }

  try {
    if (classForm) {
      await createClassGroup(new FormData(classForm));
    } else if (assignmentForm) {
      await createTeacherAssignment(new FormData(assignmentForm));
    } else if (centreForm) {
      await createCentre(new FormData(centreForm));
    } else {
      await joinCentre(new FormData(joinCentreForm));
    }
  } catch (error) {
    teacherActionMessage = { text: error.message, type: "error" };
    renderTeacherMode();
  } finally {
    if (submitButton?.isConnected) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function handleTeacherModeChange(event) {
  const selector = event.target.closest("[data-class-selector]");
  if (!selector) return;

  activeClassId = selector.value;
  teacherActionMessage = { text: "", type: "" };
  if (!isGuestMode && currentUser?.isTeacher && activeClassId) {
    try {
      await loadTeacherClassEvidence(activeClassId);
    } catch (error) {
      teacherActionMessage = { text: error.message, type: "error" };
    }
  }
  renderTeacherMode();
}

async function createClassGroup(form) {
  if (!isGuestMode && currentUser) {
    const response = await api("/api/classes", {
      method: "POST",
      body: {
        centreId: activeCentreId || null,
        name: String(form.get("name") || "").trim(),
        subject: String(form.get("subject") || "Computer Science").trim(),
        examBoard: String(form.get("examBoard") || "OCR A-Level").trim(),
        yearGroup: String(form.get("yearGroup") || "").trim(),
        description: String(form.get("description") || "").trim(),
      },
    });
    activeClassId = response.class.id;
    await loadAccountLearningWorkspace();
    teacherActionMessage = { text: `${response.class.name} created. Share its join code when you are ready.`, type: "success" };
    renderTeacherMode();
    return;
  }

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

async function createTeacherAssignment(form) {
  const classId = String(form.get("classId") || activeClassId || "").trim();
  const topicId = String(form.get("topicId") || activeRevisionTopicId || "").trim();
  const topic = getQuizTopicById(topicId);
  if (!classId || !topic) return;

  if (!isGuestMode && currentUser) {
    const response = await api(`/api/classes/${encodeURIComponent(classId)}/assignments`, {
      method: "POST",
      body: {
        topicId,
        taskType: String(form.get("taskType") || "topic_revision"),
        instructions: String(form.get("instructions") || "").trim(),
        startAt: String(form.get("startAt") || "").trim() || null,
        dueAt: String(form.get("dueAt") || "").trim() || null,
        estimatedMinutes: Number(form.get("estimatedMinutes") || 15),
      },
    });
    activeClassId = classId;
    activeRevisionTopicId = topicId;
    await loadAccountLearningWorkspace();
    teacherActionMessage = { text: `${response.assignment.title} assigned successfully.`, type: "success" };
    trackEvent("teacher_assignment_created", { classId, topicId, taskType: response.assignment.taskType });
    renderTeacherMode();
    return;
  }

  const dueValue = String(form.get("dueAt") || "").trim();
  const assignment = {
    id: createLocalId("assignment"),
    classId,
    topicId,
    title: `${topic.code} ${topic.title}`,
    taskType: String(form.get("taskType") || "flashcards_quiz"),
    instructions: String(form.get("instructions") || "").trim() || "Complete the flashcards, then use Quick Practice to check your understanding.",
    dueAt: dueValue ? new Date(`${dueValue}T16:00:00`).toISOString() : "",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  teacherAssignments = [assignment, ...teacherAssignments].slice(0, 300);
  saveLocalArray(TEACHER_ASSIGNMENTS_KEY, teacherAssignments);
  activeClassId = classId;
  activeRevisionTopicId = topicId;
  recordActivityEvent({ type: "assignment_created", classId, topicId });
  trackEvent("teacher_assignment_created", { classId, topicId, taskType: assignment.taskType });
  renderTeacherMode();
}

async function regenerateClassCode(classId) {
  if (!isGuestMode && currentUser) {
    try {
      const response = await api(`/api/classes/${encodeURIComponent(classId)}/join-code/regenerate`, { method: "POST" });
      await loadAccountLearningWorkspace();
      teacherActionMessage = { text: `New join code created: ${response.joinCode}`, type: "success" };
      renderTeacherMode();
    } catch (error) {
      teacherActionMessage = { text: error.message, type: "error" };
      renderTeacherMode();
    }
    return;
  }

  classGroups = classGroups.map((group) =>
    group.id === classId
      ? { ...group, inviteCode: createInviteCode("NN"), updatedAt: new Date().toISOString() }
      : group
  );
  saveLocalArray(CLASS_GROUPS_KEY, classGroups);
  renderTeacherMode();
}

async function archiveClassGroup(classId) {
  const group = getClassById(classId);
  if (!group || group.archivedAt) return;
  const confirmed = window.confirm(`Archive ${group.name}? Students are not deleted, but the class is marked as inactive.`);
  if (!confirmed) return;

  if (!isGuestMode && currentUser) {
    try {
      const response = await api(`/api/classes/${encodeURIComponent(classId)}/archive`, { method: "PATCH" });
      await loadAccountLearningWorkspace();
      teacherActionMessage = { text: response.message, type: "success" };
      renderTeacherMode();
    } catch (error) {
      teacherActionMessage = { text: error.message, type: "error" };
      renderTeacherMode();
    }
    return;
  }

  classGroups = classGroups.map((item) =>
    item.id === classId ? { ...item, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item
  );
  saveLocalArray(CLASS_GROUPS_KEY, classGroups);
  renderTeacherMode();
}

async function removeClassStudent(studentId) {
  const membership = classMemberships.find((item) => item.userId === studentId || item.id === studentId);
  if (!membership) return;
  const confirmed = window.confirm(`Remove ${membership.studentName || "this student"} from the class?`);
  if (!confirmed) return;

  if (!isGuestMode && currentUser) {
    try {
      const response = await api(`/api/classes/${encodeURIComponent(membership.classId)}/members/${encodeURIComponent(membership.userId)}`, { method: "DELETE" });
      await loadTeacherClassEvidence(membership.classId);
      teacherActionMessage = { text: response.message, type: "success" };
      renderTeacherMode();
    } catch (error) {
      teacherActionMessage = { text: error.message, type: "error" };
      renderTeacherMode();
    }
    return;
  }

  classMemberships = classMemberships.map((item) =>
    item.id === membership.id ? { ...item, status: "removed", removedAt: new Date().toISOString() } : item
  );
  saveClassMemberships();
  renderTeacherMode();
}

async function createCentre(form) {
  if (!isGuestMode && currentUser) {
    const response = await api("/api/centres", {
      method: "POST",
      body: { name: String(form.get("name") || "").trim(), type: String(form.get("type") || "school") },
    });
    activeCentreId = response.centre.id;
    await loadAccountLearningWorkspace();
    teacherActionMessage = { text: `${response.centre.name} created.`, type: "success" };
    renderTeacherMode();
    return;
  }

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

async function joinCentre(form) {
  const code = String(form.get("code") || "").trim().toUpperCase();
  if (!code) return;

  if (!isGuestMode && currentUser) {
    const response = await api("/api/centres/join", { method: "POST", body: { code } });
    activeCentreId = response.centre.id;
    await loadAccountLearningWorkspace();
    teacherActionMessage = { text: `Joined ${response.centre.name}.`, type: "success" };
    renderTeacherMode();
    return;
  }

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
  let topic = getActiveRevisionTopic();
  renderLearningMode();
  renderPracticeMode();

  if (activeLearningMode === "teacher") {
    renderTeacherMode();
    return;
  }

  const selectedFreeDeck = getSelectedFreeRevisionTopicId();
  if (!canAccessRevisionTopic(topic.id) && selectedFreeDeck) {
    activeRevisionTopicId = selectedFreeDeck;
    topic = getActiveRevisionTopic();
  }

  const access = getRevisionTopicAccessState(topic.id);

  renderAchievementSummary();
  renderDailyStudyPanel();
  renderRevisionDashboard(topic);
  renderStudentDashboard(topic);
  renderMistakeJournal();
  renderStudentClassPanel();
  elements.revisionTopicCode.textContent = topic.code;
  elements.revisionTopicTitle.textContent = topic.title;
  elements.revisionTopicSummary.textContent = topic.summary;
  renderRevisionMasteryMap();
  renderNeatQuestions();
  renderRevisionTopicList();

  if (!access.canAccess) {
    elements.revisionProgressPercent.textContent = "0%";
    elements.revisionProgressLabel.textContent = access.canClaim ? "Choose free deck" : "Pro required";
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
      : `${completedCount}/${deckTotal} done${sessionCardIds ? " · weak review" : ""}`;
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

  elements.revisionCardGrid.innerHTML = remainingOrder
    .map((cardIndex) => {
      const card = topicCards[cardIndex];
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
                <button class="confidence-button needs-practice" type="button" data-card-confidence="again" data-card-id="${escapeHtml(cardKey)}" tabindex="${isFlipped ? "0" : "-1"}">Again</button>
                <button class="confidence-button good" type="button" data-card-confidence="good" data-card-id="${escapeHtml(cardKey)}" tabindex="${isFlipped ? "0" : "-1"}">Good</button>
                <button class="confidence-button easy" type="button" data-card-confidence="easy" data-card-id="${escapeHtml(cardKey)}" tabindex="${isFlipped ? "0" : "-1"}">Easy</button>
              </span>
            </span>
          </span>
        </span>
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
  elements.revisionTopicList.innerHTML = REVISION_TOPICS.map((revisionTopic, index) => {
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
  const title = access.canClaim ? "Choose your free revision deck" : "This deck is part of Pro";
  const copy = access.canClaim
    ? "Free accounts can unlock one complete OCR topic deck with flashcards, instant marking and streak tracking. Pick carefully: Pro unlocks every deck."
    : "Your free OCR deck is already selected. Upgrade to Pro for the full Computer Science library, Quick Practice across every topic and complete progress tracking.";
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

  elements.revisionTodayStat.textContent = `${today.cards}/${DAILY_REVIEW_GOAL}`;
  elements.revisionTodayCopy.textContent =
    today.cards >= DAILY_REVIEW_GOAL ? "Today’s retrieval complete" : `${Math.max(0, DAILY_REVIEW_GOAL - today.cards)} activities to today’s goal`;
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
  const activeAssignments = teacherAssignments
    .filter((assignment) => assignment.status === "active" && assignment.userStatus !== "complete")
    .slice(0, 2);
  const sessionPreview = session.items.slice(0, 4);
  const examCountdown = getNearestExamCountdown();

  elements.studentDashboardPanel.innerHTML = `
    <section class="today-session" aria-labelledby="today-session-title">
      <div class="today-session-copy">
        <p class="eyebrow">Recommended session</p>
        <h3 id="today-session-title">15 minutes. ${session.items.length} focused retrieval activities.</h3>
        <p>${recommended ? escapeHtml(recommended.reason) : "Choose your free OCR deck to create a revision plan."}</p>
        <div class="today-session-actions">
          <button type="button" data-session-duration="15">Start revision</button>
          <details class="session-duration-menu">
            <summary>Change length</summary>
            <div>
              <button type="button" data-session-duration="5">Quick · 5 min</button>
              <button type="button" data-session-duration="25">Focused · 25 min</button>
            </div>
          </details>
        </div>
      </div>
      <ol class="today-session-list" aria-label="Session preview">
        ${sessionPreview.length ? sessionPreview.map((item) => `<li>
          <span>${escapeHtml(item.code)} · ${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.prompt)}</strong>
          <small>${escapeHtml(item.reason)}</small>
        </li>`).join("") : `<li><strong>Choose a topic to begin</strong><small>Your first completed activity creates the learning baseline.</small></li>`}
      </ol>
    </section>
    <div class="student-home-sections">
      <section>
        <div class="section-title"><span>Due for review</span><span>${dueItems.length}</span></div>
        ${dueItems.length ? `<p><strong>${escapeHtml(dueItems[0].code)} ${escapeHtml(dueItems[0].topicTitle)}</strong><br>${dueItems.length} concept${dueItems.length === 1 ? " is" : "s are"} ready for retrieval.</p>` : `<p>Nothing is overdue. New activity will be scheduled as you revise.</p>`}
        <button type="button" data-session-duration="5">Review due knowledge</button>
      </section>
      <section>
        <div class="section-title"><span>Continue</span><span>${streak} day streak</span></div>
        <p><strong>${recentQuiz ? `${escapeHtml(recentQuiz.topic.code)} Quick Practice` : recentNote ? escapeHtml(recentNote.title || createTitle(recentNote.body)) : "Start your first activity"}</strong><br>${today.cards} retrieval activities completed today.</p>
        <button type="button" data-student-action="${recentQuiz ? "quick" : recentNote ? "note" : "cards"}">${recentQuiz ? "Continue practice" : recentNote ? "Open note" : "Choose a topic"}</button>
      </section>
      <section>
        <div class="section-title"><span>Assignments</span><span>${activeAssignments.length}</span></div>
        ${activeAssignments.length ? `<p><strong>${escapeHtml(activeAssignments[0].title)}</strong><br>${escapeHtml(activeAssignments[0].instructions || "Teacher-set revision")}</p>
          <div class="assignment-home-actions">
            <button type="button" data-assignment-start="${escapeHtml(activeAssignments[0].id)}">${activeAssignments[0].userStatus === "started" ? "Continue assignment" : "Start assignment"}</button>
            ${activeAssignments[0].userStatus === "started" ? `<button class="secondary" type="button" data-assignment-complete="${escapeHtml(activeAssignments[0].id)}">Mark complete</button>` : ""}
          </div>` : `<p>No teacher assignments are waiting. Independent revision stays separate.</p>`}
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
    </div>`;
}

function getNearestExamCountdown() {
  const examDates = parseClientJson(accountProfile?.studentProfile?.exam_dates, {});
  const options = [
    { key: "component1", label: "Component 01" },
    { key: "component2", label: "Component 02" },
  ].map((item) => ({ ...item, date: examDates[item.key] ? new Date(`${examDates[item.key]}T12:00:00`) : null }))
    .filter((item) => item.date && !Number.isNaN(item.date.getTime()) && item.date.getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.date - b.date);
  if (!options.length) return null;
  const nearest = options[0];
  const days = Math.max(0, Math.ceil((nearest.date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return {
    ...nearest,
    days,
    message: days <= 21
      ? "Exam practice now carries more weight in your recommended sessions."
      : "Your plan will gradually increase mixed and applied practice as the exam approaches.",
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
  const assignmentStart = event.target.closest("[data-assignment-start]");
  if (assignmentStart) {
    await openStudentAssignment(assignmentStart.dataset.assignmentStart);
    return;
  }

  const assignmentComplete = event.target.closest("[data-assignment-complete]");
  if (assignmentComplete) {
    await updateStudentAssignmentStatus(assignmentComplete.dataset.assignmentComplete, "complete");
    return;
  }

  const sessionButton = event.target.closest("[data-session-duration]");
  if (sessionButton) {
    startAdaptiveRevisionSession(Number(sessionButton.dataset.sessionDuration) || 15);
    return;
  }

  const button = event.target.closest("[data-student-action]");
  if (!button) return;

  const action = button.dataset.studentAction;
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

  if (action === "teacher") {
    setAppSection("teacher");
    return;
  }

  if (action === "exam-settings") {
    openSettingsModal("revision");
  }
}

async function updateStudentAssignmentStatus(assignmentId, status) {
  if (isGuestMode || !currentUser) return;
  try {
    await api(`/api/assignments/${encodeURIComponent(assignmentId)}/status`, {
      method: "PATCH",
      body: { status },
    });
    await loadAccountLearningWorkspace();
    renderRevisionPage();
  } catch (error) {
    studentClassJoinMessage = { text: error.message, type: "error" };
    renderStudentClassPanel();
  }
}

async function openStudentAssignment(assignmentId) {
  const assignment = teacherAssignments.find((item) => item.id === assignmentId);
  if (!assignment) return;
  await updateStudentAssignmentStatus(assignmentId, "started");
  if (assignment.topicId && getQuizTopicById(assignment.topicId)) {
    activeRevisionTopicId = assignment.topicId;
  }

  if (["quick_quiz", "exam_questions", "mini_mock", "interactive_lab"].includes(assignment.taskType)) {
    setAppSection("practice");
    if (assignment.taskType === "quick_quiz") {
      activePracticeMode = "quick";
      await startNeatQuiz(activeRevisionTopicId);
    } else if (assignment.taskType === "mini_mock") {
      activePracticeMode = "mock";
      await loadMiniMock();
    } else if (assignment.taskType === "interactive_lab") {
      activePracticeMode = "labs";
      await loadCsLabs(true);
    } else {
      activePracticeMode = "exam";
      await loadExamPracticeQuestion();
    }
    renderPracticeMode();
    elements.quickPracticeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  setAppSection("revise");
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
  document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  elements.neatQuestionsCount.textContent = `${catalog.length} topic packs · ${totalQuestions} questions`;
  elements.neatQuestionsCurrentLink.textContent = "Start quick practice";
  elements.neatQuestionsCurrentLink.hidden = !activeTopic;

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
    const sourceLabel = "Instant feedback";
    const activeLabel = isActive ? `<span class="question-current">Current topic</span>` : "";
    const runningLabel = isRunning ? `<span class="question-variant">In progress</span>` : "";
    const lockLabel = locked
      ? `<span class="question-variant pro">Pro library</span>`
      : access.canClaim
        ? `<span class="question-variant free">Free pick</span>`
        : access.selectedFreeDeck
          ? `<span class="question-variant free">Your free deck</span>`
          : !hasFeature("quickPractice")
            ? `<span class="question-variant pro">Pro quiz</span>`
            : "";
    const openLabel = access.canClaim ? "Choose deck" : locked ? "Preview plan" : "Flashcards";
    const actionLabel = access.canClaim ? "Choose + practise" : quizLocked ? "Unlock Pro" : isRunning ? "Continue" : quizProgress.attempts ? "Retry quiz" : "Start quiz";
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
        <span>${topicCardCount} questions · ${escapeHtml(sourceLabel)}</span>
      </div>
      ${lockedNote}
      <div class="topic-card-meter" aria-label="${topicPercent}% flashcard progress">
        <span style="width: ${topicPercent}%"></span>
      </div>
      <div class="topic-card-meta">
        <span>${topicPercent}% deck progress</span>
        <span>${escapeHtml(progressLabel)}</span>
      </div>
      <div class="topic-card-actions">
        <button type="button" data-topic-id="${escapeHtml(quiz.topic.id)}">${openLabel}</button>
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
      questionCount: getRevisionTopicCardCount(topic),
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
    const activeQuestionCount = getRevisionTopicCardCount(activeTopic);
    const access = getRevisionTopicAccessState(activeTopic?.id);
    const actionLabel = access.canClaim ? "Choose free deck" : access.locked ? "Unlock Pro" : "Start quick practice";
    const description = access.canAccess
      ? "Answer one question at a time with instant marking, corrections and streak tracking."
      : access.canClaim
        ? "Choose this as your one free deck to unlock flashcards and Quick Practice."
        : "Upgrade to Pro to practise this deck and the full OCR Computer Science library.";
    elements.neatQuizPanel.innerHTML = `<div class="neat-quiz-empty">
      <div>
        <p class="eyebrow">Quick Practice</p>
        <h4>Practise ${escapeHtml(activeTopic?.code || "this topic")} one question at a time.</h4>
        <p>${escapeHtml(description)}</p>
      </div>
      <button type="button" data-start-current-quiz>${escapeHtml(actionLabel)}</button>
      <span class="quick-practice-note">${activeQuestionCount} questions in this topic pack${access.locked ? " · Pro" : ""}</span>
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
    renderRevisionPage();
    document.querySelector(".revision-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const button = event.target.closest("[data-start-quiz]");
  if (!button) return;

  await startNeatQuiz(button.dataset.startQuiz);
}

async function handleNeatQuizPanelClick(event) {
  if (event.target.closest("[data-start-current-quiz]")) {
    await startActiveTopicQuiz();
    return;
  }

  if (event.target.closest("[data-quiz-restart]")) {
    await startNeatQuiz(neatQuizState.quizId || getActiveRevisionTopic()?.id);
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

async function loadExamPracticeQuestion() {
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Save written-answer progress to your account</strong><p>Create a free account to submit an original exam question from your chosen OCR deck.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  elements.examLoadQuestionButton.disabled = true;
  elements.examLoadQuestionButton.textContent = "Loading...";
  elements.examPracticePanel.setAttribute("aria-busy", "true");
  try {
    const response = await api(`/api/exam/questions?topicId=${encodeURIComponent(activeRevisionTopicId)}`);
    const question = response.questions[0];
    if (!question) {
      const topic = getQuizTopicById(activeRevisionTopicId) || getActiveRevisionTopic();
      elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-locked-state"><span class="pro-badge">Pro</span><strong>${escapeHtml(topic ? `${topic.code} ${topic.title}` : "This topic")} is outside your free deck</strong><p>Choose an accessible topic or unlock the complete original exam-practice bank with Pro.</p><button type="button" data-exam-upgrade>View Pro</button></div>`;
      examPracticeState = null;
      return;
    }
    examPracticeState = { question, startedAt: performance.now(), answer: "", originalAttemptId: null, result: null };
    renderExamPracticeQuestion();
    trackEvent("exam_question_started", { questionId: question.id, topicId: question.topicId });
  } catch (error) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state error-state"><strong>Exam Practice could not load</strong><p>${escapeHtml(error.message)}</p><button type="button" data-exam-retry>Try again</button></div>`;
  } finally {
    elements.examPracticePanel.removeAttribute("aria-busy");
    elements.examLoadQuestionButton.disabled = false;
    elements.examLoadQuestionButton.textContent = "Another question";
  }
}

function renderExamPracticeQuestion() {
  const state = examPracticeState;
  if (!state?.question) return;
  const question = state.question;
  if (state.result) {
    const { result, notice } = state.result;
    elements.examPracticePanel.innerHTML = `<article class="exam-feedback-card"><div class="exam-feedback-score"><span>Suggested mark</span><strong>${result.proposedMark}<small> / ${result.maximumMark}</small></strong><em>${escapeHtml(result.confidence === "low" ? "Teacher review recommended" : "Rubric match")}</em></div><div class="exam-feedback-body"><p class="eyebrow">${escapeHtml(question.topicCode)} · ${escapeHtml(question.commandWord)}</p><h4>${escapeHtml(result.feedback)}</h4>${result.awarded.length ? `<section><strong>Credit matched</strong><ul>${result.awarded.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}${result.missing.length ? `<section class="exam-missing-points"><strong>Build these points in</strong><ul>${result.missing.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}<section class="exam-reasoning"><strong>Reasoning guide</strong><p>${escapeHtml(result.modelReasoning)}</p></section><p class="exam-result-notice">${escapeHtml(notice)}</p><div class="exam-feedback-actions">${result.proposedMark < result.maximumMark ? `<button class="primary-button" type="button" data-exam-improve>Improve my answer</button>` : ""}<button type="button" data-exam-next>Try another</button></div></div></article>`;
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
  if (event.target.closest("[data-mock-retry], [data-mock-new]")) return loadMiniMock();
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
  if (event.target.closest("[data-exam-retry], [data-exam-next]")) return loadExamPracticeQuestion();
  if (event.target.closest("[data-exam-improve]") && examPracticeState) {
    examPracticeState.result = null;
    examPracticeState.startedAt = performance.now();
    renderExamPracticeQuestion();
    document.querySelector("#exam-answer")?.focus();
    trackEvent("exam_answer_improvement_started", { questionId: examPracticeState.question.id });
  }
}

async function loadMiniMock() {
  clearInterval(miniMockTimer);
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Mini mocks save formal learning evidence</strong><p>Log in to build a timed paper from your available OCR question bank.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  elements.examPracticePanel.innerHTML = `<div class="exam-empty-state"><strong>Building your paper...</strong><p>Selecting a balanced set of original Neat Notes questions.</p></div>`;
  try {
    const response = await api("/api/exam/questions");
    if (response.questions.length < 3) {
      elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-locked-state"><span class="pro-badge">Pro</span><strong>Mixed-topic mini mocks use the full question bank</strong><p>Your free deck still includes the complete single-question feedback and improvement loop. Pro unlocks enough topics to build a balanced paper.</p><button type="button" data-exam-upgrade>View Pro</button></div>`;
      miniMockState = null;
      return;
    }
    const questions = shuffleArray([...response.questions]).slice(0, 5);
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
  if (state.submitted) return renderMiniMockResults();
  const question = state.questions[state.currentIndex];
  const answer = state.answers[question.id] || "";
  const confidence = state.confidence[question.id] || "";
  elements.examPracticePanel.innerHTML = `<article class="mini-mock-shell">
    <header class="mini-mock-head"><div><p class="eyebrow">Original mixed-topic paper</p><h3>Component 01 mini mock</h3></div><div class="mini-mock-clock" aria-label="Time remaining"><span>Time remaining</span><strong id="mini-mock-time">${formatMockTime(getMiniMockSecondsRemaining())}</strong></div></header>
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
}

function updateMiniMockTimer() {
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
  if (!miniMockState || miniMockState.submitted) return;
  const unanswered = miniMockState.questions.filter((item) => !miniMockState.answers[item.id]?.trim()).length;
  if (!automatic && !window.confirm(`Submit this paper? ${unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.` : "Every question has an answer."}`)) return;
  clearInterval(miniMockTimer);
  const status = elements.examPracticePanel.querySelector("[data-mock-status]");
  if (status) status.textContent = "Submitting answers and building your feedback...";
  const results = [];
  for (const question of miniMockState.questions) {
    const answer = miniMockState.answers[question.id]?.trim();
    if (!answer) {
      results.push({ question, skipped: true, result: { proposedMark: 0, maximumMark: question.marks, missing: [], awarded: [] } });
      continue;
    }
    try {
      const response = await api("/api/exam/attempts", { method: "POST", body: { questionId: question.id, answer, confidence: miniMockState.confidence[question.id], responseTimeMs: null } });
      results.push({ question, ...response });
    } catch (error) {
      results.push({ question, error: error.message, result: { proposedMark: 0, maximumMark: question.marks, missing: [], awarded: [] } });
    }
  }
  miniMockState.results = results;
  miniMockState.submitted = true;
  renderMiniMockResults();
  trackEvent("mini_mock_completed", { answered: miniMockState.questions.length - unanswered, total: miniMockState.questions.length });
}

function renderMiniMockResults() {
  const results = miniMockState.results;
  const scored = results.reduce((sum, item) => sum + item.result.proposedMark, 0);
  const available = results.reduce((sum, item) => sum + item.result.maximumMark, 0);
  const percent = available ? Math.round((scored / available) * 100) : 0;
  const weakest = [...results].sort((a, b) => (a.result.proposedMark / a.result.maximumMark) - (b.result.proposedMark / b.result.maximumMark))[0];
  elements.examPracticePanel.innerHTML = `<article class="mini-mock-results"><header><div><p class="eyebrow">Mini mock complete</p><h3>${scored} / ${available} suggested marks</h3><p>${percent}% against the Neat Notes rubrics. This is not a predicted grade.</p></div><strong>${percent}%</strong></header><div class="mini-mock-breakdown">${results.map((item, index) => `<article><span>Q${index + 1} · ${escapeHtml(item.question.topicCode)}</span><strong>${item.result.proposedMark} / ${item.result.maximumMark}</strong><p>${item.skipped ? "Unanswered" : item.error ? "Submission error" : item.result.proposedMark === item.result.maximumMark ? "Rubric complete" : "Review missing points"}</p></article>`).join("")}</div><section class="mini-mock-next-step"><div><span>Recommended next</span><strong>Review ${escapeHtml(weakest.question.topicCode)} ${escapeHtml(weakest.question.topicTitle)}</strong><p>Your lowest rubric coverage came from this question. It has been added to the evidence and mistake-repair loop where applicable.</p></div><button class="primary-button" type="button" data-mock-review-topic data-topic-id="${escapeHtml(weakest.question.topicId)}">Revise this topic</button></section><div class="exam-feedback-actions"><button type="button" data-mock-new>Build another mini mock</button></div></article>`;
}

async function loadCsLabs(showPicker = false) {
  clearInterval(miniMockTimer);
  if (isGuestMode || !currentUser) {
    elements.examPracticePanel.innerHTML = `<div class="exam-empty-state exam-auth-state"><strong>Interactive practice builds mastery evidence</strong><p>Create an account to use a Computer Science lab from your chosen free deck.</p><button type="button" data-exam-auth>Create account</button></div>`;
    return;
  }
  try {
    const response = await api("/api/labs");
    if (!response.labs.length) {
      elements.examPracticePanel.innerHTML = `<div class="exam-empty-state"><strong>No lab is published for your chosen free topic yet</strong><p>Quick Practice and Exam Practice remain available. Pro unlocks ${response.lockedCount} interactive labs across CPU tracing, Boolean logic, algorithms, data structures, SQL, normalisation, pseudocode and networks.</p><button type="button" data-exam-upgrade>View Pro</button></div>`;
      csLabState = null;
      return;
    }
    csLabState = { labs: response.labs, current: csLabState?.current || response.labs[0], result: null, startedAt: performance.now() };
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

async function startNeatQuiz(topicId) {
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
  const questions = buildNativeQuizQuestions(topic);
  neatQuizState = {
    ...createEmptyNeatQuizState(),
    quizId: topic.id,
    questions,
    bestStreak: neatQuizProgress[topic.id]?.bestStreak || 0,
  };
  trackEvent("quick_practice_started", { topicId: topic.id, questionCount: questions.length });
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
  recordCardAttempt(`${neatQuizState.quizId}:${question.id}`, neatQuizState.quizId, wasCorrect ? "confident" : "needs_practice", {
    quizCorrect: wasCorrect,
    source: "quick_practice",
  });
  persistNeatQuizBestStreak(neatQuizState.quizId, neatQuizState.bestStreak);
  trackEvent("quick_practice_answered", { topicId: neatQuizState.quizId, correct: wasCorrect });
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
  const allCards = REVISION_TOPICS.flatMap((revisionTopic) =>
    getTopicCards(revisionTopic).map((card) => ({
      ...card,
      topicId: revisionTopic.id,
      topicCode: revisionTopic.code,
      topicTitle: revisionTopic.title,
    }))
  );

  return getTopicCards(topic).map((card) => {
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
  neatQuizState = createEmptyNeatQuizState();
  clearRevisionAutoReset();
  startRevisionSession(activeRevisionTopicId);
  renderRevisionPage();
}

async function flipRevisionCard(event) {
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

  const card = event.target.closest("[data-card-id]");
  if (!card) return;

  const cardId = card.dataset.cardId;
  if (flippedRevisionCards.has(cardId)) {
    flippedRevisionCards.delete(cardId);
  } else {
    flippedRevisionCards.add(cardId);
    trackEvent("flashcard_flipped", { cardId, topicId: getRevisionTopicFromCardId(cardId)?.id });
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
  const confidenceMap = {
    again: "needs_practice",
    needs_practice: "needs_practice",
    good: "confident",
    easy: "confident",
    confident: "confident",
  };
  const storedConfidence = confidenceMap[confidence];
  if (!cardId || !storedConfidence) return;

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
    activeAdaptiveSession.completedConceptIds = [...new Set([...activeAdaptiveSession.completedConceptIds, cardId])];
    const currentTopicRemaining = activeAdaptiveSession.items.some(
      (item) => item.topicId === topic?.id && !completedRevisionCards.has(item.cardId),
    );
    if (!currentTopicRemaining) openNextAdaptiveSessionTopic();
  }
  renderRevisionPage();
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
    elements.dashboardButton.hidden = true;
    return;
  }

  const plan = currentUser.entitlements || plans[currentUser.plan] || plans.free || {};

  const freeDeck = getSelectedFreeRevisionTopicId();
  const planSuffix = !hasFeature("fullRevisionLibrary") && freeDeck ? " · 1 deck" : "";
  elements.userPlanLabel.textContent = `${currentUser.planName || plan.name || "Free"}${planSuffix}`;
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
      "Start writing and Neat Notes will shape this into a study summary.",
      "Use headings, bullets, definitions, and tasks to unlock cleaner revision outputs."
    );
  }

  const pack = getRevisionGenerator().generateStudyPack(note.body || "");
  const summary = pack.summary || note.summary || createSummary(note.body);
  const cardCount = pack.flashcards.length;
  const signals = [
    `${lines.length} learning point${lines.length === 1 ? "" : "s"}`,
    cardCount ? `${cardCount} instant card${cardCount === 1 ? "" : "s"} ready` : "Add bullets for cards",
    `${pack.quality.score}% note quality`,
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
    <div class="section-title"><span>Note intelligence</span><span>${escapeHtml(pack.quality.label)}</span></div>
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
    showInsightsMessage("PDF export is part of Pro and Teacher plans.", "error");
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

  const cardDraft = generatedNoteCards
    .map((card, index) => `${index + 1}. Q: ${card.front}\n   A: ${card.back}`)
    .join("\n");
  const addition = `\n\n## Instant revision cards\n${cardDraft}`;

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
        <small>Source note saved ${escapeHtml(formatDate(provenance.sourceNoteUpdatedAt || provenance.generatedAt))} · ${escapeHtml(provenance.method || "Neat Notes generator")}</small>
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
        ? "Your plan includes the full OCR revision library."
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
    elements.upgradeMessage.textContent = `${topic.code} ${topic.title} is now your free revision deck. Pro unlocks the full OCR library.`;
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
  elements.upgradeMessage.textContent = `Upgrade to Pro to unlock ${topicName}, Quick Practice, badges and the full OCR revision library.`;
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
