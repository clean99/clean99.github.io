import { AUTHOR, SITE_URL } from "../site.config";
import { toIsoWithOffset } from "./dates";
import { HTML_LANG, LANGS, localizePath, t, type Lang } from "./i18n";
import type { Post } from "./posts";
import { AREA_LABELS } from "./taxonomy";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** `<title>`: page name first (what shows in a crowded tab strip), site name last. */
export function documentTitle(title: string | undefined, lang: Lang): string {
  const site = t(lang).siteTitle;
  if (!title || title === site) return site;
  return `${title} · ${AUTHOR.name}`;
}

export function siteOgImage(lang: Lang): string {
  return `/og/site-${lang}.png`;
}

export function postOgImage(post: Pick<Post, "lang" | "key">): string {
  return `/og/${post.lang}/${post.key}.png`;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/**
 * hreflang cluster for a page that exists in more than one language.
 * Single-language pages get none: a self-only cluster carries no signal.
 */
export function hreflangAlternates(paths: Partial<Record<Lang, string>>): Alternate[] {
  const present = LANGS.filter((lang) => paths[lang]);
  if (present.length < 2) return [];
  const links = present.map((lang) => ({ hreflang: HTML_LANG[lang], href: absoluteUrl(paths[lang]!) }));
  const fallback = paths.en ?? paths[present[0]!]!;
  return [...links, { hreflang: "x-default", href: absoluteUrl(fallback) }];
}

type JsonLdNode = Record<string, unknown>;

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function personNode(): JsonLdNode {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR.name,
    alternateName: [AUTHOR.nativeName, AUTHOR.alternateName],
    url: absoluteUrl("/about/"),
    email: `mailto:${AUTHOR.email}`,
    jobTitle: AUTHOR.jobTitle,
    knowsAbout: [...AUTHOR.knowsAbout],
    sameAs: [AUTHOR.github]
  };
}

export function websiteNode(lang: Lang): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl(localizePath("/", lang)),
    name: t(lang).siteTitle,
    description: t(lang).siteDescription,
    inLanguage: LANGS.map((l) => HTML_LANG[l]),
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID }
  };
}

export function profilePageNode(input: { path: string; lang: Lang; title: string }): JsonLdNode {
  return {
    "@type": "ProfilePage",
    "@id": `${absoluteUrl(input.path)}#page`,
    url: absoluteUrl(input.path),
    name: input.title,
    inLanguage: HTML_LANG[input.lang],
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID }
  };
}

export function blogPostingNode(post: Post, options: { translation?: Post | undefined } = {}): JsonLdNode {
  const url = absoluteUrl(post.url);
  const { translation } = options;
  const node: JsonLdNode = {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: url,
    headline: post.title.length > 110 ? `${post.title.slice(0, 109)}…` : post.title,
    description: post.description,
    datePublished: toIsoWithOffset(post.date),
    dateModified: toIsoWithOffset(post.updated ?? post.date),
    inLanguage: HTML_LANG[post.lang],
    image: [absoluteUrl(postOgImage(post))],
    articleSection: AREA_LABELS[post.lang][post.area],
    keywords: post.tags.map((tag) => tag.label),
    timeRequired: `PT${post.minutes}M`,
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID }
  };
  if (translation) {
    const ref = { "@id": `${absoluteUrl(translation.url)}#article` };
    // The English note is the original; Chinese editions are its translations.
    node[post.lang === "en" ? "workTranslation" : "translationOfWork"] = ref;
  }
  return node;
}

export function breadcrumbNode(items: readonly { name: string; path: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function jsonLdGraph(nodes: readonly JsonLdNode[]): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Safe inside `<script type="application/ld+json">`: no `</script>` breakout. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
