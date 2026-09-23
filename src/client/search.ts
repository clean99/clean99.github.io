import { isSearchShortcut, moveSelection, toSearchHit, type SearchHit } from "../lib/search";

interface PagefindResult {
  data(): Promise<{ url: string; meta?: { title?: string }; excerpt: string }>;
}

interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>;
  init(): Promise<void>;
  debouncedSearch(
    term: string,
    options?: Record<string, unknown>,
    timeout?: number
  ): Promise<{ results: PagefindResult[] } | null>;
}

const MAX_HITS = 8;
const PAGEFIND_URL = "/pagefind/pagefind.js";

// Pagefind ships as a plain file in public/, not as a bundled module, so the
// import must survive bundling untouched. A bare dynamic import gets wrapped by
// Vite's preload helper, and this script is small enough that Astro inlines it
// into the HTML, where the helper's placeholder is never substituted and the
// import throws. Building the import at runtime keeps it out of that analysis.
const importModule = new Function("url", "return import(url)") as (url: string) => Promise<unknown>;

const dialog = document.querySelector<HTMLDialogElement>("[data-search-dialog]");
const input = dialog?.querySelector<HTMLInputElement>("[data-search-input]");
const list = dialog?.querySelector<HTMLOListElement>("[data-search-results]");
const status = dialog?.querySelector<HTMLElement>("[data-search-status]");

let pagefind: Promise<Pagefind | undefined> | undefined;

/** Loaded on first intent (hover, focus, shortcut), never on page load. */
function loadPagefind(): Promise<Pagefind | undefined> {
  pagefind ??= (async () => {
    try {
      const module = (await importModule(PAGEFIND_URL)) as Pagefind;
      await module.options({ excerptLength: 22 });
      await module.init();
      return module;
    } catch {
      return undefined;
    }
  })();
  return pagefind;
}

if (dialog && input && list && status) {
  const text = dialog.dataset;
  let selected = -1;

  const links = () => [...list.querySelectorAll<HTMLAnchorElement>("a")];

  const setStatus = (message: string) => {
    status.textContent = message;
  };

  const focusSelected = () => {
    if (selected === -1) input.focus();
    else links()[selected]?.focus();
  };

  const render = (hits: SearchHit[]) => {
    list.replaceChildren(
      ...hits.map((hit) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = hit.url;
        const title = document.createElement("span");
        title.className = "hit-title";
        title.textContent = hit.title;
        const excerpt = document.createElement("span");
        excerpt.className = "hit-excerpt";
        // Pagefind escapes page text and only adds <mark> around matches.
        excerpt.innerHTML = hit.excerpt;
        link.append(title, excerpt);
        item.append(link);
        return item;
      })
    );
    selected = -1;
    const count = hits.length;
    setStatus(
      count === 0 ? text.empty! : count === 1 ? text.countOne! : text.countOther!.replace("{n}", String(count))
    );
  };

  const run = async () => {
    const query = input.value.trim();
    if (!query) {
      list.replaceChildren();
      setStatus("");
      return;
    }
    setStatus(text.loading!);
    const engine = await loadPagefind();
    if (!engine) {
      setStatus(text.unavailable!);
      return;
    }
    const search = await engine.debouncedSearch(query, {}, 160);
    if (!search || input.value.trim() !== query) return;
    const data = await Promise.all(search.results.slice(0, MAX_HITS).map((result) => result.data()));
    render(data.map(toSearchHit));
  };

  const open = () => {
    if (dialog.open) return;
    void loadPagefind();
    dialog.showModal();
    input.focus();
    input.select();
  };

  for (const trigger of document.querySelectorAll<HTMLElement>("[data-search-open]")) {
    trigger.addEventListener("click", open);
    trigger.addEventListener("pointerenter", () => void loadPagefind(), { once: true });
    trigger.addEventListener("focus", () => void loadPagefind(), { once: true });
  }

  document.addEventListener("keydown", (event) => {
    if (dialog.open || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    const inEditable = Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));
    if (
      !isSearchShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        inEditable
      })
    )
      return;
    event.preventDefault();
    open();
  });

  input.addEventListener("input", () => void run());

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selected = moveSelection(selected, event.key === "ArrowDown" ? 1 : -1, links().length);
      focusSelected();
    } else if (event.key === "Enter" && event.target === input) {
      // The form is method="dialog"; Enter should open the top hit, not just close.
      event.preventDefault();
      const first = links()[0];
      if (first) window.location.assign(first.href);
    }
  });

  // A click on the backdrop lands on the <dialog> element itself.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
