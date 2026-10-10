(function (root, factory) {
  const api = factory(root.RECALLSTRIDE_POLICY_CONFIG || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RecallPolicies = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (initialConfig) {
  'use strict';

  const VERSION = '2026-10-10';
  const PAGE_IDS = Object.freeze(['privacy', 'terms', 'cookies', 'billing', 'data-protection']);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const link = (url, label) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} (opens a new tab)</a>`;
  const paragraphs = (value) => escape(value).replace(/\r?\n/g, '<br>');
  const duration = (value, fallback) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 3650 ? Number(value) : fallback;

  function normalise(config = {}) {
    const supplied = config && typeof config === 'object' ? config : {};
    const email = String(supplied.supportEmail || 'support@recallstride.com').trim();
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) throw new TypeError('A valid public support email is required.');
    const website = new URL(supplied.website || 'https://recallstride.breakellsystems.workers.dev');
    if (!['https:', 'http:'].includes(website.protocol) || website.username || website.password) throw new TypeError('The public website must be an HTTP or HTTPS URL.');
    const retention = supplied.retention || {};
    return Object.freeze({
      operatorName: String(supplied.operatorName || 'Adam Breakell').trim(),
      tradingName: String(supplied.tradingName || 'BreakellSystems').trim(),
      postalAddress: String(supplied.postalAddress || '').trim(),
      supportEmail: email,
      website: website.origin,
      companyNumber: String(supplied.companyNumber || '').trim(),
      vatNumber: String(supplied.vatNumber || '').trim(),
      googleSignInEnabled: supplied.googleSignInEnabled === true,
      emailDeliveryProvider: supplied.emailDeliveryProvider === 'resend' ? 'resend' : 'gmail',
      retention: Object.freeze({
        analyticsDays: duration(retention.analyticsDays, 30),
        auditDays: duration(retention.auditDays, 90),
        supportDays: duration(retention.supportDays, 365),
        billingYears: duration(retention.billingYears, 7),
        backupDays: duration(retention.backupDays, 30),
      }),
    });
  }

  function buildPages(config) {
    const support = `<a href="mailto:${escape(config.supportEmail)}">${escape(config.supportEmail)}</a>`;
    const operator = `${escape(config.operatorName)}${config.tradingName ? ` trading as ${escape(config.tradingName)}` : ''}`;
    const identity = `<p>RecallStride is operated by ${operator}. ${config.postalAddress ? `Postal address: ${paragraphs(config.postalAddress)}. ` : ''}Contact: ${support}.${config.companyNumber ? ` Company number: ${escape(config.companyNumber)}.` : ''}${config.vatNumber ? ` VAT number: ${escape(config.vatNumber)}.` : ''}</p>`;
    const date = '<p><strong>Effective 10 October 2026.</strong> Save or print a copy for your records.</p>';
    const rights = `<p>Contact ${support} to ask for access, correction, erasure, restriction or a portable copy of your information where applicable. You can withdraw optional analytics consent in Settings at any time. Withdrawing consent does not affect earlier lawful processing. <strong>You can object to our use of your information for legitimate interests.</strong> Tell us what concerns you; we will consider your circumstances.</p><p>We normally respond to a privacy request within one month. We may ask for information needed to confirm your identity. If the law permits an extension for a complex request, we will explain it within the first month. Requests are normally free. You can complain directly to ${link('https://ico.org.uk/make-a-complaint/', 'the Information Commissioner’s Office (ICO)')} without contacting us first.</p>`;
    const retention = `<ul>
      <li><strong>Your account, notes and study progress:</strong> kept while your account exists, unless you remove the relevant data. We do not automatically close accounts for inactivity. Some practice histories and note versions keep a limited number of recent records, so export work you need to retain.</li>
      <li><strong>Coding attempt metadata and optional usage events:</strong> up to ${config.retention.analyticsDays} days. Coding source and planning notes remain on your device rather than in our account database.</li>
      <li><strong>Security and account audit records:</strong> up to ${config.retention.auditDays} days. Expired session, verification, password-reset and temporary sign-in records are removed during maintenance.</li>
      <li><strong>Support enquiries:</strong> application records are removed after ${config.retention.supportDays} days from submission, whether delivered or queued. Ordinary support inbox correspondence follows the same period.</li>
      <li><strong>Subscription orders, contract copies, confirmation messages, billing status and payment-event references:</strong> up to ${config.retention.billingYears} years, or until the related account is deleted. Order records include the accepted policy version and declaration, the exact terms supplied, recipient address and delivery status. Stripe may retain payment and invoice records after account deletion to meet its financial and legal duties. Necessary business tax records follow the applicable statutory accounting period.</li>
      <li><strong>Recovery copies:</strong> Cloudflare recovery history covers the previous ${config.retention.backupDays} days. Recovery is restricted to maintaining the service. Before restored data is used, account deletions must be reapplied. Separate incident or migration copies are kept only while needed for that recovery and are then securely removed.</li>
    </ul><p>Time limits are enforced during scheduled daily maintenance and relevant service use; removal may take until the next maintenance run.</p>`;
    const cancellation = `<p>Cancel future renewal from the account menu → <strong>Billing</strong> → Stripe’s subscription management page. Check the effective date shown in its confirmation. Cancellation normally takes effect at the end of the current paid month, and Pro continues until then. You can also request cancellation using the Contact form or ${support}; you do not have to give a reason. A failed sign-in or unavailable portal does not prevent you contacting us to cancel.</p>`;
    const refunds = `<p><strong>You may cancel and receive a full refund within 14 days of your first payment or any renewal payment.</strong> This is our refund promise, including when you have used the service. We do not ask you to waive it for immediate access. Tell us through Contact or ${support} that you want to cancel and refund the charge. Include the account email, payment date and, if available, the receipt reference. Never send a full card number or password.</p><p>We confirm the request, cancel future payments and return an eligible refund to the original payment method within 14 days of receiving your request. Your bank may take additional time to display it. Refunded Pro access ends when the refund is processed; your Free account and personal notes remain. Outside this window, tell us about duplicate payments, unauthorised charges or a service problem. Your statutory rights to remedies for faulty or misdescribed services still apply.</p>`;
    const form = `<h3>Optional cancellation form</h3><p>You may copy this into an email, use the Contact form, or send it by post. You may also cancel with any other clear statement.</p><p>To: ${operator}${config.postalAddress ? `, ${paragraphs(config.postalAddress)}` : ''}; ${support}.<br>I give notice that I cancel my RecallStride Student Pro subscription.<br>Account email:<br>Order or payment reference (if known):<br>Payment date:<br>Name:<br>Address (if sending by post):<br>Date:<br>Signature (only for a paper notice):</p>`;

    return {
      privacy: { title: 'Privacy Policy', html: `${date}
        <h3>The short version</h3><p>We use your account details, notes and study activity to run your private study workspace. Your coding programs run in your browser. Optional usage measurement is off until you choose it. We do not sell student information, run advertising trackers, or send your notes or coding source to an AI provider.</p>
        <h3>Who is responsible</h3>${identity}<p>The operator is the controller of account, study and support information: the person responsible for deciding how it is used.</p>
        <h3>What information we use</h3><ul>
          <li><strong>Account access:</strong> name, email, securely hashed password, verification and recovery records, session identifiers, device/browser description and recent sign-in activity.${config.googleSignInEnabled ? ' If you choose Google sign-in, Google supplies your account identifier, name and email; we do not obtain your Google password.' : ' Google sign-in is not currently offered; if it is introduced, the sign-in screen will explain the identity information shared.'}</li>
          <li><strong>Your study workspace:</strong> profile and preferences you enter, personal notes and their saved versions, practice answers, recorded attempts, confidence, study history and review schedules. Shared work and existing class records may include membership, teacher and assignment information.</li>
          <li><strong>Coding practice:</strong> task identifiers and versions, whether stated checks passed, assistance counters and attempt mode. Source code, virtual files, example inputs, predictions and planning notes stay in account-scoped browser storage; they are not sent in coding attempt or analytics requests.</li>
          <li><strong>Payment and support:</strong> subscription/customer references and status from Stripe, and your name, email, message and delivery status when you contact us. Stripe collects the payment information needed for Checkout; we do not store full card details.</li>
          <li><strong>Service protection:</strong> requests, error information and short-lived rate-limit identifiers. Cloudflare processes network information, including IP addresses, to deliver and protect the site.</li>
        </ul><p>Information comes from you, our service when you use it, Stripe after a payment, and other members when you take part in existing shared work. An email and authentication method are needed for a saved account. Other profile details are optional. Avoid putting health information, passwords or another person’s private details into study text or messages.</p>
        <h3>Why we use it and our lawful bases</h3><ul>
          <li><strong>Providing study accounts and learning tools:</strong> our legitimate interests in delivering the private educational workspace you request, including support for students aged 16–17. We limit data to that purpose and offer export and deletion controls.</li>
          <li><strong>Paid subscriptions:</strong> performing the subscription contract for the adult purchaser, including managing access, renewal, cancellation and refunds.</li>
          <li><strong>Security and support:</strong> legitimate interests in preventing abuse, securing accounts, diagnosing failures and answering the enquiries you send.</li>
          <li><strong>Optional feature-usage measurement:</strong> your consent. It is not required for an account, coding practice or paid access. Settings → Data lets you turn it off and removes stored optional account events.</li>
          <li><strong>Necessary financial records and lawful requests:</strong> legal obligations where applicable, including UK tax and accounting duties.</li>
        </ul>
        <h3>Learning suggestions and optional measurement</h3><p>Revision suggestions use previous attempts, confidence and due dates to suggest what to practise next. You can choose another topic. They do not decide exam grades, school placement or admission, and are not official assessments. Coding checks compare your program with the examples shown; a pass does not prove every possible input is correct.</p><p>If you opt in to usage measurement, we collect defined feature events and task/session identifiers to understand which tools are useful. We exclude note text, answers, coding source, inputs, names and email addresses from event contents. Events are still linked to your account and are personal information. Turning measurement off stops collection and removes stored optional account events.</p>
        <h3>Who receives information</h3><p>Cloudflare hosts the app and its persistent database and provides service protection and recovery. ${config.emailDeliveryProvider === 'resend' ? 'Resend delivers verification, password-reset, subscription and support notification email. Google’s Gmail service holds support correspondence in our inbox.' : 'Google’s Gmail service delivers verification, password-reset and support email and holds support correspondence in our inbox.'} Stripe provides Checkout, payments, invoices and subscription management. The operator and authorised support access information as needed to maintain accounts, resolve enquiries or meet a legal duty. Members of an existing shared workspace can access its shared notes; sharing is separate from your private personal workspace.</p><p>Providers may process information outside the UK, including in the United States. Cloudflare’s processing terms include standard contractual clauses and the UK transfer addendum where required. ${config.emailDeliveryProvider === 'resend' ? 'Resend, Google and Stripe' : 'Google and Stripe'} describe their applicable adequacy, Data Privacy Framework and contractual safeguards in their notices. Contact us for information about safeguards relevant to your data. See ${link('https://www.cloudflare.com/cloudflare-customer-dpa/', 'Cloudflare’s data processing terms')}, ${link('https://policies.google.com/privacy', 'Google’s privacy notice')}${config.emailDeliveryProvider === 'resend' ? `, ${link('https://resend.com/legal/privacy-policy', 'Resend’s privacy notice')}` : ''} and ${link('https://stripe.com/gb/privacy', 'Stripe’s privacy notice')}.</p>
        <h3>How long we keep it</h3>${retention}
        <h3>Your rights and choices</h3>${rights}
        <h3>Students under 18</h3><p>RecallStride is designed for A-Level students aged 16 and over. If you are 16 or 17, you can use the study tools; a parent or guardian must agree to any paid subscription. We do not ask you to upload an identity document and do not claim to independently verify your age or parental permission. Accounts and notes are private unless you deliberately use shared work. Optional analytics is off by default for everyone. We do not use advertising profiles or precise location tracking, and do not give a parent or school access to a personal account merely because they request it.</p><p>If something about your data is confusing, contact us. You can ask a trusted adult to help with a request. If an account belongs to someone under 16, contact us so we can arrange an appropriate export and account closure.</p>
        <h3>Changes</h3><p>The date above identifies this notice. We will explain material changes before using your information for a new purpose, and request a fresh choice where consent is needed.</p>` },

      terms: { title: 'Terms of Service', html: `${date}
        <h3>The service and its operator</h3>${identity}<p>RecallStride provides personal notes, OCR H446 A-Level Computer Science revision, study progress, written practice and browser-based coding tasks. These terms apply to use of the service. Our Privacy Policy explains data handling, and Cancellation and Billing explains charges and refunds.</p>
        <h3>Accounts and age</h3><p>You must be aged 16 or over to create an account. Use an email you can access and provide accurate account details. If you are under 18, ask a parent or guardian to agree to a paid subscription and payment. The adult authorising the purchase is responsible for the payment agreement. Protect your password and do not share a personal account. Contact support promptly if you think someone has accessed it without permission.</p>
        <h3>What Free and Pro include</h3><p>Free provides one published revision topic, selected once, and the personal workspace limits shown in Pricing. The coding workspace and worksheet tasks are available without a paid subscription. Student Pro provides the published revision library and the additional workspace features shown before purchase. Only monthly Student Pro is offered for new paid subscriptions. Existing personal notes remain available when paid access ends.</p>
        <h3>Learning content and academic use</h3><p>RecallStride is independent of OCR and is not endorsed by OCR. Specification mapping helps you find relevant material; it does not replace the official specification, classroom teaching or examiner guidance. We do not guarantee an exam grade or complete coverage of every possible question. Program checks and guided feedback support practice and may have limitations or errors; report concerns so we can correct them.</p><p>Use examples to learn, not to submit someone else’s work as your own. Follow your school’s assessment rules. Do not use generic coding practice to generate candidate-specific assessed NEA project work.</p>
        <h3>Your work and acceptable use</h3><p>Your notes and original code remain yours. You allow us to store, display and process the material you choose to save only to provide the service and handle your support requests. You are responsible for having permission to upload material and share it with other people.</p><p>Do not upload unlawful material, another person’s private information without permission, or content that infringes their rights. Do not harass other users, try to access accounts or paid content without permission, automate abusive traffic, distribute malware, or disrupt the service. Report a security concern privately to support.</p><p>Our published teaching materials and app are supplied for your own educational use. Do not resell them, republish a paid library or remove ownership notices. This does not restrict uses permitted by copyright law.</p>
        <h3>Payments and cancellation</h3><p>Student Pro is <strong>£3.99 per month</strong>, including any applicable taxes shown at Checkout. It renews monthly until cancelled, with no annual commitment. Pro begins after payment is confirmed. The payment page confirms the amount and billing schedule before you commit. Your saveable subscription confirmation and receipts identify the purchase.</p>${cancellation}${refunds}
        <h3>Availability and changes</h3><p>We provide the service with reasonable care and skill. Maintenance, provider outages or network failures can interrupt it; there is no promise of uninterrupted availability. Keep exports of work you need. Browser-only drafts are not synced between devices.</p><p>We may update lessons, fix errors and improve features. If a change materially reduces a paid service, we will give reasonable notice and explain cancellation or refund options. Any price increase is notified before it affects a renewal; you can cancel before the new charge. Changes do not remove rights already attached to an earlier purchase.</p>
        <h3>Suspension and closing an account</h3><p>We may restrict an account where reasonably necessary to prevent abuse, protect other users or comply with law. We explain the reason and allow you to challenge it through support unless doing so would expose a security risk or breach a legal restriction. A disputed suspension is reviewed by the operator. Where safe and lawful, you can export your work. If we permanently end paid service for a reason other than your serious breach, we refund unused paid time.</p><p>You may stop using the service and request account deletion at any time. Deletion and subscription cancellation are separate actions: resolve an active subscription first or contact us for help. Shared-work ownership can require an export or transfer to protect other people’s notes.</p>
        <h3>Responsibility and consumer rights</h3><p>We are responsible for foreseeable loss caused by our breach or failure to use reasonable care and skill. We do not exclude liability that the law prevents us excluding, including fraud, death or personal injury caused by negligence, or statutory consumer rights. The service is supplied for personal educational use. Your legal remedies for faulty, misdescribed or improperly supplied services apply regardless of the 14-day refund promise.</p>
        <h3>Questions, complaints and applicable law</h3><p>Contact ${support} or use Contact for a complaint. Explain the issue and the outcome you want; we will acknowledge it and aim to resolve it promptly. Applicable UK consumer law governs these terms. Mandatory consumer protections and your right to bring a claim in the courts where the law allows remain unchanged.</p>` },

      billing: { title: 'Cancellation and Billing', html: `${date}
        <h3>Your monthly subscription</h3>${identity}<p><strong>Student Pro costs £3.99 per month and automatically renews each month until cancelled.</strong> The charge includes any applicable taxes shown at Checkout. New subscriptions have no annual plan, trial charge or separate coding surcharge. Existing subscriptions keep the amount and billing interval agreed for their original purchase, as shown in Stripe Billing. The paid service starts when Stripe confirms the payment. The subscription confirmation records the purchase and its terms; keep it with your receipts.</p><p>Free gives one published revision topic selected once and the workspace limits shown in Pricing. Pro adds the published revision library and the paid workspace features shown before purchase. Coding tasks and the embedded interpreter remain available without Pro.</p>
        <h3>Cancel future payments</h3>${cancellation}<p>After the paid period ends, your account returns to Free. Your personal notes and export controls remain accessible. A declined payment may interrupt Pro; contact us if the account status appears wrong. Do not start a second subscription to solve a status problem.</p>
        <h3>14-day full refund promise</h3>${refunds}
        <h3>Closing an account</h3><p>Export your work before deletion. Settings → Data provides account deletion. An active or past-due subscription must be resolved first; contact us if you need cancellation, a refund or deletion before the paid period ends. Deleting an account does not automatically erase Stripe’s lawful accounting records. We will help resolve a deletion blocked by existing shared-work ownership without erasing another person’s work.</p>
        ${form}
        <h3>Help with a payment</h3><p>Use Contact or ${support}. Give the account email and receipt reference if available. We can investigate a payment even if you cannot sign in. Never send a full card number, card security code or password. If you are 16 or 17, have a parent or guardian agree to the purchase; the adult authorising payment is responsible for it.</p>` },

      cookies: { title: 'Cookie and Browser Storage Policy', html: `${date}
        <h3>Operator and contact</h3>${identity}
        <h3>Why storage is used</h3><p>RecallStride uses necessary sign-in and security cookies, and browser storage to remember the preferences and study work you request. We do not use advertising cookies or third-party marketing trackers. Optional feature-usage measurement is a separate choice in Settings → Data and starts only after you enable it.</p>
        <h3>Cookies</h3><ul>
          <li><strong><code>nn_session</code>:</strong> first-party sign-in cookie, with a maximum life of 30 days. It keeps the requested account session active. In production it is HttpOnly, Secure and SameSite=Lax. Sign-out clears it.</li>
          <li><strong><code>google_oauth_state</code>:</strong> a first-party security cookie used only if Google sign-in is offered and you choose it. It lasts up to 10 minutes and checks that the sign-in reply belongs to the request you started. Google’s own sign-in site has its own storage rules.</li>
        </ul><p>These cookies support the account or sign-in action you request. Blocking them can prevent sign-in from working.</p>
        <h3>Browser storage and cached files</h3><ul>
          <li><strong>Preferences:</strong> theme, editor settings, selected course component and workspace position are remembered in this browser until reset or browser storage is cleared.</li>
          <li><strong>Guest work and study history:</strong> notes, chosen topics, practice progress and recent study history are stored locally to support your study tools. Local history has record-count limits rather than a single time limit.</li>
          <li><strong>Account-scoped practice drafts:</strong> keys beginning <code>neat-practice-draft:</code> and <code>recallstride-coding:</code> save unfinished practice and code separately for each account. They stop resuming after 30 days without a saved update and are removed when checked. Coding drafts are also cleared for that account on sign-out. Mini-mock resume lasts seven days. Other local study drafts can remain until cleared or the account is deleted. Export useful drafts before signing out on a shared computer.</li>
          <li><strong>Public app cache:</strong> the service worker caches app files so the interface can load through a temporary connection failure. Authenticated API responses and paid revision content are not stored in this cache. Old app caches are removed when a new release activates.</li>
          <li><strong>Optional usage history:</strong> when you enable measurement, defined feature events may be stored locally and sent to our account database. It is off by default. Disabling it stops collection and removes stored optional account events.</li>
        </ul><p>Local storage is not encrypted account backup and is not automatically available on another device. Someone using the same unlocked browser may be able to inspect it. Sign out and clear site data on a shared computer when appropriate; clearing browser storage removes local drafts.</p>
        <h3>Your choices</h3><p>Reset local preferences in Settings, clear coding data in Code, or use your browser’s controls to delete cookies and site data. Essential account storage is needed for saved sign-in and cannot be replaced by an analytics choice. You can keep optional measurement off and still use the study tools. Stripe’s Checkout and portal run on Stripe’s site and explain their own cookies there. For storage questions, contact ${support}.</p>` },

      'data-protection': { title: 'Your Account Data', html: `${date}
        <h3>Simple controls</h3><p>Your account data supports your study workspace. You can change profile details, download your information and close your account from Settings. Optional usage measurement is off unless you enable it. Coding source stays in this browser rather than being sent to the coding API.</p>
        <h3>Download and correct</h3><p>Settings → Data → <strong>Download workspace JSON</strong> downloads your available account, notes and study records. Code → <strong>Export coding data</strong> includes this device’s source drafts and local outcomes. Keep exports private: they may contain personal notes and answers. Contact support if you need information such as a support message or security record that is not included in the standard export.</p><p>Use Settings → Profile to correct your name and profile information. If an email, shared record or other detail cannot be changed there, send a correction request to ${support}.</p>
        <h3>Sign out other devices</h3><p>Settings → Profile lists current device sessions and lets you sign out other sessions. A password reset signs out existing sessions so you can sign in again with the new password. Sign out after using a shared device, and export browser-only drafts you need before doing so.</p>
        <h3>Delete your account</h3><p>Export first, then use Settings → Data → <strong>Delete account</strong>. Enter the requested confirmation and authentication. It removes the active account and its associated private notes and study data. Active subscriptions and ownership of existing shared or archived work need to be resolved first so billing or another person’s records are not lost. Contact us for help; a blocked button does not stop you making an erasure request.</p><p>Relevant support copies, provider accounting records and restricted recovery history may remain for the periods explained in the Privacy Policy. We remove or restrict them where required and tell you if a particular legal duty prevents immediate erasure. Recovery must reapply account deletions before restored data is used.</p>
        <h3>Privacy requests and complaints</h3>${rights}
        <h3>Students and parents</h3><p>If you are 16 or 17, you have privacy rights too. You may ask a trusted adult to help you contact us. We do not give parents or a school access to your personal study account solely on request. If someone acts on your behalf, we check the authority needed for the particular request and consider your rights and understanding.</p><h3>Who to contact</h3>${identity}` },
    };
  }

  function create(config = {}) {
    const settings = normalise(config);
    const pages = buildPages(settings);
    const isConfigured = () => Boolean(settings.operatorName && settings.postalAddress && settings.supportEmail);
    const get = (page) => ({ ...(Object.hasOwn(pages, page) ? pages[page] : pages.privacy), version: VERSION, effectiveDate: VERSION });
    return {
      version: VERSION,
      pages: PAGE_IDS,
      isConfigured,
      get,
      renderDocument(page) {
        if (!isConfigured()) throw new Error('The operator name, public postal address and support email are required to publish a policy document.');
        const policy = get(page);
        return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(policy.title)} · RecallStride</title><style>body{margin:0;background:#f5f7fa;color:#192b43;font:16px/1.65 system-ui,sans-serif}main{max-width:760px;margin:32px auto;padding:32px;background:#fff;border-radius:16px}h1{line-height:1.2}h3{margin-top:28px}a{color:#195548;overflow-wrap:anywhere}li{margin:.5em 0}.brand{font-weight:750;color:#195548}@media(max-width:600px){main{margin:0;padding:24px;border-radius:0}}@media print{body,main{background:white}main{margin:0;padding:0;border-radius:0}a{color:inherit}}</style></head><body><main><p class="brand">RecallStride</p><h1>${escape(policy.title)}</h1>${policy.html}<p><a href="${escape(settings.website)}">Return to RecallStride</a></p></main></body></html>`;
      },
    };
  }

  let current = create(initialConfig);
  return {
    version: VERSION,
    pages: PAGE_IDS,
    create,
    configure(config) { current = create(config); return current.isConfigured(); },
    isConfigured() { return current.isConfigured(); },
    get(page) { return current.get(page); },
    renderDocument(page) { return current.renderDocument(page); },
  };
});
