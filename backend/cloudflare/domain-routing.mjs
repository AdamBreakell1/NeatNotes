export const LEGACY_ORIGIN = "https://recallstride.breakellsystems.workers.dev";
export const CUSTOM_ORIGIN = "https://recallstride.com";

// Activated only after the owned domain is explicitly made canonical. POST
// requests to the old origin remain available for existing Stripe webhooks.
export function canonicalRedirect(request, env) {
  if (env.BASE_URL !== CUSTOM_ORIGIN || !["GET", "HEAD"].includes(request.method)) return null;
  const url = new URL(request.url);
  if (!["www.recallstride.com", new URL(LEGACY_ORIGIN).hostname].includes(url.hostname)) return null;
  const target = new URL(url.pathname + url.search, CUSTOM_ORIGIN);
  return new Response(null, { status: 308, headers: { Location: target.href, "Cache-Control": "no-store" } });
}
