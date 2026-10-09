"use strict";

const AUTH_EMAIL_TIMEOUT_MS = 12_000;

class AuthEmailDeliveryError extends Error {
  constructor(kind, cause) {
    const messages = {
      configuration: "Account email is temporarily unavailable. Please try again later.",
      verification: "We couldn't send your verification email. Your account is saved. Try signing up again with the same email and password in a minute.",
      password_reset: "We couldn't send the password reset email. Please try again in a minute.",
    };
    super(messages[kind] || messages.configuration, { cause });
    this.name = "AuthEmailDeliveryError";
    this.status = 503;
    this.code = "AUTH_EMAIL_UNAVAILABLE";
  }
}

function smtpTransportOptions(settings) {
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  };
}

// Bound the entire delivery attempt, including DNS and a stalled SMTP dialogue.
// The injected transport keeps provider failure tests independent of real mail.
async function sendAuthenticationEmail({ createTransport, message, kind, onFailure = () => {}, timeoutMs = AUTH_EMAIL_TIMEOUT_MS }) {
  let transport;
  let timeout;
  try {
    transport = createTransport();
    const delivery = Promise.resolve().then(() => transport.sendMail(message));
    const deadline = new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        const error = new Error("Authentication email delivery timed out");
        error.code = "ETIMEDOUT";
        reject(error);
      }, timeoutMs);
    });
    const result = await Promise.race([delivery, deadline]);
    if (Array.isArray(result?.accepted) && result.accepted.length === 0) {
      const error = new Error("Authentication email recipient was rejected");
      error.code = "ERECIPIENT";
      throw error;
    }
    return result;
  } catch (error) {
    onFailure(error);
    throw new AuthEmailDeliveryError(kind, error);
  } finally {
    clearTimeout(timeout);
    try { transport?.close?.(); } catch {}
  }
}

module.exports = { AUTH_EMAIL_TIMEOUT_MS, AuthEmailDeliveryError, smtpTransportOptions, sendAuthenticationEmail };
