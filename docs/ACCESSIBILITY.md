# Accessibility Target

Updated: 24 August 2026

Neat Notes targets WCAG 2.2 AA. This is a target, not a formal conformance claim.

## Implemented foundations

- Semantic landmarks, labels, buttons and a skip link.
- Keyboard-operable navigation, dialogs and disclosure controls.
- Visible 3px focus indicators and mobile primary targets of at least 44px.
- Live regions for validation, save, authentication and task feedback.
- Statuses pair text with colour; mastery is never colour-only.
- Responsive bottom navigation avoids a horizontally scrolling mobile header.
- Motion is brief and disabled under `prefers-reduced-motion`.
- System fonts, zoom-friendly relative text and constrained reading measures.

## Content guidance

- Use direct action labels and explain why a revision item is recommended.
- Do not use shame, punitive streak loss or unsupported grade predictions.
- Preserve heading order and descriptive error text when adding a view.
- Give charts, progress rings and icons an equivalent textual value.

## Release checks

Automated checks and Chromium keyboard/responsive review have been completed for the relaunch surfaces. Before a broad school rollout, test current Safari, Firefox and Chromium; iOS VoiceOver; macOS VoiceOver; Windows NVDA; 200% and 400% zoom; high contrast; reduced motion; keyboard-only use; and representative screen magnification. Record defects in `docs/QA_MATRIX.md` and do not claim conformance until they are resolved and independently reviewed.
