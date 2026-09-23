import { copyFor, resolveCaseVariant, type NotFoundCopy } from "./not-found-logic";

/**
 * GitHub Pages answers a retired URL with this page and status 404. Two cases:
 *
 * 1. The only thing wrong with the request is its casing (`/About/` for
 *    `/about/`), or it names a retired section (`/Works/`). Send the reader to
 *    the canonical page instead of leaving them here.
 * 2. Nothing matches, so the page is shown — in the language the requested path
 *    implied, because the document itself is shared by both editions.
 */
function readJson<T>(id: string): T | undefined {
  const block = document.getElementById(id);
  if (!block?.textContent) return undefined;
  try {
    return JSON.parse(block.textContent) as T;
  } catch {
    return undefined;
  }
}

function localize(): void {
  const copy = readJson<Record<"en" | "zh", NotFoundCopy>>("not-found-copy");
  if (!copy) return;
  const chosen = copyFor(`${location.pathname}${location.search}`, copy);

  document.documentElement.lang = chosen.htmlLang;
  document.title = chosen.documentTitle;

  const text = (name: string, value: string) => {
    const node = document.querySelector(`[data-nf="${name}"]`);
    if (node) node.textContent = value;
  };
  text("title", chosen.title);
  text("lede", chosen.lede);
  text("home", chosen.home);
  text("writing", chosen.writing);
  text("searchHint", chosen.searchHint);
  text("recent", chosen.recent);

  const home = document.querySelector<HTMLAnchorElement>('[data-nf="home"]');
  const writing = document.querySelector<HTMLAnchorElement>('[data-nf="writing"]');
  if (home) home.href = chosen.homePath;
  if (writing) writing.href = chosen.writingPath;

  // Only the reader's own language is listed; the other is already in the DOM.
  for (const node of document.querySelectorAll<HTMLElement>("[data-nf-recent]")) {
    node.hidden = node.dataset.nfRecent !== chosen.htmlLang.slice(0, 2);
  }
}

const map = readJson<Record<string, string>>("case-map") ?? {};
const target = resolveCaseVariant(`${location.pathname}${location.search}${location.hash}`, map);
if (target) {
  location.replace(target);
} else {
  localize();
}
