export interface ShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  /** Whether focus is in a text field, where `/` must stay a character. */
  inEditable: boolean;
}

/** ⌘K / Ctrl+K anywhere, or a bare `/` outside text fields. */
export function isSearchShortcut(event: ShortcutEvent): boolean {
  if (event.altKey) return false;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") return true;
  return event.key === "/" && !event.metaKey && !event.ctrlKey && !event.inEditable;
}

/** Arrow-key movement through results; wraps at both ends, -1 means the input. */
export function moveSelection(current: number, delta: 1 | -1, count: number): number {
  if (count === 0) return -1;
  const next = current + delta;
  if (next < -1) return count - 1;
  if (next >= count) return -1;
  return next;
}

export interface SearchHit {
  url: string;
  title: string;
  excerpt: string;
}

/** Pagefind result data → what the dialog renders. Pagefind URLs keep a trailing `index.html` off. */
export function toSearchHit(data: { url: string; meta?: { title?: string }; excerpt: string }): SearchHit {
  return {
    url: data.url.replace(/index\.html$/, ""),
    title: data.meta?.title?.replace(/ · Koh Hom$/, "") || data.url,
    excerpt: data.excerpt
  };
}
