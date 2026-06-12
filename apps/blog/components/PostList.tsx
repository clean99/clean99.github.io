import { LiquidCard, LiquidPill, type LiquidMode } from "@clean99/liquid-glass";
import type { BlogPost } from "@/lib/posts";

export function PostList({ featured = false, posts }: { featured?: boolean; posts: BlogPost[] }) {
  const cardMode: LiquidMode = featured ? "auto" : "fallback";

  return (
    <div className={featured ? "post-list post-list--featured" : "post-list"}>
      {posts.map((post) => (
        <LiquidCard
          as="article"
          className="post-list__item"
          intensity={featured ? "medium" : "subtle"}
          key={post.canonicalPath}
          mode={cardMode}
        >
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
                <LiquidPill as="li" key={tag} mode="solid">
                  {tag}
                </LiquidPill>
              ))}
            </ul>
          ) : null}
        </LiquidCard>
      ))}
    </div>
  );
}
