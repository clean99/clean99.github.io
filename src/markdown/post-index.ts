import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { buildPost, type Post, type RawPostData } from "../lib/posts";
import { SITE } from "../site.config";

let cache: Post[] | undefined;

/**
 * Posts read straight from disk. Markdown plugins run before the content
 * collection is queryable, so cross-post lookups (`{% post_link %}`) use this.
 */
export function loadPostsFromDisk(root = process.cwd()): Post[] {
  if (cache) return cache;
  const dir = join(root, SITE.postsDir);
  cache = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
      return buildPost({ id: file.replace(/\.md$/, ""), body: content, data: data as RawPostData });
    });
  return cache;
}
