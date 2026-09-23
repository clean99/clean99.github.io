import { getCollection, type CollectionEntry } from "astro:content";
import { buildPost, type Post } from "../lib/posts";

export type PostEntry = CollectionEntry<"posts">;

interface PostIndex {
  posts: Post[];
  entries: Map<string, PostEntry>;
}

let cached: Promise<PostIndex> | undefined;

async function load(): Promise<PostIndex> {
  const entries = await getCollection("posts");
  return {
    posts: entries.map((entry) => buildPost({ id: entry.id, body: entry.body ?? "", data: entry.data })),
    entries: new Map(entries.map((entry) => [entry.id, entry]))
  };
}

/** Every post (drafts included, callers filter), built once per production build. */
export function postIndex(): Promise<PostIndex> {
  if (!import.meta.env.PROD) return load();
  return (cached ??= load());
}

export async function allPosts(): Promise<Post[]> {
  return (await postIndex()).posts;
}
