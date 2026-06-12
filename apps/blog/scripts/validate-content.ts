import fs from "node:fs";
import path from "node:path";
import { getBlogPath } from "../lib/paths";
import { getAllPosts } from "../lib/posts";

const posts = getAllPosts();
const canonicalUrls = new Set(posts.map((post) => post.canonicalPath));
const slugs = new Set(posts.map((post) => `${post.lang}:${post.slug}`));

if (posts.length < 58) {
  throw new Error(`Expected at least 58 posts after migration, found ${posts.length}`);
}

if (canonicalUrls.size !== posts.length) {
  throw new Error("Duplicate canonical post URLs detected");
}

if (slugs.size !== posts.length) {
  throw new Error("Duplicate language/slug pairs detected");
}

for (const post of posts) {
  if (!post.title || !post.date || !post.slug || !post.canonicalPath) {
    throw new Error(`Post is missing required metadata: ${post.filePath}`);
  }

  if (!post.canonicalPath.endsWith("/")) {
    throw new Error(`Post canonical URL must end with slash: ${post.canonicalPath}`);
  }
}

const publicDir = getBlogPath("public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const rssPath = path.join(publicDir, "atom.xml");
const llmsPath = path.join(publicDir, "llms.txt");

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const post of posts) {
    if (!sitemap.includes(post.canonicalPath)) {
      throw new Error(`Sitemap missing post URL: ${post.canonicalPath}`);
    }
  }
}

if (fs.existsSync(rssPath)) {
  const rss = fs.readFileSync(rssPath, "utf8");
  if (!rss.includes(posts[0].title)) {
    throw new Error("RSS feed does not include the latest post title");
  }
}

if (fs.existsSync(llmsPath) && !fs.readFileSync(llmsPath, "utf8").includes("AI Lab")) {
  throw new Error("llms.txt was generated without the AI Lab entry");
}

console.log(`Validated ${posts.length} migrated posts.`);
