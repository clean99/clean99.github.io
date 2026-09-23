import type { Lang } from "./i18n";
import { collectTags, type TagSummary } from "./posts";
import type { Post } from "./posts";

/**
 * Route data for the topic pages. Both languages share the shape, so the two thin
 * route files build their static paths from the same function and only differ in
 * which language they render.
 */
export interface TagRoute {
  params: { tag: string };
  props: { tag: TagSummary; alternate: string | undefined };
}

/** `/tags/<slug>/` in the given language. */
export function tagPath(lang: Lang, slug: string): string {
  return `${lang === "en" ? "" : "/zh"}/tags/${slug}/`;
}

export function tagRoutes(posts: readonly Post[], lang: Lang): TagRoute[] {
  const other: Lang = lang === "en" ? "zh" : "en";
  const elsewhere = new Set(collectTags(posts, other).map((tag) => tag.slug));
  return collectTags(posts, lang).map((tag) => ({
    params: { tag: tag.slug },
    props: {
      tag,
      // Only advertise a twin when that language actually publishes the topic.
      alternate: elsewhere.has(tag.slug) ? tagPath(other, tag.slug) : undefined
    }
  }));
}
