import type { Lang } from "../i18n";

/**
 * Work-page copy. Grounded in three existing sources: the legacy Hexo projects
 * and interviewers layouts (`themes/minima/layout/*.ejs` at the pre-rebuild
 * commit), `siteDescription` in src/lib/i18n.ts, and the posts themselves. No
 * metric, employer, or repository is claimed that those sources do not contain.
 */
const COPY = {
  en: {
    eyebrow: "Work",
    title: "Things I built, and what changed because of them",
    lede: "Case studies and build write-ups from production frontend work: browser-grade tab systems, performance under real constraints, reliability, and AI agents that ship. Every card links to the full note behind it.",
    note: "This page only lists work with a write-up in this repository. I do not invent demos or repositories that do not exist.",
    workLabel: "Case studies and builds",
    caseBadge: "Case study",
    buildBadge: "Build write-up",
    readNote: "Read the note",
    problemLabel: "Problem",
    impactLabel: "What changed",
    stackLabel: "Stack",
    detailsLabel: "Details",
    roleLabel: "Role",
    periodLabel: "Period",
    teamLabel: "Team",
    alsoTitle: "More writing on the same themes",
    alsoLede: "Performance, testing, reliability, and AI-assisted engineering, written up as they came.",
    themeTitle: "Browse by theme",
    themeLede: "The same engineering problems, grouped.",
    nextTitle: "Where to go next",
    nextLede: "If you are reviewing my work, start with the cards above, then the notes behind them.",
    aboutLink: "About me",
    writingLink: "All writing",
    topicsLink: "All topics",
    contactLink: "Get in touch",
    stats: { projects: "Projects", areas: "Themes", langs: "Languages" }
  },
  zh: {
    eyebrow: "作品",
    title: "我做过的东西，和它们带来的改变",
    lede: "这些复盘和长文都来自生产环境里的前端工作：浏览器级标签页系统、真实约束下的性能和可靠性，还有用在实际工作里的 AI Agent。每张卡片都链到一篇完整的笔记。",
    note: "这里只列我写过笔记的项目，每一项都有对应的文章。",
    workLabel: "项目复盘与构建",
    caseBadge: "项目复盘",
    buildBadge: "构建长文",
    readNote: "阅读笔记",
    problemLabel: "问题",
    impactLabel: "带来的改变",
    stackLabel: "技术栈",
    detailsLabel: "细节",
    roleLabel: "角色",
    periodLabel: "时间",
    teamLabel: "团队",
    alsoTitle: "同一主题下的更多文章",
    alsoLede: "性能、测试、可靠性，还有 AI 辅助工程，都是随手写下来的。",
    themeTitle: "按主题浏览",
    themeLede: "同一类工程问题，归在一起。",
    nextTitle: "下一步",
    nextLede: "如果你在评估我的工程能力，先看上面的卡片，再看背后的笔记。",
    aboutLink: "关于我",
    writingLink: "全部文章",
    topicsLink: "全部主题",
    contactLink: "联系我",
    stats: { projects: "项目", areas: "主题", langs: "语言" }
  }
} satisfies Record<Lang, unknown>;

export type ProjectsCopy = (typeof COPY)[Lang];

export function projectsCopy(lang: Lang): ProjectsCopy {
  return COPY[lang];
}
