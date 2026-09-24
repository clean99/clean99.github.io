/**
 * OG card metrics and font loading.
 *
 * Two halves that share one home because both exist to keep a card inside 3-4 lines:
 *
 *  - Text metrics. Satori lays text out with a real font, but the title size has to be
 *    chosen without rendering twice, so the advance widths below were measured once
 *    from the shipped faces and encoded as a cheap model of the wrapped line count.
 *    Weights are em widths (1 = the font size).
 *
 *  - Font loading. Noto Serif SC ships ~100 unicode-range subsets per weight, and
 *    satori takes one entry per family with no unicode-range support. The font list is
 *    therefore assembled per title from the subsets that actually cover its characters,
 *    named in subset order, and that order becomes the CSS fallback stack.
 *
 *  - The card itself, as a satori element tree plus the two functions that turn a post
 *    or a language into its content and its PNG.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { formatLongDate } from "./dates";
import { LANGS, t, type Lang } from "./i18n";
import { AREA_LABELS } from "./taxonomy";
import { AUTHOR, SITE_URL } from "../site.config";
import { FENG_PATH, SEAL_VIEWBOX } from "./seal";
import type { Font } from "satori";
import type { Post } from "./posts";

export const OG_CARD = {
  width: 1200,
  height: 630,
  /** Card padding; the title column is width minus twice this. */
  padding: 72
} as const;

/**
 * Vertical rhythm, in px. The title gets whatever is left once these bands are
 * reserved — a line-count cap alone does not stop a four-line title from running
 * under the footer, so the budget is subtracted and the size chosen against it.
 */
export const CARD_LAYOUT = {
  /** Eyebrow rail line box, sitting level with the seal. */
  eyebrowHeight: 30,
  /** Gap from the eyebrow rail down to the title. */
  eyebrowGap: 44,
  /** Standfirst gap plus one line at the size it is drawn at. */
  standfirstGap: 28,
  standfirstSize: 23,
  /** Footer: gap, rule, line box. */
  footerGap: 32,
  footerRule: 2,
  footerSize: 24
} as const;

/** Space the title block may occupy on a card with no standfirst. */
export const TITLE_HEIGHT_BUDGET = Math.round(
  OG_CARD.height -
    OG_CARD.padding * 2 -
    CARD_LAYOUT.eyebrowHeight -
    CARD_LAYOUT.eyebrowGap -
    (CARD_LAYOUT.footerGap + CARD_LAYOUT.footerRule + CARD_LAYOUT.footerSize * 1.25)
);

/**
 * Standfirst band height for `lines` wrapped lines, or 0 when the card carries none.
 * The gap only exists when something is drawn under the title.
 */
export function standfirstHeight(lines: number): number {
  if (lines <= 0) return 0;
  return Math.round(CARD_LAYOUT.standfirstGap + lines * CARD_LAYOUT.standfirstSize * STANDFIRST_LINE_HEIGHT);
}

/**
 * The same, minus the standfirst band, for cards that carry one. `lines` is the
 * wrapped line count the standfirst will actually occupy at its drawn size —
 * reserving a single line let a two-line standfirst push the block under the rule.
 */
export function titleBudget(hasStandfirst: boolean | number): number {
  const lines = typeof hasStandfirst === "number" ? hasStandfirst : hasStandfirst ? 1 : 0;
  return TITLE_HEIGHT_BUDGET - standfirstHeight(lines);
}

/** Size ladder, largest first. A title picks the first rung that fits. */
export const TITLE_SIZES = [84, 76, 68, 60, 52, 46, 40, 36, 32] as const;

export const TITLE_MIN_SIZE = 32;

/** Beyond this the card looks like a wall of text; every title here fits in fewer. */
export const TITLE_MAX_LINES = 4;

/** Card body line height for the title block. */
export const TITLE_LINE_HEIGHT = 1.18;

/** Standfirst line height multiplier, shared by the layout and its height budget. */
export const STANDFIRST_LINE_HEIGHT = 1.4;

type WidthClass = "wide" | "upper" | "lower" | "digit" | "space" | "narrow" | "cjk";

