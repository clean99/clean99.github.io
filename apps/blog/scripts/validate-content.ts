import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "../..");
const postsDir = path.join(repoRoot, "source/_posts");

const posts = fs.readdirSync(postsDir).filter((file) => file.endsWith(".md"));
const uniqueNames = new Set(posts);

if (posts.length < 58) {
  throw new Error(`Expected at least 58 posts before migration, found ${posts.length}`);
}

if (uniqueNames.size !== posts.length) {
  throw new Error("Duplicate post file names detected");
}

console.log(`Validated ${posts.length} source posts for migration.`);
