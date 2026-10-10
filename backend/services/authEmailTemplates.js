"use strict";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

function accountEmail({ name, url, subject, heading, introduction, action, expiry, ignore }) {
  const link = String(url ?? "");
  const parsed = new URL(link);
  if (!["http:", "https:"].includes(parsed.protocol) || /[\u0000-\u001f\u007f]/.test(link)) {
    throw new Error("Account email links must use HTTP or HTTPS.");
  }
  const greeting = name ? `Hi ${String(name)},` : "Hello,";
  const safeLink = escapeHtml(link);
  return {
    subject,
    text: ["RecallStride", "", heading, "", greeting, "", introduction, "", `${action}:`, link,
      "", `This link expires in ${expiry}.`, "", ignore, "", "RecallStride · A BreakellSystems product"].join("\n"),
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f5f7fa;color:#192b43;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(action)} to continue with RecallStride. This link expires in ${escapeHtml(expiry)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f7fa" style="width:100%;background-color:#f5f7fa;"><tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background-color:#ffffff;border:1px solid #d8e0dd;border-radius:16px;">
<tr><td style="padding:28px 28px 24px;border-bottom:1px solid #d8e0dd;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" height="44" align="center" bgcolor="#20374e" style="width:44px;height:44px;border-radius:12px;background-color:#20374e;color:#c1f3e0;font-size:18px;font-weight:700;">RS</td>
<td style="padding-left:12px;color:#192b43;font-size:23px;font-weight:700;letter-spacing:-0.5px;">RecallStride</td>
</tr></table></td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 20px;color:#192b43;font-size:28px;line-height:36px;font-weight:700;">${escapeHtml(heading)}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:26px;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;color:#526378;font-size:16px;line-height:26px;">${escapeHtml(introduction)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#236a5e" style="background-color:#236a5e;border-radius:10px;mso-padding-alt:14px 24px;"><a href="${safeLink}" style="display:inline-block;padding:14px 24px;border:1px solid #236a5e;border-radius:10px;color:#ffffff;font-size:16px;font-weight:700;line-height:24px;text-decoration:none;">${escapeHtml(action)}</a></td></tr></table>
<p style="margin:18px 0 24px;color:#526378;font-size:14px;line-height:22px;">This link expires in <strong>${escapeHtml(expiry)}</strong>.</p>
<p style="margin:0 0 24px;color:#526378;font-size:14px;line-height:22px;">${escapeHtml(ignore)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #d8e0dd;"><tr><td style="padding-top:20px;">
<p style="margin:0 0 8px;color:#526378;font-size:13px;line-height:21px;">Button not working? Copy and paste this link into your browser:</p>
<p style="margin:0;font-size:13px;line-height:21px;word-break:break-all;overflow-wrap:anywhere;"><a href="${safeLink}" style="color:#236a5e;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${safeLink}</a></p>
</td></tr></table></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="margin:20px 0 0;color:#526378;font-size:12px;line-height:20px;">RecallStride · A BreakellSystems product</p>
</td></tr></table></body></html>`,
  };
}

function verificationEmail({ name, url }) {
  return accountEmail({ name, url, subject: "Verify your RecallStride account", heading: "Welcome to RecallStride",
    introduction: "Thanks for creating an account. Verify your email to start revising, practising and writing code in your RecallStride workspace.",
    action: "Verify my email", expiry: "24 hours", ignore: "If you didn't create a RecallStride account, you can ignore this email." });
}

function passwordResetEmail({ name, url }) {
  return accountEmail({ name, url, subject: "Reset your RecallStride password", heading: "Reset your password",
    introduction: "We received a request to reset your RecallStride password. Use the button below to choose a new password and return to your workspace.",
    action: "Reset my password", expiry: "30 minutes", ignore: "If you didn't request a password reset, you can ignore this email. Your password will stay the same." });
}

module.exports = { verificationEmail, passwordResetEmail };
