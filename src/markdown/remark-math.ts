import type { Code, Html, Root } from "mdast";
import type { VFile } from "vfile";
import katex from "katex";
import { visit } from "unist-util-visit";

const DISPLAY = /\\\[([\s\S]+?)\\\]/g;
const INLINE = /\\\(([\s\S]+?)\\\)/g;

export function renderTex(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex.trim(), {
    displayMode,
    throwOnError: true,
    strict: "ignore",
    output: "htmlAndMathml"
  });
}

/** Rewrite `\[…\]` / `\(…\)` inside raw HTML. Returns undefined when nothing matched. */
export function renderTexInHtml(html: string): string | undefined {
  if (!html.includes("\\[") && !html.includes("\\(")) return undefined;
  const out = html
    .replace(DISPLAY, (_, tex: string) => renderTex(tex, true))
    .replace(INLINE, (_, tex: string) => renderTex(tex, false));
  return out === html ? undefined : out;
}

function markMath(file: VFile) {
  const astro = (file.data.astro ??= {}) as { frontmatter?: Record<string, unknown> };
  (astro.frontmatter ??= {}).hasMath = true;
}

/**
 * Build-time TeX → KaTeX HTML + MathML, so posts ship no math runtime.
 * Supports ```math fences and the legacy `<div class="math-display">\[…\]</div>` blocks.
 * Pages whose frontmatter ends up with `hasMath` load the self-hosted KaTeX stylesheet.
 */
export default function remarkMath() {
  return (tree: Root, file: VFile) => {
    visit(tree, (node, index, parent) => {
      if (node.type === "code" && (node as Code).lang === "math" && parent && index !== undefined) {
        const html: Html = {
          type: "html",
          value: `<div class="math-display">${renderTex((node as Code).value, true)}</div>`
        };
        parent.children.splice(index, 1, html);
        markMath(file);
        return;
      }
      if (node.type === "html") {
        const rendered = renderTexInHtml((node as Html).value);
        if (rendered) {
          (node as Html).value = rendered;
          markMath(file);
        }
      }
    });
  };
}
