import { getAllPosts, getFeaturedPosts } from "../lib/posts";
import { absoluteUrl } from "../lib/paths";
import { writePublicFile } from "./static-rendering";

const selected = getFeaturedPosts()
  .filter((post) => post.lang === "en")
  .slice(0, 8);
const latest = getAllPosts().slice(0, 12);

writePublicFile(
  "llms.txt",
  `# Koh Hom — Software, AI, and Clear Thinking

> Notes on software, frontend systems, AI-assisted development, learning, and clear thinking.

## Main Pages

- Home: ${absoluteUrl("/")}
- Writing: ${absoluteUrl("/writing/")}
- Projects: ${absoluteUrl("/projects/")}
- AI Lab: ${absoluteUrl("/ai-coding-lab/")}
- About: ${absoluteUrl("/About/")}

## Selected Engineering and AI Posts

${selected.map((post) => `- [${post.title}](${absoluteUrl(post.canonicalPath)})`).join("\n")}

## Latest Writing

${latest.map((post) => `- [${post.title}](${absoluteUrl(post.canonicalPath)})`).join("\n")}

## Feeds

- RSS Feed: ${absoluteUrl("/atom.xml")}
- Sitemap: ${absoluteUrl("/sitemap.xml")}
`
);
