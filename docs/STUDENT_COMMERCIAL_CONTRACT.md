# Student relaunch: commercial and legacy contract

7 September 2026. Implementation facts and proposals, not approved legal terms.

**Superseded direction, 11 September:** the [student-only brief](STUDENT_ONLY_BRIEF.md) retires classroom UI and endpoints in the local branch. This document records earlier compatibility assumptions, not a promise to continue those workflows. Legacy billing identifiers, records and student resource access remain intact; deployment of the retirement still needs an approved obligations/export plan. No production contract or price was changed.

## Public offering

`product-config.js` owns the backend plan catalogue, brand identity and public plan IDs. Only Free and Pro can start a new checkout. Current Pro price remains GBP 3.99/month; no price or live Stripe object was changed.

| Capability | Free | Pro |
| --- | --- | --- |
| OCR content | One released deck, selected once | All released packs; draft material is not a paid entitlement |
| Learning loop | Retrieval, explanation, ratings, quiz and available written/applied practice in that deck | Same feedback quality across the released catalogue |
| Personal notes | 25 notes, two spaces | Unlimited notes/spaces |
| Account data | Read/edit existing personal notes, JSON export, recovery and deletion route | Same rights, plus PDF export and version history |
| Advanced study tools | Not included | Generated study packs, legacy collaboration support |
| Mixed-topic mini mocks | Needs enough accessible questions | Short selections where content is available; not full OCR papers |

Catalogue breadth, not weaker feedback, distinguishes the free experience. Content access is enforced by the server, including direct deck/question/lab requests. Visiting a checkout success URL never grants access. The browser is not an entitlement authority.

Annual-price mapping is prepared with `STRIPE_PRICE_PRO_ANNUAL`, but annual checkout and marketing remain disabled. Before enabling: approve the actual annual charge, renewal terms and savings calculation, configure a matching recurring Stripe price, validate checkout/webhooks/portal and show the full charge prominently. No invented annual discount.

## Subscription lifecycle

Stripe signatures are checked against the raw body. Events are deduplicated, processed serially per customer on this single instance and recorded only after success. Subscription handlers retrieve current Stripe state rather than trusting notification order. Active/trialling recognised contracts grant access; unpaid/cancelled/unknown-price states do not. Cancellation at period end retains access while Stripe still reports active.

Existing paid users are directed to their billing portal rather than a duplicate checkout. New Teacher/Institution sales are rejected, but their existing Price IDs and feature maps remain supported. Never remove these mappings before an approved contract migration.

Unit tests simulate duplicates, concurrency, failure/retry, stale events, invoice events, status changes, cancellation timing and unknown prices. These are not Stripe Sandbox or live settlement evidence. External lifecycle validation remains mandatory.

An abandoned checkout changes nothing. After webhook downtime, inspect failed deliveries and resend events in test mode first; reconcile the affected subscription against current provider state. Do not manually grant Pro from a return URL. Refunds and subscription cancellation are separate operations: support must approve the refund policy and action, record its reference and verify access independently. This release issues neither refunds nor cancellations.

Paid-account deletion is blocked while a subscription is active/trialling/past due. The user can export, cancel through Billing, wait for the end of access or ask support for help. Accounts owning shared work require an ownership/export plan before deletion. This safeguard must not become an indefinite obstruction to lawful deletion requests: legal/support review is required.

## Legacy Teacher/Institution runbook

Public acquisition stops, not service obligations. Class/membership/assignment/centre tables, ownership, progress attribution, shared notes and existing access stay intact. Active legacy assignments remain reachable for their members. No live aggregate inventory or customer communication was authorised or performed.

Before any sunset, obtain approval for:

1. An authorised aggregate inventory of active contracts, shared work owners/members and assignment obligations; no personal data in reports.
2. The commercial timeline, notices, renewal policy, support route, refunds and contractual commitments.
3. Per-workspace ownership/export handling agreed with affected parties. Never silently privatise another author's work.
4. A staging rehearsal with synthetic owner/member/student fixtures, downgrade and export tests, and a rollback snapshot.
5. Explicit approval before communications, provider edits or any production migration. Keep legacy price maps until obligations are resolved.

## Brand decision

Neat Notes remains the public brand and all stable identity/billing/content IDs remain unchanged.

| Candidate | Benefit | Risk / validation |
| --- | --- | --- |
| Neat Revision | Continuity and immediate category clarity | Descriptive; test distinctiveness and recognition |
| RecallStride | Broader retrieval/progress positioning | Less immediately academic; test pronunciation and comprehension |

Neither candidate has legal, domain or handle clearance. Obtain UKIPO/domain/social checks and student comprehension feedback before selection. Do not buy or rename anything automatically.

Rebrand checklist: reversible brand configuration and asset references; old-domain redirects; topic URLs/canonicals/sitemap/social cards; sender SPF/DKIM/DMARC; verification/reset URLs; OAuth callbacks; Stripe portal/checkout/receipt URLs; support and policy links; manifest/icons and service-worker cache version. Preserve account, concept, customer and subscription IDs. Stage, test old links and obtain explicit DNS/deployment approval.
