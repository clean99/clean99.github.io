import { localizePath, type Lang } from "./i18n";
import { PROJECT_KEYS, projectPicks, type Post } from "./posts";
import { AREAS, AREA_LABELS } from "./taxonomy";

/** One rich card on the Work page. */
export interface ProjectCard {
  post: Post;
  /** 2–3 result lines; empty when the post carries no case-study frontmatter. */
  impact: string[];
  /** Stack chips: case-study stack first, then the post's tags. */
  stack: string[];
  /** Role / period / team, when the case-study block provides them. */
  facts: { label: string; value: string }[];
  /** Whether the card is backed by a real `case_study` block. */
  caseStudy: boolean;
}

/** How many impact bullets a card shows, and how many stack chips. */
export const IMPACT_LIMIT = 3;
export const STACK_LIMIT = 6;

function stackChips(post: Post): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...(post.caseStudy?.stack ?? []), ...post.tags.map((tag) => tag.label)]) {
    const label = item.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length === STACK_LIMIT) break;
  }
  return out;
}

const FACT_KEYS = ["role", "period", "team"] as const;
export type FactKey = (typeof FACT_KEYS)[number];

/** Labels for the case-study fact row, supplied by the page's copy module. */
export type FactLabels = Record<FactKey, string>;

/** A run of impact-bullet text, flagged when it was wrapped in `backticks`. */
export interface ImpactPart {
  text: string;
  code: boolean;
}

/**
 * Split one impact bullet into plain and code runs. The frontmatter is a plain
 * string, so authors write figures as `` `1829.8ms` ``; rendering the backticks
 * literally would be a typo, and the numbers read better in the mono face.
 */
export function impactParts(line: string): ImpactPart[] {
  const parts: ImpactPart[] = [];
  for (const [index, chunk] of line.split("`").entries()) {
    if (chunk) parts.push({ text: chunk, code: index % 2 === 1 });
  }
  return parts;
}

/**
 * The Work page's cards. `projectPicks` already leads with case studies and falls
 * back to the hand-picked build write-ups; a card renders the same shape either
 * way, so the page survives case-study frontmatter landing later.
 */
export function projectCards(posts: readonly Post[], lang: Lang, labels?: FactLabels): ProjectCard[] {
  void lang;
  return projectPicks(posts, lang).map((post) => {
    const facts: { label: string; value: string }[] = [];
    for (const key of FACT_KEYS) {
      const value = post.caseStudy?.[key];
      if (!value || !labels) continue;
      facts.push({ label: labels[key], value });
    }
    return {
      post,
      impact: post.caseStudy?.impact.slice(0, IMPACT_LIMIT) ?? [],
      stack: stackChips(post),
      facts,
      caseStudy: Boolean(post.caseStudy)
    };
  });
}

export interface AlsoCard {
  post: Post;
  areaLabel: string;
}

/**
 * "More writing on the same themes": the strongest remaining notes once the
 * cards are spent, deduplicated by translation key.
 */
export function alsoWriting(cards: readonly ProjectCard[], posts: readonly Post[], lang: Lang, limit = 6): AlsoCard[] {
  const shown = new Set(cards.map((card) => card.post.id));
  const keys = new Set(cards.map((card) => card.post.key));
  const ranked = posts
    .filter((post) => post.lang === lang && !post.draft && !shown.has(post.id) && !keys.has(post.key))
    .map((post) => ({
      post,
      score:
        (post.caseStudy ? 40 : 0) +
        (post.featured ? 20 : 0) +
        (post.audience.includes("interviewers") ? 12 : 0) +
        (PROJECT_KEYS.includes(post.key) ? 6 : 0) +
        (post.area === "engineering" || post.area === "ai" ? 3 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.getTime() - a.post.date.getTime());
  return ranked.slice(0, limit).map(({ post }) => ({ post, areaLabel: AREA_LABELS[lang][post.area] }));
}

/** Every area that has at least one note, in the fixed taxonomy order. */
export function themeLinks(posts: readonly Post[], lang: Lang): { area: string; label: string; href: string }[] {
  const writing = localizePath("/writing/", lang);
  const seen = new Set<string>();
  for (const post of posts) {
    if (post.lang !== lang || post.draft) continue;
    seen.add(post.area);
  }
  return AREAS.filter((area) => seen.has(area)).map((area) => ({
    area,
    label: AREA_LABELS[lang][area],
    href: `${writing}?area=${area}`
  }));
}
