/**
 * Astro hoists `<link>`/`<meta>` placed in a `<head>` block and moves `<script>`
 * into the head as well, which would strip the ordering a hand-written stub
 * page needs. Rendering the document as one raw string keeps it exactly as
 * authored: meta refresh first, canonical next, then the visible fallback.
 */
export function stubDocument(input: {
  title: string;
  targetPath: string;
  canonical: string;
  description: string;
  linkLabel: string;
  homePath: string;
  homeLabel: string;
}): string {
  const { title, targetPath, canonical, description, linkLabel, homePath, homeLabel } = input;
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return [
    "<!doctype html>",
    `<html lang="en">`,
    "<head>",
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escape(title)}</title>`,
    `<meta http-equiv="refresh" content="0; url=${escape(targetPath)}">`,
    `<meta name="robots" content="noindex, follow">`,
    `<link rel="canonical" href="${escape(canonical)}">`,
    `<style>body{font-family:ui-serif,Georgia,serif;margin:4rem auto;max-width:36rem;padding:0 1.5rem;color:#1a1a1a}a{color:#8b1a1a}</style>`,
    "</head>",
    "<body>",
    `<main><h1>${escape(title)}</h1>`,
    `<p>${escape(description)}</p>`,
    `<p><a href="${escape(targetPath)}">${escape(linkLabel)}</a></p>`,
    `<p><a href="${escape(homePath)}">${escape(homeLabel)}</a></p></main>`,
    "</body>",
    "</html>",
    ""
  ].join("\n");
}
