import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AREAS,
  EDITORIAL_OFFSET,
  fileNameFor,
  frontmatterDate,
  inferAreaFromTags,
  offsetMinutes,
  parseTags,
  renderPair,
  renderPost,
  resolveArea,
  resolveI18nKey,
  resolveSlug,
  slugify,
  wallClock,
  yamlString,
  yamlTagList,
  zhPermalink
} from "../scripts/lib/new-post.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "scripts", "new-post.mjs");

/** A fixed instant: 2026-06-19 04:00:00Z is 12:00 in Asia/Shanghai. */
const AT_NOON_SHANGHAI = new Date("2026-06-19T04:00:00.000Z");

test("AREAS matches the collection's area set", () => {
  assert.deepEqual(AREAS, ["engineering", "ai", "systems", "mind", "life"]);
});

test("offsetMinutes parses the editorial offset and honours a sign", () => {
  assert.equal(offsetMinutes("+08:00"), 480);
  assert.equal(offsetMinutes("-05:00"), -300);
  assert.equal(offsetMinutes("+0800"), 480);
  assert.equal(offsetMinutes("+00:00"), 0);
});

test("offsetMinutes rejects an unsupported offset rather than guessing", () => {
  assert.throws(() => offsetMinutes("Asia/Shanghai"), /unsupported timezone offset/);
  assert.throws(() => offsetMinutes("8"), /unsupported timezone offset/);
});

test("wallClock reads the editorial timezone, not the build machine's", () => {
  assert.deepEqual(wallClock(AT_NOON_SHANGHAI), { date: "2026-06-19", time: "12:00:00" });
  // The same instant is the previous day in UTC: that difference is the point.
  assert.deepEqual(wallClock(AT_NOON_SHANGHAI, "+00:00"), { date: "2026-06-19", time: "04:00:00" });
});

test("wallClock rolls the day over across the offset boundary", () => {
  // 2026-06-18T20:00Z is already the 19th in Shanghai.
  assert.equal(wallClock(new Date("2026-06-18T20:00:00Z")).date, "2026-06-19");
  // 2026-06-19T20:00Z is already the 20th there.
  assert.equal(wallClock(new Date("2026-06-19T20:00:00Z")).date, "2026-06-20");
});

