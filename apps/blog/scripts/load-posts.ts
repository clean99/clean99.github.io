import { getAllPosts } from "../lib/posts";

const posts = getAllPosts();
console.log(`Loaded ${posts.length} posts.`);
