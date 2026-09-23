/**
 * Minimal XML well-formedness checker for the generated feeds and sitemap.
 *
 * Node has no DOMParser, and the point of these tests is exactly that the
 * machine-facing documents parse, so a small tokenizer that validates tag
 * nesting, attribute quoting and entity escaping is worth more than a regex.
 */
export interface XmlIssue {
  message: string;
  position: number;
}

const NAME = "[A-Za-z_:][\\w.:-]*";
const TAG = new RegExp(`^<(/?)(${NAME})((?:\\s+${NAME}\\s*=\\s*(?:"[^"]*"|'[^']*'))*)\\s*(/?)>`, "u");
const ATTR = new RegExp(`(${NAME})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "gu");
const COMMENT = /^<!--[\s\S]*?-->/u;
const PI = /^<\?[\s\S]*?\?>/u;

export function checkXml(xml: string): XmlIssue[] {
  const issues: XmlIssue[] = [];
  const stack: string[] = [];
  let i = 0;

  while (i < xml.length) {
    const rest = xml.slice(i);
    const lt = rest.indexOf("<");
    if (lt === -1) break;

    const text = rest.slice(0, lt);
    if (text.includes("&")) {
      const bad = [...text.matchAll(/&(?!(?:#\d+|#x[\da-fA-F]+|[A-Za-z][\w.-]*);)/gu)];
      for (const match of bad) issues.push({ message: `unescaped & in text`, position: i + match.index });
    } else if (text.includes(">")) {
      issues.push({ message: "raw > in text", position: i + text.indexOf(">") });
    }

    i += lt;
    const here = xml.slice(i);

    const comment = COMMENT.exec(here);
    if (comment) {
      i += comment[0].length;
      continue;
    }
    const pi = PI.exec(here);
    if (pi) {
      i += pi[0].length;
      continue;
    }

    const match = TAG.exec(here);
    if (!match) {
      issues.push({ message: `malformed tag: ${here.slice(0, 40)}`, position: i });
      break;
    }
    const [, closing, name, attrs, selfClosing] = match;
    for (const attr of attrs!.matchAll(ATTR)) {
      const value = attr[2] ?? attr[3] ?? "";
      if (value.includes("<")) issues.push({ message: `raw < in attribute ${attr[1]}`, position: i });
    }
    if (closing === "/") {
      const open = stack.pop();
      if (open !== name) issues.push({ message: `</${name}> closes <${open ?? "nothing"}>`, position: i });
    } else if (selfClosing !== "/") {
      stack.push(name!);
    }
    i += match[0].length;
  }

  for (const name of stack) issues.push({ message: `unclosed <${name}>`, position: xml.length });
  return issues;
}

/** Throws with a readable list, so a failing assertion names the document. */
export function expectWellFormed(xml: string): void {
  const issues = checkXml(xml);
  if (issues.length > 0) {
    const detail = issues.map((issue) => `  ${issue.message} (at ${issue.position})`).join("\n");
    throw new Error(`XML is not well-formed:\n${detail}`);
  }
}

/** Qualified names of every element, in document order, ignoring attributes. */
export function elementNames(xml: string): string[] {
  return [...xml.matchAll(new RegExp(`<(/?)((?:[\\w.-]+:)?${NAME})`, "gu"))]
    .filter((match) => match[1] !== "/")
    .map((match) => match[2]!);
}
