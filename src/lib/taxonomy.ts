import type { Lang } from "./i18n";

export const AREAS = ["engineering", "ai", "systems", "mind", "life"] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Record<Lang, Record<Area, string>> = {
  en: {
    engineering: "Engineering",
    ai: "AI & Agents",
    systems: "Systems & Learning",
    mind: "Mind & Practice",
    life: "Life"
  },
  zh: {
    engineering: "工程",
    ai: "AI 与 Agent",
    systems: "系统与学习",
    mind: "心智与实践",
    life: "生活"
  }
};

export const AREA_BLURBS: Record<Lang, Record<Area, string>> = {
  en: {
    engineering: "Frontend architecture, performance, testing, and reliability in production.",
    ai: "Agents, AI-assisted development, and the harnesses that make them dependable.",
    systems: "SICP, abstractions, mental models, and learning how to learn.",
    mind: "Attention, Buddhism, and the practice of working and living well.",
    life: "Everything else worth writing down."
  },
  zh: {
    engineering: "前端架构、性能、测试，以及生产环境里的可靠性。",
    ai: "Agent、AI 辅助开发，以及让它们稳定跑起来的工程约束。",
    systems: "SICP、抽象、心智模型，以及如何学习。",
    mind: "注意力、佛学，以及怎样把工作和生活过好。",
    life: "其他值得记下来的事。"
  }
};

const AREA_ALIASES: Record<string, Area> = {
  "ai-agents": "ai",
  "systems-learning": "systems",
  learning: "systems",
  "mind-practice": "mind"
};

export function normalizeArea(value: unknown): Area | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug in AREA_ALIASES) return AREA_ALIASES[slug];
  return (AREAS as readonly string[]).includes(slug) ? (slug as Area) : undefined;
}

const AREA_RULES: [Area, RegExp][] = [
  ["ai", /\b(ai|chatgpt|copilot|agent|agents|claude|openspec|vibe coding|skill|skills)\b/],
  [
    "engineering",
    /\b(frontend|react|testing|tdd|performance|reliability|browser|redux|tailwind|error-boundary|architecture|software engineering|web performance)\b/
  ],
  ["systems", /\b(sicp|sicpjs|abstraction|learning|mental model|model)\b/],
  ["mind", /\b(buddhism|attention|meditation|mind|inner practice|living well|life)\b/]
];

export function inferArea(input: { area?: unknown; title?: string; slug?: string; tags?: readonly string[] }): Area {
  const explicit = normalizeArea(input.area);
  if (explicit) return explicit;
  const haystack = [input.title, input.slug, ...(input.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
  for (const [area, pattern] of AREA_RULES) {
    if (pattern.test(haystack)) return area;
  }
  return "engineering";
}

/** URL slug for a tag: lowercase, ASCII-safe, hyphenated. */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical display labels for tags that were authored with inconsistent casing. */
const TAG_LABELS_EN: Record<string, string> = {
  frontend: "Frontend",
  react: "React",
  testing: "Testing",
  "software-engineering": "Software Engineering",
  "web-performance": "Web Performance",
  tdd: "TDD",
  sdlc: "SDLC",
  copilot: "Copilot",
  sicpjs: "SICP JS",
  "code-generation": "Code Generation",
  agile: "Agile",
  browser: "Browser",
  development: "Development",
  "error-handling": "Error Handling",
  "error-boundary": "Error Boundary",
  "fault-tolerance": "Fault Tolerance",
  robustness: "Robustness",
  reliability: "Reliability",
  javascript: "JavaScript",
  chatgpt: "ChatGPT",
  "claude-code": "Claude Code",
  openspec: "OpenSpec",
  seo: "SEO",
  ai: "AI"
};

const TAG_LABELS_ZH: Record<string, string> = {
  "software-engineering": "软件工程",
  frontend: "前端",
  "web-performance": "Web 性能",
  testing: "测试",
  "code-generation": "代码生成",
  agile: "敏捷",
  browser: "浏览器",
  development: "开发",
  "error-handling": "错误处理",
  "fault-tolerance": "容错",
  robustness: "健壮性",
  reliability: "可靠性",
  data: "数据",
  growth: "增长"
};

export function tagLabel(tag: string, lang: Lang): string {
  const slug = tagSlug(tag);
  if (lang === "zh" && TAG_LABELS_ZH[slug]) return TAG_LABELS_ZH[slug];
  if (TAG_LABELS_EN[slug]) return TAG_LABELS_EN[slug];
  const trimmed = tag.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export interface TagRef {
  slug: string;
  label: string;
}

/** Normalise frontmatter tags (string, comma list, or array) into unique tag refs. */
export function normalizeTags(value: unknown, lang: Lang): TagRef[] {
  const raw: string[] = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>();
  const out: TagRef[] = [];
  for (const item of raw) {
    const slug = tagSlug(item);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, label: tagLabel(item, lang) });
  }
  return out;
}
