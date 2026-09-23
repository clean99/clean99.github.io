import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit, SKIP } from "unist-util-visit";
import { truncate } from "../lib/text";

function tableLabel(table: Element): string {
  let header: Element | undefined;
  visit(table, "element", (node) => {
    if (!header && node.tagName === "tr") header = node;
  });
  const cells = header
    ? header.children.filter((c): c is Element => c.type === "element").map((c) => toString(c).trim())
    : [];
  return truncate(cells.filter(Boolean).join(" · ") || "Table", 80);
}

/** Wrap tables in a keyboard-scrollable region so wide tables never widen the page. */
export default function rehypeTables() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return undefined;
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"], role: "region", tabIndex: 0, ariaLabel: tableLabel(node) },
        children: [node]
      };
      parent.children.splice(index, 1, wrapper);
      return [SKIP, index + 1];
    });
  };
}
