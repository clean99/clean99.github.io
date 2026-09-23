import { THEME_COLOR, THEME_KEY, isTheme, resolveTheme, themeToStore, toggleTheme, type Theme } from "../lib/theme";

const root = document.documentElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function stored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  root.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_COLOR[theme];
  }
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-pressed", String(theme === "dark"));
  }
}

apply(resolveTheme(stored(), systemDark.matches));

for (const button of document.querySelectorAll("[data-theme-toggle]")) {
  button.addEventListener("click", () => {
    const current = isTheme(root.dataset.theme) ? root.dataset.theme : resolveTheme(stored(), systemDark.matches);
    const next = toggleTheme(current);
    const keep = themeToStore(next, systemDark.matches);
    try {
      if (keep) localStorage.setItem(THEME_KEY, keep);
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // Private mode: the choice still applies for this page view.
    }
    apply(next);
  });
}

// Readers who never chose follow the OS live.
systemDark.addEventListener("change", (event) => {
  if (!isTheme(stored())) apply(event.matches ? "dark" : "light");
});
