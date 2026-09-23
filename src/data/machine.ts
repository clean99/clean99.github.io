import { getCollection, render } from "astro:content";
import { allPosts, postIndex, type PostEntry } from "./posts";
import { ATOM_CONTENT_TYPE, FEED_FULL_CONTENT, atomFeed, type FeedEntry } from "../lib/feed";
import { localizePath, type Lang } from "../lib/i18n";
import { LLMS_CONTENT_TYPE, llmsFullTxt, llmsTxt } from "../lib/llms";
import { postsForLang, type Post } from "../lib/posts";
import { resolvePostLink } from "../markdown/remark-hexo-tags";
import { AUTHOR, SITE } from "../site.config";

/**
 * The machine-facing documents (feeds, llms.txt, the markdown twins) are the
 * only place that needs a post's *rendered HTML* alongside its metadata, so the
 * content-collection access lives here and the routes stay thin.
 */

async function entriesById(): Promise<Map<string, PostEntry>> {
  const entries = await getCollection("posts");
  return new Map(entries.map((entry) => [entry.id, entry]));
}

/** Post HTML for the newest entries; older ones fall back to summary + link. */
export async function feedEntries(lang: Lang): Promise<FeedEntry[]> {
  const list = postsForLang(await allPosts(), lang);
  const byId = await entriesById();
  return Promise.all(
    list.map(async (post, index) => {
      const entry = byId.get(post.id);
      if (index >= FEED_FULL_CONTENT || !entry) return { post };
      const { Content } = await render(entry);
      return { post, content: String(Content) };
    })
  );
}

export async function atomDocument(lang: Lang): Promise<string> {
  return atomFeed({
    lang,
    entries: await feedEntries(lang),
    feedPath: localizePath("/atom.xml", lang),
    homePath: localizePath("/", lang),
    author: { name: AUTHOR.name, uri: AUTHOR.github, email: AUTHOR.email }
  });
}

export async function llmsDocument(lang: Lang): Promise<string> {
  const posts = await allPosts();
  return llmsTxt({
    lang,
    posts: postsForLang(posts, lang),
    // `llms-full.txt` is one file holding both languages, so both indexes point
    // at the same root path rather than a per-language variant that is not built.
    extras: ["Full archive (all posts, both languages)|/llms-full.txt"]
  });
}

export const ATOM_HEADERS = {
  "Content-Type": ATOM_CONTENT_TYPE,
  "Cache-Control": "public, max-age=3600"
} as const;

export const LLMS_HEADERS = {
  "Content-Type": LLMS_CONTENT_TYPE,
  "Cache-Control": "public, max-age=3600"
} as const;

/** One post's markdown body with `{% post_link %}` rewritten to a real link. */
export function markdownBody(post: Post, entry: PostEntry | undefined, all: readonly Post[]): string {
  const body = (entry?.body ?? "").trim();
  return body.replace(/\{%\s*(post_link|youtube)\s+([^%]*?)\s*%\}/g, (raw, name: string, args: string) => {
    if (name === "youtube") return args.trim() ? `https://www.youtube.com/watch?v=${args.trim()}` : raw;
    const [slug = "", ...rest] = args.split(/\s+/);
    const label = rest.join(" ") || slug.replace(/-/g, " ");
    const target = resolvePostLink(all, slug, post.lang);
    return target ? `[${label}](${target.url})` : label;
  });
}

export async function fullArchiveDocument(): Promise<string> {
  const { posts, entries } = await postIndex();
  const published = posts.filter((post) => !post.draft);
  return llmsFullTxt(posts, (post) => markdownBody(post, entries.get(post.id), published));
}

export const MACHINE_SITE = SITE;
