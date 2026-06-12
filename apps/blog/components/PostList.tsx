import type { BlogPost } from "@/lib/posts";

export function PostList({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article className="post-list__item" key={post.canonicalPath}>
          <p className="eyebrow">
            {post.dateLabel} · {post.lang.toUpperCase()}
          </p>
          <h2>
            <a href={post.canonicalPath}>{post.title}</a>
          </h2>
          <p>{post.excerpt}</p>
          {post.tags.length > 0 ? (
            <ul className="tag-list" aria-label={`Tags for ${post.title}`}>
              {post.tags.slice(0, 5).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