/**
 * Em advance per character class, calibrated against the shipped faces.
 * `wide` covers letters that run past an em (W, M); `narrow` the thin ones (i, l, t, f, j).
 */
const ADVANCE: Record<WidthClass, number> = {
  wide: 0.9938,
  upper: 0.7163,
  lower: 0.6198,
  digit: 0.5984,
  space: 0.1952,
  narrow: 0.3334,
  // Han is a full em in Noto Serif SC; measured per glyph rather than fitted.
  cjk: 1
};

const NARROW = new Set("iljtfrI.,:;!|'\"`()[]{}");

function classify(char: string): WidthClass {
  const code = char.codePointAt(0) ?? 0;
  // Han, kana, hangul, CJK punctuation and fullwidth forms all occupy a full em.
  if (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0x3000 && code <= 0x303f)
  ) {
    return "cjk";
  }
  if (char === " ") return "space";
  if (NARROW.has(char)) return "narrow";
  if (char === "W" || char === "M") return "wide";
  if (char >= "A" && char <= "Z") return "upper";
  if (char >= "0" && char <= "9") return "digit";
  return "lower";
}

/** Total advance width in ems for a string. */
export function emWidth(text: string): number {
  let total = 0;
  for (const char of text) total += ADVANCE[classify(char)];
  return total;
}

/** Longest run that cannot wrap: Latin words break only at spaces, CJK breaks anywhere. */
export function longestTokenEm(text: string): number {
  let best = 0;
  let current = 0;
  const flush = () => {
    if (current > best) best = current;
    current = 0;
  };
  for (const char of text) {
    const kind = classify(char);
    if (kind === "cjk") {
      // Han has no word spaces, so a CJK run can always break; the worst case is one glyph.
      flush();
      if (ADVANCE.cjk > best) best = ADVANCE.cjk;
    } else if (char === " ") {
      flush();
    } else {
      current += ADVANCE[kind];
    }
  }
  flush();
  return best;
}

/**
 * Break a title into the units a browser may wrap at: Latin words stay whole, CJK
 * glyphs break individually. A trailing space is dropped; interior ones are kept.
 */
export function wrapUnits(text: string): string[] {
  const units: string[] = [];
  let current = "";
  const flush = () => {
    if (current) units.push(current);
    current = "";
  };
  for (const char of text) {
    if (classify(char) === "cjk") {
      flush();
      units.push(char);
    } else if (char === " ") {
      flush();
      units.push(" ");
    } else {
      current += char;
    }
  }
  flush();
  return units;
}

/**
 * Lines a title occupies at `fontSize` in a column `column` px wide, simulating the
 * wrap greedily. Area division (total width ÷ line width) undercounts badly: real
 * text leaves ragged line ends, and a count that is one line short lets a title run
 * under the footer.
 */
export function lineCount(text: string, fontSize: number, column: number): number {
  if (column <= 0) return Number.POSITIVE_INFINITY;
  const units = wrapUnits(text.trim());
  if (!units.length) return 1;

  let lines = 1;
  let used = 0;
  for (const unit of units) {
    if (unit === " ") continue;
    // A space before a wrapped word is dropped, so it never counts toward a line.
    const width = emWidth(unit) * fontSize;
    const gap = used > 0 ? ADVANCE.space * fontSize : 0;
    if (used > 0 && used + gap + width > column) {
      lines += 1;
      used = width;
    } else {
      used += gap + width;
    }
  }
  return lines;
}

export interface TitleFit {
  fontSize: number;
  lines: number;
  /** Rendered height of the title block in px. */
  height: number;
  /** True when the model could not fit even the smallest rung. */
  overflow: boolean;
}

/**
 * Largest ladder size whose wrapped title fits both the line cap and the vertical
 * budget. CJK titles weigh a full em per glyph, so they step down the ladder roughly
 * twice as fast as Latin ones — which is exactly how long zh titles stay inside 3-4 lines.
 */
