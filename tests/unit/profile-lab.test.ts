import { describe, expect, it } from "vitest";
import catalog from "../../content/ai-coding-lab/catalog.json";
import {
  catalogOrder,
  categoryFacets,
  categoryLabel,
  excerpt,
  filterCounts,
  formatSize,
  matchesFilter,
  matchesQuery,
  shortPath,
  type Catalog,
  type CatalogItem
} from "../../src/lib/lab";

function item(overrides: Partial<CatalogItem> & { id: string }): CatalogItem {
  return {
    id: overrides.id,
    kind: overrides.kind ?? "skill",
    name: overrides.name ?? overrides.id,
    description: overrides.description ?? "",
    category: overrides.category ?? "frontend",
    source: overrides.source ?? "Codex",
    path: overrides.path ?? `home/.codex/skills/${overrides.id}/SKILL.md`,
    redacted: overrides.redacted ?? false,
    size: overrides.size ?? 1024,
    content: overrides.content ?? ""
  };
}

describe("the shipped catalog", () => {
  const data = catalog as Catalog;

  it("matches the shape the page reads", () => {
    expect(data.schemaVersion).toBe(1);
    expect(data.stats.skills).toBeGreaterThan(0);
    expect(data.stats.files).toBeGreaterThan(0);
    expect(data.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(data.items).toHaveLength(data.stats.skills + data.stats.files);
  });

  it("carries no credentials, personal paths, or internal platform names", () => {
    const text = JSON.stringify(data);
    for (const forbidden of ["/Users/", "xff9924", "api_key", "apiKey", "private-key"]) {
      expect(text, `catalog must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("gives every item a description, so no card renders empty", () => {
    for (const entry of data.items) {
      expect(entry.description.trim(), `${entry.id} has no description`).not.toBe("");
      expect(entry.name.trim()).not.toBe("");
    }
  });

  it("keeps every config file public-safe: sanitized, and no internal paths", () => {
    for (const entry of data.items.filter((i) => i.kind === "file")) {
      expect(entry.path.startsWith("home/") || entry.path === "AGENTS.md").toBe(true);
    }
  });
});

describe("categoryLabel", () => {
  it("uses the translated label for known categories", () => {
    expect(categoryLabel("growth", "en")).toBe("Growth & marketing");
    expect(categoryLabel("growth", "zh")).toBe("增长与营销");
  });

  it("title-cases an unknown category instead of dropping it", () => {
    expect(categoryLabel("something-new", "en")).toBe("Something-new");
  });
});

describe("categoryFacets", () => {
  it("counts skills only, most populated first", () => {
    const items = [
      item({ id: "a", category: "growth" }),
      item({ id: "b", category: "growth" }),
      item({ id: "c", category: "frontend" }),
      item({ id: "d", kind: "file", category: "agent policy" })
    ];
    expect(categoryFacets(items, "en")).toEqual([
      { id: "growth", label: "Growth & marketing", count: 2 },
      { id: "frontend", label: "Frontend & design", count: 1 }
    ]);
  });

  it("returns nothing for an empty catalog", () => {
    expect(categoryFacets([], "en")).toEqual([]);
  });
});

describe("filterCounts and matchesFilter", () => {
  const items = [
    item({ id: "a", kind: "skill" }),
    item({ id: "b", kind: "skill", redacted: true }),
    item({ id: "c", kind: "file", redacted: true })
  ];

  it("counts each filter the UI offers", () => {
    expect(filterCounts(items)).toEqual({ all: 3, skill: 2, file: 1, redacted: 2 });
  });

  it("treats `all` as a passthrough", () => {
    expect(items.every((entry) => matchesFilter(entry, "all"))).toBe(true);
  });

  it("filters by kind and by sanitized state", () => {
    expect(items.filter((entry) => matchesFilter(entry, "skill")).map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(items.filter((entry) => matchesFilter(entry, "file")).map((entry) => entry.id)).toEqual(["c"]);
    expect(items.filter((entry) => matchesFilter(entry, "redacted")).map((entry) => entry.id)).toEqual(["b", "c"]);
  });
});

describe("matchesQuery", () => {
  const entry = item({
    id: "analytics",
    name: "analytics",
    description: "Set up and audit analytics tracking.",
    category: "growth",
    path: "home/.codex/skills/analytics/SKILL.md"
  });

  it("searches name, description, category, source, and path", () => {
    for (const query of ["analytics", "audit tracking", "growth", "codex", "skills/analytics"]) {
      expect(matchesQuery(entry, query), query).toBe(true);
    }
  });

  it("matches multiple terms in any order", () => {
    expect(matchesQuery(entry, "analytics audit")).toBe(true);
    expect(matchesQuery(entry, "tracking audit")).toBe(true);
    expect(matchesQuery(entry, "audit analytics")).toBe(true);
  });

  it("requires every term, not just one", () => {
    expect(matchesQuery(entry, "analytics kubernetes")).toBe(false);
  });

  it("is case- and whitespace-insensitive, and matches everything when empty", () => {
    expect(matchesQuery(entry, "  ANALYTICS  ")).toBe(true);
    expect(matchesQuery(entry, "")).toBe(true);
    expect(matchesQuery(entry, "   ")).toBe(true);
  });

  it("rejects a miss", () => {
    expect(matchesQuery(entry, "kubernetes")).toBe(false);
  });
});

describe("shortPath", () => {
  it("drops the home prefix so the path reads like a repo path", () => {
    expect(shortPath("home/.codex/skills/analytics/SKILL.md")).toBe("skills/analytics/SKILL.md");
    expect(shortPath("home/.codex/AGENTS.md")).toBe("AGENTS.md");
    expect(shortPath("home/.agents/skills/figma/SKILL.md")).toBe("skills/figma/SKILL.md");
  });
});

describe("formatSize", () => {
  it.each([
    [512, "512 B"],
    [2048, "2.0 KB"],
    [1024 * 1024, "1.0 MB"]
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected);
  });
});

describe("excerpt", () => {
  it("strips frontmatter, code fences, headings, and markdown markers", () => {
    const text = excerpt("---\nname: demo\n---\n# Heading\n\n```js\nconst x = 1;\n```\n\nSome **bold** body text.");
    expect(text).toBe("Heading Some bold body text.");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const text = excerpt("word ".repeat(100), 50);
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(51);
  });

  it("leaves short content untouched", () => {
    expect(excerpt("Short.")).toBe("Short.");
  });

  it("never emits a trailing space before the ellipsis", () => {
    expect(excerpt("alpha beta gamma delta epsilon zeta eta theta", 20)).not.toMatch(/ …$/);
  });
});

describe("catalogOrder", () => {
  it("puts config files first, then skills by category and name", () => {
    const items = [
      item({ id: "zeta", kind: "skill", name: "zeta", category: "growth" }),
      item({ id: "alpha", kind: "skill", name: "alpha", category: "frontend" }),
      item({ id: "config", kind: "file", name: "Config" })
    ];
    expect(catalogOrder(items).map((entry) => entry.id)).toEqual(["config", "alpha", "zeta"]);
  });

  it("does not mutate its input", () => {
    const items = [item({ id: "b" }), item({ id: "a" })];
    const order = catalogOrder(items);
    expect(order).not.toBe(items);
    expect(items.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("orders the shipped catalog deterministically", () => {
    const data = catalog as Catalog;
    expect(catalogOrder(data.items).map((entry) => entry.id)).toEqual(
      catalogOrder(data.items).map((entry) => entry.id)
    );
    expect(catalogOrder(data.items)[0]!.kind).toBe("file");
  });
});
