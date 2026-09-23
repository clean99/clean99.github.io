import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPostsFromDisk } from "../../src/markdown/post-index";

export const ROOT = join(import.meta.dirname, "../..");

export const loadPosts = () => loadPostsFromDisk(ROOT);

export function legacyUrls(): string[] {
  return readFileSync(join(ROOT, "tests/fixtures/legacy-urls.txt"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