export function ogTitleSize(
  title: string,
  _lang: "en" | "zh",
  options: {
    column?: number;
    maxLines?: number;
    sizes?: readonly number[];
    heightBudget?: number;
    lineHeight?: number;
  } = {}
): TitleFit {
  const column = options.column ?? OG_CARD.width - OG_CARD.padding * 2;
  const maxLines = options.maxLines ?? TITLE_MAX_LINES;
  const ladder = options.sizes ?? TITLE_SIZES;
  const budget = options.heightBudget ?? TITLE_HEIGHT_BUDGET;
  const lineHeight = options.lineHeight ?? TITLE_LINE_HEIGHT;
  const text = title.trim();
  const token = longestTokenEm(text);

  const measure = (fontSize: number): TitleFit => {
    const lines = lineCount(text, fontSize, column);
    return { fontSize, lines, height: Math.round(lines * fontSize * lineHeight), overflow: false };
  };

  for (const fontSize of ladder) {
    const fit = measure(fontSize);
    if (fit.lines > maxLines) continue;
    if (fit.height > budget) continue;
    if (token * fontSize > column) continue;
    return fit;
  }

  const smallest = ladder[ladder.length - 1] ?? TITLE_MIN_SIZE;
  return { ...measure(smallest), overflow: true };
}

/**
 * Eyebrow/area label size. Short labels stay large; long bilingual ones step down
 * so the card's top rail never collides with the title block.
 */
export function ogEyebrowSize(label: string): number {
  const size = emWidth(label);
  if (size <= 14) return 26;
  if (size <= 20) return 22;
  return 19;
}

/** Metadata/footer line size, from its own em length. */
export function ogMetaSize(label: string): number {
  const size = emWidth(label);
  if (size <= 30) return 24;
  if (size <= 46) return 20;
  return 17;
}

/**
 * Astro bundles prerendered endpoints into `.astro/`, so `import.meta.url` points
 * there rather than at the repo. The build always runs from the project root, which
 * is why every other on-disk lookup here (MANIFEST_PATH, posts) uses cwd too.
 */
const ROOT = process.cwd();

const FRAUNCES_DIR = join(ROOT, "node_modules/@fontsource/fraunces/files");
const NOTO_DIR = join(ROOT, "node_modules/@fontsource/noto-serif-sc");
const NOTO_FILES = join(NOTO_DIR, "files");

/** Weights used by the card design. `as const` keeps them literal, so the font list
 * satori receives is a real FontOptions[] rather than a widened number[]. */
export const DISPLAY_WEIGHT = 600 as const;
export const BODY_WEIGHT = 400 as const;

/** A closed code-point interval. */
export type Range = readonly [number, number];

/** One unicode-range subset of Noto Serif SC. */
export interface Subset {
  /** Package key, e.g. `[113]`; also the sort order. */
  key: string;
  /** Satori family name for this subset, e.g. `SC113`. */
  family: string;
  file: string;
  ranges: readonly Range[];
}

/** `U+4e00-9fff,U+3000` → [[0x4e00, 0x9fff], [0x3000, 0x3000]] */
export function parseUnicodeRange(spec: string): Range[] {
  const out: Range[] = [];
  for (const part of spec.split(",")) {
    const match = part.trim().match(/^U\+([0-9a-fA-F]+)(?:-([0-9a-fA-F]+))?$/);
    if (!match) continue;
    const start = Number.parseInt(match[1]!, 16);
    const end = match[2] ? Number.parseInt(match[2], 16) : start;
    out.push([start, end]);
  }
  return out;
}

export function inRange(codePoint: number, ranges: readonly Range[]): boolean {
  return ranges.some(([start, end]) => codePoint >= start && codePoint <= end);
}

/** Code points a string needs a glyph for (newlines and control characters excluded). */
export function codePointsOf(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined || code < 0x20) continue;
    out.push(code);
  }
  return out;
}

let subsets: Subset[] | undefined;

