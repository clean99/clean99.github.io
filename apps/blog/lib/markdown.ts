import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeScrollableTables)
  .use(rehypePrettyCode, {
    theme: {
      dark: "github-dark",
      light: "github-light"
    },
    keepBackground: false
  })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return result.toString();
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[/, "").replace(/]\([^)]*\)$/, ""))
    .replace(/[#>*_`|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type HastElement = {
  children?: HastNode[];
  properties?: Record<string, unknown>;
  tagName?: string;
  type: string;
};

type HastNode = HastElement | { type: string; value?: string };

function rehypeScrollableTables() {
  return (tree: HastElement) => {
    wrapTables(tree);
  };
}

function wrapTables(parent: HastElement) {
  const children = parent.children;

  if (!children) {
    return;
  }

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (isTable(child)) {
      children[index] = {
        children: [child],
        properties: {
          "aria-label": "Scrollable table",
          className: ["table-scroll"],
          role: "region",
          tabIndex: 0
        },
        tagName: "div",
        type: "element"
      };
      continue;
    }

    if (hasChildren(child)) {
      wrapTables(child);
    }
  }
}

function isTable(node: HastNode): node is HastElement {
  return node.type === "element" && "tagName" in node && node.tagName === "table";
}

function hasChildren(node: HastNode): node is HastElement {
  return "children" in node && Array.isArray(node.children);
}
