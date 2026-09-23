#!/usr/bin/env node
/**
 * Scaffold a post: `pnpm new:post --title "…" [--lang en|zh] [--slug …]`.
 *
 *   node scripts/new-post.mjs --title "Designing an Operations Heartbeat System" \
 *     --lang en --area engineering --tags "Software Engineering, reliability"
 *   node scripts/new-post.mjs --title "…" --title-zh "…" --pair   # writes the en + zh pair
 *
 * All planning lives in scripts/lib/new-post.mjs and is unit-tested; this file only
 * parses arguments, refuses to overwrite, and writes the two files.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS, parseTags, renderPair, renderPost, resolveSlug } from "./lib/new-post.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Overridable so the test suite can scaffold into a temp directory instead of the
// real collection.
const POSTS_DIR = process.env.NEW_POST_DIR ? join(process.env.NEW_POST_DIR) : join(ROOT, "content", "posts");

const USAGE = `Usage: pnpm new:post --title <title> [options]

Options:
  --title <text>      Post title (required)
  --lang <en|zh>      Language of a single post (default: en; must be en with --pair)
  --title-zh <text>   zh title for --pair (default: the en title)
  --slug <text>       File stem / URL key (default: derived from the title)
  --area <name>       ${AREAS.join(" | ")} (default: inferred from tags)
  --tags <a,b>        Comma-separated tags; repeatable
  --case-study        Add an empty case_study block
  --pair              Also write the zh half, sharing one i18n_key
  --help              Show this message
`;

/** `--flag value`, `--flag=value` and repeatable flags. */
function parseArgs(argv) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq >= 0) {
      push(values, arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }
    const name = arg.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags.add(name);
      continue;
    }
    push(values, name, next);
    index += 1;
  }
  return { values, flags };
}

function push(target, key, value) {
  if (target[key] === undefined) target[key] = [value];
  else target[key].push(value);
}

function main() {
  const { values, flags } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || values.help) {
    process.stdout.write(USAGE);
    return;
  }

  const title = values.title?.[0]?.trim();
  if (!title) {
    console.error("new-post: --title is required\n");
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }

  const lang = (values.lang?.[0] ?? "en").trim().toLowerCase();
  if (lang !== "en" && lang !== "zh") {
    console.error(`new-post: --lang must be en or zh, got "${lang}"`);
    process.exitCode = 1;
    return;
  }
  if (flags.has("pair") && lang !== "en") {
    console.error("new-post: --pair writes the en+zh pair, so --lang must be en");
    process.exitCode = 1;
    return;
  }

  const area = values.area?.[0]?.trim().toLowerCase();
  if (area && !AREAS.includes(area)) {
    console.error(`new-post: --area must be one of ${AREAS.join(", ")}, got "${area}"`);
    process.exitCode = 1;
    return;
  }

  const common = {
    slug: values.slug?.[0],
    area,
    tags: parseTags(values.tags),
    caseStudy: flags.has("case-study") || Boolean(values["case-study"]),
    date: new Date()
  };

  const rendered = flags.has("pair")
    ? renderPair({
        ...common,
        titleEn: title,
        titleZh: values["title-zh"]?.[0]?.trim() || title,
        lang: "en"
      })
    : [renderPost({ ...common, title, lang })];

  // Refuse before writing anything: a half-written pair is worse than no pair.
  const clashes = rendered.filter((post) => existsSync(join(POSTS_DIR, post.fileName)));
  if (clashes.length) {
    console.error(`new-post: refusing to overwrite ${clashes.map((p) => p.fileName).join(", ")}`);
    console.error("          pass --slug to pick a different file name.");
    process.exitCode = 1;
    return;
  }

  mkdirSync(POSTS_DIR, { recursive: true });
  for (const post of rendered) {
    writeFileSync(join(POSTS_DIR, post.fileName), post.content);
    console.log(`created content/posts/${post.fileName}`);
    console.log(`        ${post.url}`);
  }
  const key = rendered[0].content.match(/^i18n_key: (.*)$/m)?.[1];
  if (flags.has("pair")) console.log(`        shared i18n_key: ${key}`);

  const slug = resolveSlug({ title, slug: common.slug });
  console.log(`\nNext: pnpm dev, then write the body. The file stem is ${slug}.`);
}

main();
