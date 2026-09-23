import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Element, ElementContent, Root } from "hast";
import type { VFile } from "vfile";
import { visit } from "unist-util-visit";
import {
  CONTENT_SIZES,
  MANIFEST_PATH,
  isLocalImage,
  manifestKey,
  scaledDimensions,
  type ImageEntry,
  type ImageManifest
} from "../lib/images";

function loadManifest(): ImageManifest {
  const path = join(process.cwd(), MANIFEST_PATH);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as ImageManifest) : {};
}

function numeric(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function toPicture(img: Element, entry: ImageEntry): Element {
  const pinned = numeric(img.properties.width);
  const { width, height } = scaledDimensions(entry, pinned);
  const sizes = pinned ? `${width}px` : CONTENT_SIZES;
  const sources: ElementContent[] = entry.sources.map((s) => ({
    type: "element",
    tagName: "source",
    properties: { type: s.type, srcSet: s.srcset, sizes },
    children: []
  }));
  const { style: _style, ...rest } = img.properties;
  const image: Element = {
    ...img,
    properties: { loading: "lazy", ...rest, src: entry.src, width, height, decoding: "async" }
  };
  return { type: "element", tagName: "picture", properties: {}, children: [...sources, image] };
}

type Parent = Root | Element;

const isBlank = (node: ElementContent | Root["children"][number]) => node.type === "text" && !node.value.trim();

function meaningfulChildren(node: Element): ElementContent[] {
  return node.children.filter((c) => !isBlank(c));
}

function onlyChild(node: Element, tagName: string): Element | undefined {
  const [first, ...rest] = meaningfulChildren(node);
  return !rest.length && first?.type === "element" && first.tagName === tagName ? first : undefined;
}

function nextElementIndex(parent: Parent, from: number): number {
  for (let i = from; i < parent.children.length; i++) {
    const child = parent.children[i]!;
    if (!isBlank(child as ElementContent)) return child.type === "element" ? i : -1;
  }
  return -1;
}

/**
 * `![alt](src)` on its own line → `<figure>`; an italic-only paragraph right after it
 * (the `*Figure 1: …*` convention used across posts) becomes its `<figcaption>`.
 */
function buildFigures(parent: Parent) {
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i]!;
    if (node.type !== "element") continue;
    if (node.tagName !== "p" || !onlyChild(node, "img")) {
      buildFigures(node);
      continue;
    }
    node.tagName = "figure";
    node.properties = { className: ["figure"] };
    const next = nextElementIndex(parent, i + 1);
    const caption = next === -1 ? undefined : (parent.children[next] as Element);
    const em = caption?.tagName === "p" ? onlyChild(caption, "em") : undefined;
    if (em) {
      node.children = [
        ...meaningfulChildren(node),
        { type: "element", tagName: "figcaption", properties: {}, children: em.children }
      ];
      parent.children.splice(next, 1);
    }
  }
}

/** Images this close to the top of a post are LCP candidates: load them eagerly. */
const EAGER_WITHIN_BLOCKS = 4;

function leadingImage(tree: Root): Element | undefined {
  const blocks = tree.children.filter((c) => c.type === "element").slice(0, EAGER_WITHIN_BLOCKS);
  for (const block of blocks) {
    let found: Element | undefined;
    visit(block, "element", (node) => {
      if (node.tagName === "img") {
        found = node;
        return false;
      }
      return undefined;
    });
    if (found) return found;
  }
  return undefined;
}

/**
 * `/img/...` → `<picture>` with AVIF/WebP srcsets and intrinsic width/height (no CLS).
 * Everything is lazy and async-decoded except a leading image, which gets fetchpriority=high.
 */
export default function rehypeResponsiveImages() {
  const manifest = loadManifest();
  return (tree: Root, file: VFile) => {
    buildFigures(tree);
    const lead = leadingImage(tree);
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img" || !parent || index === undefined) return;
      const src = typeof node.properties.src === "string" ? node.properties.src : "";
      if (node === lead) {
        node.properties.loading = "eager";
        node.properties.fetchPriority = "high";
      } else {
        node.properties.loading = "lazy";
      }
      node.properties.decoding = "async";
      if (!isLocalImage(src) || (parent.type === "element" && parent.tagName === "picture")) return;
      const entry = manifest[manifestKey(src)];
      if (!entry) {
        if (Object.keys(manifest).length) file.message(`image not in manifest: ${src}`);
        return;
      }
      parent.children.splice(index, 1, toPicture(node, entry));
    });
  };
}
