const CJK_CLASS = "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]";
const CJK = new RegExp(CJK_CLASS, "gu");
const IS_CJK = new RegExp(`^${CJK_CLASS}$`, "u");

export function hasCjk(text: string): boolean {
  return /[\p{Script=Han}]/u.test(text);
}

/** Cheap markdown → plain text for summaries, meta descriptions, and word counts. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\{%\s*post_link\s+(\S+)(?:\s+([^%]+?))?\s*%\}/g, (_, slug: string, title?: string) =>
      (title ?? slug).replace(/-/g, " ")
    )
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSummary(text: string): string {
  return text
    .replace(/^\s*(\*\*)?TL;DR(\*\*)?\s*[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** First prose paragraph of a markdown body (skips headings, tables, images, code). */
export function firstParagraph(markdown: string): string {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "\n\n");
  for (const block of withoutCode.split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^(#|\||<|!\[|---|\{%|- \[)/.test(trimmed)) continue;
    const text = stripMarkdown(trimmed);
    if (text.length >= 20) return text;
  }
  return "";
}

/**
 * Truncate on a word boundary (Latin) or character boundary (CJK).
 * `max` counts visual width: CJK characters count double.
 */
export function truncate(text: string, max: number): string {
  let width = 0;
  let cut = -1;
  for (let i = 0; i < text.length; i++) {
    width += IS_CJK.test(text[i]!) ? 2 : 1;
    if (width > max) {
      cut = i;
      break;
    }
  }
  if (cut === -1) return text;
  let head = text.slice(0, cut);
  if (!hasCjk(head)) {
    const lastSpace = head.lastIndexOf(" ");
    if (lastSpace > max * 0.5) head = head.slice(0, lastSpace);
  }
  return `${head.replace(/[\s.,;:!?，。；：！？、—-]+$/u, "")}…`;
}

export function summarize(
  input: { summary?: string | undefined; description?: string | undefined; body?: string | undefined },
  max = 180
): string {
  const source = input.summary || input.description || firstParagraph(input.body ?? "");
  return truncate(cleanSummary(stripMarkdown(source)), max);
}

/** Minutes to read: 220 wpm for Latin words, 400 cpm for CJK characters, code at half weight. */
export function readingMinutes(markdown: string): number {
  const code = (markdown.match(/```[\s\S]*?```/g) ?? []).join(" ");
  const prose = stripMarkdown(markdown);
  const count = (text: string) => {
    const cjk = (text.match(CJK) ?? []).length;
    const words = text
      .replace(CJK, " ")
      .split(/\s+/)
      .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    return cjk / 400 + words / 220;
  };
  const minutes = count(prose) + count(code.replace(/```\w*/g, " ")) / 2;
  return Math.max(1, Math.ceil(minutes));
}
