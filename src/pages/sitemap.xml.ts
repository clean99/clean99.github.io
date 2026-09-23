/**
 * The sitemap, with an xhtml:link cluster on every page that exists in both
 * languages so a crawler sees the pair as one page with two editions. Drafts,
 * redirect stubs and the 404 page are excluded: they are either not published
 * or deliberately point somewhere else.
 */
import type { APIRoute } from "astro";
import { allPosts } from "../data/posts";
import { LANGS, type Lang } from "../lib/i18n";
import { collectTags } from "../lib/posts";
import { SITEMAP_CONTENT_TYPE, postEntries, sectionEntries, sitemapXml, tagEntries } from "../lib/sitemap";

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await allPosts();
  const tags: Partial<Record<Lang, readonly { slug: string }[]>> = {};
  for (const lang of LANGS) tags[lang] = collectTags(posts, lang);
  const xml = sitemapXml([...sectionEntries(), ...postEntries(posts), ...tagEntries(tags)]);
  return new Response(xml, {
    headers: {
      "Content-Type": SITEMAP_CONTENT_TYPE,
      "Cache-Control": "public, max-age=3600"
    }
  });
};
