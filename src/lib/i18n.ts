export type Lang = "en" | "zh";

export const LANGS: readonly Lang[] = ["en", "zh"];
export const DEFAULT_LANG: Lang = "en";

export const HTML_LANG: Record<Lang, string> = { en: "en", zh: "zh-CN" };
export const OG_LOCALE: Record<Lang, string> = { en: "en_US", zh: "zh_CN" };

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "zh";
}

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "zh" : "en";
}

/** Normalise any site path to a leading and trailing slash (files keep their extension). */
export function normalizePath(path: string): string {
  let out = path.trim();
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/{2,}/g, "/");
  const last = out.split("/").pop() ?? "";
  if (!out.endsWith("/") && !last.includes(".")) out = `${out}/`;
  return out;
}

/** Prefix a language-neutral path (`/writing/`) for the given language. */
export function localizePath(path: string, lang: Lang): string {
  const clean = normalizePath(path);
  if (lang === DEFAULT_LANG) return clean;
  return clean === "/" ? "/zh/" : `/zh${clean}`;
}

/** Inverse of localizePath: `/zh/writing/` → `{ lang: "zh", path: "/writing/" }`. */
export function splitLangPath(path: string): { lang: Lang; path: string } {
  const clean = normalizePath(path);
  if (clean === "/zh/") return { lang: "zh", path: "/" };
  if (clean.startsWith("/zh/")) return { lang: "zh", path: clean.slice(3) };
  return { lang: "en", path: clean };
}

const UI = {
  en: {
    siteTagline: "Engineer's field notes",
    siteTitle: "Koh Hom — Engineer's Field Notes",
    siteDescription:
      "Field notes from Koh Hom (Xu Feng), a frontend engineer: case studies on browser-grade tab systems, web performance, testing, and AI agents that ship.",
    heroTitle: ["I build frontend systems that ", "hold up", " in production."],
    heroLede:
      "I'm Koh Hom (许峰), a software engineer with experience across Shopee, Ant Group, ByteDance, and TikTok. These are my field notes: case studies from real projects, and long-form writing on web performance, testing, and AI-assisted engineering.",
    heroPrimary: "Selected work",
    heroSecondary: "About me",
    since: (year: number) => `Since ${year}`,
    caseStudies: (n: number) => `${n} case ${n === 1 ? "study" : "studies"}`,
    areas: "Areas",
    browseArea: "Browse",
    skip: "Skip to content",
    nav: { writing: "Writing", projects: "Work", about: "About", tags: "Topics", lab: "AI Coding Lab" },
    search: "Search",
    searchPlaceholder: "Search notes, topics, code…",
    searchEmpty: "No matching notes.",
    searchLoading: "Loading index…",
    searchUnavailable: "Search index is available after a production build.",
    theme: "Dark theme",
    searchClose: "Close search",
    searchHint: "↑ ↓ to move · Enter to open · Esc to close",
    searchCount: { one: "1 result", other: "{n} results" },
    langSwitch: "中文",
    langSwitchLabel: "Read this page in Chinese",
    readingTime: (n: number) => `${n} min read`,
    published: "Published",
    updated: "Updated",
    toc: "Contents",
    tags: "Topics",
    allTags: "All topics",
    related: "Keep reading",
    previous: "Older",
    next: "Newer",
    translation: "中文版",
    translationLabel: "Read the Chinese version",
    recent: "Recent notes",
    allWriting: "All writing",
    selectedWork: "Selected work",
    caseStudy: "Case study",
    role: "Role",
    period: "Period",
    team: "Team",
    stack: "Stack",
    impact: "Impact",
    links: "Links",
    backToTop: "Back to top",
    rss: "RSS",
    notes: (n: number) => `${n} ${n === 1 ? "note" : "notes"}`,
    footerNote: "Written by hand, built with Astro, served as static HTML.",
    notFound: "Page not found",
    editOnGitHub: "Source on GitHub",
    copyLink: "Copy link",
    copied: "Link copied",
    github: "GitHub",
    email: "Email",
    primaryNav: "Primary",
    onThisPage: "On this page",
    readingProgress: "Reading progress",
    languages: "EN / 中文",
    breadcrumbHome: "Home",
    allWork: "All work",
    statSince: "Writing since",
    statNotes: "Notes",
    statCases: "Case studies",
    statLangs: "Languages"
  },
  zh: {
    siteTagline: "前端工程笔记",
    siteTitle: "许峰 Koh Hom — 前端工程笔记",
    siteDescription: "许峰（Koh Hom）的前端工程笔记：浏览器级标签页系统、Web 性能、测试和 AI Agent 的项目复盘与文章。",
    heroTitle: ["我做的前端系统，上线后", "跑得稳", "。"],
    heroLede:
      "我是许峰（Koh Hom），软件工程师，先后在 Shopee、蚂蚁集团、字节跳动和 TikTok 工作。这里有我做过的项目复盘，也有关于 Web 性能、测试和 AI 辅助开发的文章。",
    heroPrimary: "精选作品",
    heroSecondary: "关于我",
    since: (year: number) => `始于 ${year}`,
    caseStudies: (n: number) => `${n} 个项目复盘`,
    areas: "领域",
    browseArea: "浏览",
    skip: "跳到正文",
    nav: { writing: "文章", projects: "作品", about: "关于", tags: "主题", lab: "AI 编程实验室" },
    search: "搜索",
    searchPlaceholder: "搜索文章、主题、代码…",
    searchEmpty: "没有匹配的文章。",
    searchLoading: "正在加载索引…",
    searchUnavailable: "搜索索引在生产构建后可用。",
    theme: "深色模式",
    searchClose: "关闭搜索",
    searchHint: "↑ ↓ 选择 · Enter 打开 · Esc 关闭",
    searchCount: { one: "1 条结果", other: "{n} 条结果" },
    langSwitch: "EN",
    langSwitchLabel: "阅读英文版本",
    readingTime: (n: number) => `${n} 分钟阅读`,
    published: "发布于",
    updated: "更新于",
    toc: "目录",
    tags: "主题",
    allTags: "全部主题",
    related: "继续阅读",
    previous: "上一篇",
    next: "下一篇",
    translation: "English",
    translationLabel: "阅读英文版",
    recent: "最近的笔记",
    allWriting: "全部文章",
    selectedWork: "精选作品",
    caseStudy: "项目复盘",
    role: "角色",
    period: "时间",
    team: "团队",
    stack: "技术栈",
    impact: "结果",
    links: "链接",
    backToTop: "回到顶部",
    rss: "RSS",
    notes: (n: number) => `${n} 篇`,
    footerNote: "文章都是自己写的，用 Astro 构建，输出纯静态 HTML。",
    notFound: "页面不存在",
    editOnGitHub: "在 GitHub 查看源码",
    copyLink: "复制链接",
    copied: "链接已复制",
    github: "GitHub",
    email: "邮件",
    primaryNav: "主导航",
    onThisPage: "本页目录",
    readingProgress: "阅读进度",
    languages: "中文 / EN",
    breadcrumbHome: "首页",
    allWork: "全部作品",
    statSince: "开始写作",
    statNotes: "笔记",
    statCases: "项目复盘",
    statLangs: "语言"
  }
} as const;

export type UIStrings = (typeof UI)[Lang];

export function t(lang: Lang): UIStrings {
  return UI[lang];
}
