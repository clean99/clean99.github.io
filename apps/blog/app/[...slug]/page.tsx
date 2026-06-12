import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { absoluteUrl } from "@/lib/paths";
import { getAllPosts, getPostBySegments, getPostHtml } from "@/lib/posts";

type Params = {
  slug: string[];
};

export function generateStaticParams(): Params[] {
  return getAllPosts().map((post) => ({
    slug: post.routeSegments
  }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySegments(slug);
  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: post.canonicalPath
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: absoluteUrl(post.canonicalPath)
    }
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getPostBySegments(slug);

  if (!post) {
    notFound();
  }

  const html = await getPostHtml(post);

  return (
    <PageShell>
      <article className="prose">
        <a className="back-link" href="/writing/">
          Back to writing
        </a>
        <p className="eyebrow">
          {post.dateLabel} · {post.lang.toUpperCase()}
        </p>
        <h1>{post.title}</h1>
        <p className="lede">{post.excerpt}</p>
        {post.tags.length > 0 ? (
          <ul className="tag-list" aria-label={`Tags for ${post.title}`}>
            {post.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </PageShell>
  );
}
