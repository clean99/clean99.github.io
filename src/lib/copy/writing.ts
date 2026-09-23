import type { Lang } from "../i18n";

/**
 * Writing index copy: the page's `<h1>`, its meta description, and the strings
 * the client enhancement substitutes into the live region.
 */
const COPY = {
  en: {
    title: "Writing — frontend architecture, web performance, testing and AI agents",
    eyebrow: "The archive",
    heading: "Writing",
    lead: "Every note I've published, newest first: frontend architecture and web performance, software testing and reliability, system design write-ups, and field reports on AI-assisted engineering.",
    description:
      "The full archive of Koh Hom's engineering notes: frontend architecture, web performance, React internals, software testing and AI agents, grouped by year and filtered by area.",
    filterLabel: "Filter by area",
    allAreas: "All",
    groupLabel: (year: number) => `Notes from ${year}`,
    count: (n: number) => `${n} ${n === 1 ? "note" : "notes"}`,
    // The client refills `{n}` after filtering; the singular is its own string so
    // the substitution never has to know about grammar.
    countTemplate: "{n} notes",
    countTemplateOne: "1 note",
    countAll: "{total} notes",
    countFiltered: "Showing {shown} of {total} notes",
    jumpTo: "Jump to",
    browseTopics: "Browse by topic"
  },
  zh: {
    title: "文章 — 前端架构、Web 性能、测试与 AI Agent",
    eyebrow: "全部文章",
    heading: "文章",
    lead: "这里收录我发表的全部工程笔记，按时间倒序：前端架构与 Web 性能、软件测试与可靠性、系统设计复盘，以及 AI 辅助工程的一线实践。",
    description:
      "许峰的工程笔记全量归档：前端架构、Web 性能、React 内部机制、软件测试与 AI Agent，按年份分组，可按领域筛选。",
    filterLabel: "按领域筛选",
    allAreas: "全部",
    groupLabel: (year: number) => `${year} 年的笔记`,
    count: (n: number) => `${n} 篇`,
    countTemplate: "{n} 篇",
    countTemplateOne: "1 篇",
    countAll: "{total} 篇",
    countFiltered: "显示 {total} 篇中的 {shown} 篇",
    jumpTo: "跳转到",
    browseTopics: "按主题浏览"
  }
} satisfies Record<Lang, unknown>;

export type WritingCopy = (typeof COPY)[Lang];

export function writingCopy(lang: Lang): WritingCopy {
  return COPY[lang];
}
