(() => {
  const storedTheme = localStorage.getItem("neat-notes-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    storedTheme && storedTheme !== "system" ? storedTheme : prefersDark ? "dark" : "light";
})();
