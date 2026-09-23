import { describe, expect, it } from "vitest";
import type { CaseStudy, Post } from "../../src/lib/posts";
import { alsoWriting, IMPACT_LIMIT, impactParts, projectCards, STACK_LIMIT, themeLinks } from "../../src/lib/projects";

function post(overrides: Partial<Post> & { id: string; key?: string }): Post {
  return {
    id: overrides.id,
    key: overrides.key ?? overrides.id,
    lang: overrides.lang ?? "en",
    title: overrides.title ?? `Note ${overrides.id}`,
    date: overrides.date ?? new Date(Date.UTC(2026, 0, 1)),
    updated: undefined,
    url: overrides.url ?? `/2026/01/01/${overrides.id}/`,
    tags: overrides.tags ?? [],
    area: overrides.area ?? "engineering",
    summary: overrides.summary ?? "",
    description: overrides.description ?? "",
    minutes: overrides.minutes ?? 5,
    featured: overrides.featured ?? false,
    audience: overrides.audience ?? [],
    caseStudy: overrides.caseStudy,
    draft: overrides.draft ?? false
  };
}

const projectKeys = [
  "Workspace-v2-Tab-System-Browser-Grade-Tabs",
  "Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops",
  "Agent-Skills-The-Functional-Blueprint-for-AI-Agents",
  "Build-a-Toy-Browser-with-NodeJS",
  "build-a-redux-from-scratch"
];

describe("projectCards", () => {
  it("leads with case studies and keeps the hand-picked builds behind them", () => {
    const caseStudy: CaseStudy = { stack: ["React"], impact: ["Faster switching"], links: [] };
    const posts = [
      post({ id: "Build-a-Toy-Browser-with-NodeJS", caseStudy: undefined }),
      post({ id: "Designing-an-Operations-Heartbeat-System", caseStudy })
    ];
    const cards = projectCards(posts, "en");
    expect(cards.map((card) => card.post.id)).toEqual([
      "Designing-an-Operations-Heartbeat-System",
      "Build-a-Toy-Browser-with-NodeJS"
    ]);
    expect(cards[0]!.caseStudy).toBe(true);
    expect(cards[1]!.caseStudy).toBe(false);
  });

  it("caps impact bullets and stack chips, deduplicating case-insensitively", () => {
    const caseStudy: CaseStudy = {
      stack: ["React", "react", "TypeScript", "Redis", "Node", "Vite", "Webpack", "Extra"],
      impact: ["a", "b", "c", "d"],
      links: []
    };
    const cards = projectCards(
      [
        post({ id: "Workspace-v2-Tab-System-Browser-Grade-Tabs", caseStudy, tags: [{ slug: "react", label: "React" }] })
      ],
      "en"
    );
    expect(cards[0]!.impact).toHaveLength(IMPACT_LIMIT);
    expect(cards[0]!.stack).toHaveLength(STACK_LIMIT);
    expect(cards[0]!.stack.filter((chip) => chip.toLowerCase() === "react")).toHaveLength(1);
  });

  it("falls back to the post's tags when there is no case-study stack", () => {
    const posts = [
      post({
        id: "Build-a-Toy-Browser-with-NodeJS",
        tags: [
          { slug: "browser", label: "Browser" },
          { slug: "node", label: "Node" }
        ]
      })
    ];
    const cards = projectCards(posts, "en");
    expect(cards[0]!.stack).toEqual(["Browser", "Node"]);
    expect(cards[0]!.impact).toEqual([]);
  });

  it("renders the same card shape with and without case_study frontmatter", () => {
    const withCase = projectCards(
      [post({ id: "A", caseStudy: { stack: ["React"], impact: ["win"], links: [] } })],
      "en"
    );
    const without = projectCards([post({ id: "build-a-redux-from-scratch" })], "en");
    expect(Object.keys(withCase[0]!).sort()).toEqual(Object.keys(without[0]!).sort());
  });

  it("collects role, period, and team facts only when labels are supplied", () => {
    const caseStudy: CaseStudy = {
      role: "Frontend lead",
      period: "2025",
      team: "5 engineers",
      stack: [],
      impact: [],
      links: []
    };
    const post_ = post({ id: "Designing-an-Operations-Heartbeat-System", caseStudy });
    expect(projectCards([post_], "en")[0]!.facts).toEqual([]);
    expect(projectCards([post_], "en", { role: "Role", period: "Period", team: "Team" })[0]!.facts).toEqual([
      { label: "Role", value: "Frontend lead" },
      { label: "Period", value: "2025" },
      { label: "Team", value: "5 engineers" }
    ]);
  });

  it("only lists posts in the requested language", () => {
    const posts = [
      post({ id: "Build-a-Toy-Browser-with-NodeJS", lang: "en" }),
      post({ id: "Build-a-Toy-Browser-with-NodeJS-zh", key: "Build-a-Toy-Browser-with-NodeJS", lang: "zh" })
    ];
    expect(projectCards(posts, "zh").map((card) => card.post.id)).toEqual(["Build-a-Toy-Browser-with-NodeJS-zh"]);
  });

  it("never invents projects: an empty post set yields no cards", () => {
    expect(projectCards([], "en")).toEqual([]);
  });
});

