import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PostList } from "@/components/PostList";
import { getFeaturedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected technical work derived from published notes."
};

export default function ProjectsPage() {
  const projects = getFeaturedPosts().filter((post) => post.lang === "en");

  return (
    <PageShell>
      <section className="page-heading">
        <p className="eyebrow">Projects</p>
        <h1>Selected technical work</h1>
        <p>Only items backed by existing posts or generated catalog entries are shown here.</p>
      </section>
      <PostList posts={projects} />
    </PageShell>
  );
}
