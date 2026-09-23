import { toInstant } from "./dates";
import { HTML_LANG, t, type Lang } from "./i18n";
import type { Post } from "./posts";
import { SITE_URL } from "../site.config";

/** Atom 1.0, per RFC 4287. Built as a string so the feed is byte-stable across builds. */
export const ATOM_CONTENT_TYPE = "application/atom+xml; charset=utf-8";

/** How many entries carry their full body; older ones fall back to summary + link. */
export const FEED_FULL_CONTENT = 20;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 3339 instants compare and sort as plain strings. */
function instant(date: Date): string {
  return toInstant(date);
}

function indent(level: number): string {
  return "  ".repeat(level);
}

function element(name: string, value: string, level = 1, attributes = ""): string {
  const attrs = attributes ? ` ${attributes}` : "";
  return `${indent(level)}<${name}${attrs}>${escapeXml(value)}</${name}>`;
}

/** An empty element, used for `link`, which carries everything in attributes. */
function emptyElement(name: string, attributes: string, level = 1): string {
  return `${indent(level)}<${name} ${attributes}/>`;
}

export interface FeedEntry {
  post: Post;
  /** Rendered article HTML; omitted entries fall back to a summary and a link. */
  content?: string | undefined;
}

export interface AtomFeedInput {
  lang: Lang;
  entries: readonly FeedEntry[];
  /** Site-absolute path of the feed document, e.g. `/atom.xml`. */
  feedPath: string;
  /** Site-absolute path of the HTML page the feed describes. */
  homePath: string;
  author: { name: string; uri?: string | undefined; email?: string | undefined };
  /** Overrides the derived timestamp (newest entry, then the build date). */
  updated?: Date | undefined;
}

/** Newest timestamp in the feed, compared as RFC 3339 instants (which sort as strings). */
export function feedUpdated(entries: readonly FeedEntry[], fallback: Date): string {
  let newest = instant(fallback);
  for (const { post } of entries) {
    const candidate = instant(post.updated ?? post.date);
    if (candidate > newest) newest = candidate;
  }
  return newest;
}

function authorBlock(level: number, author: AtomFeedInput["author"]): string {
  const lines = [`${indent(level)}<author>`, element("name", author.name, level + 1)];
  if (author.uri) lines.push(element("uri", author.uri, level + 1));
  if (author.email) lines.push(element("email", author.email, level + 1));
  lines.push(`${indent(level)}</author>`);
  return lines.join("\n");
}

function entryXml(entry: FeedEntry, author: AtomFeedInput["author"], level: number): string {
  const { post, content } = entry;
  const url = new URL(post.url, SITE_URL).href;
  const updated = post.updated ?? post.date;
  const lines: string[] = [
    `${indent(level)}<entry>`,
    element("title", post.title, level + 1),
    element("id", url, level + 1),
    emptyElement("link", `rel="alternate" type="text/html" href="${escapeXml(url)}"`, level + 1),
    element("published", instant(post.date), level + 1),
    element("updated", instant(updated), level + 1),
    authorBlock(level + 1, author)
  ];
  if (content) {
    lines.push(element("content", content, level + 1, `type="html" xml:base="${escapeXml(url)}"`));
    lines.push(element("summary", post.summary, level + 1, 'type="text"'));
  } else {
    lines.push(element("summary", post.summary, level + 1, 'type="text"'));
  }
  for (const tag of post.tags) {
    lines.push(emptyElement("category", `term="${escapeXml(tag.slug)}" label="${escapeXml(tag.label)}"`, level + 1));
  }
  lines.push(`${indent(level)}</entry>`);
  return lines.join("\n");
}

export function atomFeed(input: AtomFeedInput): string {
  const { lang, entries, feedPath, homePath, author } = input;
  const ui = t(lang);
  const self = new URL(feedPath, SITE_URL).href;
  const home = new URL(homePath, SITE_URL).href;
  const updated = input.updated ? instant(input.updated) : feedUpdated(entries, new Date(0));

  const head = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${HTML_LANG[lang]}">`,
    element("title", ui.siteTitle),
    element("subtitle", ui.siteDescription),
    element("id", self),
    element("updated", updated),
    emptyElement("link", `rel="self" type="application/atom+xml" href="${escapeXml(self)}"`),
    emptyElement("link", `rel="alternate" type="text/html" href="${escapeXml(home)}"`),
    authorBlock(1, author),
    element("rights", `© ${author.name}`),
    `${indent(1)}<generator uri="https://astro.build" version="7">Astro</generator>`
  ];

  const body = entries.map((entry) => entryXml(entry, author, 1));
  return [...head, ...body, `</feed>`, ""].join("\n");
}
