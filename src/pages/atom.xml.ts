/**
 * The English edition of the Atom feed. `/zh/atom.xml` carries the Chinese one,
 * and each language's pages advertise its own URL so a reader subscribes to the
 * edition they are reading.
 */
import type { APIRoute } from "astro";
import { ATOM_HEADERS, atomDocument } from "../data/machine";

export const prerender = true;

export const GET: APIRoute = async () => new Response(await atomDocument("en"), { headers: ATOM_HEADERS });
