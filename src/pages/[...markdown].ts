/**
 * Plain-Markdown twin of every post, at `<post url>index.md`. A crawler that
 * would otherwise parse the rendered article can lift the source instead: the
 * raw body under a small front header naming the canonical URL, date and
 * language. The param ends in `.md`, so Astro writes the file with that
 * extension rather than as an HTML page.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { markdownBody } from "../data/machine";
import { postIndex } from "../data/posts";
import { postMarkdown } from "../lib/llms";

export const prerender = true;

export const getStaticPaths = (async () => {
  const { posts, entries } = await postIndex();
  const published = posts.filter((post) => !post.draft);
  return published.map((post) => ({
    // `post.url` already ends in a slash, so the markdown twin is the canonical
    // path plus the filename; the trailing slash must survive.
    params: { markdown: `${post.url.replace(/^\//, "")}index.md` },
    props: { post, body: markdownBody(post, entries.get(post.id), published) }
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { post, body } = props as { post: import("../lib/posts").Post; body: string };
  return new Response(postMarkdown({ post, body }), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
