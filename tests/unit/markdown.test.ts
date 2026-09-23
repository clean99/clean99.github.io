import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import matter from "gray-matter";
import rehypeRaw from "rehype-raw";
import { describe, expect, it } from "vitest";
import rehypeHeadingAnchors from "../../src/markdown/rehype-heading-anchors";
import rehypeLinks, { normalizeHref } from "../../src/markdown/rehype-links";
import rehypeResponsiveImages, { toPicture } from "../../src/markdown/rehype-responsive-images";
import rehypeTables from "../../src/markdown/rehype-tables";
import remarkHexoTags, { resolvePostLink } from "../../src/markdown/remark-hexo-tags";
import remarkMath, { renderTexInHtml } from "../../src/markdown/remark-math";
import { loadPosts, ROOT } from "./content";

const processor = await createMarkdownProcessor({
  remarkPlugins: [remarkHexoTags, remarkMath],
  rehypePlugins: [rehypeRaw, rehypeHeadingAnchors, rehypeResponsiveImages, rehypeLinks, rehypeTables],
  syntaxHighlight: false
});

async function render(markdown: string, frontmatter: Record<string, unknown> = {}) {
  return processor.render(markdown, { frontmatter });
}

describe("remark-hexo-tags", () => {
  const posts = loadPosts();

  it("links post_link to the translation in the reader's language", async () => {
    const zh = resolvePostLink(posts, "Testing-Best-Practice-Tdd", "zh");
    const { code } = await render("See {% post_link Testing-Best-Practice-Tdd %} now.", { lang: "zh" });
    expect(zh?.lang).toBe("zh");
    expect(code).toContain(`<a href="${zh?.url}">${zh?.title}</a>`);
  });

  it("keeps an explicit post_link title", async () => {
    const { code } = await render("{% post_link Testing-Best-Practice-Tdd TDD notes %}");
    expect(code).toMatch(/<a href="\/\d{4}\/\d{2}\/\d{2}\/Testing-Best-Practice-Tdd\/">TDD notes<\/a>/);
  });

  it("turns a youtube tag into a click-to-load facade", async () => {
    const { code } = await render("{% youtube VhRrEiR2rY0 %}");
    expect(code).toContain('data-youtube="VhRrEiR2rY0"');
    expect(code).not.toContain("<iframe");
    expect(code).not.toMatch(/<p>\s*<figure/);
  });
});

describe("remark-math", () => {
  it("renders legacy \\[…\\] blocks to KaTeX with MathML", () => {
    const out = renderTexInHtml('<div class="math-display">\n\\[\na^2 + b^2 = c^2\n\\]\n</div>');
    expect(out).toContain('class="katex-display"');
    expect(out).toContain("<math");
  });

  it("flags pages that need the KaTeX stylesheet", async () => {
    const { metadata } = await render("```math\nE = mc^2\n```");
    expect(metadata.frontmatter.hasMath).toBe(true);
    const plain = await render("No formulas.");
    expect(plain.metadata.frontmatter.hasMath).toBeUndefined();
  });
});

describe("rehype-heading-anchors", () => {
  it("demotes body h1s so the page title stays the only h1, and builds a TOC", async () => {
    const { code, metadata } = await render("# One\n\n## Two\n\n# One");
    expect(code).not.toContain("<h1");
    expect(code).toContain('<h2 id="one">One<a class="heading-anchor" href="#one" aria-label="§ One"></a></h2>');
    expect(code).toContain('id="one-1"');
    expect(metadata.frontmatter.toc).toEqual([
      { depth: 2, id: "one", text: "One" },
      { depth: 3, id: "two", text: "Two" },
      { depth: 2, id: "one-1", text: "One" }
    ]);
  });
});

describe("rehype-links", () => {
  it.each([
    ["https://clean99.github.io/About/", "/about/"],
    ["/Links", "/links/"],
    ["/zh/interviewers/#top", "/zh/projects/#top"],
    ["/2023/01/01/Foo/", "/2023/01/01/Foo/"],
    ["https://example.com/", "https://example.com/"]
  ])("%s → %s", (input, expected) => expect(normalizeHref(input)).toBe(expected));

  it("marks external links", async () => {
    const { code } = await render("[x](https://example.com)");
    expect(code).toContain('class="external"');
  });
});

describe("rehype-tables", () => {
  it("wraps tables in a focusable, labelled scroll region", async () => {
    const { code } = await render("| Stage | Metric |\n| --- | --- |\n| a | b |");
    expect(code).toContain('<div class="table-scroll" role="region" tabindex="0" aria-label="Stage · Metric"><table>');
  });
});

describe("rehype-responsive-images", () => {
  const entry = {
    width: 2000,
    height: 1000,
    src: "/img/a/b.1440w.webp",
    sources: [
      { type: "image/avif" as const, srcset: "/img/a/b.720w.avif 720w" },
      { type: "image/webp" as const, srcset: "/img/a/b.720w.webp 720w" }
    ]
  };

  it("emits a picture with intrinsic dimensions", () => {
    const pic = toPicture(
      { type: "element", tagName: "img", properties: { src: "/img/a/b.png", alt: "B" }, children: [] },
      entry
    );
    expect(pic.tagName).toBe("picture");
    const img = pic.children.at(-1);
    expect(img).toMatchObject({
      tagName: "img",
      properties: { src: entry.src, width: 2000, height: 1000, alt: "B", loading: "lazy" }
    });
  });

  it("honours an author-pinned width", () => {
    const pic = toPicture(
      { type: "element", tagName: "img", properties: { src: "/img/a/b.png", width: "300" }, children: [] },
      entry
    );
    expect(pic.children.at(-1)).toMatchObject({ properties: { width: 300, height: 150 } });
    expect(pic.children[0]).toMatchObject({ properties: { sizes: "300px" } });
  });

  it("turns an image-only paragraph into a figure with its italic caption", async () => {
    const { code } = await render("![Alt](https://example.com/x.png)\n\n*Figure 1: the *shape*.*\n\nBody *text*.");
    expect(code).toContain(
      '<figure class="figure"><img src="https://example.com/x.png" alt="Alt" loading="eager" fetchpriority="high" decoding="async"><figcaption>'
    );
    expect(code).toContain("</figcaption></figure>");
    expect(code).toContain("<p>Body <em>text</em>.</p>");
  });

  it("lazy-loads images below the fold", async () => {
    const { code } = await render(
      ["a", "b", "c", "d", "e"].map((x) => `Para ${x}.`).join("\n\n") + "\n\n![Late](https://example.com/late.png)"
    );
    expect(code).toContain('alt="Late" loading="lazy"');
    expect(code).not.toContain("fetchpriority");
  });
});

describe("every post renders cleanly", () => {
  const dir = join(ROOT, "content/posts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it.each(files)("%s", async (file) => {
    const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
    const result = await processor.render(content, {
      frontmatter: data,
      fileURL: new URL(`file://${join(dir, file)}`)
    });
    expect(result.code.length).toBeGreaterThan(200);
    expect(result.code).not.toMatch(/\{%\s*(post_link|youtube)/);
    expect(result.code).not.toMatch(/\\\[\s*\\begin|katex-error/);
    expect((result.code.match(/<h1[\s>]/g) ?? []).length).toBe(0);
  });
});
