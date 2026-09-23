/**
 * Retired sections and the legacy `/zh/<date>/<slug>/` fallback the old theme
 * published for English-only posts. GitHub Pages has no server-side rewrite, so
 * each stub ships as its own static page: a meta refresh does the moving, the
 * canonical tag names the destination, and the visible link keeps a reader whose
 * browser ignores meta refresh on the same path.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { postIndex } from "../data/posts";
import { stubDocument } from "../lib/stub";
import { allRedirects, type Redirect } from "../lib/redirects";
import { absoluteUrl } from "../lib/seo";
import { SITE } from "../site.config";

export const getStaticPaths = (async () => {
  const { posts } = await postIndex();
  const published = posts.filter((post) => !post.draft);
  // A page that already exists at `from` would win the build anyway; filtering
  // here keeps the generated output free of a stub nothing can ever reach.
  const taken = new Set(["/", ...published.map((post) => post.url)]);
  return allRedirects(published)
    .filter((redirect) => !taken.has(redirect.from) && !taken.has(redirect.from.replace(/\/$/, "")))
    .map((redirect) => ({
      /**
       * The param names the output file, not the URL: an endpoint param with no
       * extension would be written as a bare file, so it carries `index.html`
       * and lands where GitHub Pages looks for `/interviewers/`.
       */
      params: { legacy: `${redirect.from.replace(/^\/|\/$/g, "")}/index.html` },
      props: { redirect }
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { redirect } = props as { redirect: Redirect };
  const html = stubDocument({
    title: `Moved: ${redirect.from}`,
    targetPath: redirect.to,
    canonical: absoluteUrl(redirect.to),
    description: "This page moved. If your browser does not take you there automatically, follow the link.",
    linkLabel: `Continue to ${redirect.to}`,
    homePath: "/",
    homeLabel: `Back to ${SITE.shortTitle}`
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};
