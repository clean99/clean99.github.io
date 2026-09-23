import { localizePath, normalizePath, splitLangPath, type Lang } from "./i18n";

export type Section = "writing" | "projects" | "tags" | "about";

/** Where each section lives, before language prefixing. */
export const SECTION_PATHS: Record<Section, string> = {
  writing: "/writing/",
  projects: "/projects/",
  tags: "/tags/",
  about: "/about/"
};

/**
 * Profile pages that hang off a section without living under its URL. `/links/`
 * is a companion to About; `/ai-coding-lab/` is a companion to Work. Posts live
 * on dated URLs, so the home page and section pages are the only exceptions.
 */
const SECTION_ALIASES: Record<string, Section> = {
  "/links/": "about",
  "/about/": "about",
  "/ai-coding-lab/": "projects",
  "/projects/": "projects",
  "/tags/": "tags",
  "/writing/": "writing"
};

const POST_PATH = /^\/(?:\d{4}\/\d{2}\/\d{2}|og)\//;

/**
 * The nav section a URL belongs to, used when a page does not pass `section`
 * explicitly. Nested routes inherit the section they hang off: `/tags/foo/` is
 * still Topics, every dated post URL is Writing. The home page marks nothing.
 */
export function sectionForPath(path: string): Section | undefined {
  const { path: bare } = splitLangPath(path);
  if (bare === "/") return undefined;
  const exact = SECTION_ALIASES[bare];
  if (exact) return exact;
  if (POST_PATH.test(bare)) return "writing";
  if (bare.startsWith("/tags/")) return "tags";
  if (bare.startsWith("/writing/")) return "writing";
  if (bare.startsWith("/projects/")) return "projects";
  if (bare.startsWith("/about/") || bare.startsWith("/links/")) return "about";
  if (bare.startsWith("/ai-coding-lab/")) return "projects";
  return undefined;
}

/**
 * The other language's URL for the page the reader is on.
 *
 * `alternates` (passed by the page) always wins. Otherwise the current path is
 * prefixed or unprefixed (`/tags/foo/` ⇄ `/zh/tags/foo/`). A dated post URL only
 * has a counterpart when the post was translated, which the page passes through
 * `alternates`; without one the caller falls back to that language's home page
 * instead of linking into a redirect stub.
 */
export function counterpartPath(
  path: string,
  target: Lang,
  alternates: Partial<Record<Lang, string>> = {}
): string | undefined {
  const explicit = alternates[target];
  if (explicit) return explicit;
  const { path: bare } = splitLangPath(path);
  if (POST_PATH.test(bare) || bare === "/404/") return undefined;
  if (target === "zh") return bare === "/" ? "/zh/" : `/zh${bare}`;
  return bare;
}

export interface NavItem {
  id: Section;
  href: string;
  label: string;
  current: "page" | "true" | undefined;
}

/** The primary nav, with `aria-current` resolved for the current URL. */
export function navItems(input: {
  lang: Lang;
  path: string;
  section: Section | undefined;
  labels: Record<Section, string>;
}): NavItem[] {
  const active = input.section ?? sectionForPath(input.path);
  const order: Section[] = ["writing", "projects", "tags", "about"];
  return order.map((id) => {
    const href = localizePath(SECTION_PATHS[id], input.lang);
    const exact = normalizePath(input.path) === href;
    return {
      id,
      href,
      label: input.labels[id],
      current: exact ? "page" : id === active ? "true" : undefined
    };
  });
}
