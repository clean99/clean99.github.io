import { describe, expect, it } from "vitest";
import {
  copyFor,
  langForPath,
  parseCaseMap,
  resolveCaseVariant,
  samePath,
  splitQuery
} from "../../src/client/not-found-logic";
import { NOT_FOUND_COPY } from "../../src/lib/copy/not-found";
import { collectTags } from "../../src/lib/posts";
import { SECTION_ALIASES, caseMapFor, pagePaths } from "../../src/lib/sitemap";
import { loadPosts } from "./content";

const posts = loadPosts();
const tags = { en: collectTags(posts, "en"), zh: collectTags(posts, "zh") };
const MAP = caseMapFor({ posts, tags });

describe("splitQuery", () => {
  it("separates the path from the query and fragment a reader may need back", () => {
    expect(splitQuery("/writing/")).toEqual({ path: "/writing/", suffix: "" });
    expect(splitQuery("/writing/?area=ai")).toEqual({ path: "/writing/", suffix: "?area=ai" });
    expect(splitQuery("/about/#contact")).toEqual({ path: "/about/", suffix: "#contact" });
    expect(splitQuery("/about/?a=1#b")).toEqual({ path: "/about/", suffix: "?a=1#b" });
  });
});

describe("resolveCaseVariant", () => {
  const map = {
    "/about/": "/about/",
    "/works/": "/projects/",
    "/tags/frontend/": "/tags/frontend/",
    "/2026/06/19/designing-an-operations-heartbeat-system/": "/2026/06/19/Designing-an-Operations-Heartbeat-System/"
  };

  it("recovers a case variant of a live page", () => {
    expect(resolveCaseVariant("/About/", map)).toBe("/about/");
    expect(resolveCaseVariant("/TAGS/Frontend/", map)).toBe("/tags/frontend/");
  });

  it("recovers a post whose slug was typed in another case", () => {
    expect(resolveCaseVariant("/2026/06/19/designing-an-operations-heartbeat-system/", map)).toBe(
      "/2026/06/19/Designing-an-Operations-Heartbeat-System/"
    );
  });

  it("keeps the query and fragment the reader arrived with", () => {
    expect(resolveCaseVariant("/About/?ref=nav#team", map)).toBe("/about/?ref=nav#team");
  });

  it("maps a retired section to its replacement", () => {
    expect(resolveCaseVariant("/Works/", map)).toBe("/projects/");
    expect(resolveCaseVariant("/works/", map)).toBe("/projects/");
  });

  it("returns null for a request that is already canonical", () => {
    expect(resolveCaseVariant("/about/", map)).toBeNull();
    expect(resolveCaseVariant("/About/", { "/about/": "/About/" })).toBeNull();
  });

  it("returns null for a path nothing maps", () => {
    expect(resolveCaseVariant("/definitely-not-here/", map)).toBeNull();
    expect(resolveCaseVariant("/", map)).toBeNull();
    expect(resolveCaseVariant("", map)).toBeNull();
  });

  it("tries the trailing-slash form of a bare segment", () => {
    expect(resolveCaseVariant("/ABOUT", map)).toBe("/about/");
  });

  it("ignores a map value that is not a site path", () => {
    expect(resolveCaseVariant("/evil/", { "/evil/": "https://example.com/x" })).toBeNull();
  });

  it("survives a percent-encoded path", () => {
    expect(resolveCaseVariant("/%41bout/", map)).toBe("/about/");
  });
});

describe("parseCaseMap", () => {
  it("reads the map and lowercases its keys", () => {
    expect(parseCaseMap('{"/Tags/Agent/":"/tags/Agent/"}')).toEqual({ "/tags/agent/": "/tags/Agent/" });
  });

  it("tolerates malformed or hostile input", () => {
    expect(parseCaseMap(null)).toEqual({});
    expect(parseCaseMap("")).toEqual({});
    expect(parseCaseMap("{oops")).toEqual({});
    expect(parseCaseMap('["/a/"]')).toEqual({});
    expect(parseCaseMap('{"/a/":42}')).toEqual({});
  });
});

