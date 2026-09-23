/**
 * The whole archive in one file: every published post's markdown body under a
 * title/url/date header, newest first. An agent that has read /llms.txt can
 * fetch this instead of walking the site one page at a time.
 */
import type { APIRoute } from "astro";
import { LLMS_HEADERS, fullArchiveDocument } from "../data/machine";

export const prerender = true;

export const GET: APIRoute = async () => {
  return new Response(await fullArchiveDocument(), { headers: LLMS_HEADERS });
};
