import type { APIRoute, GetStaticPaths } from "astro";
import { allPosts } from "../../data/posts";
import { SITE_CARD_LANGS, renderCard, type CardSpec } from "../../lib/og";

/**
 * Every OG image, generated at build time: one card per published post plus one per
 * language. The paths come from siteOgImage()/postOgImage() in src/lib/seo.ts — a post
 * key never contains a slash, so one catch-all covers `/og/site-en.png` and
 * `/og/en/<key>.png` alike, with no duplicate-prefix route to collide with.
 */
export const getStaticPaths = (async () => {
  const published = (await allPosts()).filter((post) => !post.draft);
  const specs: { file: string; card: CardSpec }[] = SITE_CARD_LANGS.map((lang) => ({
    file: `site-${lang}`,
    card: { kind: "site", lang }
  }));
  for (const post of published) {
    specs.push({ file: `${post.lang}/${post.key}`, card: { kind: "post", id: post.id } });
  }
  return specs.map(({ file, card }) => ({ params: { file }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderCard(props.card as CardSpec, await allPosts());
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
};

export const prerender = true;
