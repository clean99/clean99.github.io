import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="page-heading">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page may have moved, or the old link no longer exists.</p>
        <p>
          <a href="/writing/">Browse writing</a>
        </p>
      </section>
    </PageShell>
  );
}
