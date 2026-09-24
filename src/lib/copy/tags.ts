import type { Lang } from "../i18n";

/** Tags index and single-tag page copy, keyed by language. */
const COPY = {
  en: {
    title: "Topics — frontend, web performance, testing, React and AI agents",
    eyebrow: "Topics",
    heading: "Topics",
    lead: "Every subject I've written about, ranked by how much is behind it. The heaviest are up top; the long tail follows as a full list.",
    description:
      "Browse Koh Hom's engineering notes by topic: frontend architecture, web performance, React, software testing, reliability, and AI-assisted development.",
    tagTitle: (label: string) => `${label} — engineering field notes`,
    tagDescription: (label: string, n: number) =>
      `${n} ${n === 1 ? "note" : "notes"} filed under ${label}, newest first, with the year and reading time of each.`,
    tagHeading: (label: string) => `Notes on ${label}`,
    tagLede: (label: string, n: number) => `${n} ${n === 1 ? "note" : "notes"} under ${label}, newest first.`,
    count: (n: number) => `${n} ${n === 1 ? "note" : "notes"}`,
    leadTitle: "Most written about",
    more: "Also covered",
    total: (tags: number, notes: number) => `${tags} topics across ${notes} notes`,
    allTopics: "All topics",
    backToIndex: "All topics",
    otherLang: "Topics"
  },
  zh: {
    title: "主题：前端、Web 性能、测试、React 与 AI Agent",
    eyebrow: "主题",
    heading: "主题",
    lead: "我写过的全部主题，按文章数量排序。写得多的排在前面，完整的列表在下面。",
    description: "按主题浏览许峰的工程笔记：前端架构、Web 性能、React、软件测试、可靠性与 AI 辅助开发。",
    tagTitle: (label: string) => `${label} — 工程笔记`,
    tagDescription: (label: string, n: number) =>
      `归档在「${label}」下的 ${n} 篇文章，按时间倒序，标注年份与阅读时长。`,
    tagHeading: (label: string) => `关于「${label}」`,
    tagLede: (label: string, n: number) => `「${label}」下的 ${n} 篇文章，按时间倒序。`,
    count: (n: number) => `${n} 篇`,
    leadTitle: "写得最多",
    more: "还有这些",
    total: (tags: number, notes: number) => `${notes} 篇文章，${tags} 个主题`,
    allTopics: "全部主题",
    backToIndex: "全部主题",
    otherLang: "主题"
  }
} satisfies Record<Lang, unknown>;

export type TagsCopy = (typeof COPY)[Lang];

export function tagsCopy(lang: Lang): TagsCopy {
  return COPY[lang];
}
