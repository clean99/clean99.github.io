import { PageShell } from "@/components/PageShell";
import { PostList } from "@/components/PostList";
import { getAllPosts, getFeaturedPosts } from "@/lib/posts";

export default function HomePage() {
  const latestPosts = getAllPosts().slice(0, 6);
  const selectedWork = getFeaturedPosts()
    .filter((post) => post.lang === "en")
    .slice(0, 4);

  return (
    <PageShell>
      <section className="hero">
        <p className="eyebrow">Software Engineer · Frontend Systems · AI Agents</p>
        <h1>Koh Hom</h1>
        <p className="lede">I build reliable frontend systems and AI-assisted workflows.</p>
        <p>
          Long-form notes on performance, architecture, agents, learning, and clear thinking.
        </p>
        <div className="actions">
          <a href="/writing/">Read Writing</a>
          <a href="/projects/">View Projects</a>
          <a href="/ai-coding-lab/">Explore AI Lab</a>
        </div>
      </section>

      <section className="section">
        <h2>Selected Work</h2>
        <PostList posts={selectedWork} />
      </section>

      <section className="section">
        <h2>Latest Writing</h2>
        <PostList posts={latestPosts} />
      </section>
    </PageShell>
  );
}
