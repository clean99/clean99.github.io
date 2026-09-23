import type { Root } from "hast";
import { visit } from "unist-util-visit";
import { SITE_URL } from "../site.config";

/** Old-site paths that moved; content written before the rebuild still links to them. */
const MOVED: Record<string, string> = {
  "/about": "/about/",
  "/links": "/links/",
  "/interviewers": "/projects/",
  "/works": "/projects/",
  "/archives": "/writing/"
};

export function normalizeHref(href: string): string {
  let url = href;
  if (url.startsWith(SITE_URL)) url = url.slice(SITE_URL.length) || "/";
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const [path = "/", rest = ""] = url.split(/(?=[?#])/, 2);
  const bare = path.replace(/\/+$/, "");
  const zh = bare.startsWith("/zh/") || bare === "/zh";
  const key = (zh ? bare.slice(3) : bare).toLowerCase();
  const moved = MOVED[key];
  if (moved) return `${zh ? "/zh" : ""}${moved}${rest}`;
  return url;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) && !href.startsWith(SITE_URL);
}

/** Same-site links become root-relative (and follow moved pages); external links get a marker class. */
export default function rehypeLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a" || typeof node.properties.href !== "string") return;
      const href = node.properties.href;
      if (isExternal(href)) {
        const cls = Array.isArray(node.properties.className) ? node.properties.className : [];
        node.properties.className = [...cls, "external"];
        node.properties.rel = ["noopener"];
        return;
      }
      node.properties.href = normalizeHref(href);
    });
  };
}