/** Subset metadata, read once from the package's unicode.json. */
export function notoSubsets(): Subset[] {
  if (subsets) return subsets;
  const manifest = JSON.parse(readFileSync(join(NOTO_DIR, "unicode.json"), "utf8")) as Record<string, string>;
  subsets = Object.entries(manifest)
    .filter(([key]) => /^\[\d+\]$/.test(key))
    .map(([key, spec]) => {
      const id = key.replace(/[[\]]/g, "");
      return {
        key,
        family: `SC${id}`,
        file: join(NOTO_FILES, `noto-serif-sc-${id}-${BODY_WEIGHT}-normal.woff`),
        ranges: parseUnicodeRange(spec)
      };
    })
    .sort((a, b) => Number(a.key.slice(1, -1)) - Number(b.key.slice(1, -1)));
  return subsets;
}

/**
 * The CJK subsets whose unicode-range covers at least one character of `text`,
 * in ascending subset order. That order is also the fallback order satori uses.
 */
export function subsetsFor(text: string, all: readonly Subset[] = notoSubsets()): Subset[] {
  const codes = codePointsOf(text);
  return all.filter((subset) => codes.some((code) => inRange(code, subset.ranges)));
}

/** `Fraunces, SC110, SC113` — the family stack satori needs to find each glyph. */
export function fontStack(families: readonly string[]): string {
  return ["Fraunces", ...families].join(", ");
}

/** Parsed font files, kept across calls so a build never re-reads the same file. */
const cache = new Map<string, Buffer>();

function load(file: string): Buffer {
  let buffer = cache.get(file);
  if (!buffer) {
    buffer = readFileSync(file);
    cache.set(file, buffer);
  }
  return buffer;
}

/**
 * Satori's own `Font` shape, re-exported under the name the rest of this module uses.
 * Declaring a local structural copy instead would silently accept a widened `weight`
 * or a `Buffer` that does not satisfy the library's `Buffer | ArrayBuffer`.
 */
export type LoadedFont = Font;

/**
 * Satori's `fonts` array plus the CSS stack for one title.
 * Always includes Fraunces; adds only the CJK subsets the title needs.
 */
export function cardsFonts(text: string): { fonts: LoadedFont[]; familyStack: string } {
  const used = subsetsFor(text);
  const fonts: LoadedFont[] = [
    {
      name: "Fraunces",
      data: load(join(FRAUNCES_DIR, `fraunces-latin-${DISPLAY_WEIGHT}-normal.woff`)),
      weight: DISPLAY_WEIGHT,
      style: "normal"
    },
    {
      name: "Fraunces",
      data: load(join(FRAUNCES_DIR, `fraunces-latin-${BODY_WEIGHT}-normal.woff`)),
      weight: BODY_WEIGHT,
      style: "normal"
    },
    ...used.map((subset) => ({
      name: subset.family,
      data: load(subset.file),
      weight: BODY_WEIGHT,
      style: "normal" as const
    }))
  ];
  return { fonts, familyStack: fontStack(used.map((subset) => subset.family)) };
}

/** Light-mode token values, duplicated because satori never sees CSS variables. */
export const OG_TOKENS = {
  paper: "#f4f1ea",
  paperRaised: "#faf8f3",
  ink: "#1c1a17",
  inkSoft: "#45403a",
  inkMuted: "#686157",
  rule: "#dcd5c8",
  accent: "#b8321f",
  onAccent: "#fbf6ee"
} as const;

