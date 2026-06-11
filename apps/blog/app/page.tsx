import { siteNavigation } from "@/lib/site";

export default function HomePage() {
  return (
    <main style={{ margin: "0 auto", maxWidth: 920, padding: "64px 24px" }}>
      <nav aria-label="Primary navigation" style={{ display: "flex", gap: 16 }}>
        {siteNavigation.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <p style={{ color: "var(--site-muted)", marginTop: 64 }}>
        Software Engineer · Frontend Systems · AI Agents
      </p>
      <h1 style={{ fontSize: 64, letterSpacing: 0, lineHeight: 1, margin: "12px 0" }}>Koh Hom</h1>
      <p style={{ color: "var(--site-muted)", fontSize: 20 }}>
        Monorepo scaffold for the upcoming Liquid Glass rebuild.
      </p>
    </main>
  );
}
