import { getCollection, render } from "astro:content";
import type { Lang } from "./i18n";

/** Migrated prose pages: `/about/` and `/links/`, each in both languages. */
export const PAGE_IDS = {
  about: { en: "about", zh: "about-zh" },
  links: { en: "links", zh: "links-zh" }
} as const;

export type PageName = keyof typeof PAGE_IDS;

export interface ProsePage {
  title: string;
  description: string | undefined;
  Content: Awaited<ReturnType<typeof render>>["Content"];
}

/**
 * Renders one migrated markdown page. Missing content is a build error rather
 * than a silently empty page, so a rename in `content/pages/` cannot ship.
 */
export async function prosePage(name: PageName, lang: Lang): Promise<ProsePage> {
  const id = PAGE_IDS[name][lang];
  const entries = await getCollection("pages", (entry) => entry.id === id);
  const entry = entries[0];
  if (!entry) throw new Error(`Missing content/pages/${id}.md for ${name} (${lang})`);
  const { Content } = await render(entry);
  return { title: entry.data.title, description: entry.data.description, Content };
}
