import { LiquidButton, LiquidCard, LiquidPill } from "@clean99/liquid-glass";
import { PageShell } from "@/components/PageShell";
import { PostList } from "@/components/PostList";
import { getAllPosts, getFeaturedPosts } from "@/lib/posts";

const focusAreas = [
  "Frontend Systems",
  "Performance & Reliability",
  "AI Agents & Automation",
  "Learning & Clear Thinking"
] as const;

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
          <LiquidButton as="a" href="/writing/" intensity="medium">
            Read Writing
          </LiquidButton>
          <LiquidButton as="a" href="/projects/" mode="fallback">
            View Projects
          </LiquidButton>
          <LiquidButton as="a" href="/ai-coding-lab/" mode="fallback">
            Explore AI Lab
          </LiquidButton>
        </div>
      </section>

      <section className="section">
        <h2>Focus</h2>
        <div className="focus-grid">
          {focusAreas.map((area) => (
            <LiquidCard as="article" className="focus-card" key={area} mode="fallback">
              <LiquidPill mode="solid">{area}</LiquidPill>
              <p>
                Notes and experiments that turn ambiguous engineering work into smaller
                verifiable systems.
              </p>
            </LiquidCard>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Selected Work</h2>
        <PostList featured posts={selectedWork} />
      </section>

      <section className="section">
        <h2>Latest Writing</h2>
        <PostList posts={latestPosts} />
      </section>
    </PageShell>
  );
}
