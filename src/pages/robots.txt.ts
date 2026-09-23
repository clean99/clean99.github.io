/**
 * robots.txt. Every crawler is welcome, including the AI agents that answer
 * questions from this site's text, and they are named explicitly so a default
 * interpreted more strictly than intended cannot lock them out. The two
 * documents they should read first are advertised alongside the sitemap.
 */
import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/seo";
import { SITE_URL } from "../site.config";

export const prerender = true;

/** Answering engines and the training collector are listed apart, as vendors ask. */
const ANSWER_ENGINES = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "YouBot",
  "Amazonbot",
  "Applebot"
];
const SEARCH_AND_TRAINING = [
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "CCBot",
  "cohere-ai",
  "anthropic-ai",
  "Meta-ExternalAgent"
];

export const GET: APIRoute = () => {
  const lines = [
    "# Everything here is public: text, images, feeds, and the markdown twins.",
    "# Retrieval and answering engines are named so no default can exclude them.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    ...ANSWER_ENGINES.flatMap((agent) => [`User-agent: ${agent}`, "Allow: /", ""]),
    ...SEARCH_AND_TRAINING.flatMap((agent) => [`User-agent: ${agent}`, "Allow: /", ""]),
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `Host: ${SITE_URL}`,
    ""
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
