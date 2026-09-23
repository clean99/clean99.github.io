import type { Lang } from "../i18n";

/**
 * AI Coding Lab copy. The framing comes from the legacy Hexo layout
 * (`themes/minima/layout/ai-coding-lab.ejs`): the intro, the author statement,
 * and the four-step update pipeline are that page's sentences, kept because they
 * already match what the catalog actually contains.
 */
const COPY = {
  en: {
    eyebrow: "Public agent workbench",
    title: "AI Coding Skills",
    lede: "A live catalog of the AI coding skills I created, generated from my private setup repository. It publishes only self-authored skills and key agent configuration, in sanitized form.",
    statementTitle: "Author statement",
    statement:
      "These skills and configuration files are part of my day-to-day AI coding workflow. This page does not publish credentials, internal platform details, personal paths, or private repository entry points; clickable content is sanitized during generation.",
    pipelineTitle: "Update pipeline",
    pipelineSteps: [
      { title: "Watch setup updates", blurb: "The private setup repo is the source of truth." },
      { title: "Select authored skills", blurb: "Only self-authored skills and key agent config." },
      { title: "Generate sanitized previews", blurb: "Names, paths, and secrets are rewritten." },
      { title: "Publish a static catalog", blurb: "The page reads the generated JSON." }
    ],
    controlsLabel: "Filter catalog",
    searchLabel: "Search skills, config, categories, or paths",
    searchPlaceholder: "Search skills, config, categories…",
    empty: "No public entries match this filter.",
    statusLabel: "Sync status",
    statusReady: "Synced",
    generatedLabel: "Generated",
    commitLabel: "Source commit",
    policyLabel: "Redaction policy",
    itemsLabel: "Entries",
    skillsLabel: "Skills",
    filesLabel: "Config files",
    sanitizedLabel: "Sanitized",
    categoryLabel: "Category",
    sourceLabel: "Source",
    pathLabel: "Path",
    sizeLabel: "Size",
    filters: { all: "All", skill: "Skills", file: "Config files", redacted: "Sanitized" },
    counts: {
      skills: (n: number) => `${n} skills`,
      files: (n: number) => `${n} config files`,
      sanitized: (n: number) => `${n} sanitized`,
      entries: (n: number) => `${n} entries`
    },
    note: "Names, paths, and content are sanitized when the catalog is generated. Nothing on this page is fetched at runtime.",
    workLabel: "Related writing",
    workLede: "The longer arguments behind this catalog."
  },
  zh: {
    eyebrow: "公开 Agent 工作台",
    title: "AI Coding Skills",
    lede: "我创建的 AI coding skills 目录，从私有 setup 仓库生成。页面只展示自建 skills 和关键 agent 配置的脱敏公开内容。",
    statementTitle: "作者声明",
    statement:
      "这些 skills 和配置是我的日常 AI 编程工作流样本。页面不会发布密钥、内部平台细节、个人路径或私有仓库入口；展示内容已在生成阶段脱敏。",
    pipelineTitle: "更新流水线",
    pipelineSteps: [
      { title: "监听 setup 更新", blurb: "私有 setup 仓库是唯一事实来源。" },
      { title: "筛选自建 skills", blurb: "只保留自建 skills 与关键 agent 配置。" },
      { title: "生成脱敏预览", blurb: "名称、路径与密钥会被重写。" },
      { title: "发布静态 catalog", blurb: "页面读取生成的 JSON。" }
    ],
    controlsLabel: "筛选目录",
    searchLabel: "搜索 skills、配置、类别或路径",
    searchPlaceholder: "搜索 skills、配置、类别…",
    empty: "没有匹配的公开条目。",
    statusLabel: "同步状态",
    statusReady: "已同步",
    generatedLabel: "生成时间",
    commitLabel: "源提交",
    policyLabel: "脱敏策略",
    itemsLabel: "条目",
    skillsLabel: "Skills",
    filesLabel: "配置文件",
    sanitizedLabel: "脱敏内容",
    categoryLabel: "类别",
    sourceLabel: "来源",
    pathLabel: "路径",
    sizeLabel: "大小",
    filters: { all: "全部", skill: "Skills", file: "配置文件", redacted: "脱敏内容" },
    counts: {
      skills: (n: number) => `${n} 个 skill`,
      files: (n: number) => `${n} 个配置文件`,
      sanitized: (n: number) => `${n} 项已脱敏`,
      entries: (n: number) => `${n} 个条目`
    },
    note: "名称、路径和内容在生成 catalog 时已脱敏。本页不在运行时请求任何数据。",
    workLabel: "相关文章",
    workLede: "这套目录背后的长文论证。"
  }
} satisfies Record<Lang, unknown>;

export type LabCopy = (typeof COPY)[Lang];

export function labCopy(lang: Lang): LabCopy {
  return COPY[lang];
}
