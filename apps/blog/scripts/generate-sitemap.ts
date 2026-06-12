import { getAllPosts } from "../lib/posts";
import { absoluteUrl } from "../lib/paths";
import { escapeXml, publicPages, writePublicFile } from "./static-rendering";

const urls = [...publicPages, ...getAllPosts().map((post) => post.canonicalPath)];
const uniqueUrls = Array.from(new Set(urls));

const entries = uniqueUrls
  .map((pathname) => `  <url><loc>${escapeXml(absoluteUrl(pathname))}</loc></url>`)
  .join("\n");

writePublicFile(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
);

writePublicFile(
  "robots.txt",
  `User-agent: *
Allow: /

Disallow: /vendors/
Disallow: /js/
Disallow: /css/
Disallow: /fonts/
Disallow: /fancybox/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://clean99.github.io/sitemap.xml
`
);
