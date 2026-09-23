/**
 * Resolving a request path against a GitHub Pages build directory.
 *
 * GitHub Pages is a plain static host with three behaviours that matter here:
 * it is case-sensitive, it serves `<dir>/index.html` for a directory request,
 * and it serves `404.html` when nothing matches. There is no server-side
 * rewrite, so the retired-URL stubs in `src/lib/redirects.ts` are delivered as
 * meta-refresh HTML and the `/About/`-style case variants are resolved by a
 * script on the 404 page from the case map it embeds.
 *
 * Everything in this module is pure: filesystem access arrives through the
 * `context` passed to `resolveRequest`, so the rules can be unit-tested against
 * a small in-memory fixture instead of a real build.
 */

/**
 * @typedef {object} ResolveContext
 * @property {(rel: string) => boolean} exists
 * @property {(rel: string) => string} read
 * @property {Record<string, string>} [caseMap]
 *
 * @typedef {object} Resolved
 * @property {boolean} ok
 * @property {string} kind
 * @property {string} target
 * @property {string} [reason]
 */

/** Pages that answer a request for `foo` from `foo.html`. */
const HTML_FALLBACK = ".html";

/** @param {string} url @returns {string} */
export function stripQuery(url) {
  return String(url).split(/[?#]/, 1)[0] || "/";
}

/** @param {string} url @returns {string} */
export function normalizeRequestPath(url) {
  const raw = stripQuery(url).trim();
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/{2,}/g, "/");
}

/**
 * Trailing-slash-free, leading-slash-free form used to address files in `dist`.
 * @param {string} path
 * @returns {string[]}
 */
function relativeCandidates(path) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const base = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!base) return ["index.html"];
  return [`${base}/index.html`, base, `${base}${HTML_FALLBACK}`];
}

/**
 * The `<script type="application/json" id="case-map">` block the 404 page reads.
 * Keys are lowercase request paths, values are the canonical path. An empty map
 * simply means no case variant of a URL can be recovered in this build.
 *
 * @param {unknown} html
 * @returns {Record<string, string>}
 */
export function parseCaseMap(html) {
  const match = /<script[^>]*id=["']case-map["'][^>]*>([\s\S]*?)<\/script>/i.exec(String(html ?? ""));
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    /** @type {Record<string, string>} */
    const map = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) map[key.toLowerCase()] = value;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Target of a meta-refresh stub, or null when the page is a real page.
 * @param {unknown} html
 * @returns {string | null}
 */
export function parseRedirectTarget(html) {
  // The content attribute is quoted with a character that can also appear inside
  // it (`content="0;URL='/a/b/'"`), so match the delimiter with a backreference.
  const tag = /<meta[^>]*http-equiv\s*=\s*(["']?)refresh\1[^>]*>/i.exec(String(html ?? ""));
  if (!tag) return null;
  const content = /content\s*=\s*(?:(["'])([\s\S]*?)\1|([^\s>]+))/i.exec(tag[0]);
  if (!content) return null;
  const value = content[2] ?? content[3] ?? "";
  const url = /url\s*=\s*(.+)$/i.exec(value);
  if (!url) return null;
  const target = url[1]
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  return target || null;
}

/**
 * @param {string} path
 * @param {ResolveContext} context
 * @returns {{ candidate: string, kind: string } | null}
 */
function lookup(path, context) {
  for (const candidate of relativeCandidates(path)) {
    if (context.exists(candidate)) return { candidate, kind: candidate.endsWith("index.html") ? "index" : "file" };
  }
  return null;
}

/**
 * @param {string} path
 * @param {ResolveContext} context
 * @param {number} depth
 * @returns {{ path: string, kind: string, target?: string } | null}
 */
function followRedirect(path, context, depth) {
  const found = lookup(path, context);
  if (!found) return null;
  if (depth <= 0) return { path, kind: "redirect-loop" };
  const target = parseRedirectTarget(context.read(found.candidate));
  if (!target) return { path, kind: found.kind };
  // A stub that points at itself (or at a path that points back) would ping-pong
  // forever in the browser, so treat it as a failure rather than a pass.
  if (stripQuery(target) === path) return { path, kind: "redirect-loop" };
  const next = followRedirect(normalizeRequestPath(target), context, depth - 1);
  if (!next) return { path, kind: "redirect-broken", target: normalizeRequestPath(target) };
  return { path: next.path, kind: "redirect", target: next.path };
}

/**
 * Where a request for `path` ends up in this build.
 *
 * @param {string} path request path, with or without a trailing slash
 * @param {ResolveContext} context
 * @returns {Resolved}
 */
export function resolveRequest(path, context) {
  const requestPath = normalizeRequestPath(path);
  const caseMap = context.caseMap ?? {};

  const direct = followRedirect(requestPath, context, 8);
  if (direct && direct.kind !== "redirect-loop" && direct.kind !== "redirect-broken") {
    return { ok: true, kind: direct.kind, target: direct.path };
  }

  const reason = direct?.kind === "redirect-broken" ? `redirect target ${direct.target} does not exist` : undefined;

  // Case variants cannot exist on a case-insensitive build disk, so they arrive
  // as a 404 and are recovered from the map that page carries.
  const lower = requestPath.toLowerCase();
  const canonical = caseMap[lower];
  if (canonical && stripQuery(canonical) !== requestPath) {
    const resolved = followRedirect(normalizeRequestPath(canonical), context, 8);
    if (resolved && resolved.kind !== "redirect-loop" && resolved.kind !== "redirect-broken") {
      return { ok: true, kind: "case", target: resolved.path };
    }
  }

  return { ok: false, kind: "missing", target: "", ...(reason ? { reason } : {}) };
}

/**
 * Resolve a list of URLs, preserving order so the report reads like the sitemap.
 *
 * @param {readonly string[]} urls
 * @param {ResolveContext} context
 * @returns {(Resolved & { url: string })[]}
 */
export function checkUrls(urls, context) {
  return urls.map((url) => ({ url, ...resolveRequest(url, context) }));
}

/** @param {readonly (Resolved & { url: string })[]} results @returns {(Resolved & { url: string })[]} */
export function failures(results) {
  return results.filter((result) => !result.ok);
}

/**
 * Fixed-width table so a long failure list stays readable in CI logs.
 * @param {readonly (Resolved & { url: string })[]} results
 * @returns {string}
 */
export function formatReport(results) {
  const width = Math.max(20, ...results.map((result) => result.url.length)) + 2;
  const lines = ["URL".padEnd(width) + "RESULT", "-".repeat(width + 48)];
  for (const result of results) {
    const status = result.ok ? `ok (${result.kind}) → ${result.target}` : `FAIL (${result.reason ?? result.kind})`;
    lines.push(result.url.padEnd(width) + status);
  }
  const failed = failures(results).length;
  lines.push("-".repeat(width + 48));
  lines.push(`${results.length - failed}/${results.length} legacy URLs resolve`);
  return lines.join("\n");
}
