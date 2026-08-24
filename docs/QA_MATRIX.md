# QA Matrix

Updated: 24 August 2026

| Surface | Automated | Browser review | Remaining external review |
| --- | --- | --- | --- |
| Authentication and lifecycle | Integration pass | Desktop/mobile modal pass | Safari, password managers, email-provider matrix |
| Free and paid entitlements | Integration pass | Locked/free-deck flows pass | Live Stripe test-mode lifecycle |
| Student Home/Revise/Practice/Progress | Model and API pass | 390px and 1280px Chromium pass | iOS/Android real devices, screen readers |
| Notes and study packs | Syntax/API regression pass | Desktop/mobile editing pass | Long documents, PDF print/browser matrix |
| Teacher classes/assignments/insights | Integration pass | Empty and populated class flows pass | Larger class datasets, teacher pilot |
| OCR content/exam/labs | 16 topics, 316 concepts and rubric/lab tests pass | Core task surfaces pass | Independent academic/content review |
| Contact/email | Persistence/retry code pass | Form validation pass | Live SMTP delivery and provider failure drill |
| Public OCR pages/PWA | Health/public route pass | Public page and install shell pass | Installed iOS/Android and offline recovery |
| Accessibility | Syntax/manual keyboard foundations | Focus/responsive/reduced-motion review | NVDA, VoiceOver, Firefox, Safari, 400% zoom |
| Security | Permission/paywall tests and seven diff findings remediated | Reset URL, cache and client/server boundary pass | Independent penetration test and DPIA |

Automated commands: `npm run check`, `npm run validate:content`, and `npm test`.

Release-blocking defects are data loss, authentication inconsistency, entitlement bypass, cross-account access, inaccessible primary actions, broken checkout/webhooks, failed verification/reset email, persistent-storage fallback in production, or a content validation failure.
