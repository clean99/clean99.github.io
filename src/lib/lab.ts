import type { Lang } from "./i18n";

/**
 * Shape of content/ai-coding-lab/catalog.json, written by
 * tools/ai-coding-lab/build-catalog.mjs. The catalog is generated from a private
 * setup repository and sanitized during generation; this module only reads it.
 */
export interface CatalogItem {
  id: string;
  kind: "skill" | "file";
  name: string;
  description: string;
  category: string;
  source: string;
  path: string;
  redacted: boolean;
  size: number;
  content: string;
}

export interface Catalog {
  schemaVersion: number;
  generatedAt: string;
  status: string;
  source: { repository: string; url: string; branch: string; commit: string; remote: string };
  redaction: {
    publishedRawMarkdown: boolean;
    publishedSanitizedContent: boolean;
    policy: string[];
    redactedCount: number;
  };
  stats: { files: number; skills: number; redacted: number; bytesIndexed: number };
  items: CatalogItem[];
}

/** Category labels for the filter row; unknown categories fall back to a title-cased slug. */
const CATEGORY_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    "agent policy": "Agent policy",
    configuration: "Configuration",
    prompt: "Prompts",
    growth: "Growth & marketing",
    frontend: "Frontend & design",
    quality: "Code quality",
    media: "Media & docs",
    automation: "Automation",
    "agent workflow": "Agent workflow",
    writing: "Writing"
  },
  zh: {
    "agent policy": "Agent 规则",
    configuration: "配置",
    prompt: "提示词",
    growth: "增长与营销",
    frontend: "前端与设计",
    quality: "代码质量",
    media: "媒体与文档",
    automation: "自动化",
    "agent workflow": "Agent 工作流",
    writing: "写作"
  }
};

export function categoryLabel(category: string, lang: Lang): string {
  const known = CATEGORY_LABELS[lang][category];
  if (known) return known;
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

export interface CategoryFacet {
  id: string;
  label: string;
  count: number;
}

/**
 * Every category present in the catalog, most populated first, with stable
 * alphabetical order for ties. Skills only: the config files are a handful and
 * always shown.
 */
export function categoryFacets(items: readonly CatalogItem[], lang: Lang): CategoryFacet[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== "skill") continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, label: categoryLabel(id, lang), count }));
}

/** Filter ids accepted by the page's filter row. */
export type CatalogFilter = "all" | "skill" | "file" | "redacted";

export function filterCounts(items: readonly CatalogItem[]): Record<CatalogFilter, number> {
  return {
    all: items.length,
    skill: items.filter((item) => item.kind === "skill").length,
    file: items.filter((item) => item.kind === "file").length,
    redacted: items.filter((item) => item.redacted).length
  };
}

export function matchesFilter(item: CatalogItem, filter: CatalogFilter): boolean {
  if (filter === "all") return true;
  if (filter === "redacted") return item.redacted;
  return item.kind === filter;
}

/**
 * Token search: every whitespace-separated term must appear somewhere, in any
 * order. "audit analytics" finds "Set up and audit analytics tracking."
 */
export function matchesQuery(item: CatalogItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [item.name, item.description, item.category, item.source, item.path].join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** `home/.codex/skills/analytics/SKILL.md` → `skills/analytics/SKILL.md`. */
export function shortPath(path: string): string {
  return path.replace(/^home\/\.(codex|agents)\//, "");
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * A short, plain-text excerpt of the sanitized content for the card. The full
 * content never reaches the page: it is long, and the point of the card is to
 * show what the skill is for.
 */
export function excerpt(content: string, max = 220): string {
  const cleaned = content
    .replace(/^---[\s\S]*?---/, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/[*_`>#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[\s.,;:]+$/, "")}…`;
}

/** Catalog items in display order: config files first, then skills by name. */
export function catalogOrder(items: readonly CatalogItem[]): CatalogItem[] {
  const rank = (item: CatalogItem) => (item.kind === "file" ? 0 : 1);
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}
