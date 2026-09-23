import { describe, expect, it } from "vitest";
import { allRedirects } from "../../src/lib/redirects";
import {
  SECTION_PATHS,
  dedupeEntries,
  lastmodDate,
  postEntries,
  sectionEntries,
  sitemapXml,
  tagEntries
} from "../../src/lib/sitemap";
import { loadPosts } from "./content";
import { elementNames, expectWellFormed } from "./seo-xml";

const posts = loadPosts();
const published = posts.filter((post) => !post.draft);
const xml = sitemapXml([...sectionEntries(), ...postEntries(posts), ...tagEntries({})]);

function locs(document = xml): string[] {
  return [...document.matchAll(/<loc>([^<]*)<\/loc>/gu)].map((match) => match[1]!);
}

describe("sitemap dates", () => {
  it("prefers the modification date over the publication date", () => {
    expect(lastmodDate({ date: new Date(Date.UTC(2026, 5, 19)), updated: undefined })).toBe("2026-06-19");
    expect(lastmodDate({ date: new Date(Date.UTC(2026, 5, 19)), updated: new Date(Date.UTC(2026, 6, 2)) })).toBe(
      "2026-07-02"
    );
  });

  it("formats every lastmod as a bare date", () => {
    const updated = published.find((post) => post.updated);
    if (updated) expect(lastmodDate(updated)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const entry of postEntries(posts)) {
      expect(entry.lastmod, `${entry.path} has no lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("sitemap entries", () => {
  it("lists every published post exactly once and never a draft", () => {
    const entries = postEntries(posts);
    expect(entries.map((entry) => entry.path).sort()).toEqual(published.map((post) => post.url).sort());
    expect(entries.some((entry) => posts.find((post) => post.url === entry.path)?.draft)).toBe(false);
  });

  it("excludes redirect stubs and the 404 page", () => {
    const stubs = new Set(allRedirects(posts).map((redirect) => redirect.from));
    for (const loc of locs()) {
      const path = loc.replace("https://clean99.github.io", "");
      expect(stubs.has(path), `${path} is a redirect stub`).toBe(false);
      expect(path).not.toBe("/404");
      expect(path).not.toBe("/404/");
    }
  });

  it("carries a reciprocal hreflang cluster on translated posts", () => {
    const url = "/2026/06/19/Designing-an-Operations-Heartbeat-System/";
    const block = xml.split("<url>").find((chunk) => chunk.includes(`<loc>https://clean99.github.io${url}</loc>`))!;
    expect(block).toContain(
      'hreflang="en" href="https://clean99.github.io/2026/06/19/Designing-an-Operations-Heartbeat-System/"'
    );
    expect(block).toContain(
      'hreflang="zh-CN" href="https://clean99.github.io/zh/2026/06/19/Designing-an-Operations-Heartbeat-System/"'
    );
    expect(block).toContain(
      'hreflang="x-default" href="https://clean99.github.io/2026/06/19/Designing-an-Operations-Heartbeat-System/"'
    );
  });

  it("omits the cluster for a post that exists in one language only", () => {
    const single = published.find(
      (post) => !published.some((other) => other.key === post.key && other.lang !== post.lang)
    );
    expect(single).toBeDefined();
    const block = xml
      .split("<url>")
      .find((chunk) => chunk.includes(`<loc>https://clean99.github.io${single!.url}</loc>`))!;
    expect(block).not.toContain("xhtml:link");
  });

  it("lists the section pages in both languages from the constant", () => {
    for (const path of SECTION_PATHS) {
      expect(locs()).toContain(`https://clean99.github.io${path}`);
      expect(locs()).toContain(`https://clean99.github.io${path === "/" ? "/zh/" : `/zh${path}`}`);
    }
  });

  it("pairs tag hubs across languages and skips slugs only one language has", () => {
    const entries = tagEntries({ en: [{ slug: "react" }, { slug: "only-en" }], zh: [{ slug: "react" }] });
    expect(entries.map((entry) => entry.path)).toEqual(["/tags/only-en/", "/tags/react/", "/zh/tags/react/"]);
    const react = entries.find((entry) => entry.path === "/tags/react/")!;
    expect(react.alternates).toContainEqual({ hreflang: "x-default", href: "https://clean99.github.io/tags/react/" });
    expect(entries.find((entry) => entry.path === "/tags/only-en/")!.alternates).toBeUndefined();
  });

  it("keeps the first entry when a path is listed twice", () => {
    const entries = dedupeEntries([
      { path: "/a/", lastmod: "2026-01-01" },
      { path: "/a/", lastmod: "2026-02-02" }
    ]);
    expect(entries).toEqual([{ path: "/a/", lastmod: "2026-01-01" }]);
  });
});

describe("sitemap document", () => {
  it("is well-formed XML with the sitemap and xhtml namespaces", () => {
    expectWellFormed(xml);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(elementNames(xml)).toContain("xhtml:link");
  });

  it("escaping never leaves a raw & or < in a loc", () => {
    for (const loc of locs()) {
      expect(loc).not.toContain("&");
      expect(loc).not.toContain("<");
    }
  });

  it("carries an absolute loc with a trailing slash for every entry", () => {
    for (const loc of locs()) {
      expect(loc.startsWith("https://clean99.github.io/")).toBe(true);
      expect(loc.endsWith("/")).toBe(true);
    }
  });

  it("sorts nothing it was not asked to sort but keeps every entry", () => {
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
  });
});
