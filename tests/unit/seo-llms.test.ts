import { describe, expect, it } from "vitest";
import {
  fullTextHeader,
  llmsFullTxt,
  llmsLine,
  llmsSections,
  llmsTxt,
  markdownPath,
  postMarkdown,
  stripHexoTags
} from "../../src/lib/llms";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadPosts } from "./content";

const posts = loadPosts();
const published = posts.filter((post) => !post.draft);
const en = published.filter((post) => post.lang === "en");

describe("markdown alternates", () => {
  it("appends index.md to the canonical path", () => {
    expect(markdownPath({ url: "/2026/06/19/Designing-an-Operations-Heartbeat-System/" })).toBe(
      "/2026/06/19/Designing-an-Operations-Heartbeat-System/index.md"
    );
  });

  it("heads the file with the title, canonical URL, date and language", () => {
    const post = en[0]!;
    const header = fullTextHeader(post);
    expect(header.startsWith("---\n")).toBe(true);
    expect(header).toContain(`url: https://clean99.github.io${post.url}`);
    expect(header).toContain(`lang: ${post.lang}`);
    expect(header).toMatch(/date: \d{4}\.\d{2}\.\d{2}/);
    expect(header).toContain(`title: ${JSON.stringify(post.title)}`);
  });

  it("keeps the body verbatim under the header", () => {
    const post = en[0]!;
    const markdown = postMarkdown({ post, body: "# Heading\n\nBody text.\n" });
    expect(markdown).toContain("---\n\n# Heading\n\nBody text.");
  });

  it("rewrites Hexo tag plugins into plain markdown for an agent without the plugin", () => {
    const resolved = stripHexoTags("See {% post_link Some-Post A title %} and {% youtube abcdEFGHijk %}.", (slug) =>
      slug === "Some-Post" ? "/2026/01/01/Some-Post/" : undefined
    );
    expect(resolved).toBe("See [A title](/2026/01/01/Some-Post/) and https://www.youtube.com/watch?v=abcdEFGHijk.");
  });

  it("degrades a link to plain text when the target no longer exists", () => {
    expect(stripHexoTags("See {% post_link Gone-Post %}.", () => undefined)).toBe("See Gone Post.");
  });
});

