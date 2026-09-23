/**
 * Case recovery for the 404 page.
 *
 * GitHub Pages paths are case-sensitive but the build disk of whoever runs
 * `astro build` usually is not, so `/About/` and `/about/` cannot both be
 * shipped. A lowercase → canonical map embedded in the 404 page is enough to
 * send a reader (and a crawler that executes scripts) to the page they meant,
 * while leaving the query string and fragment alone.
 */

/** Strip the query and fragment a reader may still need, so they can be re-attached. */
export function splitQuery(path: string): { path: string; suffix: string } {
  const index = path.search(/[?#]/);
  if (index === -1) return { path, suffix: "" };
  return { path: path.slice(0, index), suffix: path.slice(index) };
}

/**
 * The canonical path for a request that differs from a live page only in case
 * (or that carries a trailing slash the map does not), or `null` when nothing
 * matches. Both arguments may carry a query or fragment; the returned path keeps
 * the request's own suffix.
 */
export function resolveCaseVariant(requested: string, caseMap: Readonly<Record<string, string>>): string | null {
  const { path, suffix } = splitQuery(requested);
  let decoded: string;
  try {
    decoded = decodeURI(path);
  } catch {
    decoded = path;
  }

  const tries = [decoded, `${decoded}/`];
  const seen = new Set<string>();

  for (const key of tries) {
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const canonical = caseMap[lower];
    if (!canonical || !canonical.startsWith("/")) continue;
    // A request that already resolves to its own canonical path needs no rewrite.
    if (canonical === decoded) return null;
    return `${canonical}${suffix}`;
  }
  return null;
}

/** Parse the map embedded in `<script type="application/json" id="case-map">`. */
export function parseCaseMap(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value) map[key.toLowerCase()] = value;
    }
    return map;
  } catch {
    return {};
  }
}

/** Does this request look like it is already the canonical page? */
export function samePath(a: string, b: string): boolean {
  return splitQuery(a).path.replace(/\/$/, "") === splitQuery(b).path.replace(/\/$/, "");
}

export interface NotFoundCopy {
  /** Document language for `<html lang>`. */
  htmlLang: string;
  documentTitle: string;
  title: string;
  lede: string;
  home: string;
  homePath: string;
  writing: string;
  writingPath: string;
  searchHint: string;
  recent: string;
}

/** The language a request looked like, from the path alone. */
export function langForPath(path: string): "en" | "zh" {
  return /^\/zh(\/|$)/.test(path) ? "zh" : "en";
}

/**
 * The 404 document is one file shared by both languages, so which column to
 * show is decided in the browser from the path that was requested — the build
 * cannot know it. The returned copy also names the localized target of each
 * link, so the reader stays inside their language.
 */
export function copyFor(requested: string, copy: Record<"en" | "zh", NotFoundCopy>): NotFoundCopy {
  return copy[langForPath(splitQuery(requested).path)];
}
