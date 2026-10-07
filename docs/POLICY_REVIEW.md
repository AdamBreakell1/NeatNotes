# Policy facts, local copy and legal-review questions

7 October 2026. Customer-facing draft copy is in `policy-content.js`, displayed in the local Privacy, Billing, Cookies, Terms and Data Protection dialogs. It is visibly a draft. This pack does not claim legal approval. No completed controller identity, unverified jurisdiction, refund rule or provider location was invented.

## Verified implementation facts

| Data / operation | Code evidence | Current behaviour / honest limit |
| --- | --- | --- |
| Brand/contact | product-config.js | RecallStride, BreakellSystems product name, neatnotescontact@gmail.com. Trading/legal identity and postal address not supplied. |
| Accounts | server.js users/session/token routes | Email, name, salted password hash or Google identifier; verification before password login; server session and authentication events. No age/DOB or parental-consent verification. |
| Verification / recovery | server.js createEmailVerification / reset routes | Verification 24h, reset 30m, session 30d. Expiry denies access; not every expired row is proactively erased. Reset revokes sessions. |
| Notes/profiles/evidence | server.js account/profile/note routes | Necessary account workspace data; no inactive-account expiry. 150 flashcard/evidence records per card/concept, 500 exam/lab attempts per account, bounded activity histories. Count pruning is not a universal 30-day policy. |
| Existing optional events | server.js /api/events | Explicit opt-in usageAnalytics; latest 1,000 events per account, not a fixed time window. This existing stream must be included in final retention review. |
| New coding events/attempts | pseudocodePractice.js / pilotTelemetry.js | First-party metadata only; 30d time window; daily/startup/use cleanup; 500 attempt/2,000 pilot-event limits per account. New event endpoint allows only known names, IDs and mode. Client results are untrusted. |
| Coding text | pseudocode-drafts.js / practice adapter | Source, inputs, prediction and rubric are account-scoped local data; maximum 30d since saved update with lazy removal. Sign-out clears this browser’s coding data. Account export combines this device’s drafts with server export. Other-device local files are not erased remotely. |
| Recipients | implementation integration points | Existing Render host; Stripe when configured; configured SMTP/email provider; Gmail support inbox; optional Google identity. Regions/contracts/subprocessors not inspected; no credentials were read. No runtime AI for coding. |
| Billing | product-config.js / subscriptionEvents.js | £3.99 monthly, no new annual sales; signed/deduplicated webhooks reconcile current provider state. Paid status from provider, not browser result. Portal settings remain externally unverified. |
| Account deletion | server.js DELETE /api/account | Confirmation/password or recent Google sign-in required. Active/trialling/past-due subscription and shared/archive ownership can block automatic deletion. Child coding/event records cascade. Support enquiries are separate email-indexed records, not auto-cascaded; audit/provider/backup retention is separate. |
| Backups / support logs | existing deployment records and schema | Synthetic restore tested. No checked production backup-erasure horizon; contact_enquiries have no time-based cleanup. Audit rows may remain with actor reference cleared. No blanket “all data immediately deleted” promise. |

## Proposed purposes/bases — requires confirmation

Necessary account/subscription provision: assess contractual necessity for account/profile, saved learning and entitlement operations. Optional aggregate usage: consent, with an equally easy Settings withdrawal. Account security: assess legitimate interests and document its necessity/balance. Support: assess the appropriate service/legitimate-interest basis by enquiry type. Financial record keeping: identify actual applicable obligations and periods before relying on legal obligation. These are proposals requiring documented legal review, particularly for children; they are not inferred approvals.

The [ICO privacy-information checklist](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) informs the identity, purpose, recipients, retention and rights questions. Its page says guidance is under review following the Data (Use and Access) Act. A reviewer should check the applicable current position and [lawful-basis guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/) before finalising wording.

## Facts/questions to resolve before publication

1. Full operator/controller legal name, trading relationship, postal/service address, contact ownership and whether a DPO/representative or ICO registration is applicable. Do not substitute the product name for a legal entity.
2. Which provider contracts/processors/subprocessors are active, who can access accounts/support, storage locations, international-transfer basis and safeguards? Obtain confirmations without putting credentials in this pack.
3. What are the final purpose-by-purpose lawful bases, security legitimate-interest assessment and under-18 handling? Is an assessment under the [children’s code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/) required? Decide appropriate age explanation, parental involvement and pilot consent with the institution/guardian where needed.
4. Retention owner and enforceable periods for inactive accounts, contact enquiries, audit/product events, expired tokens, provider accounting records and all backups. Confirm how deletion requests affect each and how a restored backup honours already completed erasure requests.
5. Request handling: verify identity proportionately, log a minimal case reference, route blocked deletions to a responsible person, meet applicable deadlines, explain any lawful exception and provide [ICO complaint access](https://ico.org.uk/make-a-complaint/). Automatic safeguards cannot obstruct rights indefinitely.
6. Confirm monthly recurring price/tax presentation, pre-contract information, portal cancellation configuration, effective date and durable confirmations. Review digital-service cancellation/withdrawal, immediate-service consent and refunds against [GOV.UK distance-selling guidance](https://www.gov.uk/online-and-distance-selling-for-businesses). Resolve fair rules for mistaken/duplicate billing and service failure; do not invent “no refunds” or a return window.
7. Set support ownership/escalation, expected response handling and a complaints route. No service-level promise is currently approved.
8. Inventory essential cookies/local storage versus optional measurement. Verify consent changes stop collection and provide an erasure route for already collected optional events. No marketing automation is part of this work.

Legal/owner sign-off record: reviewer **unassigned**; review date **pending**; operator facts **pending**; under-18 decision **pending**; final published policy revision **none**. Keep the draft notice until those facts and approvals exist. Deployment requires separate user approval.
