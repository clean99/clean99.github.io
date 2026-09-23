import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import {
  CARD_LAYOUT,
  OG_CARD,
  STANDFIRST_MAX_LINES,
  TITLE_HEIGHT_BUDGET,
  cardStandfirst,
  clampToLines,
  fitCard,
  lineCount,
  linesThatFit,
  standfirstHeight,
  titleBudget
} from "../../src/lib/og";

const COLUMN = OG_CARD.width - OG_CARD.padding * 2;

/** Vertical space a fitted card actually spends, gap included. */
const usedHeight = (fit: ReturnType<typeof fitCard>) => fit.title.height + standfirstHeight(fit.standfirst.lines);

describe("standfirstHeight / titleBudget", () => {
  it("charges nothing for a card with no standfirst", () => {
    expect(standfirstHeight(0)).toBe(0);
    expect(titleBudget(0)).toBe(TITLE_HEIGHT_BUDGET);
    expect(titleBudget(false)).toBe(TITLE_HEIGHT_BUDGET);
  });

  it("charges the gap plus one line box per wrapped line", () => {
    expect(standfirstHeight(1)).toBe(Math.round(CARD_LAYOUT.standfirstGap + CARD_LAYOUT.standfirstSize * 1.4));
    expect(standfirstHeight(2) - standfirstHeight(1)).toBe(Math.round(CARD_LAYOUT.standfirstSize * 1.4));
  });

  it("charges more for two lines than for one, which is what the old budget missed", () => {
    expect(titleBudget(2)).toBeLessThan(titleBudget(1));
  });
});

describe("linesThatFit", () => {
  it("is zero once the gap alone exceeds the room", () => {
    expect(linesThatFit(CARD_LAYOUT.standfirstGap)).toBe(0);
    expect(linesThatFit(CARD_LAYOUT.standfirstGap - 1)).toBe(0);
    expect(linesThatFit(0)).toBe(0);
  });

  it("counts one line at exactly one line box of room", () => {
    expect(linesThatFit(standfirstHeight(1))).toBe(1);
    expect(linesThatFit(standfirstHeight(1) - 1)).toBe(0);
  });

  it("agrees with standfirstHeight for a run of line counts", () => {
    for (let lines = 1; lines <= 5; lines += 1) expect(linesThatFit(standfirstHeight(lines))).toBe(lines);
  });
});

describe("clampToLines", () => {
  const long =
    "A system design write-up on turning UI activity events into reliable agent state across compute windows.";

  it("returns the text unchanged when it already fits", () => {
    expect(clampToLines("Short one.", CARD_LAYOUT.standfirstSize, COLUMN, 1)).toBe("Short one.");
  });

  it("caps the result at the requested line count", () => {
    const clamped = clampToLines(long, CARD_LAYOUT.standfirstSize, COLUMN, 1);
    expect(clamped.endsWith("…")).toBe(true);
    expect(lineCount(clamped, CARD_LAYOUT.standfirstSize, COLUMN)).toBeLessThanOrEqual(1);
  });

  it("never cuts mid-word and drops the separator the cut left behind", () => {
    const clamped = clampToLines(long, CARD_LAYOUT.standfirstSize, COLUMN, 1);
    const body = clamped.slice(0, -1);
    expect(body).not.toMatch(/[,;:，、；：—-]$/);
    expect(long.startsWith(body.trimEnd())).toBe(true);
  });

  it("returns empty for an empty source or a zero cap", () => {
    expect(clampToLines("", 23, COLUMN, 1)).toBe("");
    expect(clampToLines("   ", 23, COLUMN, 1)).toBe("");
    expect(clampToLines(long, 23, COLUMN, 0)).toBe("");
  });

  it("stays inside the line cap even in a column too narrow for the first word", () => {
    // Nothing sensible can be drawn there; the invariant is that whatever comes back
    // still fits the cap rather than silently overflowing the card.
    const clamped = clampToLines(long, CARD_LAYOUT.standfirstSize, 1, 1);
    expect(lineCount(clamped, CARD_LAYOUT.standfirstSize, 1)).toBeLessThanOrEqual(1);
  });

  it("keeps CJK text whole-glyph — no half character survives the cut", () => {
    const zh = "一个把界面活动事件变成可靠智能体状态的系统设计复盘，覆盖计算窗口、状态提交、多地域切换与服务拆分边界。";
    const clamped = clampToLines(zh, CARD_LAYOUT.standfirstSize, COLUMN, 1);
    expect(clamped.endsWith("…")).toBe(true);
    expect(zh.startsWith(clamped.slice(0, -1))).toBe(true);
  });
});

