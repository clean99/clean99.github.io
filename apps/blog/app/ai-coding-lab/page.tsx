import fs from "node:fs";
import type { Metadata } from "next";
import { LiquidCard } from "@clean99/liquid-glass";
import { PageShell } from "@/components/PageShell";
import { getSourcePath } from "@/lib/paths";

type Catalog = {
  generatedAt: string;
  items: Array<{
    category?: string;
    description?: string;
    id: string;
    name: string;
  }>;
  stats?: {
    files?: number;
    skills?: number;
  };
};

export const metadata: Metadata = {
  title: "AI Coding Lab",
  description: "A public catalog of sanitized AI coding workflow artifacts."
};

export default function AiCodingLabPage() {
  const catalog = JSON.parse(
    fs.readFileSync(getSourcePath("ai-coding-lab", "catalog.json"), "utf8")
  ) as Catalog;

  return (
    <PageShell>
      <section className="page-heading">
        <p className="eyebrow">AI Coding Lab</p>
        <h1>Agent workflow catalog</h1>
        <p>
          {catalog.stats?.skills ?? catalog.items.length} indexed entries · generated{" "}
          {new Date(catalog.generatedAt).toISOString().slice(0, 10)}
        </p>
      </section>
      <div className="card-grid">
        {catalog.items.slice(0, 12).map((item) => (
          <LiquidCard as="article" className="simple-card" key={item.id} mode="fallback">
            <p className="eyebrow">{item.category ?? "Catalog"}</p>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
          </LiquidCard>
        ))}
      </div>
    </PageShell>
  );
}
