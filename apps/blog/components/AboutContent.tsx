import { PageShell } from "@/components/PageShell";
import { loadMarkdownPage } from "@/lib/pages";

export async function AboutContent() {
  const page = await loadMarkdownPage("About", "index.md");

  return (
    <PageShell>
      <article className="prose">
        <h1>{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
    </PageShell>
  );
}