describe("samePath", () => {
  it("compares paths while ignoring the trailing slash and query", () => {
    expect(samePath("/about/", "/about")).toBe(true);
    expect(samePath("/about/?x=1", "/about/")).toBe(true);
    expect(samePath("/about/", "/tags/")).toBe(false);
  });
});

describe("404 copy", () => {
  it("reads the language from the requested path", () => {
    expect(langForPath("/About/")).toBe("en");
    expect(langForPath("/zh/About/")).toBe("zh");
    expect(langForPath("/zh")).toBe("zh");
    expect(langForPath("/zh/")).toBe("zh");
    expect(langForPath("/zhos/")).toBe("en");
  });

  it("ignores a query string when picking the language", () => {
    expect(langForPath("/writing/?lang=zh")).toBe("en");
    expect(copyFor("/nope/?x=/zh/", NOT_FOUND_COPY)).toBe(NOT_FOUND_COPY.en);
  });

  it("points each language at its own home and writing index", () => {
    expect(copyFor("/nope/", NOT_FOUND_COPY).homePath).toBe("/");
    expect(copyFor("/nope/", NOT_FOUND_COPY).writingPath).toBe("/writing/");
    expect(copyFor("/zh/nope/", NOT_FOUND_COPY).homePath).toBe("/zh/");
    expect(copyFor("/zh/nope/", NOT_FOUND_COPY).writingPath).toBe("/zh/writing/");
  });

  it("changes the document language too, so a screen reader stays in the right voice", () => {
    expect(copyFor("/zh/nope/", NOT_FOUND_COPY).htmlLang).toBe("zh-CN");
    expect(copyFor("/nope/", NOT_FOUND_COPY).htmlLang).toBe("en");
  });

  it("has copy in both languages with no empty string", () => {
    for (const column of [NOT_FOUND_COPY.en, NOT_FOUND_COPY.zh]) {
      for (const [key, value] of Object.entries(column)) {
        expect(value, `${key} is empty`).toBeTruthy();
      }
    }
    expect(NOT_FOUND_COPY.zh.title).not.toBe(NOT_FOUND_COPY.en.title);
  });
});

describe("case map for the real build", () => {
  it("contains every section page in both languages", () => {
    for (const [from, to] of Object.entries(SECTION_ALIASES)) {
      expect(MAP[from], `${from} is missing from the case map`).toBe(to);
    }
    expect(MAP["/about/"]).toBe("/about/");
    expect(MAP["/zh/about/"]).toBe("/zh/about/");
  });

  it("contains every tag hub the site publishes", () => {
    expect(MAP["/tags/react/"]).toBe("/tags/react/");
  });

  it("recovers the legacy casings the E2E suite names", () => {
    expect(resolveCaseVariant("/About/", MAP)).toBe("/about/");
    expect(resolveCaseVariant("/Links/", MAP)).toBe("/links/");
    expect(resolveCaseVariant("/tags/Frontend/", MAP)).toBe("/tags/frontend/");
  });

  it("maps to a path that is itself a real page", () => {
    const real = new Set(pagePaths({ posts, tags }));
    for (const [from, to] of Object.entries(SECTION_ALIASES)) {
      expect(real.has(to), `${from} points at a page that is not built: ${to}`).toBe(true);
    }
  });

  it("points every alias at a different path, so no stub loops back on itself", () => {
    for (const [from, to] of Object.entries(SECTION_ALIASES)) {
      expect(MAP[from]).toBe(to);
      expect(to).not.toBe(from);
    }
  });

  it("gives every real page a lowercase key, so any casing resolves", () => {
    for (const path of pagePaths({ posts, tags })) {
      expect(MAP[path.toLowerCase()], `${path} is not in the case map`).toBeDefined();
    }
  });
});
