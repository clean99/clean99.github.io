import { dateParts } from "./dates";
import { HTML_LANG, LANGS, type Lang } from "./i18n";
import type { Post } from "./posts";
import { caseInsensitiveMap } from "./redirects";
import { hreflangAlternates } from "./seo";
import { SITE_URL } from "../site.config";

export const SITEMAP_CONTENT_TYPE = "application/xml; charset=utf-8";
export const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
export const XHTML_NS = "http://www.w3.org/1999/xhtml";

export function escapeXmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sitemap `lastmod` is a date, not a timestamp: `2026-06-19`. */
export function lastmodDate(post: Pick<Post, "date" | "updated">): string {
  const { year, month, day } = dateParts(post.updated ?? post.date);
  return `${year}-${month}-${day}`;
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapEntry {
  /** Site-absolute path, with trailing slash. */
  path: string;
  /** `YYYY-MM-DD`; omitted when the page has no meaningful modification date. */
  lastmod?: string | undefined;
  /** hreflang cluster, including x-default, when the page exists in two languages. */
  alternates?: readonly SitemapAlternate[] | undefined;
}

/**
 * One entry per page per language. The post's own path is its canonical URL, so
 * a language pair contributes two entries that point at each other.
 */
export function postEntries(posts: readonly Post[]): SitemapEntry[] {
  return posts
    .filter((post) => !post.draft)
    .map((post) => {
      const alternates = hreflangAlternates(
        Object.fromEntries(posts.filter((p) => p.key === post.key).map((p) => [p.lang, p.url])) as Partial<
          Record<Lang, string>
        >
      );
      return {
        path: post.url,
        lastmod: lastmodDate(post),
        ...(alternates.length > 1 && { alternates })
      };
    });
}

function entryXml(entry: SitemapEntry): string {
  const loc = new URL(entry.path, SITE_URL).href;
  const lines = [`  <url>`, `    <loc>${escapeXmlText(loc)}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  for (const alternate of entry.alternates ?? []) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${escapeXmlText(alternate.hreflang)}" href="${escapeXmlText(
        alternate.href
      )}"/>`
    );
  }
  lines.push(`  </url>`);
  return lines.join("\n");
}

/** Deduplicate by path, keeping the first (most specific) entry. */
export function dedupeEntries(entries: readonly SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    out.push(entry);
  }
  return out;
}

export function sitemapXml(entries: readonly SitemapEntry[]): string {
  const body = dedupeEntries(entries).map(entryXml).join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="${SITEMAP_NS}" xmlns:xhtml="${XHTML_NS}">`,
    body,
    `</urlset>`,
    ""
  ].join("\n");
}

/**
 * Every static section page that ships in the export. Derived from a constant
 * rather than the filesystem so a page another route owns missing from a build
 * cannot silently drop out of the sitemap.
 */
export const SECTION_PATHS = [
  "/",
  "/writing/",
  "/projects/",
  "/about/",
  "/links/",
  "/ai-coding-lab/",
  "/tags/"
] as const;

export function sectionEntries(): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const base of SECTION_PATHS) {
    const paths = Object.fromEntries(LANGS.map((lang) => [lang, lang === "en" ? base : `/zh${base}`])) as Partial<
      Record<Lang, string>
    >;
    const alternates = hreflangAlternates(paths);
    for (const lang of LANGS) {
      out.push({ path: paths[lang]!, ...(alternates.length > 1 && { alternates }) });
    }
  }
  return out;
}

/** Tag hubs: one entry per topic per language, with the hreflang cluster. */
export function tagEntries(tagsByLang: Partial<Record<Lang, readonly { slug: string }[]>>): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const slugs = new Set<string>();
  for (const list of Object.values(tagsByLang)) for (const tag of list ?? []) slugs.add(tag.slug);
  for (const slug of [...slugs].sort()) {
    const paths = Object.fromEntries(
      LANGS.filter((lang) => (tagsByLang[lang] ?? []).some((tag) => tag.slug === slug)).map((lang) => [
        lang,
        lang === "en" ? `/tags/${slug}/` : `/zh/tags/${slug}/`
      ])
    ) as Partial<Record<Lang, string>>;
    const alternates = hreflangAlternates(paths);
    for (const path of Object.values(paths)) {
      out.push({ path: path!, ...(alternates.length > 1 && { alternates }) });
    }
  }
  return out;
}

/**
 * Retired section names whose lowercase form is *not* a live page, so the 404
 * page's case map has to carry them explicitly. Every other legacy casing
 * (`/About/`, `/tags/Frontend/`) resolves through the lowercase key alone.
 */
export const SECTION_ALIASES: Record<string, string> = {
  "/works/": "/projects/",
  "/zh/works/": "/zh/projects/",
  "/interviewers/": "/projects/",
  "/zh/interviewers/": "/zh/projects/",
  "/archives/": "/writing/",
  "/zh/archives/": "/zh/writing/"
};

export interface PageInventory {
  posts: readonly Post[];
  tags: Partial<Record<Lang, readonly { slug: string }[]>>;
}

/**
 * Every real page path in the build, for the 404 page's case map: sections,
 * tag hubs and posts, in both languages. `/404` is deliberately absent — it is
 * the page doing the resolving, not a destination.
 */
export function pagePaths(input: PageInventory): string[] {
  const paths = new Set<string>();
  for (const entry of sectionEntries()) paths.add(entry.path);
  for (const entry of tagEntries(input.tags)) paths.add(entry.path);
  for (const post of input.posts) {
    if (!post.draft) paths.add(post.url);
  }
  return [...paths];
}

/** Lowercase → canonical map, with the aliases a live page cannot supply itself. */
export function caseMapFor(input: PageInventory): Record<string, string> {
  const map = caseInsensitiveMap(pagePaths(input));
  for (const [from, to] of Object.entries(SECTION_ALIASES)) {
    if (map[from] === from) continue;
    map[from] = to;
  }
  return map;
}

/** Language code used in the sitemap's xhtml:link cluster. */
export const SITEMAP_LANG = HTML_LANG;
