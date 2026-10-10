// Operator RPC only. No customer records are returned by these methods.
export const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERY_RESTART_MESSAGE = "RecallStride recovery restart requested";

const validObjectId = (id) => typeof id === "string" && /^[a-f0-9]{64}$/.test(id);
const validBookmark = (bookmark) => typeof bookmark === "string" && /^[A-Za-z0-9-]{16,160}$/.test(bookmark);

export function createRecoveryController(ctx, env) {
  const objectId = () => String(ctx.id);
  function enabled() {
    if (env.RECOVERY_MODE !== "true") throw new Error("Enable RECOVERY_MODE for an operator recovery session.");
    if (typeof ctx.storage.getCurrentBookmark !== "function") throw new Error("Cloudflare native recovery is unavailable in this runtime.");
  }
  function target(input) {
    enabled();
    if (!validObjectId(input?.objectId) || input.objectId !== objectId()) throw new Error("Recovery object ID does not match the bound database.");
  }
  function mutation(input) {
    target(input);
    if (env.MIGRATION_MODE !== "true") throw new Error("Put the application in maintenance before restoring its database.");
    if (input.confirmRestoreObject !== objectId()) throw new Error("Explicit confirmation of the database object ID is required for restoration.");
  }
  return {
    async info() {
      enabled();
      return { objectId: objectId(), bookmark: await ctx.storage.getCurrentBookmark(),
        databaseBytes: ctx.storage.sql.databaseSize, retentionDays: 30,
        maintenance: env.MIGRATION_MODE === "true", nativeRecovery: true };
    },
    async bookmarkForTime(input) {
      target(input);
      const timestamp = Date.parse(input.timestamp);
      if (!Number.isFinite(timestamp) || timestamp > Date.now() || timestamp < Date.now() - RECOVERY_WINDOW_MS) {
        throw new Error("Recovery timestamp must be an ISO date within the past 30 days.");
      }
      return { objectId: objectId(), timestamp: new Date(timestamp).toISOString(),
        bookmark: await ctx.storage.getBookmarkForTime(timestamp) };
    },
    async prepare(input) {
      mutation(input);
      if (!validBookmark(input.bookmark)) throw new Error("Invalid recovery bookmark.");
      const undoBookmark = await ctx.storage.onNextSessionRestoreBookmark(input.bookmark);
      // Save this response outside the Durable Object before requesting restart.
      return { objectId: objectId(), restoreBookmark: input.bookmark, undoBookmark,
        preparedAt: new Date().toISOString(), status: "restore_on_next_restart" };
    },
    restart(input) {
      mutation(input);
      ctx.abort(RECOVERY_RESTART_MESSAGE);
    },
  };
}
