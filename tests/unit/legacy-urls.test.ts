import { describe, expect, it } from "vitest";
import { allRedirects } from "../../src/lib/redirects";
import { legacyUrls, loadPosts } from "./content";

const posts = loadPosts();
const legacy = legacyUrls();
const legacyPostUrls = legacy.filter((u) => /^\/(zh\/)?\d{4}\/\d{2}\/\d{2}\//.test(u));

describe("legacy post URLs", () => {
  it("every published post keeps a URL the old site already had", () => {
    const missing = posts.filter((p) => !p.draft && !legacy.includes(p.url)).map((p) => `${p.id} → ${p.url}`);
    expect(missing).toEqual([]);
  });

  it("every legacy dated URL is served by a post or a redirect stub", () => {
    const served = new Set([...posts.map((p) => p.url), ...allRedirects(posts).map((r) => r.from)]);
    expect(legacyPostUrls.filter((u) => !served.has(u))).toEqual([]);
  });

  it("post URLs are unique", () => {
    const urls = posts.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("a translation key has at most one post per language", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const p of posts) {
      const slot = `${p.lang}:${p.key}`;
      if (seen.has(slot)) clashes.push(`${seen.get(slot)} / ${p.id}`);
      seen.set(slot, p.id);
    }
    expect(clashes).toEqual([]);
  });
});
