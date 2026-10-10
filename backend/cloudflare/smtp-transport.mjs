import net from "node:net";
import tls from "node:tls";
import nodemailer from "nodemailer";
import authEmail from "../services/authEmail.js";

const { smtpTransportOptions } = authEmail;

function smtpSettings(environment) {
  const user = String(environment.SMTP_USER || "").trim();
  const host = String(environment.SMTP_HOST || (user.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : "")).trim();
  const gmail = host.toLowerCase().includes("gmail.com");
  const port = Number(environment.SMTP_PORT || (gmail ? 465 : 587));
  const secure = environment.SMTP_SECURE ? environment.SMTP_SECURE === "true" : port === 465;
  const rawPass = String(environment.SMTP_PASS || "");
  return { host, port, secure, user, pass: gmail ? rawPass.replace(/\s+/g, "") : rawPass };
}

// Nodemailer normally substitutes a DNS-resolved IP before opening its socket.
// Workers sockets must receive the original hostname for proxy routing and TLS
// identity verification. Supplying an already-open socket keeps Nodemailer's
// authentication, SMTP protocol, MIME building and certificate checks intact.
export function createCloudflareMailTransport(environment, dependencies = {}) {
  const mailer = dependencies.nodemailer || nodemailer;
  const tlsClient = dependencies.tls || tls;
  const netClient = dependencies.net || net;
  const settings = smtpSettings(environment);
  const options = smtpTransportOptions(settings);
  const sockets = new Set();
  let closed = false;

  const transport = mailer.createTransport({
    ...options,
    // Never authenticate over a plaintext connection if STARTTLS is required.
    requireTLS: !settings.secure,
    forceAuth: Boolean(settings.user),
    getSocket(_options, callback) {
      if (closed) {
        const error = new Error("SMTP transport is closed");
        error.code = "ECONNECTION";
        return callback(error);
      }
      let socket;
      let timer;
      let returned = false;
      const finish = (error) => {
        if (returned) return;
        returned = true;
        clearTimeout(timer);
        if (error) {
          try { socket?.destroy(); } catch {}
          return callback(error);
        }
        callback(null, { connection: socket, secured: settings.secure });
      };
      try {
        const connection = { host: settings.host, port: settings.port };
        socket = settings.secure
          ? tlsClient.connect({ ...connection, servername: settings.host, rejectUnauthorized: true })
          : netClient.connect(connection);
        sockets.add(socket);
        socket.on("error", (error) => finish(error));
        socket.once("close", () => {
          sockets.delete(socket);
          if (!returned) {
            const error = new Error("SMTP socket closed before connection");
            error.code = "ECONNECTION";
            finish(error);
          }
        });
        socket.once(settings.secure ? "secureConnect" : "connect", () => finish());
        timer = setTimeout(() => {
          const error = new Error("SMTP connection timed out");
          error.code = "ETIMEDOUT";
          finish(error);
        }, Math.min(8_000, options.connectionTimeout));
      } catch (error) {
        finish(error);
      }
    },
  });
  const originalClose = transport.close?.bind(transport);
  transport.close = () => {
    closed = true;
    for (const socket of sockets) {
      try { socket.destroy(); } catch {}
    }
    sockets.clear();
    originalClose?.();
  };
  return transport;
}
