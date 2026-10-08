(function (root, factory) {
  const navigation = factory();
  if (typeof module === "object" && module.exports) module.exports = navigation;
  else root.WorkspaceNavigation = navigation;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const destinations = { today: "home", revise: "revise", practice: "practice", code: "coding", progress: "progress", help: "contact" };
  const paths = Object.fromEntries(Object.entries(destinations).map(([path, section]) => [section, path]));
  const modes = ["quick", "exam", "mock", "labs"];
  const safeId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : null;

  function parse(hash) {
    if (!hash.startsWith("#/")) return null;
    const [path, query = ""] = hash.slice(2).split("?");
    const [destination, activity] = path.split("/");
    const params = new URLSearchParams(query);
    if (!destinations[destination]) return { section: "home" };
    const route = { section: destinations[destination] };
    if (destination === "revise") {
      if (activity === "notes") route.section = "notes";
      else route.studyView = activity === "cards" ? "cards" : "topics";
    }
    if (destination === "practice") route.mode = modes.includes(activity) ? activity : "hub";
    if (["revise", "practice", "progress"].includes(destination)) {
      if (safeId(params.get("topic"))) route.topicId = params.get("topic");
      if (["h446-01", "h446-02"].includes(params.get("component"))) route.componentId = params.get("component");
    }
    if (destination === "code" && safeId(params.get("task"))) route.taskId = params.get("task");
    return route;
  }

  function format(route) {
    let path = route.section === "notes" ? "revise/notes" : paths[route.section] || "today";
    if (route.section === "revise" && route.studyView === "cards") path += "/cards";
    if (route.section === "practice" && modes.includes(route.mode)) path += `/${route.mode}`;
    const params = new URLSearchParams();
    if (["revise", "practice", "progress"].includes(route.section)) {
      if (["h446-01", "h446-02"].includes(route.componentId)) params.set("component", route.componentId);
      if (safeId(route.topicId) && (route.studyView === "cards" || modes.includes(route.mode))) params.set("topic", route.topicId);
    }
    if (route.section === "coding" && safeId(route.taskId)) params.set("task", route.taskId);
    return `#/${path}${params.size ? `?${params}` : ""}`;
  }
  return { parse, format };
});
