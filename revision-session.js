(function initialiseSessions(root) {
  "use strict";
  function create(plan, id, now = new Date().toISOString()) {
    const seen = new Set();
    const items = plan.items.filter((item) => {
      if (!item.cardId || seen.has(item.cardId)) return false;
      seen.add(item.cardId);
      return true;
    });
    return { ...plan, version: 1, id, items, completedConceptIds: [], startedAt: now, completedAt: items.length ? null : now };
  }
  function next(session) {
    return session?.items.find((item) => !session.completedConceptIds.includes(item.cardId)) || null;
  }
  function complete(session, cardId, now = new Date().toISOString()) {
    if (next(session)?.cardId !== cardId) return session;
    const updated = { ...session, completedConceptIds: [...session.completedConceptIds, cardId] };
    if (!next(updated)) updated.completedAt = now;
    return updated;
  }
  function restore(value, allowedCardIds) {
    if (value?.version !== 1 || !Array.isArray(value.items) || !Array.isArray(value.completedConceptIds)) return null;
    if (!value.items.every((item) => item && allowedCardIds.has(item.cardId))) return null;
    if (new Set(value.items.map((item) => item.cardId)).size !== value.items.length) return null;
    if (!value.completedConceptIds.every((id, index) => value.items[index]?.cardId === id)) return null;
    return value;
  }
  const api = { create, next, complete, restore };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NEAT_REVISION_SESSION = api;
})(typeof window !== "undefined" ? window : globalThis);
