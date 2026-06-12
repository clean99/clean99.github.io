import { getAllPosts } from "../lib/posts";
import { escapeXml, renderPostUrl, writePublicFile } from "./static-rendering";

const posts = getAllPosts().slice(0, 30);
const updated = posts[0]?.date ?? new Date(0).toISOString();

const entries = posts
  .map((post) => {
    const url = renderPostUrl(post);
    return `<entry>
  <title>${escapeXml(post.title)}</title>
  <link href="${escapeXml(url)}" />
  <id>${escapeXml(url)}</id>
  <updated>${escapeXml(post.updated ?? post.date)}</updated>
  <summary>${escapeXml(post.excerpt)}</summary>
</entry>`;
  })
  .join("\n");

writePublicFile(
  "atom.xml",
  `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Koh Hom</title>
  <subtitle>Software, AI, and clear thinking.</subtitle>
  <link href="https://clean99.github.io/atom.xml" rel="self" />
  <link href="https://clean99.github.io/" />
  <id>https://clean99.github.io/</id>
  <updated>${escapeXml(updated)}</updated>
  ${entries}
</feed>
`
);
