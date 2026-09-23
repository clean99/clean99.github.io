import { describe, expect, it } from "vitest";
import {
  checkUrls,
  failures,
  formatReport,
  normalizeRequestPath,
  parseCaseMap,
  parseRedirectTarget,
  resolveRequest,
  stripQuery
} from "../../scripts/lib/legacy-check.mjs";

/** In-memory stand-in for a GitHub Pages directory. */
function build(files: Record<string, string>) {
  const read = (rel: string) => files[rel] ?? "";
  return {
    exists: (rel: string) => rel in files,
    read,
    caseMap: "404.html" in files ? parseCaseMap(read("404.html")) : {}
  };
}

const stub = (to: string) => `<!doctype html><meta http-equiv="refresh" content="0; url=${to}">`;

describe("normalizeRequestPath / stripQuery", () => {
  it("keeps a leading slash and collapses duplicate slashes", () => {
    expect(normalizeRequestPath("writing/")).toBe("/writing/");
    expect(normalizeRequestPath("/a//b/")).toBe("/a/b/");
    expect(normalizeRequestPath("/")).toBe("/");
  });

  it("drops query strings and fragments", () => {
    expect(stripQuery("/writing/?area=ai")).toBe("/writing/");
    expect(stripQuery("/about/#contact")).toBe("/about/");
    expect(stripQuery("")).toBe("/");
  });
});

describe("parseCaseMap", () => {
  it("reads the lowercase → canonical map from the 404 page", () => {
    const html = `<script type="application/json" id="case-map">{"/about/":"/about/","/works/":"/projects/"}</script>`;
    expect(parseCaseMap(html)).toEqual({ "/about/": "/about/", "/works/": "/projects/" });
  });

  it("tolerates a missing block or malformed JSON", () => {
    expect(parseCaseMap("<html></html>")).toEqual({});
    expect(parseCaseMap(`<script id="case-map">{oops</script>`)).toEqual({});
    expect(parseCaseMap(`<script id="case-map">["/a/"]</script>`)).toEqual({});
  });

  it("normalizes keys to lowercase so lookups are case-insensitive", () => {
    const html = `<script id="case-map">{"/Tags/Agent/":"/tags/Agent/"}</script>`;
    expect(parseCaseMap(html)["/tags/agent/"]).toBe("/tags/Agent/");
  });
});

describe("parseRedirectTarget", () => {
  it("extracts the target of a meta-refresh stub", () => {
    expect(parseRedirectTarget(stub("/projects/"))).toBe("/projects/");
    expect(parseRedirectTarget(`<meta http-equiv="refresh" content="0;URL='/a/b/'">`)).toBe("/a/b/");
  });

  it("returns null for a page with no meta refresh", () => {
    expect(parseRedirectTarget("<html><body>hi</body></html>")).toBeNull();
  });

  it("returns null when the refresh has no url=", () => {
    expect(parseRedirectTarget(`<meta http-equiv="refresh" content="5">`)).toBeNull();
  });
});

describe("resolveRequest", () => {
  // Mirrors a real Linux build: the file on disk is `about/index.html`, the
  // legacy URL was `/About/`, and the 404 page carries the lowercase → canonical
  // map so that case variant can find its way home.
  const dist = build({
    "index.html": "<html>home</html>",
    "writing/index.html": "<html>writing</html>",
    "about/index.html": "<html>about</html>",
    "tags/agent/index.html": "<html>agent</html>",
    "2024/04/10/Web-Performance-Optimization/index.html": "<html>post</html>",
    "interviewers/index.html": stub("/projects/"),
    "zh/interviewers/index.html": stub("/zh/projects/"),
    "projects/index.html": "<html>projects</html>",
    "zh/projects/index.html": "<html>项目</html>",
    "broken/index.html": stub("/nowhere/"),
    "loop/index.html": stub("/loop/"),
    "favicon.svg": "<svg></svg>",
    "feed.xml": "<feed></feed>",
    "404.html": `<script type="application/json" id="case-map">{"/about/":"/about/","/tags/agent/":"/tags/agent/","/writing/":"/writing/"}</script>`
  });

  it("resolves a directory to its index.html", () => {
    expect(resolveRequest("/writing/", dist)).toEqual({ ok: true, kind: "index", target: "/writing/" });
    expect(resolveRequest("/writing", dist).ok).toBe(true);
  });

  it("resolves the site root", () => {
    expect(resolveRequest("/", dist).ok).toBe(true);
  });

  it("resolves an exact file", () => {
    expect(resolveRequest("/favicon.svg", dist)).toEqual({ ok: true, kind: "file", target: "/favicon.svg" });
    expect(resolveRequest("/feed.xml", dist).ok).toBe(true);
  });

  it("follows a meta-refresh stub and confirms the target exists", () => {
    expect(resolveRequest("/interviewers/", dist)).toEqual({ ok: true, kind: "redirect", target: "/projects/" });
    expect(resolveRequest("/zh/interviewers/", dist)).toEqual({ ok: true, kind: "redirect", target: "/zh/projects/" });
  });

  it("fails when a stub points at a missing page", () => {
    const result = resolveRequest("/broken/", dist);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("/nowhere/");
  });

  it("reports a self-referential stub as a loop rather than a pass", () => {
    const result = resolveRequest("/loop/", dist);
    expect(result.ok).toBe(false);
    expect(result.kind).toBe("missing");
  });

  it("recovers a case variant from the 404 case map", () => {
    expect(resolveRequest("/About/", dist)).toEqual({ ok: true, kind: "case", target: "/about/" });
    expect(resolveRequest("/Tags/Agent/", dist)).toEqual({ ok: true, kind: "case", target: "/tags/agent/" });
  });

  it("maps any casing of a known page, because the map is keyed lowercase", () => {
    expect(resolveRequest("/WRITING/", dist).ok).toBe(true);
  });

  it("still fails when a case variant maps to a page that was never built", () => {
    // `/Links/` is a retired page with no build output and no case-map entry.
    expect(resolveRequest("/Links/", dist).ok).toBe(false);
  });

  it("fails for a path that is in neither the build nor the case map", () => {
    expect(resolveRequest("/Nope/", dist).ok).toBe(false);
  });

  it("does not treat the canonical path as its own case recovery", () => {
    const result = resolveRequest("/about/", dist);
    expect(result.kind).toBe("index");
  });
});

describe("checkUrls / failures / formatReport", () => {
  const dist = build({
    "index.html": "home",
    "interviewers/index.html": stub("/projects/"),
    "projects/index.html": "projects"
  });

  it("keeps input order and marks each result", () => {
    const results = checkUrls(["/", "/interviewers/", "/gone/"], dist);
    expect(results.map((r) => r.url)).toEqual(["/", "/interviewers/", "/gone/"]);
    expect(results.map((r) => r.ok)).toEqual([true, true, false]);
  });

  it("selects only the failures", () => {
    const results = checkUrls(["/", "/gone/"], dist);
    expect(failures(results).map((r) => r.url)).toEqual(["/gone/"]);
  });

  it("summarizes the pass rate and lists every failure", () => {
    const report = formatReport(checkUrls(["/", "/gone/"], dist));
    expect(report).toContain("1/2 legacy URLs resolve");
    expect(report).toContain("FAIL");
  });
});
