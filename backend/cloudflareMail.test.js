const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

async function fixture(secure = true, environment = {}) {
  const { createCloudflareMailTransport } = await import("./cloudflare/smtp-transport.mjs");
  let options;
  let connectionOptions;
  const socket = new EventEmitter();
  socket.destroyed = false;
  socket.destroy = () => {
    if (socket.destroyed) return;
    socket.destroyed = true;
    socket.emit("close");
  };
  const connect = (input) => { connectionOptions = input; return socket; };
  const transport = createCloudflareMailTransport({
    SMTP_HOST: "smtp.fixture.test", SMTP_PORT: secure ? "465" : "587", SMTP_SECURE: String(secure),
    SMTP_USER: "synthetic@fixture.test", SMTP_PASS: "synthetic-password",
    ...environment,
  }, {
    nodemailer: { createTransport(input) { options = input; return { close() {} }; } },
    tls: { connect }, net: { connect },
  });
  return { transport, socket, options, connection: () => connectionOptions };
}

test("Cloudflare SMTP cannot authenticate before certificate-validated TLS connects", async () => {
  const fixtureData = await fixture();
  const results = [];
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  assert.equal(fixtureData.connection().host, "smtp.fixture.test");
  assert.equal(fixtureData.connection().servername, "smtp.fixture.test");
  assert.equal(fixtureData.connection().rejectUnauthorized, true);
  fixtureData.socket.emit("connect");
  assert.equal(results.length, 0, "An unencrypted TCP connect must not release SMTP authentication");
  fixtureData.socket.emit("secureConnect");
  assert.equal(results.length, 1);
  assert.equal(results[0][0], null);
  assert.equal(results[0][1].secured, true);
  fixtureData.transport.close();
  assert.equal(fixtureData.socket.destroyed, true);
});

test("Cloudflare SMTP submission port requires STARTTLS before authentication", async () => {
  const fixtureData = await fixture(false);
  const results = [];
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  assert.equal(fixtureData.options.requireTLS, true);
  assert.equal(fixtureData.options.forceAuth, true);
  fixtureData.socket.emit("connect");
  assert.equal(results[0][1].secured, false, "The initial TCP socket must not be mislabeled as TLS");
  fixtureData.transport.close();
});

test("Closing a pending SMTP connection aborts it once and prevents reconnects", async () => {
  const fixtureData = await fixture();
  const results = [];
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  fixtureData.transport.close();
  fixtureData.socket.emit("error", new Error("Synthetic later connection failure"));
  fixtureData.socket.emit("secureConnect");
  assert.equal(results.length, 1);
  assert.equal(results[0][0].code, "ECONNECTION");
  assert.equal(fixtureData.socket.destroyed, true);
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  assert.equal(results.length, 2);
  assert.equal(results[1][0].code, "ECONNECTION");
});

test("Existing Gmail configuration and app password normalization are preserved", async () => {
  const fixtureData = await fixture(true, {
    SMTP_HOST: "", SMTP_USER: "synthetic@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop",
  });
  assert.equal(fixtureData.options.host, "smtp.gmail.com");
  assert.deepEqual(fixtureData.options.auth, { user: "synthetic@gmail.com", pass: "abcdefghijklmnop" });
  fixtureData.transport.close();
});

test("Failed SMTP socket is closed and reports its failure only once", async () => {
  const fixtureData = await fixture();
  const results = [];
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  const failure = new Error("Synthetic TLS failure");
  failure.code = "ESOCKET";
  fixtureData.socket.emit("error", failure);
  fixtureData.socket.emit("secureConnect");
  assert.equal(results.length, 1);
  assert.equal(results[0][0], failure);
  assert.equal(fixtureData.socket.destroyed, true);
  fixtureData.transport.close();
});

test("SMTP handshake timeout closes the socket without a later callback", async (context) => {
  const fixtureData = await fixture();
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const results = [];
  fixtureData.options.getSocket({}, (...args) => results.push(args));
  context.mock.timers.tick(8_000);
  fixtureData.socket.emit("secureConnect");
  assert.equal(results.length, 1);
  assert.equal(results[0][0].code, "ETIMEDOUT");
  assert.equal(fixtureData.socket.destroyed, true);
  fixtureData.transport.close();
});
