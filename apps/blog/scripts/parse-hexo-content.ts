import { getAllPosts } from "../lib/posts";

const posts = getAllPosts();
const languages = posts.reduce<Record<string, number>>((acc, post) => {
  acc[post.lang] = (acc[post.lang] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ posts: posts.length, languages }, null, 2));
