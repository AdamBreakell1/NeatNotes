"use strict";

const BRAND = Object.freeze({ name: "RecallStride", owner: "BreakellSystems", supportEmail: "neatnotescontact@gmail.com", positioning: "Know what to revise next. Practise, repair and return." });

const PLAN_CATALOG = {
  free: {
    id: "free",
    name: "Free",
    price: "£0",
    noteLimit: 25,
    workspaceLimit: 2,
    features: {
      collaboration: false,
      pdfExport: false,
      versionHistory: false,
      studyPack: false,
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
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
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
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
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
      pdfExport: true,
      versionHistory: true,
      studyPack: true,
      fullRevisionLibrary: true,
      quickPractice: true,
      billingPortal: true,
    },
  },
};

PLAN_CATALOG.teacher.legacyOnly = true;
PLAN_CATALOG.institution.legacyOnly = true;
const PUBLIC_PLAN_IDS = Object.freeze(["free", "pro"]);
const BILLING = Object.freeze({ currency: "gbp", monthlyPence: 399, annualEnabled: false });
module.exports = { BRAND, PLAN_CATALOG, PUBLIC_PLAN_IDS, BILLING };
