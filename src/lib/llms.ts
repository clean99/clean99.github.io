import { formatShortDate } from "./dates";
import { normalizePath, t, type Lang } from "./i18n";
import type { Post } from "./posts";
import { absoluteUrl } from "./seo";
import { stripMarkdown } from "./text";
import { AUTHOR, SITE_URL } from "../site.config";

export const LLMS_CONTENT_TYPE = "text/plain; charset=utf-8";

/** The plain-markdown twin of a post: the canonical path with `index.md` appended. */
export function markdownPath(post: Pick<Post, "url">): string {
  return `${post.url}index.md`;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** One `- [title](url): description` line, the shape llmstxt.org specifies. */
export function llmsLine(input: { title: string; url: string; description: string }): string {
  const title = collapse(input.title);
  const description = collapse(input.description);
  return description ? `- [${title}](${input.url}): ${description}` : `- [${title}](${input.url})`;
}

export interface LlmsSection {
  heading: string;
  lines: string[];
}

/** Section headings for the index, keyed by language. Case studies come first. */
const HEADINGS: Record<Lang, { caseStudies: string; writing: string; profile: string }> = {
  en: { caseStudies: "Case studies", writing: "Writing", profile: "Profile" },
  zh: { caseStudies: "项目复盘", writing: "文章", profile: "关于" }
};

export interface LlmsInput {
  lang: Lang;
  posts: readonly Post[];
  /** Follow-up pages such as `llms-full.txt`, appended under Optional. */
  extras?: readonly string[] | undefined;
}

/**
 * Case studies first — they are the pages an agent should read when asked what
 * this engineer has built — then the remaining writing newest first.
 */
export function llmsSections(input: LlmsInput): LlmsSection[] {
  const { lang, posts } = input;
  const published = posts.filter((post) => post.lang === lang && !post.draft);
  const toLine = (post: Post): string =>
    llmsLine({ title: post.title, url: absoluteUrl(markdownPath(post)), description: post.summary });

  const caseStudies = published.filter((post) => post.caseStudy).map(toLine);
  const writing = published.filter((post) => !post.caseStudy).map(toLine);

  const sections: LlmsSection[] = [];
  if (caseStudies.length) sections.push({ heading: HEADINGS[lang].caseStudies, lines: caseStudies });
  if (writing.length) sections.push({ heading: HEADINGS[lang].writing, lines: writing });

  sections.push({
    heading: HEADINGS[lang].profile,
    lines: [
      llmsLine({
        title: AUTHOR.name,
        url: absoluteUrl(lang === "en" ? "/about/" : "/zh/about/"),
        description: `${AUTHOR.jobTitle}. ${t(lang).siteDescription}`
      }),
      llmsLine({
        title: lang === "en" ? "All writing" : "全部文章",
        url: absoluteUrl(lang === "en" ? "/writing/" : "/zh/writing/"),
        description: lang === "en" ? "Every note, newest first." : "全部笔记，按时间倒序。"
      })
    ].concat(
      (input.extras ?? []).map((extra) => {
        const [title, ...rest] = extra.split("|");
        return llmsLine({
          title: collapse(title ?? ""),
          url: absoluteUrl(collapse(rest.join("|") || "/llms-full.txt")),
          description:
            lang === "en"
              ? "The same index with every published post inlined as Markdown."
              : "同一份索引，附全部已发布文章的 Markdown 全文。"
        });
      })
    )
  });

  return sections;
}

export function llmsTxt(input: LlmsInput): string {
  const { lang } = input;
  const lines = [`# ${t(lang).siteTitle}`, "", `> ${collapse(t(lang).siteDescription)}`, ""];
  for (const section of llmsSections(input)) {
    lines.push(`## ${section.heading}`, "", ...section.lines, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Hexo tag plugins have no place in a plain-markdown export: a reader of
 * `index.md` wants the reading copy, so the only thing worth rewriting is the
 * link a `{% post_link %}` stood for.
 */
export function stripHexoTags(markdown: string, resolve?: (slug: string) => string | undefined): string {
  return markdown.replace(/\{%\s*(post_link|youtube)\s+([^%]*?)\s*%\}/g, (raw, name: string, args: string) => {
    if (name === "youtube") return args.trim() ? `https://www.youtube.com/watch?v=${args.trim()}` : raw;
    const [slug = "", ...rest] = args.split(/\s+/);
    const label = rest.join(" ") || slug.replace(/-/g, " ");
    const url = resolve?.(slug);
    return url ? `[${label}](${url})` : label;
  });
}

export interface FullTextInput {
  post: Post;
  /** Raw markdown body, already stripped of its frontmatter. */
  body: string;
  resolvePostLink?: ((slug: string) => string | undefined) | undefined;
}

/** The header a reader needs to cite the file: what it is, where it lives, when. */
export function fullTextHeader(post: Post): string {
  const canonical = absoluteUrl(post.url);
  return [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    `url: ${canonical}`,
    `date: ${formatShortDate(post.date)}`,
    `lang: ${post.lang}`,
    "---"
  ].join("\n");
}

/**
 * One post as plain markdown: the raw body under a short header, so an agent can
 * quote the prose and cite the canonical page without stripping HTML.
 */
export function postMarkdown(input: FullTextInput): string {
  const body = stripHexoTags(input.body, input.resolvePostLink).trim();
  return `${fullTextHeader(input.post)}\n\n${body}\n`;
}

/** Title/url/date headers over concatenated bodies: the whole archive in one file. */
export function llmsFullTxt(posts: readonly Post[], bodies: (post: Post) => string): string {
  const ordered = [...posts].filter((post) => !post.draft).sort((a, b) => b.date.getTime() - a.date.getTime());
  const chunks = ordered.map((post) => {
    const canonical = absoluteUrl(post.url);
    const markdown = absoluteUrl(markdownPath(post));
    return [
      `# ${post.title}`,
      "",
      `- Canonical: ${canonical}`,
      `- Markdown: ${markdown}`,
      `- Date: ${formatShortDate(post.date)}${post.updated ? ` (updated ${formatShortDate(post.updated)})` : ""}`,
      `- Language: ${post.lang}`,
      "",
      bodies(post).trim()
    ].join("\n");
  });
  return `${chunks.join("\n\n---\n\n")}\n`;
}

/** Crop a post body for the search-engine summary fields that have hard caps. */
export function metaDescription(value: string, max = 160): string {
  const text = collapse(stripMarkdown(value));
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export const SITE_ORIGIN = SITE_URL;
export const MARKDOWN_ALTERNATE = (post: Pick<Post, "url">): string => normalizePath(markdownPath(post));
