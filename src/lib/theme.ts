export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

/** Browser-chrome colour per theme; mirrors `--paper` in tokens.css. */
export const THEME_COLOR: Record<Theme, string> = { light: "#f4f1ea", dark: "#121110" };

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** An explicit choice wins; otherwise follow the OS. */
export function resolveTheme(stored: unknown, systemDark: boolean): Theme {
  return isTheme(stored) ? stored : systemDark ? "dark" : "light";
}

export function toggleTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/**
 * Store only choices that differ from the OS, so a reader who flips back to
 * their system theme keeps following the OS afterwards.
 */
export function themeToStore(next: Theme, systemDark: boolean): Theme | null {
  return next === (systemDark ? "dark" : "light") ? null : next;
}
