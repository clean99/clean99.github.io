import { dateParts } from "./dates";
import { findTranslation, type Post } from "./posts";

export interface Redirect {
  from: string;
  to: string;
}

/** Retired sections that get a static meta-refresh stub (no case collision with a live page). */
export const SECTION_REDIRECTS: Redirect[] = [
  { from: "/interviewers/", to: "/projects/" },
  { from: "/zh/interviewers/", to: "/zh/projects/" },
  { from: "/Works/", to: "/projects/" },
  { from: "/zh/Works/", to: "/zh/projects/" },
  { from: "/archives/", to: "/writing/" },
  { from: "/zh/archives/", to: "/zh/writing/" }
];

/**
 * The legacy theme rendered a `/zh/<date>/<slug>/` fallback for English-only posts.
 * Keep those URLs alive by pointing them at the English original.
 */
export function missingTranslationRedirects(posts: readonly Post[]): Redirect[] {
  const out: Redirect[] = [];
  for (const post of posts) {
    if (post.lang !== "en" || post.draft || findTranslation(posts, post)) continue;
    const { year, month, day } = dateParts(post.date);
    out.push({ from: `/zh/${year}/${month}/${day}/${post.id}/`, to: post.url });
  }
  return out;
}

export function allRedirects(posts: readonly Post[]): Redirect[] {
  return [...SECTION_REDIRECTS, ...missingTranslationRedirects(posts)];
}

/**
 * GitHub Pages paths are case-sensitive but macOS/Windows build disks are not, so
 * `/About/` and `/about/` cannot both exist in `dist/`. The 404 page resolves
 * case variants client-side from this lowercase → canonical map.
 */
export function caseInsensitiveMap(paths: readonly string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const path of paths) {
    const lower = path.toLowerCase();
    if (lower !== path || !(lower in map)) map[lower] = path;
  }
  return map;
}
