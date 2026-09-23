import { dateParts, parseNaiveDate } from "./dates";
import { DEFAULT_LANG, isLang, normalizePath, type Lang } from "./i18n";
import { inferArea, normalizeTags, type Area, type TagRef } from "./taxonomy";
import { readingMinutes, summarize, truncate } from "./text";

export interface CaseStudy {
  role?: string | undefined;
  period?: string | undefined;
  team?: string | undefined;
  stack: string[];
  impact: string[];
  links: { label: string; url: string }[];
}

/** Frontmatter as authored (validated by the content collection schema). */
export interface RawPostData {
  title: string;
  date: Date | string;
  updated?: Date | string | undefined;
  tags?: string[] | string | undefined;
  area?: string | undefined;
  summary?: string | undefined;
  description?: string | undefined;
  featured?: boolean | undefined;
  audience?: string[] | undefined;
  lang?: string | undefined;
  i18n_key?: string | undefined;
  permalink?: string | undefined;
  draft?: boolean | undefined;
  case_study?: CaseStudy | undefined;
}

export interface RawPost {
  /** File stem, case preserved (`React-Performance-Optimization-zh`). */
  id: string;
  body: string;
  data: RawPostData;
}

export interface Post {
  id: string;
  key: string;
  lang: Lang;
  title: string;
  date: Date;
  updated: Date | undefined;
  url: string;
  tags: TagRef[];
  area: Area;
  summary: string;
  description: string;
  minutes: number;
  featured: boolean;
  audience: string[];
  caseStudy: CaseStudy | undefined;
  draft: boolean;
}

export function translationKey(id: string, explicit?: string): string {
  return explicit?.trim() || id.replace(/-zh$/, "");
}

/**
 * Legacy Hexo permalink contract:
 *   en → /YYYY/MM/DD/<file-stem>/
 *   zh → explicit `permalink`, else /zh/YYYY/MM/DD/<i18n_key>/
 */
export function postUrl(input: {
  id: string;
  lang: Lang;
  date: Date;
  key: string;
  permalink?: string | undefined;
}): string {
  if (input.permalink) return normalizePath(input.permalink);
  const { year, month, day } = dateParts(input.date);
  if (input.lang === "zh") return `/zh/${year}/${month}/${day}/${input.key}/`;
  return `/${year}/${month}/${day}/${input.id}/`;
}

export function buildPost(raw: RawPost): Post {
  const { data } = raw;
  const lang: Lang = isLang(data.lang) ? data.lang : DEFAULT_LANG;
  const date = parseNaiveDate(data.date);
  const key = translationKey(raw.id, data.i18n_key);
  const tags = normalizeTags(data.tags, lang);
  const summary = summarize(
    { summary: data.summary, description: data.description, body: raw.body },
    lang === "zh" ? 200 : 220
  );
  return {
    id: raw.id,
    key,
    lang,
    title: data.title.trim(),
    date,
    updated: data.updated ? parseNaiveDate(data.updated) : undefined,
    url: postUrl({ id: raw.id, lang, date, key, permalink: data.permalink }),
    tags,
    area: inferArea({
      area: data.area,
      title: data.title,
      slug: raw.id,
      tags: tags.map((t) => t.slug.replace(/-/g, " "))
    }),
    summary,
    description: truncate(summary, 160),
    minutes: readingMinutes(raw.body),
    featured: data.featured === true,
    audience: (data.audience ?? []).map((a) => a.toLowerCase()),
    caseStudy: data.case_study,
    draft: data.draft === true
  };
}

export function byDateDesc(a: Post, b: Post): number {
  return b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title);
}

export function postsForLang(posts: readonly Post[], lang: Lang): Post[] {
  return posts.filter((p) => p.lang === lang && !p.draft).sort(byDateDesc);
}

export function findTranslation(posts: readonly Post[], post: Post): Post | undefined {
  return posts.find((p) => p.key === post.key && p.lang !== post.lang && !p.draft);
}

export function groupByYear(posts: readonly Post[]): { year: number; posts: Post[] }[] {
  const groups = new Map<number, Post[]>();
  for (const post of [...posts].sort(byDateDesc)) {
    const year = post.date.getUTCFullYear();
    const list = groups.get(year) ?? [];
    list.push(post);
    groups.set(year, list);
  }
  return [...groups.entries()].map(([year, list]) => ({ year, posts: list }));
}

