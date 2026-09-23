import type { Html, Link, Paragraph, PhrasingContent, Root, Text } from "mdast";
import type { VFile } from "vfile";
import { visit, SKIP } from "unist-util-visit";
import { isLang, DEFAULT_LANG, type Lang } from "../lib/i18n";
import { translationKey, type Post } from "../lib/posts";
import { YOUTUBE_ID } from "../lib/video";
import { loadPostsFromDisk } from "./post-index";

const TAG = /\{%\s*(post_link|youtube)\s+([^%]*?)\s*%\}/g;

export function resolvePostLink(posts: readonly Post[], slug: string, lang: Lang): Post | undefined {
  const key = translationKey(slug);
  const candidates = posts.filter((p) => !p.draft && (p.id === slug || p.key === key));
  return candidates.find((p) => p.lang === lang) ?? candidates.find((p) => p.id === slug) ?? candidates[0];
}

export function youtubeFacade(id: string, title: string): string {
  const watch = `https://www.youtube.com/watch?v=${id}`;
  return (
    `<figure class="video"><a class="video-facade" href="${watch}" data-youtube="${id}">` +
    `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async">` +
    `<span class="video-play" aria-hidden="true"></span><span class="visually-hidden">${title}</span></a></figure>`
  );
}

function fileLang(file: VFile): Lang {
  const lang = (file.data.astro as { frontmatter?: { lang?: unknown } } | undefined)?.frontmatter?.lang;
  return isLang(lang) ? lang : DEFAULT_LANG;
}

/**
 * Hexo tag plugins used by legacy posts:
 *   {% post_link Slug [title] %} → link to that post in the reader's language
 *   {% youtube ID %}             → click-to-load facade (no third-party script until clicked)
 */
export default function remarkHexoTags() {
  return (tree: Root, file: VFile) => {
    const lang = fileLang(file);
    const posts = loadPostsFromDisk();
    const videoLabel = lang === "zh" ? "在 YouTube 上播放视频" : "Play video on YouTube";

    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      const only = node.children.length === 1 && node.children[0]?.type === "text" ? node.children[0].value.trim() : "";
      const video = /^\{%\s*youtube\s+([\w-]+)\s*%\}$/.exec(only);
      if (video?.[1] && YOUTUBE_ID.test(video[1]) && parent && index !== undefined) {
        const html: Html = { type: "html", value: youtubeFacade(video[1], videoLabel) };
        parent.children.splice(index, 1, html);
        return SKIP;
      }
      return undefined;
    });

    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined || !node.value.includes("{%")) return undefined;
      const parts: PhrasingContent[] = [];
      let last = 0;
      for (const match of node.value.matchAll(TAG)) {
        const [raw, name, args = ""] = match;
        const start = match.index;
        if (start > last) parts.push({ type: "text", value: node.value.slice(last, start) });
        last = start + raw.length;
        if (name === "youtube") {
          const id = args.trim();
          parts.push({
            type: "link",
            url: `https://www.youtube.com/watch?v=${id}`,
            children: [{ type: "text", value: "YouTube" }]
          });
          continue;
        }
        const [slug = "", ...rest] = args.split(/\s+/);
        const target = resolvePostLink(posts, slug, lang);
        if (!target) {
          file.message(`post_link target not found: ${slug}`);
          parts.push({ type: "text", value: rest.join(" ") || slug.replace(/-/g, " ") });
          continue;
        }
        const link: Link = {
          type: "link",
          url: target.url,
          children: [{ type: "text", value: rest.join(" ") || target.title }]
        };
        parts.push(link);
      }
      if (last === 0) return undefined;
      if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
      (parent.children as PhrasingContent[]).splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
