import { normalizePath } from "./i18n";

/**
 * Area filtering for the writing index.
 *
 * The pages render every note; a `?area=` link only pre-selects a chip. Keeping
 * the decision in one pure function means the server render and the client
 * enhancement can never disagree about what "current" means.
 */

/** Sentinel selection: no area filter. */
export const ALL_AREAS = "all";

export interface AreaTagged {
  area: string;
}

export interface AreaGroup<T extends AreaTagged> {
  year: number;
  posts: readonly T[];
}

export interface FilteredGroup<T extends AreaTagged> {
  year: number;
  posts: T[];
  /** Nothing in this year matches; the heading goes with its list. */
  hidden: boolean;
}

export interface AreaSelection<T extends AreaTagged> {
  area: string;
  groups: FilteredGroup<T>[];
  visible: number;
  total: number;
  empty: boolean;
}

/** `?area=` value → a known slug, or `all` for absent, empty and unknown values. */
export function resolveArea(value: string | null | undefined, known: readonly string[]): string {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug || slug === ALL_AREAS) return ALL_AREAS;
  return known.includes(slug) ? slug : ALL_AREAS;
}

/** Chip target: the plain index for `all`, otherwise the same page pre-filtered. */
export function areaHref(path: string, area: string): string {
  const base = normalizePath(path);
  return area === ALL_AREAS ? base : `${base}?area=${area}`;
}

/** Split year groups into the rows to show and the groups to hide. */
export function filterByArea<T extends AreaTagged>(groups: readonly AreaGroup<T>[], area: string): AreaSelection<T> {
  const out: FilteredGroup<T>[] = [];
  let visible = 0;
  let total = 0;
  for (const group of groups) {
    total += group.posts.length;
    const posts = area === ALL_AREAS ? [...group.posts] : group.posts.filter((post) => post.area === area);
    visible += posts.length;
    out.push({ year: group.year, posts, hidden: posts.length === 0 });
  }
  return { area, groups: out, visible, total, empty: visible === 0 };
}

/** Weight of a topic against the busiest one, clamped so a long tail stays visible. */
export function tagWeight(count: number, max: number, floor = 0.08): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.max(floor, Math.min(1, count / max));
}

export interface WeightedTag {
  slug: string;
  label: string;
  count: number;
  weight: number;
}

export interface TagTiers<T extends WeightedTag> {
  /** The subjects the archive is actually about, ranked. */
  lead: T[];
  /** The long tail, shown as a compact list. */
  more: T[];
}

/** Rank topics by how much has been written about them, busiest first. */
export function weighTags<T extends { slug: string; label: string; count: number }>(
  tags: readonly T[],
  leadLimit = 8
): TagTiers<T & { weight: number }> {
  const sorted = [...tags].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const max = sorted[0]?.count ?? 0;
  const weighed = sorted.map((tag) => ({ ...tag, weight: tagWeight(tag.count, max) }));
  return { lead: weighed.slice(0, leadLimit), more: weighed.slice(leadLimit) };
}