describe("llms.txt", () => {
  const doc = llmsTxt({ lang: "en", posts, extras: ["Full archive|/llms-full.txt"] });

  it("opens with the H1 name and a blockquote summary, the llmstxt.org shape", () => {
    const [h1, blank, quote] = doc.split("\n");
    expect(h1!.startsWith("# ")).toBe(true);
    expect(blank).toBe("");
    expect(quote!.startsWith("> ")).toBe(true);
  });

  it("opens with the case studies section and closes with the profile", () => {
    const sections = llmsSections({ lang: "en", posts }).map((section) => section.heading);
    expect(sections.at(-1)).toBe("Profile");
    expect(sections.length).toBeGreaterThanOrEqual(2);
    if (en.some((post) => post.caseStudy)) expect(sections[0]).toBe("Case studies");
    expect(new Set(sections).size).toBe(sections.length);
  });

  it("puts every published English post in exactly one section", () => {
    const lines = llmsSections({ lang: "en", posts }).flatMap((section) => section.lines);
    const urls = lines.map((line) => /\((https?:\/\/[^)]+)\)/.exec(line)?.[1]).filter(Boolean);
    for (const post of en) {
      expect(urls).toContain(`https://clean99.github.io${post.url}index.md`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("leaves the Chinese posts out of the English index", () => {
    const zh = published.filter((post) => post.lang === "zh");
    for (const post of zh) expect(doc).not.toContain(`clean99.github.io${post.url}`);
  });

  it("writes one `- [title](absolute url): description` line per post", () => {
    for (const line of llmsSections({ lang: "en", posts }).flatMap((section) => section.lines)) {
      expect(line).toMatch(/^- \[[^\]]+\]\(https:\/\/clean99\.github\.io\/[^)]+\)(: .+)?$/u);
    }
  });

  it("points the profile line at the about page for the document's language", () => {
    expect(llmsTxt({ lang: "en", posts })).toContain("(https://clean99.github.io/about/)");
    expect(llmsTxt({ lang: "zh", posts })).toContain("(https://clean99.github.io/zh/about/)");
  });

  it("drops the colon when a line has no description", () => {
    expect(llmsLine({ title: "T", url: "/u/", description: "" })).toBe("- [T](/u/)");
    expect(llmsLine({ title: " T  name ", url: "/u/", description: " a  b " })).toBe("- [T name](/u/): a b");
  });

  it("ends with a newline and no trailing blank line", () => {
    expect(doc.endsWith("\n")).toBe(true);
    expect(doc.endsWith("\n\n")).toBe(false);
  });

  it("gives the Chinese index Chinese section headings", () => {
    const zhDoc = llmsTxt({ lang: "zh", posts });
    expect(zhDoc).toContain("## 文章");
    expect(zhDoc).toContain("## 关于");
    expect(zhDoc).not.toContain("## Writing");
  });

  it("checks the escape hatch: a title containing markdown stays on one line", () => {
    const hostile = { ...en[0]!, title: "A [bracketed] title\nwith a newline: and colon" };
    const line = llmsSections({ lang: "en", posts: [hostile] }).flatMap((section) => section.lines)[0]!;
    expect(line.split("\n")).toHaveLength(1);
    expect(line).toContain("[A [bracketed] title with a newline: and colon]");
  });
});

describe("llms-full.txt", () => {
  const body = (post: { id: string }) => `Body of ${post.id}.`;
  const doc = llmsFullTxt(posts, body);

  it("includes every published post, newest first", () => {
    const titles = [...doc.matchAll(/^# (.+)$/gmu)].map((match) => match[1]!);
    expect(titles).toContain(en[0]!.title);
    const order = published
      .slice()
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((post) => post.title);
    expect(titles).toEqual(order);
  });

  it("names the canonical URL, the markdown twin and the date for each post", () => {
    const post = en[0]!;
    const chunk = doc.split("# " + post.title + "\n")[1]!;
    expect(chunk).toContain(`- Canonical: https://clean99.github.io${post.url}`);
    expect(chunk).toContain(`- Markdown: https://clean99.github.io${post.url}index.md`);
    expect(chunk).toMatch(/- Date: \d{4}\.\d{2}\.\d{2}/);
    expect(chunk).toContain(`- Language: ${post.lang}`);
  });

  it("separates posts with a horizontal rule so a chunk can be split safely", () => {
    expect(doc).toContain("\n\n---\n\n");
    expect(doc.split("\n\n---\n\n")).toHaveLength(published.length);
  });

  it("never leaks a draft", () => {
    const drafts = posts.filter((post) => post.draft);
    for (const draft of drafts) expect(doc).not.toContain(draft.title);
  });
});

/**
 * The route files decide which language's document each URL serves, and that
 * wiring is invisible to every function above it: `/atom.xml` and `/llms.txt`
 * serving the Chinese edition builds and type-checks perfectly. These read the
 * routes as they are written and check the language each one asks for.
 */
describe("machine routes pick their language by URL", () => {
  const routes = [
    { file: "src/pages/atom.xml.ts", builder: "atomDocument", lang: "en" },
    { file: "src/pages/llms.txt.ts", builder: "llmsDocument", lang: "en" },
    { file: "src/pages/zh/atom.xml.ts", builder: "atomDocument", lang: "zh" },
    { file: "src/pages/zh/llms.txt.ts", builder: "llmsDocument", lang: "zh" }
  ];

  for (const route of routes) {
    it(`${route.file} serves the ${route.lang} edition`, () => {
      const source = readFileSync(join(ROOT, route.file), "utf8");
      expect(source).toContain(`${route.builder}("${route.lang}")`);
      expect(source).not.toContain(`${route.builder}("${route.lang === "en" ? "zh" : "en"}")`);
      expect(source.includes("prerender = true")).toBe(true);
    });
  }

  it("points both llms.txt indexes at the one archive that is built", () => {
    const archive = join(ROOT, "src/data/machine.ts");
    const source = readFileSync(archive, "utf8");
    expect(source).toContain("|/llms-full.txt");
    expect(source).not.toContain('localizePath("/llms-full.txt"');
  });
});
