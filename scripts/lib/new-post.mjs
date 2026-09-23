/**
 * Pure planning for `scripts/new-post.mjs`, kept free of the filesystem so the
 * frontmatter contract (dates, slugs, the en/zh pair) is unit-testable without
 * writing files into the content collection.
 *
 * The rules mirror the legacy Hexo layout the site must keep resolving:
 *   en → /YYYY/MM/DD/<file-stem>/
 *   zh → zh/YYYY/MM/DD/<i18n_key>/   (explicit `permalink`, no leading slash)
 * Both halves of a pair share one `i18n_key`, which is what links them.
 *
 * Area names come from src/lib/taxonomy.ts, the single source of truth for the
 * collection's area set — importing it keeps this list from drifting.
 */
import { AREAS, inferArea, normalizeArea } from "../../src/lib/taxonomy.ts";

export { AREAS, normalizeArea };

/** Asia/Shanghai: the blog's editorial timezone, matching every existing post. */
export const EDITORIAL_OFFSET = "+08:00";

const pad = (value) => String(value).padStart(2, "0");

/**
 * Wall-clock date and time in `offset` for an instant.
 *
 * `Date` has no timezone arithmetic of its own, so the offset is applied by shifting
 * the instant before reading its UTC fields — the reverse of how `parseNaiveDate`
 * reads an authored naive date back.
 *
 * @param {Date} date
 * @param {string} [offset]
 * @returns {{ date: string, time: string }}
 */
export function wallClock(date, offset = EDITORIAL_OFFSET) {
  const shifted = new Date(date.getTime() + offsetMinutes(offset) * 60_000);
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  };
}

/**
 * `+08:00` → 480.
 * @param {string} offset
 * @returns {number}
 */
export function offsetMinutes(offset) {
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset.trim());
  if (!match) throw new Error(`unsupported timezone offset: ${offset}`);
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * The `date:` line value every post uses: `2026-06-19 12:00:00`.
 * @param {Date} date
 * @param {string} [offset]
 * @returns {string}
 */
export function frontmatterDate(date, offset = EDITORIAL_OFFSET) {
  const { date: day, time } = wallClock(date, offset);
  return `${day} ${time}`;
}

/**
 * File stem from a title: Latin words hyphenated, case preserved where the author
 * already used it, everything else dropped. CJK titles keep their characters, which
 * is what the existing zh stems do.
 *
 * @param {string} title
 * @param {string} [fallback]
 * @returns {string}
 */
