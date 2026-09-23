import { HTML_LANG, type Lang } from "./i18n";
import type { Post } from "./posts";
import { absoluteUrl } from "./seo";

/**
 * JSON-LD builders for the browse pages. `seo.ts` carries the node shapes shared
 * with posts and the home page; these are their listing-page counterparts — the
 * archive and its year sections, and the topic pages. Only the node builders live
 * here; `BaseLayout` still assembles and serializes the graph through `seo.ts`.
 */

type JsonLdNode = Record<string, unknown>;

const WEBSITE_ID = `${absoluteUrl("/")}#website`;

/** Newest first, matching the order the pages render. */
function itemList(posts: readonly Post[]): JsonLdNode {
  return {
    "@type": "ItemList",
    numberOfItems: posts.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(post.url),
      name: post.title,
      ...(post.summary ? { description: post.summary } : {})
    }))
  };
}

/** The archive page itself, with the notes it lists. */
export function collectionNode(input: {
  path: string;
  lang: Lang;
  name: string;
  description: string;
  posts: readonly Post[];
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: HTML_LANG[input.lang],
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: itemList(input.posts)
  };
}

/** One year section of the archive, so a year heading is addressable on its own. */
export function yearNode(input: {
  path: string;
  year: number;
  lang: Lang;
  name: string;
  posts: readonly Post[];
}): JsonLdNode {
  const url = `${absoluteUrl(input.path)}#year-${input.year}`;
  return {
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: input.name,
    inLanguage: HTML_LANG[input.lang],
    isPartOf: { "@id": `${absoluteUrl(input.path)}#page` },
    mainEntity: itemList(input.posts)
  };
}

/** One topic and everything filed under it. */
export function tagPageNode(input: {
  path: string;
  lang: Lang;
  name: string;
  description: string;
  posts: readonly Post[];
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: HTML_LANG[input.lang],
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: itemList(input.posts)
  };
}

/** The topics index: each topic as a defined term, pointing at its own page. */
export function tagIndexNode(input: {
  path: string;
  lang: Lang;
  name: string;
  description: string;
  tags: readonly { slug: string; label: string; count: number }[];
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  const tagPath = (slug: string) => `${input.path.replace(/\/$/, "")}/${slug}/`;
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: HTML_LANG[input.lang],
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.tags.length,
      itemListElement: input.tags.map((tag, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(tagPath(tag.slug)),
        name: tag.label,
        item: {
          "@type": "DefinedTerm",
          "@id": `${absoluteUrl(tagPath(tag.slug))}#term`,
          name: tag.label,
          inDefinedTermSet: { "@id": `${url}#terms`, "@type": "DefinedTermSet", name: input.name }
        }
      }))
    }
  };
}
