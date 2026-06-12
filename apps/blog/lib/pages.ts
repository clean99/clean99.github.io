import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getSourcePath } from "./paths";
import { renderMarkdown } from "./markdown";

export type MarkdownPage = {
  description?: string;
  html: string;
  lang: "en" | "zh";
  title: string;
};

export async function loadMarkdownPage(...segments: string[]): Promise<MarkdownPage> {
  const filePath = getSourcePath(...segments);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as { description?: string; lang?: string; title?: string };

  return {
    description: data.description,
    html: await renderMarkdown(parsed.content.trim()),
    lang: data.lang === "zh" ? "zh" : "en",
    title: data.title ?? path.basename(filePath, ".md")
  };
}