test("frontmatterDate renders the naive form every existing post uses", () => {
  assert.equal(frontmatterDate(AT_NOON_SHANGHAI), "2026-06-19 12:00:00");
  assert.match(frontmatterDate(AT_NOON_SHANGHAI), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test("frontmatterDate is parseable by the site's own naive-date reader", () => {
  const rendered = frontmatterDate(AT_NOON_SHANGHAI);
  const [day, time] = rendered.split(" ");
  assert.equal(day, "2026-06-19");
  assert.equal(time, "12:00:00");
});

test("EDITORIAL_OFFSET is Asia/Shanghai", () => {
  assert.equal(EDITORIAL_OFFSET, "+08:00");
});

test("slugify hyphenates Latin words and keeps their case", () => {
  assert.equal(slugify("Designing an Operations Heartbeat System"), "Designing-an-Operations-Heartbeat-System");
  assert.equal(slugify("Redux: a source review!"), "Redux-a-source-review");
});

test("slugify keeps CJK characters, which is what the zh stems do", () => {
  assert.equal(slugify("从零构建 Redux（源码解读）"), "从零构建-Redux-源码解读");
});

test("slugify drops quotes instead of hyphenating them", () => {
  assert.equal(slugify("Engineer's Field Notes"), "Engineers-Field-Notes");
  assert.equal(slugify("“Smart” quotes"), "Smart-quotes");
});

test("slugify falls back rather than returning an empty stem", () => {
  assert.equal(slugify("!!!"), "untitled");
  assert.equal(slugify("   "), "untitled");
  assert.equal(slugify("!!!", "custom"), "custom");
});

test("resolveSlug prefers an explicit slug and normalizes it the same way", () => {
  assert.equal(resolveSlug({ title: "A Title", slug: "custom-slug" }), "custom-slug");
  assert.equal(resolveSlug({ title: "A Title", slug: "  My Slug  " }), "My-Slug");
  assert.equal(resolveSlug({ title: "A Title", slug: "" }), "A-Title");
  assert.equal(resolveSlug({ title: "A Title" }), "A-Title");
});

test("fileNameFor adds the legacy -zh suffix to the zh half only", () => {
  assert.equal(fileNameFor("my-post", "en"), "my-post.md");
  assert.equal(fileNameFor("my-post", "zh"), "my-post-zh.md");
});

test("zhPermalink carries no leading slash and uses slashed date parts", () => {
  assert.equal(zhPermalink(AT_NOON_SHANGHAI, "my-post"), "zh/2026/06/19/my-post/");
  assert.ok(!zhPermalink(AT_NOON_SHANGHAI, "my-post").startsWith("/"));
});

test("resolveI18nKey strips a trailing -zh so both halves agree", () => {
  assert.equal(resolveI18nKey("my-post", "en"), "my-post");
  assert.equal(resolveI18nKey("my-post-zh", "zh"), "my-post");
  assert.equal(resolveI18nKey("my-post", "zh"), "my-post");
  assert.equal(resolveI18nKey("my-post-zh", "en"), "my-post-zh");
});

test("resolveI18nKey prefers an explicit key", () => {
  assert.equal(resolveI18nKey("a-different-slug", "zh", "shared-key"), "shared-key");
  assert.equal(resolveI18nKey("a-different-slug", "zh", "  shared-key  "), "shared-key");
});

test("inferAreaFromTags reads a tag that names an area", () => {
  assert.equal(inferAreaFromTags(["Software Engineering", "reliability"]), "engineering");
  assert.equal(inferAreaFromTags(["Agent", "skill"]), "ai");
  assert.equal(inferAreaFromTags(["SICP", "abstraction"]), "systems");
  assert.equal(inferAreaFromTags(["meditation"]), "mind");
});

test("inferAreaFromTags defaults to engineering when nothing matches", () => {
  assert.equal(inferAreaFromTags([]), "engineering");
  assert.equal(inferAreaFromTags(["unrelated", "words"]), "engineering");
});

test("resolveArea always yields a member of AREAS", () => {
  const inputs = [
    { title: "Designing an Operations Heartbeat System" },
    { title: "Something", area: "ai" },
    { title: "Something", tags: ["neurotic nonsense"] },
    { title: "SICP notes", slug: "sicp-notes" }
  ];
  for (const input of inputs) assert.ok(AREAS.includes(resolveArea(input)), `${JSON.stringify(input)}`);
});

test("resolveArea prefers the explicit flag over the tags", () => {
  assert.equal(resolveArea({ area: "life", tags: ["Agent"], title: "x" }), "life");
});

test("resolveArea falls back to the slug or title wording with no tags", () => {
  assert.equal(resolveArea({ title: "x", slug: "sicp-learning" }), "systems");
  assert.equal(resolveArea({ title: "A meditation on attention" }), "mind");
});

test("resolveArea ignores an unrecognized area value", () => {
  assert.equal(resolveArea({ title: "x", area: "nonsense", tags: ["Agent"] }), "ai");
});

test("yamlString leaves plain values unquoted and quotes the rest", () => {
  assert.equal(yamlString("Designing an Operations Heartbeat System"), "Designing an Operations Heartbeat System");
  assert.equal(yamlString("从零构建 Redux"), "从零构建 Redux");
  assert.equal(yamlString("A title: with a colon"), '"A title: with a colon"');
  assert.equal(yamlString("- leading dash"), '"- leading dash"');
  assert.equal(yamlString(""), '""');
});

test("yamlTagList renders the flow style the existing posts use", () => {
  assert.equal(yamlTagList(["Software Engineering", "reliability"]), "[Software Engineering, reliability]");
  assert.equal(yamlTagList(["a", "b,c"]), '[a, "b,c"]');
});

test("renderPost writes the fields in the order the collection already uses", () => {
  const post = renderPost({
    title: "Designing an Operations Heartbeat System",
    lang: "en",
    area: "engineering",
    tags: ["Software Engineering", "reliability"],
    date: AT_NOON_SHANGHAI
  });
  const [head] = post.content.split("\n---\n");
  const keys = head
    .split("\n")
    .filter((line) => /^[a-z0-9_]+:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
  assert.deepEqual(keys, ["title", "date", "tags", "area", "lang", "i18n_key"]);
});

test("renderPost gives the en half no permalink and derives its URL from the stem", () => {
  const post = renderPost({ title: "My Post", lang: "en", date: AT_NOON_SHANGHAI });
  assert.ok(!post.content.includes("permalink:"));
  assert.equal(post.fileName, "My-Post.md");
  assert.equal(post.url, "/2026/06/19/My-Post/");
});

test("renderPost gives the zh half the legacy permalink and matching URL", () => {
  const post = renderPost({ title: "我的文章", lang: "zh", slug: "my-post", date: AT_NOON_SHANGHAI });
  assert.match(post.content, /^permalink: zh\/2026\/06\/19\/my-post\/$/m);
  assert.equal(post.fileName, "my-post-zh.md");
  assert.equal(post.url, "/zh/2026/06/19/my-post/");
});

test("renderPost omits an empty tag list rather than writing an empty array", () => {
  const post = renderPost({ title: "My Post", lang: "en", tags: ["", "  "], date: AT_NOON_SHANGHAI });
  assert.ok(!post.content.includes("tags:"));
});

test("renderPost writes an empty case_study block on request", () => {
  const post = renderPost({ title: "My Post", lang: "en", caseStudy: true, date: AT_NOON_SHANGHAI });
  for (const key of ["case_study:", "  role:", "  stack: []", "  impact: []", "  links: []"]) {
    assert.ok(post.content.includes(key), key);
  }
  assert.ok(!renderPost({ title: "My Post", lang: "en", date: AT_NOON_SHANGHAI }).content.includes("case_study"));
});

test("renderPost leaves the body as a neutral paragraph stub", () => {
  const post = renderPost({ title: "My Post", lang: "en", date: AT_NOON_SHANGHAI });
  const body = post.content.split("\n---\n")[1] ?? "";
  assert.ok(body.trim().length > 0);
  assert.ok(!/^#\s/m.test(body), "no duplicate title heading");
  assert.ok(!/\bTODO\b/.test(post.content));
});

test("renderPost's frontmatter round-trips through gray-matter", async () => {
  const matter = (await import("gray-matter")).default;
  const post = renderPost({
    title: "A title: with a colon",
    lang: "zh",
    area: "ai",
    tags: ["Software Engineering", "reliability"],
    date: AT_NOON_SHANGHAI
  });
  const parsed = matter(post.content);
  assert.equal(parsed.data.title, "A title: with a colon");
  assert.equal(parsed.data.area, "ai");
  assert.equal(parsed.data.lang, "zh");
  assert.equal(parsed.data.permalink, "zh/2026/06/19/A-title-with-a-colon/");
  assert.deepEqual(parsed.data.tags, ["Software Engineering", "reliability"]);
  assert.equal(parsed.data.i18n_key, "A-title-with-a-colon");
});

test("renderPair writes both halves sharing one key and one timestamp", () => {
  const [en, zh] = renderPair({ titleEn: "My Post", titleZh: "我的文章", area: "engineering", date: AT_NOON_SHANGHAI });
  assert.equal(en.fileName, "My-Post.md");
  assert.equal(zh.fileName, "My-Post-zh.md");
  assert.match(en.content, /^i18n_key: My-Post$/m);
  assert.match(zh.content, /^i18n_key: My-Post$/m);
  const dateOf = (content) => /^date: (.*)$/m.exec(content)[1];
  assert.equal(dateOf(en.content), dateOf(zh.content));
  assert.equal(zh.url, "/zh/2026/06/19/My-Post/");
});

test("renderPair falls back to the en title when no zh title is given", () => {
  const [, zh] = renderPair({ titleEn: "My Post", date: AT_NOON_SHANGHAI });
  assert.match(zh.content, /^title: My Post$/m);
});

test("renderPair keys both halves off the slug, not the zh title", () => {
  const [, zh] = renderPair({ titleEn: "My Post", titleZh: "完全不同的标题", slug: "stable-key", date: AT_NOON_SHANGHAI });
  assert.match(zh.content, /^i18n_key: stable-key$/m);
  assert.equal(zh.url, "/zh/2026/06/19/stable-key/");
});

test("parseTags splits commas, trims, and accepts repeated flags", () => {
  assert.deepEqual(parseTags(["a,b"]), ["a", "b"]);
  assert.deepEqual(parseTags(["a", "b"]), ["a", "b"]);
  assert.deepEqual(parseTags([" a , b ", "c"]), ["a", "b", "c"]);
  assert.deepEqual(parseTags(undefined), []);
  assert.deepEqual(parseTags(["", "  "]), []);
});

// ---------------------------------------------------------------------------
// The CLI itself
// ---------------------------------------------------------------------------

/** Run the CLI against a throwaway posts directory, never the real collection. */
function runCli(args, { dir } = {}) {
  const owned = !dir;
  const posts = dir ?? mkdtempSync(join(tmpdir(), "new-post-posts-"));
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, NEW_POST_DIR: posts }
  });
  if (owned) process.on("exit", () => rmSync(posts, { recursive: true, force: true }));
  return { ...result, posts };
}

/** A throwaway directory holding one pre-existing post, to test overwrite refusal. */
function dirWith(fileName) {
  const posts = mkdtempSync(join(tmpdir(), "new-post-posts-"));
  writeFileSync(join(posts, fileName), "---\ntitle: Taken\n---\n");
  return posts;
}

test("the CLI refuses to run without --title", () => {
  const result = runCli([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--title is required/);
});

test("the CLI prints usage for --help and writes nothing", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: pnpm new:post/);
});

test("the CLI rejects an unknown --lang and an unknown --area", () => {
  assert.equal(runCli(["--title", "x", "--lang", "fr"]).status, 1);
  assert.equal(runCli(["--title", "x", "--area", "nonsense"]).status, 1);
});

test("the CLI rejects --pair with a zh --lang", () => {
  const result = runCli(["--title", "x", "--lang", "zh", "--pair"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--lang must be en/);
});

test("the CLI refuses to overwrite an existing file", () => {
  const dir = dirWith("Taken-Post.md");
  const result = runCli(["--title", "Taken Post", "--slug", "Taken-Post"], { dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing to overwrite Taken-Post\.md/);
});

test("the CLI leaves the existing file untouched when it refuses", () => {
  const dir = dirWith("Taken-Post.md");
  const before = readFileSync(join(dir, "Taken-Post.md"), "utf8");
  runCli(["--title", "Taken Post", "--slug", "Taken-Post"], { dir });
  assert.equal(readFileSync(join(dir, "Taken-Post.md"), "utf8"), before);
});

test("the CLI writes both halves of a pair, sharing one key", () => {
  const { posts, status, stderr } = runCli([
    "--title",
    "Finish Newpost Cli Probe",
    "--slug",
    "Finish-Newpost-Cli-Probe",
    "--area",
    "engineering",
    "--pair"
  ]);
  assert.equal(status, 0, stderr);
  const en = readFileSync(join(posts, "Finish-Newpost-Cli-Probe.md"), "utf8");
  const zh = readFileSync(join(posts, "Finish-Newpost-Cli-Probe-zh.md"), "utf8");
  assert.match(en, /^i18n_key: Finish-Newpost-Cli-Probe$/m);
  assert.match(zh, /^i18n_key: Finish-Newpost-Cli-Probe$/m);
  assert.match(zh, /^permalink: zh\/\d{4}\/\d{2}\/\d{2}\/Finish-Newpost-Cli-Probe\/$/m);
  assert.ok(!/^permalink:/m.test(en), "the en half carries no permalink");
});

test("the CLI writes a single post when --pair is absent", () => {
  const { posts, status } = runCli(["--title", "Solo Post", "--slug", "Solo-Post"]);
  assert.equal(status, 0);
  assert.ok(existsSync(join(posts, "Solo-Post.md")));
  assert.ok(!existsSync(join(posts, "Solo-Post-zh.md")));
});
