import type { Lang } from "../i18n";
import { AUTHOR } from "../../site.config";

/**
 * About-page copy. The body prose comes from content/pages/about.md (migrated
 * from the legacy site); everything here is the chrome around it: the side panel
 * facts, the focus-area list, and the link labels. Focus areas are the same five
 * the migrated markdown lists under "Areas I'm exploring".
 */
const COPY = {
  en: {
    eyebrow: "About",
    title: "Koh Hom (Xu Feng)",
    lede: "Software engineer, frontend systems. I write down what I learn about building, thinking, and living well.",
    panelLabel: "At a glance",
    nameLabel: "Name",
    nameValue: `${AUTHOR.name} · ${AUTHOR.nativeName}`,
    roleLabel: "Role",
    roleValue: AUTHOR.jobTitle,
    focusLabel: "Focus",
    whereLabel: "Where I've worked",
    writingLabel: "Writing on this site",
    contactLabel: "Elsewhere",
    areasTitle: "Areas I'm exploring",
    areas: [
      {
        title: "Frontend architecture and performance",
        blurb: "Systems that stay fast as more of the product moves into one page."
      },
      {
        title: "Testing, reliability, and maintainability",
        blurb: "Making failures visible early, and keeping code changeable."
      },
      {
        title: "AI agents and AI-assisted development",
        blurb: "Harnesses and constraints that make agents dependable, not just impressive."
      },
      { title: "Learning systems and mental models", blurb: "SICP, abstraction, and learning how to learn." },
      { title: "Buddhism, attention, and inner practice", blurb: "Working and living with more clarity." }
    ],
    elsewhere: [
      { label: "GitHub", value: AUTHOR.githubHandle },
      { label: "Email", value: AUTHOR.email },
      { label: "RSS", value: "atom.xml" }
    ],
    rssLabel: "RSS feed",
    linksLabel: "Friends & links",
    workLabel: "Selected work"
  },
  zh: {
    eyebrow: "关于",
    title: "许峰 Koh Hom",
    lede: "软件工程师，专注前端系统。我把关于构建、思考和好好生活的学习都写下来。",
    panelLabel: "速览",
    nameLabel: "姓名",
    nameValue: `${AUTHOR.nativeName} · ${AUTHOR.name}`,
    roleLabel: "角色",
    roleValue: "软件工程师",
    focusLabel: "关注",
    whereLabel: "工作过的地方",
    writingLabel: "站内文章",
    contactLabel: "其他",
    areasTitle: "我正在探索",
    areas: [
      { title: "前端架构与性能", blurb: "当越来越多产品逻辑进入同一个页面，系统依然要保持快。" },
      { title: "测试、可靠性与可维护性", blurb: "让失败尽早暴露，让代码保持可改。" },
      { title: "AI Agent 与 AI 辅助开发", blurb: "让 Agent 可靠而不只是惊艳的工程约束。" },
      { title: "学习系统与心智模型", blurb: "SICP、抽象，以及如何学习。" },
      { title: "佛学、注意力与内在实践", blurb: "更清楚地工作和生活。" }
    ],
    elsewhere: [
      { label: "GitHub", value: AUTHOR.githubHandle },
      { label: "Email", value: AUTHOR.email },
      { label: "RSS", value: "atom.xml" }
    ],
    rssLabel: "RSS 订阅",
    linksLabel: "友链",
    workLabel: "精选作品"
  }
} satisfies Record<Lang, unknown>;

export type AboutCopy = (typeof COPY)[Lang];

export function aboutCopy(lang: Lang): AboutCopy {
  return COPY[lang];
}