export function slugify(title, fallback = "untitled") {
  const cleaned = title
    .trim()
    .replace(/[’'"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

/**
 * Explicit slug when given, otherwise one derived from the title.
 * @param {{ title: string, slug?: string | undefined }} input
 * @returns {string}
 */
export function resolveSlug(input) {
  const explicit = input.slug?.trim();
  return explicit ? slugify(explicit) : slugify(input.title);
}

/**
 * The stem an en post's file gets; zh adds `-zh`, which is the legacy convention.
 * @param {string} slug
 * @param {"en" | "zh"} lang
 * @returns {string}
 */
export function fileNameFor(slug, lang) {
  return lang === "zh" ? `${slug}-zh.md` : `${slug}.md`;
}

/**
 * `zh/2026/06/19/<key>/` — no leading slash, exactly as the published posts write it.
 * @param {Date} date
 * @param {string} key
 * @param {string} [offset]
 * @returns {string}
 */
export function zhPermalink(date, key, offset = EDITORIAL_OFFSET) {
  const { date: day } = wallClock(date, offset);
  return `zh/${day.replaceAll("-", "/")}/${key}/`;
}

/**
 * Area the tags point at, or `engineering` when none of them name one.
 *
 * Delegates to the site's own inferArea() so a scaffolded post lands in exactly the
 * area the build would pick for it — a second set of rules here could only drift.
 *
 * @param {readonly string[]} tags
 * @returns {string}
 */
export function inferAreaFromTags(tags) {
  return inferArea({ tags: [...tags] });
}

/**
 * Resolve the area from the flag, then the tags, then the slug/title wording.
 * Always returns one of AREAS so the frontmatter can never carry an unknown value.
 *
 * @param {{ area?: string | undefined, tags?: string[] | undefined, title: string, slug?: string | undefined }} input
 * @returns {string}
 */
export function resolveArea(input) {
  return inferArea({
    area: input.area,
    title: input.title,
    slug: input.slug,
    tags: input.tags
  });
}

/**
 * Translation key shared by both halves: explicit, else the slug with `-zh` removed.
 * @param {string} slug
 * @param {"en" | "zh"} lang
 * @param {string} [explicit]
 * @returns {string}
 */
export function resolveI18nKey(slug, lang, explicit) {
  const given = explicit?.trim();
  if (given) return given;
  return lang === "zh" ? slug.replace(/(?:^|-)zh$/, "") : slug;
}

/**
 * Body a new post starts with. An opening paragraph rather than a `# Title` heading:
 * PostLayout already renders the title as the page's `h1`, so a matching heading in
 * the body would give every post two of them. `summary:` is deliberately absent — an
 * empty or placeholder summary would outrank the first-paragraph fallback in
 * summarize(), which is the wrong summary to publish.
 */
export const BODY_STUB =
  "Write the opening paragraph here. It becomes the post summary until a `summary:` line is added above.";

/**
 * YAML scalar: quote when the value could be read as anything but a plain string.
 * @param {string} value
 * @returns {string}
 */
export function yamlString(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N} .,'’&()\-_/]*$/u.test(value) ? value : JSON.stringify(value);
}

/**
 * `tags: [a, b]` — the flow style every existing post uses.
 * @param {readonly string[]} tags
 * @returns {string}
 */
export function yamlTagList(tags) {
  return `[${tags.map((tag) => (/,|[[\]{}:]/.test(tag) ? JSON.stringify(tag) : tag)).join(", ")}]`;
}

/**
 * Render one half of a pair. Field order and spacing follow the posts already in
 * `content/posts` so a new file diffs cleanly against its neighbours.
 *
 * @param {{
 *   title: string,
 *   lang: "en" | "zh",
 *   slug?: string | undefined,
 *   area?: string | undefined,
 *   tags?: string[] | undefined,
 *   caseStudy?: boolean | undefined,
 *   i18nKey?: string | undefined,
 *   date?: Date | undefined,
 *   offset?: string | undefined
 * }} input
 * @returns {{ fileName: string, url: string, content: string }}
 */
export function renderPost(input) {
  const slug = resolveSlug(input);
  const key = resolveI18nKey(slug, input.lang, input.i18nKey);
  const date = input.date ?? new Date();
  const offset = input.offset ?? EDITORIAL_OFFSET;
  const area = resolveArea({ area: input.area, tags: input.tags, title: input.title, slug });
  const tags = (input.tags ?? []).filter((tag) => tag.trim());

  const lines = ["---", `title: ${yamlString(input.title.trim())}`, `date: ${frontmatterDate(date, offset)}`];
  // The area is always written: inferArea() reads it first, and an explicit value is
  // what keeps a post's section stable if its tags are edited later.
  if (tags.length) lines.push(`tags: ${yamlTagList(tags)}`);
  lines.push(`area: ${area}`);
  if (input.caseStudy) {
    lines.push("case_study:", "  role:", "  period:", "  team:", "  stack: []", "  impact: []", "  links: []");
  }
  lines.push(`lang: ${input.lang}`, `i18n_key: ${yamlString(key)}`);
  // The zh half is the one that carries an explicit permalink; en derives its URL from
  // the file stem, which is exactly what postUrl() does.
  if (input.lang === "zh") lines.push(`permalink: ${zhPermalink(date, key, offset)}`);
  lines.push("---", "", BODY_STUB, "");

  const day = wallClock(date, offset).date.replaceAll("-", "/");
  return {
    fileName: fileNameFor(slug, input.lang),
    url: input.lang === "zh" ? `/${zhPermalink(date, key, offset)}` : `/${day}/${slug}/`,
    content: lines.join("\n")
  };
}

/**
 * Both halves of an en+zh pair, sharing one i18n_key and one timestamp.
 * The result is a fixed two-tuple — [en, zh] — in that order.
 *
 * @param {{
 *   titleEn: string,
 *   titleZh?: string,
 *   slug?: string | undefined,
 *   area?: string | undefined,
 *   tags?: string[] | undefined,
 *   caseStudy?: boolean | undefined,
 *   i18nKey?: string | undefined,
 *   date?: Date | undefined,
 *   offset?: string | undefined
 * }} input
 * @returns {[{ fileName: string, url: string, content: string }, { fileName: string, url: string, content: string }]}
 */
export function renderPair(input) {
  const date = input.date ?? new Date();
  const slug = resolveSlug({ title: input.titleEn, slug: input.slug });
  const key = resolveI18nKey(slug, "en", input.i18nKey);
  const shared = {
    slug,
    area: input.area,
    tags: input.tags,
    caseStudy: input.caseStudy,
    i18nKey: key,
    date,
    offset: input.offset
  };
  return [
    renderPost({ ...shared, title: input.titleEn, lang: "en" }),
    renderPost({ ...shared, title: input.titleZh || input.titleEn, lang: "zh" })
  ];
}

/**
 * Parse `--tags a,b` and repeated `--tags` into one list.
 * @param {readonly string[] | undefined} values
 * @returns {string[]}
 */
export function parseTags(values) {
  return (values ?? [])
    .flatMap((value) => value.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
}
