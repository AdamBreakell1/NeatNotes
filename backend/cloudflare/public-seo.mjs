const privateAction = (url) => ["reset", "verified", "checkout", "billing"].some((key) => url.searchParams.has(key));

// The app uses hash routes, so only / is its public document. Unknown paths
// must not silently produce an indexable 200 copy of the landing page.
export function publicIndexRedirect(request) {
  const url = new URL(request.url);
  if (!["GET", "HEAD"].includes(request.method) || url.pathname !== "/index.html") return null;
  url.pathname = "/";
  return Response.redirect(url, 308);
}

export function protectPublicResponse(request, response) {
  const url = new URL(request.url);
  const html = (response.headers.get("Content-Type") || "").includes("text/html");
  const unknownDocument = html && url.pathname !== "/" && !url.pathname.startsWith("/ocr-h446/") && !url.pathname.startsWith("/api/");
  const privateResponse = url.pathname.startsWith("/api/") || privateAction(url) || unknownDocument || response.status >= 400;
  if (!privateResponse) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (privateAction(url)) headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: unknownDocument && response.status === 200 ? 404 : response.status, statusText: unknownDocument && response.status === 200 ? "Not Found" : response.statusText, headers });
}
