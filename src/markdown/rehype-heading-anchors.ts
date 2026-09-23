import type { Element, ElementContent, Root } from "hast";
import type { VFile } from "vfile";
import GithubSlugger from "github-slugger";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

export interface TocItem {
  depth: number;
  id: string;
  text: string;
}

const HEADING = /^h([1-6])$/;

function depthOf(node: Element): number | undefined {
  const match = HEADING.exec(node.tagName);
  return match ? Number(match[1]) : undefined;
}

/**
 * Stable ids + hover anchors on headings, and a TOC in `remarkPluginFrontmatter.toc`.
 * The page title is the only h1, so a body that uses `#` headings is demoted one level.
 */
export default function rehypeHeadingAnchors(options: { tocDepth?: number } = {}) {
  const tocDepth = options.tocDepth ?? 3;
  return (tree: Root, file: VFile) => {
    let hasH1 = false;
    visit(tree, "element", (node) => {
      if (node.tagName === "h1") hasH1 = true;
    });

    const slugger = new GithubSlugger();
    const toc: TocItem[] = [];
    visit(tree, "element", (node) => {
      let depth = depthOf(node);
      if (!depth) return;
      if (hasH1) {
        depth = Math.min(depth + 1, 6);
        node.tagName = `h${depth}`;
      }
      const text = toString(node).trim();
      if (!text) return;
      const existing = node.properties.id;
      const id = typeof existing === "string" && existing ? existing : slugger.slug(text);
      node.properties.id = id;
      const anchor: ElementContent = {
        type: "element",
        tagName: "a",
        properties: { className: ["heading-anchor"], href: `#${id}`, ariaLabel: `§ ${text}` },
        children: []
      };
      node.children.push(anchor);
      if (depth >= 2 && depth <= tocDepth) toc.push({ depth, id, text });
    });

    const astro = (file.data.astro ??= {}) as { frontmatter?: Record<string, unknown> };
    (astro.frontmatter ??= {}).toc = toc;
  };
}
