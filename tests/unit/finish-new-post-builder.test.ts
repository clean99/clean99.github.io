import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { buildPost, findTranslation, translationKey } from "../../src/lib/posts";
import type { RawPostData } from "../../src/lib/posts";
import { renderPost, renderPair } from "../../scripts/lib/new-post.mjs";

/**
 * The scaffold's output only matters if the site's own reader accepts it, and that
 * reader (src/lib/posts.ts) uses extensionless TS imports that only Vite resolves —
 * so this integration check lives here rather than in the node:test suite, which
 * covers the pure planning in test/finish-new-post.test.mjs.
 */
const CLI = join(process.cwd(), "scripts", "new-post.mjs");

/** Run the scaffolder into a throwaway directory and read what it wrote. */
function scaffold(args: string[], read: string[]): string[] {
  const dir = mkdtempSync(join(tmpdir(), "new-post-vitest-"));
  try {
    const result = spawnSync(process.execPath, [CLI, ...args], {
      encoding: "utf8",
      env: { ...process.env, NEW_POST_DIR: dir }
    });
    expect(result.status, result.stderr).toBe(0);
    return read.map((name) => readFileSync(join(dir, name), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Feed a rendered file through the same path the build uses. */
function through(raw: string, id: string) {
  const parsed = matter(raw);
  // gray-matter widens the frontmatter to an index signature; the collection schema
  // is what actually validates it, so the cast is the test's alone.
  return buildPost({ id, body: parsed.content, data: parsed.data as RawPostData });
}

describe("scaffolded frontmatter survives the site's own reader", () => {
  it("turns an en scaffold into a post with a URL, area, tags and summary", () => {
    const [en] = scaffold(
      ["--title", "Scaffold Reader Probe", "--slug", "Scaffold-Reader-Probe", "--tags", "Agent"],
      ["Scaffold-Reader-Probe.md"]
    );
    const post = through(en!, "Scaffold-Reader-Probe");
    expect(post.lang).toBe("en");
    expect(post.area).toBe("ai");
    expect(post.tags.map((t) => t.slug)).toEqual(["agent"]);
    expect(post.summary.length).toBeGreaterThan(10);
    expect(post.minutes).toBeGreaterThanOrEqual(1);
    expect(post.draft).toBe(false);
    expect(post.url).toMatch(/^\/\d{4}\/\d{2}\/\d{2}\/Scaffold-Reader-Probe\/$/);
  });

  it("turns a zh scaffold into the legacy permalink URL", () => {
    const [zh] = scaffold(
      ["--title", "脚手架读取校验", "--slug", "Scaffold-Zh-Probe", "--lang", "zh"],
      ["Scaffold-Zh-Probe-zh.md"]
    );
    const post = through(zh!, "Scaffold-Zh-Probe-zh");
    expect(post.lang).toBe("zh");
    expect(post.url).toMatch(/^\/zh\/\d{4}\/\d{2}\/\d{2}\/Scaffold-Zh-Probe\/$/);
    expect(post.url).not.toContain("//");
  });

  it("links both halves of a pair through one i18n_key", () => {
    const [en, zh] = scaffold(
      ["--title", "Scaffold Pair Probe", "--title-zh", "脚手架配对校验", "--slug", "Scaffold-Pair-Probe", "--pair"],
      ["Scaffold-Pair-Probe.md", "Scaffold-Pair-Probe-zh.md"]
    ) as [string, string];
    const enPost = through(en!, "Scaffold-Pair-Probe");
    const zhPost = through(zh!, "Scaffold-Pair-Probe-zh");
    expect(enPost.key).toBe("Scaffold-Pair-Probe");
    expect(zhPost.key).toBe(enPost.key);
    expect(findTranslation([enPost, zhPost], enPost)?.id).toBe(zhPost.id);
    expect(findTranslation([enPost, zhPost], zhPost)?.id).toBe(enPost.id);
  });

  it("keeps an explicit area over what the tags would have inferred", () => {
    const [en] = scaffold(
      ["--title", "Area Probe", "--slug", "Area-Probe", "--area", "life", "--tags", "Agent"],
      ["Area-Probe.md"]
    );
    expect(through(en!, "Area-Probe").area).toBe("life");
  });

  it("carries the case_study block through as an object rather than dropping it", () => {
    const [en] = scaffold(["--title", "Case Probe", "--slug", "Case-Probe", "--case-study"], ["Case-Probe.md"]);
    const post = through(en!, "Case-Probe");
    expect(post.caseStudy).toBeDefined();
    expect(post.caseStudy?.stack).toEqual([]);
    expect(post.caseStudy?.impact).toEqual([]);
  });

  it("leaves a draft flag off, so the post publishes as soon as it is written", () => {
    const [en] = scaffold(["--title", "Draft Probe", "--slug", "Draft-Probe"], ["Draft-Probe.md"]);
    expect(through(en!, "Draft-Probe").draft).toBe(false);
  });

  it("records the authored date in the editorial timezone, not the build machine's", () => {
    const [en] = scaffold(["--title", "Date Probe", "--slug", "Date-Probe"], ["Date-Probe.md"]);
    const rendered = renderPost({ title: "Date Probe", lang: "en" });
    const authored = /^date: (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/m.exec(rendered.content);
    expect(authored).not.toBeNull();
    // The post's URL date must be the authored wall-clock date, whatever TZ CI runs in.
    const post = through(en!, "Date-Probe");
    const [year, month, day] = authored!.slice(1, 4).join("-").split("-").map(Number);
    expect(post.date.getUTCFullYear()).toBe(year);
    expect(post.date.getUTCMonth() + 1).toBe(month);
    expect(post.date.getUTCDate()).toBe(day);
  });
});

describe("renderPair and translationKey agree on the pairing rule", () => {
  it("uses the same key translationKey derives from the stem", () => {
    const [en, zh] = renderPair({ titleEn: "Pair Rule Probe", titleZh: "配对规则", slug: "Pair-Rule-Probe" });
    const enKey = /^i18n_key: (.*)$/m.exec(en.content)?.[1];
    const zhKey = /^i18n_key: (.*)$/m.exec(zh.content)?.[1];
    expect(enKey).toBe(zhKey);
    expect(translationKey("Pair-Rule-Probe-zh", undefined)).toBe(zhKey);
  });
});
