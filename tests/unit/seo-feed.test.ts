import { describe, expect, it } from "vitest";
import { AUTHOR } from "../../src/site.config";
import { ATOM_CONTENT_TYPE, atomFeed, escapeXml, feedUpdated } from "../../src/lib/feed";
import { loadPosts } from "./content";
import { elementNames, expectWellFormed } from "./seo-xml";

const posts = loadPosts();
const published = posts.filter((post) => !post.draft);
const en = published.filter((post) => post.lang === "en");

function feed(lang: "en" | "zh" = "en", withContent = true) {
  const entries = published
    .filter((post) => post.lang === lang)
    .map((post) => ({ post, ...(withContent && { content: `<p>${post.summary}</p>` }) }));
  return atomFeed({
    lang,
    entries,
    feedPath: lang === "en" ? "/atom.xml" : "/zh/atom.xml",
    homePath: lang === "en" ? "/" : "/zh/",
    author: { name: AUTHOR.name, uri: AUTHOR.github, email: AUTHOR.email }
  });
}

const xml = feed();

describe("escapeXml", () => {
  it("escapes the five XML entities", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;"
    );
  });

  it("is idempotent-safe: an existing entity is double escaped, never left raw", () => {
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
  });
});

describe("feedUpdated", () => {
  it("takes the newest entry timestamp, as an RFC 3339 instant", () => {
    const newer = { ...en[0]!, updated: new Date(Date.UTC(2027, 0, 1, 8)) };
    expect(feedUpdated([{ post: en[0]! }, { post: newer }], new Date(0))).toBe("2027-01-01T00:00:00.000Z");
  });

  it("prefers the updated time over the publication time", () => {
    const post = { ...en[0]!, date: new Date(Date.UTC(2020, 0, 1, 8)), updated: new Date(Date.UTC(2026, 0, 1, 8)) };
    expect(feedUpdated([{ post }], new Date(0))).toBe("2026-01-01T00:00:00.000Z");
  });

  it("falls back for an empty feed", () => {
    expect(feedUpdated([], new Date(Date.UTC(2026, 0, 1, 8)))).toBe("2026-01-01T00:00:00.000Z");
  });

  it("compares instants, not the author's local wall clock", () => {
    // Two posts an hour apart in the author's +08:00 zone; the later one wins.
    const early = { ...en[0]!, date: new Date(Date.UTC(2026, 0, 1, 23, 30)) };
    const late = { ...en[0]!, date: new Date(Date.UTC(2026, 0, 2, 0, 30)) };
    expect(feedUpdated([{ post: late }, { post: early }], new Date(0))).toBe(
      feedUpdated([{ post: early }, { post: late }], new Date(0))
    );
  });
});

describe("atom feed", () => {
  it("is well-formed Atom 1.0", () => {
    expectWellFormed(xml);
    expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"')).toBe(
      true
    );
    expect(elementNames(xml)).toContain("entry");
    expect(xml).toContain('xml:lang="en"');
  });

  it("declares the document type the route serves", () => {
    expect(ATOM_CONTENT_TYPE).toBe("application/atom+xml; charset=utf-8");
  });

  it("carries the feed's own URL as both id and self link", () => {
    expect(xml).toContain("<id>https://clean99.github.io/atom.xml</id>");
    expect(xml).toContain('<link rel="self" type="application/atom+xml" href="https://clean99.github.io/atom.xml"/>');
    expect(xml).toContain('<link rel="alternate" type="text/html" href="https://clean99.github.io/"/>');
  });

  it("updates the feed at the newest entry, not at build time", () => {
    const expected = feedUpdated(
      en.map((post) => ({ post })),
      new Date(0)
    );
    expect(xml).toContain(`<updated>${expected}</updated>`);
    expect(xml).not.toContain(`<updated>${new Date().toISOString()}</updated>`);
  });

  it("gives every entry a title, absolute id, link and both timestamps", () => {
    const entries = xml.split("<entry>").slice(1);
    expect(entries).toHaveLength(en.length);
    for (const entry of entries) {
      expect(entry).toMatch(/<title>[^<]+<\/title>/);
      expect(entry).toMatch(/<id>https:\/\/clean99\.github\.io\/[^<]+<\/id>/);
      expect(entry).toMatch(/<link rel="alternate" type="text\/html" href="https:\/\/clean99\.github\.io\//);
      expect(entry).toMatch(/<published>\d{4}-\d{2}-\d{2}T/);
      expect(entry).toMatch(/<updated>\d{4}-\d{2}-\d{2}T/);
      expect(entry).toMatch(/<summary type="text">/);
      expect(entry).toMatch(/<name>Koh Hom<\/name>/);
    }
  });

  it("carries the full content, typed html and based at the post URL", () => {
    expect(xml).toContain('type="html" xml:base="https://clean99.github.io/');
    expect(xml.match(/<content type="html"/g)).toHaveLength(en.length);
  });

  it("falls back to summary plus link when a body is unavailable", () => {
    const thin = feed("en", false);
    expect(thin).not.toContain("<content");
    expect(thin.match(/<summary type="text">/g)).toHaveLength(en.length);
    expect(thin).toContain('<link rel="alternate" type="text/html"');
  });

  it("lists a category per tag with both slug and label", () => {
    const tagged = en.find((post) => post.tags.length > 0)!;
    expect(xml).toContain(`term="${tagged.tags[0]!.slug}" label="${tagged.tags[0]!.label}"`);
  });

  it("lists only the language's own posts", () => {
    const zh = feed("zh");
    expect(zh).toContain("<id>https://clean99.github.io/zh/atom.xml</id>");
    expect(zh).toContain('<link rel="alternate" type="text/html" href="https://clean99.github.io/zh/"/>');
    for (const post of published.filter((p) => p.lang === "zh")) expect(zh).toContain(post.title);
    expect(zh).not.toContain(en[0]!.title);
  });

  it("escapes a title that would otherwise break the document", () => {
    const hostile = { ...en[0]!, title: "A & B <script>alert('x')</script>" };
    const escaped = atomFeed({
      lang: "en",
      entries: [{ post: hostile }],
      feedPath: "/atom.xml",
      homePath: "/",
      author: { name: AUTHOR.name }
    });
    expectWellFormed(escaped);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("A &amp; B &lt;script&gt;");
  });

  it("omits the author uri and email when they are not supplied", () => {
    const bare = atomFeed({
      lang: "en",
      entries: [{ post: en[0]! }],
      feedPath: "/atom.xml",
      homePath: "/",
      author: { name: AUTHOR.name }
    });
    expect(bare).not.toContain("<uri>");
    expect(bare).not.toContain("<email>");
  });

  it("builds a valid, empty feed rather than failing when there are no posts", () => {
    const empty = atomFeed({
      lang: "en",
      entries: [],
      feedPath: "/atom.xml",
      homePath: "/",
      author: { name: AUTHOR.name },
      updated: new Date(Date.UTC(2026, 0, 1))
    });
    expectWellFormed(empty);
    expect(empty).not.toContain("<entry>");
    expect(empty).toContain("<updated>2025-12-31T16:00:00.000Z</updated>");
  });
});
