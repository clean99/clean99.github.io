import fs from "node:fs";
import path from "node:path";
import { absoluteUrl, getBlogPath } from "../lib/paths";
import type { BlogPost } from "../lib/posts";

export const publicDir = getBlogPath("public");

export const publicPages = [
  "/",
  "/writing/",
  "/projects/",
  "/ai-coding-lab/",
  "/About/",
  "/about/",
  "/zh/"
];

export function writePublicFile(filename: string, content: string): void {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, filename), content);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderPostUrl(post: BlogPost): string {
  return absoluteUrl(post.canonicalPath);
}