describe("fitCard", () => {
  it("keeps a short title, short standfirst card exactly as authored", () => {
    const fit = fitCard("A short title", "One line that fits.", { lang: "en", column: COLUMN });
    expect(fit.standfirst.text).toBe("One line that fits.");
    expect(fit.standfirst.clamped).toBe(false);
    expect(fit.droppedStandfirst).toBe(false);
    expect(fit.title.fontSize).toBe(84);
  });

  it("drops the standfirst rather than shrinking a card with no room", () => {
    const fit = fitCard("A short title", "One line.", { lang: "en", column: COLUMN, standfirstMaxLines: 0 });
    expect(fit.standfirst.text).toBe("");
    expect(fit.standfirst.lines).toBe(0);
    expect(fit.droppedStandfirst).toBe(true);
  });

  it("never lets title plus standfirst exceed the budget", () => {
    const cases: [string, string, "en" | "zh"][] = [
      [
        "Automated AI performance optimization with a harness and goal-driven loop",
        "A long summary that wraps onto a second line at the drawn size, which is the crowding case.".repeat(1),
        "en"
      ],
      [
        "从第一性原理理解 SEO —— 一次博客全面改造的深度复盘",
        "一次把博客从头改造的完整复盘，覆盖内容、性能、可访问性与搜索引擎优化。",
        "zh"
      ],
      [
        "Designing an Operations Heartbeat System",
        "A system design write-up on turning UI activity events into reliable agent state.",
        "en"
      ]
    ];
    for (const [title, standfirst, lang] of cases) {
      const fit = fitCard(title, standfirst, { lang, column: COLUMN });
      expect(usedHeight(fit)).toBeLessThanOrEqual(TITLE_HEIGHT_BUDGET);
      expect(fit.title.overflow).toBe(false);
      expect(fit.standfirst.lines).toBeLessThanOrEqual(STANDFIRST_MAX_LINES);
    }
  });

  it("sizes the title the same whether or not a standfirst was clamped", () => {
    const title = "Automated AI performance optimization with a harness and goal-driven loop";
    const withOne = fitCard(title, "Fits on one line.", { lang: "en", column: COLUMN });
    // Long enough that the character clamp in cardStandfirst is not the only guard:
    // this one has to be cut down to a single wrapped line by clampToLines.
    const long =
      "A summary long enough that it cannot possibly be drawn under the title on a single line at twenty three pixels.";
    const withLong = fitCard(title, long, { lang: "en", column: COLUMN });
    expect(withLong.title.fontSize).toBe(withOne.title.fontSize);
    expect(withLong.standfirst.clamped).toBe(true);
    expect(withLong.standfirst.lines).toBe(1);
    expect(withLong.standfirst.text.length).toBeLessThan(long.length);
    expect(usedHeight(withLong)).toBeLessThanOrEqual(TITLE_HEIGHT_BUDGET);
  });

  it("treats a missing standfirst as an absent band, not a clamped one", () => {
    const fit = fitCard("A title", "", { lang: "en", column: COLUMN });
    expect(fit.standfirst).toEqual({ text: "", lines: 0, clamped: false });
    expect(fit.droppedStandfirst).toBe(false);
  });
});

describe("every card in the collection fits", () => {
  const postsDir = join(process.cwd(), "content/posts");
  const files = readdirSync(postsDir).filter((name) => name.endsWith(".md"));

  it("has the collection to check against", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s", (file) => {
    const fm = matter(readFileSync(join(postsDir, file), "utf8")).data;
    if (!fm.title || fm.draft === true) return;
    const lang = (fm.lang ?? "en") as "en" | "zh";
    const summary = String(fm.summary ?? "").trim();
    if (!summary) return;
    const standfirst = cardStandfirst({ lang, summary } as never);
    const fit = fitCard(String(fm.title), standfirst, { lang, column: COLUMN });
    expect(fit.title.overflow).toBe(false);
    expect(fit.title.lines).toBeLessThanOrEqual(4);
    expect(fit.standfirst.lines).toBeLessThanOrEqual(STANDFIRST_MAX_LINES);
    expect(usedHeight(fit)).toBeLessThanOrEqual(TITLE_HEIGHT_BUDGET);
  });
});
