import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PostList } from "@/components/PostList";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Essays and notes on software, AI, systems, learning, and clear thinking."
};

export default function WritingPage() {
  return (
    <PageShell>
      <section className="page-heading">
        <p className="eyebrow">Writing</p>
        <h1>Essays and notes</h1>
        <p>Software, AI, systems, learning, and inner practice.</p>
      </section>
      <PostList posts={getAllPosts()} />
    </PageShell>
  );
}