/** Older / newer neighbours within the same language, chronologically. */
export function adjacentPosts(posts: readonly Post[], post: Post): { older?: Post; newer?: Post } {
  const list = postsForLang(posts, post.lang);
  const index = list.findIndex((p) => p.id === post.id);
  if (index === -1) return {};
  const older = list[index + 1];
  const newer = list[index - 1];
  return { ...(older && { older }), ...(newer && { newer }) };
}

/** Related notes: shared tags weigh most, same area breaks ties, recency last. */
export function relatedPosts(posts: readonly Post[], post: Post, limit = 3): Post[] {
  const tagSet = new Set(post.tags.map((t) => t.slug));
  return postsForLang(posts, post.lang)
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => tagSet.has(t.slug)).length * 3 + (p.area === post.area ? 2 : 0)
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
    .slice(0, limit)
    .map((x) => x.post);
}

export interface TagSummary extends TagRef {
  count: number;
  posts: Post[];
}

export function collectTags(posts: readonly Post[], lang: Lang): TagSummary[] {
  const map = new Map<string, TagSummary>();
  for (const post of postsForLang(posts, lang)) {
    for (const tag of post.tags) {
      const entry = map.get(tag.slug) ?? { ...tag, count: 0, posts: [] };
      entry.count += 1;
      entry.posts.push(post);
      map.set(tag.slug, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function countByArea(posts: readonly Post[], lang: Lang): Record<Area, number> {
  const counts: Record<Area, number> = { engineering: 0, ai: 0, systems: 0, mind: 0, life: 0 };
  for (const post of postsForLang(posts, lang)) counts[post.area] += 1;
  return counts;
}

/** Hand-ordered notes that best show engineering depth to a hiring reader. */
export const INTERVIEWER_PRIORITY = [
  "Workspace-v2-Tab-System-Browser-Grade-Tabs",
  "Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure",
  "Designing-an-Operations-Heartbeat-System",
  "Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops",
  "Ecommerce-Growth-Data-Engineering",
  "React-Performance-Optimization",
  "Building-Fault-Tolerant-React-App-With-Error-Boundary",
  "React-Server-Component-Internals",
  "How-to-Design-GOOD-Test-Cases",
  "Web-Performance-Optimization"
];

const ENGINEERING_SIGNAL =
  /\b(frontend|react|testing|performance|reliability|architecture|software engineering|web performance)\b/;
const AI_SIGNAL = /\b(ai|agent|agents|copilot|chatgpt)\b/;

export function interviewerScore(post: Post): number {
  const index = INTERVIEWER_PRIORITY.indexOf(post.key);
  if (index >= 0) return 2000 - index;
  let score = post.caseStudy ? 1500 : 0;
  if (post.audience.includes("interviewers")) score += 800;
  if (post.featured) score += 100;
  const text = [post.title, ...post.tags.map((t) => t.slug.replace(/-/g, " "))].join(" ").toLowerCase();
  if (ENGINEERING_SIGNAL.test(text)) score += 60;
  if (AI_SIGNAL.test(text)) score += 20;
  return score;
}

export function interviewerPicks(posts: readonly Post[], lang: Lang, limit = 6): Post[] {
  return postsForLang(posts, lang)
    .map((post) => ({ post, score: interviewerScore(post) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
    .slice(0, limit)
    .map((x) => x.post);
}

/** Case studies first (newest first), then long-form builds that stand in for projects. */
export const PROJECT_KEYS = [
  "Workspace-v2-Tab-System-Browser-Grade-Tabs",
  "Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops",
  "Agent-Skills-The-Functional-Blueprint-for-AI-Agents",
  "Build-a-Toy-Browser-with-NodeJS",
  "build-a-redux-from-scratch"
];

export function projectPicks(posts: readonly Post[], lang: Lang): Post[] {
  const list = postsForLang(posts, lang);
  const caseStudies = list.filter((p) => p.caseStudy);
  const seen = new Set(caseStudies.map((p) => p.key));
  const builds = PROJECT_KEYS.map((key) => list.find((p) => p.key === key)).filter(
    (p): p is Post => Boolean(p) && !seen.has(p!.key)
  );
  return [...caseStudies, ...builds];
}
