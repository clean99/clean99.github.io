import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getSourcePath, withTrailingSlash } from "./paths";
import { renderMarkdown, stripMarkdown } from "./markdown";

export type BlogPost = {
  area?: string;
  audience: string[];
  canonicalPath: string;
  categories: string[];
  content: string;
  date: string;
  dateLabel: string;
  excerpt: string;
  featured: boolean;
  filePath: string;
  i18nKey?: string;
  lang: "en" | "zh";
  routeSegments: string[];
  slug: string;
  summary?: string;
  tags: string[];
  title: string;
  updated?: string;
};

type Frontmatter = {
  area?: string;
  audience?: string[] | string;
  categories?: string[] | string;
  date?: Date | string;
  excerpt?: string;
  featured?: boolean;
  i18n_key?: string;
  lang?: string;
  permalink?: string;
  summary?: string;
  tags?: string[] | string;
  title?: string;
  updated?: Date | string;
};

export function getAllPosts(): BlogPost[] {
  const postsDir = getSourcePath("_posts");
  const files = fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  return files
    .map((file) => parsePost(path.join(postsDir, file)))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostsByLanguage(lang: "en" | "zh"): BlogPost[] {
  return getAllPosts().filter((post) => post.lang === lang);
}

export function getPostBySegments(segments: string[]): BlogPost | undefined {
  const pathname = withTrailingSlash(`/${segments.join("/")}`);
  return getAllPosts().find((post) => post.canonicalPath === pathname);
}

export async function getPostHtml(post: BlogPost): Promise<string> {
  return renderMarkdown(post.content);
}

export function getFeaturedPosts(): BlogPost[] {
  return getAllPosts().filter((post) => post.featured || post.audience.includes("interviewers"));
}

function parsePost(filePath: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Frontmatter;
  const slug = path.basename(filePath, ".md").replace(/-zh$/, "");
  const rawDate = readRawFrontmatterValue(raw, "date");
  const rawUpdated = readOptionalRawFrontmatterValue(raw, "updated");
  const dateParts = parseDateParts(rawDate);
  const canonicalPath = buildCanonicalPath({
    permalink: data.permalink,
    slug,
    dateParts
  });
  const content = parsed.content.trim();
  const summary = data.summary ?? data.excerpt;
  const lang = data.lang === "zh" ? "zh" : "en";

  return {
    area: data.area,
    audience: toStringArray(data.audience),
    canonicalPath,
    categories: toStringArray(data.categories),
    content,
    date: toIsoDate(rawDate),
    dateLabel: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    excerpt: summary ?? buildExcerpt(content),
    featured: data.featured === true,
    filePath,
    i18nKey: data.i18n_key,
    lang,
    routeSegments: canonicalPath.replace(/^\/|\/$/g, "").split("/"),
    slug,
    summary,
    tags: toStringArray(data.tags),
    title: data.title ?? slug,
    updated: rawUpdated ? toIsoDate(rawUpdated) : undefined
  };
}

function buildCanonicalPath({
  permalink,
  slug,
  dateParts
}: {
  dateParts: DateParts;
  permalink?: string;
  slug: string;
}): string {
  if (permalink) {
    return withTrailingSlash(`/${permalink.replace(/^\/|\/$/g, "")}`);
  }

  return withTrailingSlash(`/${dateParts.year}/${dateParts.month}/${dateParts.day}/${slug}`);
}

type DateParts = {
  day: string;
  month: string;
  year: string;
};

function parseDateParts(rawDate: string): DateParts {
  const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Invalid post date: ${rawDate}`);
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3]
  };
}

function toIsoDate(rawDate: string): string {
  const normalized = rawDate.trim().replace(" ", "T");
  return new Date(`${normalized}+08:00`).toISOString();
}

function readRawFrontmatterValue(raw: string, key: string): string {
  const match = raw.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"));
  if (!match) {
    throw new Error(`Missing ${key} frontmatter`);
  }

  return match[1];
}

function readOptionalRawFrontmatterValue(raw: string, key: string): string | undefined {
  const match = raw.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m"));
  return match?.[1];
}

function toStringArray(value: string[] | string | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function buildExcerpt(content: string): string {
  return stripMarkdown(content).slice(0, 180);
}