describe("alsoWriting", () => {
  it("excludes everything already shown as a card, including translations", () => {
    const shown = post({ id: "Workspace-v2-Tab-System-Browser-Grade-Tabs", audience: ["interviewers"] });
    const translation = post({
      id: "Workspace-v2-Tab-System-Browser-Grade-Tabs-zh",
      key: "Workspace-v2-Tab-System-Browser-Grade-Tabs",
      lang: "zh",
      audience: ["interviewers"]
    });
    const other = post({ id: "Web-Performance-Optimization", featured: true });
    const cards = projectCards([shown, translation], "en");
    const also = alsoWriting(cards, [shown, translation, other], "en");
    expect(also.map((entry) => entry.post.id)).toEqual(["Web-Performance-Optimization"]);
  });

  it("ranks case studies above plain notes and honors the limit", () => {
    const caseStudy: CaseStudy = { stack: [], impact: [], links: [] };
    const posts = [
      post({ id: "Plain-A", audience: ["interviewers"] }),
      post({ id: "Plain-B", audience: ["interviewers"] }),
      post({ id: "Case-A", caseStudy }),
      post({ id: "Case-B", caseStudy })
    ];
    const also = alsoWriting([], posts, "en", 3);
    expect(also.map((entry) => entry.post.id)).toEqual(["Case-A", "Case-B", "Plain-A"]);
    expect(also.length).toBe(3);
  });

  it("drops notes with no interview signal at all", () => {
    const also = alsoWriting([], [post({ id: "Random-Thoughts", area: "life" })], "en");
    expect(also).toEqual([]);
  });

  it("labels each entry with its area in the reader's language", () => {
    const posts = [post({ id: "SICPJS-Note", area: "systems", featured: true, lang: "zh" })];
    expect(alsoWriting([], posts, "zh")[0]!.areaLabel).toBe("系统与学习");
  });

  it("keeps every hand-picked project key eligible", () => {
    const posts = projectKeys.map((key) => post({ id: key }));
    expect(alsoWriting([], posts, "en", 10)).toHaveLength(projectKeys.length);
  });
});

describe("themeLinks", () => {
  it("lists only areas with published notes, in taxonomy order", () => {
    const posts = [
      post({ id: "A", area: "mind" }),
      post({ id: "B", area: "engineering" }),
      post({ id: "C", area: "engineering" }),
      post({ id: "D", area: "ai", draft: true })
    ];
    expect(themeLinks(posts, "en").map((theme) => theme.area)).toEqual(["engineering", "mind"]);
  });

  it("links into the writing page filtered by area, localized", () => {
    const links = themeLinks([post({ id: "A", area: "ai", lang: "zh" })], "zh");
    expect(links).toEqual([{ area: "ai", label: "AI 与 Agent", href: "/zh/writing/?area=ai" }]);
  });
});

describe("impactParts", () => {
  it("leaves a plain bullet as one text run", () => {
    expect(impactParts("Shipped the tab system.")).toEqual([{ text: "Shipped the tab system.", code: false }]);
  });

  it("marks backticked figures as code so the backticks never show", () => {
    expect(impactParts("p95 fell from `1829.8ms` to `812.3ms`.")).toEqual([
      { text: "p95 fell from ", code: false },
      { text: "1829.8ms", code: true },
      { text: " to ", code: false },
      { text: "812.3ms", code: true },
      { text: ".", code: false }
    ]);
  });

  it("drops the empty run an unmatched trailing backtick would leave", () => {
    expect(impactParts("open `only")).toEqual([
      { text: "open ", code: false },
      { text: "only", code: true }
    ]);
    expect(impactParts("tail`")).toEqual([{ text: "tail", code: false }]);
  });

  it("keeps the real zh bullets from the shipped posts free of literal backticks", () => {
    const line = "冷切换 p95 duration 从 `1829.8ms` 降到 `812.3ms`（`-55.6%`），主要准备工作被移到点击前。";
    const parts = impactParts(line);
    expect(parts.some((part) => part.text.includes("`"))).toBe(false);
    expect(parts.filter((part) => part.code).map((part) => part.text)).toEqual(["1829.8ms", "812.3ms", "-55.6%"]);
  });
});