/** The seal as a data URI — satori embeds images, it cannot fetch a URL. */
export function sealDataUri(size: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SEAL_VIEWBOX}" width="${size}" height="${size}">` +
    `<rect width="64" height="64" rx="2" fill="${OG_TOKENS.accent}"/>` +
    `<path fill="${OG_TOKENS.paper}" d="${FENG_PATH}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Minimal satori element shape; satori accepts plain objects as well as JSX. */
export interface SatoriNode {
  type: string;
  props: Record<string, unknown>;
}

const text = (style: Record<string, unknown>, children: string): SatoriNode => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children }
});

const row = (style: Record<string, unknown>, children: SatoriNode[]): SatoriNode => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children }
});

export interface CardContent {
  /** Large title. Its size is derived by ogTitleSize, never passed in. */
  title: string;
  lang: "en" | "zh";
  /** Small-caps line above the title: the area label, or the site tagline. */
  eyebrow: string;
  /** Optional one-line standfirst under the title. */
  standfirst?: string | undefined;
  /** Bottom-left credit, e.g. `Koh Hom · clean99.github.io`. */
  footer: string;
  /** Bottom-right note, e.g. the publish date. */
  meta?: string | undefined;
  /** Renders the red "Case study" stamp beside the eyebrow. */
  caseStudy?: boolean | undefined;
}

/**
 * Card, top to bottom: eyebrow rail beside the seal, the title block, then a rule and
 * the footer. The title size comes from ogTitleSize against the real vertical budget,
 * so no title in the collection can overflow or run under the footer.
 */
export function ogCard(content: CardContent, familyStack: string): SatoriNode {
  const { title, eyebrow, footer, meta, caseStudy } = content;
  const column = OG_CARD.width - OG_CARD.padding * 2;
  const fit = fitCard(title, content.standfirst ?? "", { lang: content.lang, column });
  const standfirst = fit.standfirst.text;
  const eyebrowSize = ogEyebrowSize(eyebrow);
  const footerSize = ogMetaSize(`${footer}${meta ?? ""}`);

  const eyebrowChildren: SatoriNode[] = [
    text({ width: 44, height: 3, background: OG_TOKENS.accent, borderRadius: 2, marginRight: 22, flex: "none" }, ""),
    text(
      {
        fontSize: eyebrowSize,
        letterSpacing: 3.2,
        textTransform: "uppercase",
        color: OG_TOKENS.inkMuted,
        fontFamily: familyStack
      },
      eyebrow
    )
  ];

  if (caseStudy) {
    eyebrowChildren.push(
      text(
        {
          marginLeft: 26,
          padding: "6px 16px",
          background: OG_TOKENS.accent,
          color: OG_TOKENS.onAccent,
          borderRadius: 4,
          fontSize: 18,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          fontFamily: familyStack
        },
        content.lang === "zh" ? "项目复盘" : "Case study"
      )
    );
  }

  const middle: SatoriNode[] = [
    // The seal sits in this row rather than floating, so the eyebrow and the mark
    // share one band and the title starts at a predictable height.
    row(
      {
        alignItems: "center",
        justifyContent: "space-between",
        height: CARD_LAYOUT.eyebrowHeight,
        marginBottom: CARD_LAYOUT.eyebrowGap
      },
      [
        row({ alignItems: "center" }, eyebrowChildren),
        { type: "img", props: { src: sealDataUri(84), width: 84, height: 84, style: { flex: "none" } } }
      ]
    ),
    text(
      {
        fontSize: fit.title.fontSize,
        lineHeight: TITLE_LINE_HEIGHT,
        fontWeight: 600,
        color: OG_TOKENS.ink,
        letterSpacing: content.lang === "zh" ? 1 : -0.6,
        fontFamily: familyStack,
        maxHeight: fit.title.height
      },
      title
    )
  ];

  if (standfirst) {
    middle.push(
      text(
        {
          marginTop: CARD_LAYOUT.standfirstGap,
          fontSize: CARD_LAYOUT.standfirstSize,
          lineHeight: STANDFIRST_LINE_HEIGHT,
          color: OG_TOKENS.inkSoft,
          fontFamily: familyStack
        },
        standfirst
      )
    );
  }

  const footerRow = row(
    {
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingTop: CARD_LAYOUT.footerGap,
      borderTop: `${CARD_LAYOUT.footerRule}px solid ${OG_TOKENS.ink}`,
      marginTop: "auto"
    },
    [
      text({ fontSize: footerSize, color: OG_TOKENS.inkSoft, letterSpacing: 0.4, fontFamily: familyStack }, footer),
      text(
        {
          fontSize: Math.min(footerSize, 20),
          color: OG_TOKENS.inkMuted,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          fontFamily: familyStack
        },
        meta ?? ""
      )
    ]
  );

  return row(
    { flexDirection: "column", width: "100%", height: "100%", padding: OG_CARD.padding, background: OG_TOKENS.paper },
    [
      // Faint ruled margin, the way a field notebook is printed.
      row(
        { position: "absolute", top: 0, bottom: 0, left: OG_CARD.padding - 26, width: 2, background: OG_TOKENS.rule },
        []
      ),
      row({ flexDirection: "column", flex: 1 }, middle),
      footerRow
    ]
  );
}

const DOMAIN = new URL(SITE_URL).host;

/** One-line credit shared by every card: who wrote it and where it lives. */
export function cardFooter(lang: Lang): string {
  const name = lang === "zh" ? `${AUTHOR.name} (${AUTHOR.nativeName})` : AUTHOR.name;
  return `${name} · ${DOMAIN}`;
}

/** The standfirst is trimmed to one card-sized line; a summary is often 220 chars. */
export function cardStandfirst(post: Post): string {
  const limit = post.lang === "zh" ? 46 : 96;
  const summary = post.summary.trim().replace(/\s+/g, " ");
  if (summary.length <= limit) return summary;
  const cut = summary.slice(0, limit);
  const boundary = cut.lastIndexOf(post.lang === "zh" ? "，" : " ");
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * Max standfirst lines a card may draw before it starts eating the title band.
 * One line is the design; the title is never expected to give room for two.
 */
export const STANDFIRST_MAX_LINES = 1;

export interface StandfirstFit {
  /** What to draw: the summary, a clamped prefix, or empty for no standfirst. */
  text: string;
  /** Wrapped lines the drawn text occupies (0 when dropped). */
  lines: number;
  /** True when the text was shortened or dropped to fit. */
  clamped: boolean;
}

export interface CardFit {
  title: TitleFit;
  standfirst: StandfirstFit;
  /** True when the standfirst was dropped, so the eyebrow should carry the area. */
  droppedStandfirst: boolean;
}

/** Longest prefix of `text` (by wrapped lines) that fits in `maxLines` at `fontSize`. */
export function clampToLines(text: string, fontSize: number, column: number, maxLines: number): string {
  const trimmed = text.trim();
  if (!trimmed || maxLines <= 0) return "";
  if (lineCount(trimmed, fontSize, column) <= maxLines) return trimmed;

  // Binary search the longest prefix that still wraps inside the cap, then retreat to
  // the last word boundary so the result never ends mid-word.
  const chars = [...trimmed];
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineCount(chars.slice(0, mid).join(""), fontSize, column) <= maxLines) low = mid;
    else high = mid - 1;
  }
  const cut = chars.slice(0, low).join("").trimEnd();
  const boundary = cut.lastIndexOf(" ");
  const head = (boundary > 0 ? cut.slice(0, boundary) : cut).replace(/[,;:，、；：—-]+$/, "").trimEnd();
  // A single over-wide token (or a column too narrow for one glyph) has nothing to
  // cut to; an empty standfirst is the honest answer, not an ellipsis on its own.
  return head ? `${head}…` : "";
}

/**
 * Fit a card's title and standfirst together against the vertical budget.
 *
 * The title is sized first against the budget a one-line standfirst leaves, so it keeps
 * the size the design intends; the standfirst then gets whatever room is left over and
 * is clamped to *lines*, not characters. That distinction is the bug this fixes: the
 * character clamp in cardStandfirst() can still wrap to two lines at 23px, and two
 * lines plus a three-line title ran the block under the footer rule. Order —
 *
 *  1. draw the standfirst whole when it fits the leftover room;
 *  2. otherwise clamp it to the lines that do fit;
 *  3. otherwise drop it, handing the whole budget to the title.
 *
 * Pure — every input is a parameter, so this is unit-tested without rendering.
 */
export function fitCard(
  title: string,
  standfirst: string,
  options: {
    lang?: "en" | "zh";
    column?: number;
    standfirstMaxLines?: number;
  } = {}
): CardFit {
  const column = options.column ?? OG_CARD.width - OG_CARD.padding * 2;
  const standfirstMaxLines = options.standfirstMaxLines ?? STANDFIRST_MAX_LINES;
  const lang = options.lang ?? "en";
  const source = standfirst.trim();

  // Size the title as if the standfirst will be one line: the title keeps its design
  // size and the standfirst is what bends.
  const titleFit = ogTitleSize(title, lang, { column, heightBudget: titleBudget(standfirstMaxLines) });

  if (!source) {
    return { title: titleFit, standfirst: { text: "", lines: 0, clamped: false }, droppedStandfirst: false };
  }

  const remaining = TITLE_HEIGHT_BUDGET - titleFit.height;
  const allowance = linesThatFit(remaining, standfirstMaxLines);
  if (allowance < 1) {
    return { title: titleFit, standfirst: { text: "", lines: 0, clamped: true }, droppedStandfirst: true };
  }

  const fullLines = lineCount(source, CARD_LAYOUT.standfirstSize, column);
  if (fullLines <= allowance) {
    return {
      title: titleFit,
      standfirst: { text: source, lines: fullLines, clamped: false },
      droppedStandfirst: false
    };
  }

  const clamped = clampToLines(source, CARD_LAYOUT.standfirstSize, column, allowance);
  const lines = clamped ? lineCount(clamped, CARD_LAYOUT.standfirstSize, column) : 0;
  if (lines >= 1) {
    return { title: titleFit, standfirst: { text: clamped, lines, clamped: true }, droppedStandfirst: false };
  }

  // Not even one line clears the rule: the standfirst steps aside entirely.
  return { title: titleFit, standfirst: { text: "", lines: 0, clamped: true }, droppedStandfirst: true };
}

/**
 * Whole standfirst lines that fit in `height` px, gap included, capped at `max`.
 * Compares against the rounded band heights rather than dividing, so float arithmetic
 * (23 × 1.4) cannot turn an exactly-fitting line into a miss.
 */
export function linesThatFit(height: number, max = Number.POSITIVE_INFINITY): number {
  let lines = 0;
  while (lines < max && standfirstHeight(lines + 1) <= height) lines += 1;
  return lines;
}

export function postCardContent(post: Post): CardContent {
  return {
    title: post.title,
    lang: post.lang,
    eyebrow: AREA_LABELS[post.lang][post.area],
    standfirst: cardStandfirst(post),
    footer: cardFooter(post.lang),
    meta: formatLongDate(post.date, post.lang),
    caseStudy: post.caseStudy !== undefined
  };
}

export function siteCardContent(lang: Lang): CardContent {
  const ui = t(lang);
  return {
    title: ui.siteTitle,
    lang,
    eyebrow: ui.siteTagline,
    standfirst: ui.siteDescription,
    footer: cardFooter(lang),
    meta: AUTHOR.jobTitle
  };
}

/** Either a post card (by id) or one of the two site cards. */
export type CardSpec = { kind: "post"; id: string } | { kind: "site"; lang: Lang };

/** Post whose OG card this is; drafts and short posts never get one. */
export function postsForCards(posts: readonly Post[]): Post[] {
  return posts.filter((post) => !post.draft);
}

/**
 * Resolve a spec against the post list and render it to PNG bytes.
 * Fonts are cached across calls, and only the subsets a card needs are parsed,
 * which is what keeps ~70 cards inside the time budget.
 *
 * Returns a `Uint8Array` over a plain ArrayBuffer: resvg hands back a Node Buffer,
 * whose backing store TypeScript types as `ArrayBufferLike` and which the DOM's
 * `BodyInit` therefore rejects when the route wraps it in a Response.
 */
export async function renderCard(spec: CardSpec, posts: readonly Post[]): Promise<Uint8Array<ArrayBuffer>> {
  const content = spec.kind === "site" ? siteCardContent(spec.lang) : postCardContent(findCardPost(posts, spec.id));
  const haystack = `${content.title}${content.eyebrow}${content.footer}${content.standfirst ?? ""}${content.meta ?? ""}`;
  const { fonts, familyStack } = cardsFonts(haystack);
  const svg = await satori(ogCard(content, familyStack), {
    width: OG_CARD.width,
    height: OG_CARD.height,
    fonts
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: OG_CARD.width } }).render().asPng();
  return Uint8Array.from(png);
}

function findCardPost(posts: readonly Post[], id: string): Post {
  const post = posts.find((candidate) => candidate.id === id);
  if (!post) throw new Error(`no post for OG card: ${id}`);
  return post;
}

/** The language set a site card exists for, in Nav order. */
export const SITE_CARD_LANGS = LANGS;
