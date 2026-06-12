import fs from "node:fs";
import path from "node:path";
import { getBlogPath } from "../lib/paths";
import { getAllPosts } from "../lib/posts";
import { requiredStaticRoutes, siteNavigation } from "../lib/site";

const navTargets: Set<string> = new Set(siteNavigation.map((item) => item.href));

if (navTargets.has("/interviewers/")) {
  throw new Error("/interviewers/ must not be a primary navigation target");
}

for (const route of requiredStaticRoutes) {
  if (!route.startsWith("/")) {
    throw new Error(`Route must be absolute: ${route}`);
  }
}

const postRoutes = getAllPosts().map((post) => post.canonicalPath);
if (!postRoutes.includes("/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/")) {
  throw new Error("Expected Workspace v2 historical URL to be generated");
}

if (!postRoutes.includes("/zh/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/")) {
  throw new Error("Expected Workspace v2 Chinese historical URL to be generated");
}

const outDir = getBlogPath("out");
if (process.env.VALIDATE_EXPORT === "1" && fs.existsSync(outDir)) {
  for (const route of requiredStaticRoutes) {
    const file = route.endsWith(".xml") || route.endsWith(".txt") || route.endsWith(".html")
      ? path.join(outDir, route.replace(/^\//, ""))
      : path.join(outDir, route.replace(/^\//, ""), "index.html");

    if (!fs.existsSync(file)) {
      throw new Error(`Missing exported route file: ${file}`);
    }
  }
}

console.log(`Validated ${requiredStaticRoutes.length} static routes and ${postRoutes.length} post routes.`);
