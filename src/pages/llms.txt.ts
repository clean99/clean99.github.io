/**
 * The agent index for the English edition, at /llms.txt. `/zh/llms.txt` is its
 * Chinese twin; both list only their own language's posts.
 */
import type { APIRoute } from "astro";
import { LLMS_HEADERS, llmsDocument } from "../data/machine";

export const prerender = true;

export const GET: APIRoute = async () => new Response(await llmsDocument("en"), { headers: LLMS_HEADERS });
