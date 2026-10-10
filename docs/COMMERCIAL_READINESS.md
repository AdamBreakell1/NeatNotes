# RecallStride commercial readiness — 10 October 2026

The full Cloudflare app is live at **https://recallstride.com**. The owner purchased the domain and confirmed it is linked. Existing-account sign-in and the production data transfer were confirmed, GitHub deployment works, and Render NeatNotes with its paid 1 GB disk has been retired.

**This checkpoint separates the existing live app from the prepared release.** The last live revision verified before this release is `2598cf7cd67c`; health reports persistent storage without fallback, 24 decks and email/Stripe configuration. The current policy, subscription-confirmation, domain-routing and SEO changes are implemented and locally tested. Their final live revision, production Lighthouse scores and new-sender inbox result must be recorded after deployment; they are not yet claimed here.

| Area | Current evidence | Remaining concrete action or verification |
| --- | --- | --- |
| Full app | Existing Cloudflare release includes all 60 coding tasks, the embedded interpreter, revision, practice, notes, progress and working accounts. Owner confirmed existing-account sign-in after migration. | Deploy the prepared release and record the exact live SHA and health result. |
| Domain | RecallStride.com purchased; apex app reachable; owner confirmed linking. Committed configuration covers apex/www, preserves the database and uses the branded canonical origin. | Confirm deployed www and legacy GET redirects plus apex HTTPS. Preserve legacy POST/webhook compatibility until provider endpoint changes are verified. |
| GitHub delivery | Previous actual GitHub runs deployed the full app. Updated workflow preserves canonical origin, storage and secrets. | Record this release's successful Actions run against the canonical domain. |
| Authentication email | Owner confirmed receipt of a reset email with the old Neat Notes sender. The actual outbound provider is Resend. Resend now reports recallstride.com verified; Worker sender is `RecallStride <hello@recallstride.com>`. Verification/reset templates are branded. | Confirm an actual final message from the new sender. Its inbox delivery is not yet verified. A school inbox has not been tested. Domain verification is not an inbox-delivery result. |
| Support/account email | Owner created `recallstride@gmail.com`. Cloudflare inbound routing/MX/SPF/DKIM is enabled. The destination is verified; support@recallstride.com and hello@recallstride.com are active forwarding rules. | Public support is support@recallstride.com; application notifications go directly to recallstride@gmail.com. Confirm a real incoming alias message. Sending and receiving are separate functions. |
| Policies/privacy | Complete versioned Privacy, Terms, Cookies, Cancellation and Billing, and Account Data documents use **Adam Breakell trading as BreakellSystems** and the authorised public postal address. Signup records terms/16+ declarations. Checkout shows monthly renewal/refund terms and adult-permission acknowledgement. Analytics consent, withdrawal, retention, export and erasure are implemented. | Confirm deployed operator/contact details and documents. Carry out the support, refund, privacy-request, retention and incident procedures. Published policies are not certification or ICO registration. |
| Subscription confirmation | Checkout stores immutable policy snapshots. Signed successful-payment events enqueue branded confirmation with the original Terms/Billing documents attached. Persistent leases/retries, duplicates, export/isolation, erasure and atomic rollback pass synthetic tests. Delayed payments wait for success. | Confirm an owner-performed real Checkout, actual confirmation/attachments, entitlement, portal and cancellation. No purchase, refund or financial transaction was performed by this audit. |
| Stripe | Existing configuration/signing secret were transferred; live webhook was updated for the original Cloudflare origin. Canonical routing preserves POSTs there. Signed/idempotent handlers and access boundaries pass synthetic tests. | Record real purchase/portal/cancellation evidence. Configuration flags do not prove the live payment lifecycle. |
| Current recovery | Remote PITR rehearsal used a distinct synthetic namespace and the actual 42-table schema. Restore/undo matched exact hashes with zero foreign-key errors. Temporary Worker, namespace and secret were removed. Native history covers 30 days. | Follow the recovery procedure, preserving deletion requests and reconciling Stripe before reopening. No production restore or production-data test occurred. |
| Historical migration data | Transfer verified 1,002 rows in 39 tables, matching counts/hashes and no foreign-key errors. Protected migration copies predate later Cloudflare writes. | Dispose of customer-data copies when their bounded migration/incident purpose ends. They are not current backups and should not become an indefinite archive. |
| SEO | Initial public HTML, canonical/search metadata, structured identity, branded share previews, 24 linked topic previews, private noindex, real 404s, sitemap and minified assets are implemented. Compiled local Lighthouse scored 100 in all four categories on mobile/desktop; live mobile performance baseline was 87. | Record final live Lighthouse, create/verify Search Console domain property and submit the sitemap. Google verification, indexing and rankings are not yet claimed. |
| Social launch | Exact-brand artwork, avatar/header, bios, captions, alt text and relevant hashtags are ready. Dedicated Gmail was created by the owner. | Complete genuine owner signup/verification, branding and first posts. Record actual profile/post URLs. Prepared artwork does not prove publication; passwords stay outside public Git history. |
| ICO fee | Owner states not registered and ten or fewer staff. Current ICO guidance lists Tier 1 at £52, reduced by £5 with direct debit. | Complete official exemption assessment and, if required, owner-operated registration/payment. No exemption, registration number or payment is invented. |
| Content/accessibility | 24 topics, 474 concepts and 60 coding tasks are implemented; examples and interpreter checks execute. Focused account/navigation and automated accessibility checks pass. | Independent subject review, real learning outcomes and universal device/screen-reader accessibility remain unestablished. Avoid grade guarantees or certification claims. |
| Expansion | Static assets bypass the persistent database; indexes and fewer repeated writes reduce unnecessary work. Existing data fits storage. | Measure actual traffic and quota headroom. One SQLite Durable Object is not horizontal database sharding or unlimited free scaling. |

## Prepared-release verification

- Backend: **154/154 tests passed**, zero failed or skipped, including confirmation, consent and lifecycle cases. Providers/accounts were synthetic.
- Syntax: **118 JavaScript files checked**. Content: **24 topics and 474 concepts valid**.
- Static production build: **25 public files**, including the branded share preview; private source/configuration excluded.
- Browser account: **14 groups passed**, including nested policy dialogs, checkout preconditions and optional analytics. Navigation: **18 groups passed**. No real mail/payment provider was called by these browser fixtures.
- Compiled local Cloudflare Lighthouse: **100/100/100/100 mobile and desktop**, layout shift 0. Local network conditions differ from production; these are not labelled live scores.

Record final deployment/provider evidence when available. Do not repeat broad feature interactions during deployment; the user will test new features.

## Operational references

- [SEO audit](SEO_AUDIT_2026_10_10.md)
- [Policy operations](POLICY_OPERATIONS_2026_10_10.md)
- [Child privacy assessment](CHILD_PRIVACY_ASSESSMENT_2026_10_10.md)
- [Domain and recovery](CUSTOM_DOMAIN_AND_RECOVERY.md)
- [Social launch kit](SOCIAL_LAUNCH_2026_10_10.md)
- [ICO assessment](https://ico.org.uk/for-organisations/data-protection-fee/self-assessment/) and [current fee/registration guidance](https://ico.org.uk/for-organisations/data-protection-fee/faqs-data-protection-fee-payment-and-online-registration/)
- [Search Console](https://search.google.com/search-console)

Working features are implemented in full. Specific external actions above are recorded honestly: empty screens, assumed provider success or unperformed payments/verifications/posts cannot substitute for completion. Older documents describing missing coding functionality, draft-only policies or an unpurchased domain are superseded by this checkpoint.
