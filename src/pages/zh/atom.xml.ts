/**
 * The Chinese edition of the Atom feed, served at /zh/atom.xml so each language
 * advertises its own subscription URL.
 */
import type { APIRoute } from "astro";
import { ATOM_HEADERS, atomDocument } from "../../data/machine";

export const prerender = true;

export const GET: APIRoute = async () => new Response(await atomDocument("zh"), { headers: ATOM_HEADERS });
