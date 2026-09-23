/** The Chinese edition of the agent index, at /zh/llms.txt. */
import type { APIRoute } from "astro";
import { LLMS_HEADERS, llmsDocument } from "../../data/machine";

export const prerender = true;

export const GET: APIRoute = async () => new Response(await llmsDocument("zh"), { headers: LLMS_HEADERS });
