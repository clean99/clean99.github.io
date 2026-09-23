import { describe, expect, it } from "vitest";
import { ALL_AREAS, areaHref, filterByArea, resolveArea, tagWeight, weighTags } from "../../src/lib/filter";
import { tagPath, tagRoutes } from "../../src/lib/tag-paths";
import { buildPost, collectTags, type RawPost } from "../../src/lib/posts";

const AREAS = ["engineering", "ai", "systems"];

const groups = [
  { year: 2026, posts: [{ area: "ai" }, { area: "engineering" }, { area: "ai" }] },
  { year: 2025, posts: [{ area: "engineering" }] },
  { year: 2024, posts: [{ area: "systems" }] }
];

describe("resolveArea", () => {
  it("accepts a known slug", () => {
    expect(resolveArea("ai", AREAS)).toBe("ai");
  });

  it("treats absent, empty, `all` and unknown values as no filter", () => {
    expect(resolveArea(null, AREAS)).toBe(ALL_AREAS);
    expect(resolveArea(undefined, AREAS)).toBe(ALL_AREAS);
    expect(resolveArea("", AREAS)).toBe(ALL_AREAS);
    expect(resolveArea("  ", AREAS)).toBe(ALL_AREAS);
    expect(resolveArea("all", AREAS)).toBe(ALL_AREAS);
    expect(resolveArea("nope", AREAS)).toBe(ALL_AREAS);
  });

  it("normalises case and surrounding space", () => {
    expect(resolveArea(" AI ", AREAS)).toBe("ai");
    expect(resolveArea("ALL", AREAS)).toBe(ALL_AREAS);
  });

  it("ignores a slug that is only known in the other language", () => {
    expect(resolveArea("ai-agents", AREAS)).toBe(ALL_AREAS);
  });
});

describe("areaHref", () => {
  it("links the plain index for `all` and a query for an area", () => {
    expect(areaHref("/writing/", ALL_AREAS)).toBe("/writing/");
    expect(areaHref("/writing/", "ai")).toBe("/writing/?area=ai");
  });

  it("normalises a path that lost its trailing slash", () => {
    expect(areaHref("/writing", "ai")).toBe("/writing/?area=ai");
    expect(areaHref("/writing", ALL_AREAS)).toBe("/writing/");
  });
});

describe("filterByArea", () => {
  it("returns every post, grouped, for `all`", () => {
    const result = filterByArea(groups, ALL_AREAS);
    expect(result.visible).toBe(5);
    expect(result.total).toBe(5);
    expect(result.empty).toBe(false);
    expect(result.groups.map((group) => group.posts.length)).toEqual([3, 1, 1]);
    expect(result.groups.every((group) => !group.hidden)).toBe(true);
  });

  it("keeps the year groups and flags the ones with no match", () => {
    const result = filterByArea(groups, "ai");
    expect(result.visible).toBe(2);
    expect(result.total).toBe(5);
    expect(result.groups).toEqual([
      { year: 2026, posts: [{ area: "ai" }, { area: "ai" }], hidden: false },
      { year: 2025, posts: [], hidden: true },
      { year: 2024, posts: [], hidden: true }
    ]);
  });

  it("reports an empty selection rather than dropping the groups", () => {
    const result = filterByArea(groups, "life");
    expect(result.visible).toBe(0);
    expect(result.empty).toBe(true);
    expect(result.groups).toHaveLength(3);
    expect(result.groups.every((group) => group.hidden)).toBe(true);
  });

  it("never mutates the input groups", () => {
    const result = filterByArea(groups, ALL_AREAS);
    result.groups[0]!.posts.pop();
    expect(groups[0]!.posts).toHaveLength(3);
  });

  it("handles an index with no posts", () => {
    expect(filterByArea([], "ai")).toEqual({ area: "ai", groups: [], visible: 0, total: 0, empty: true });
  });
});

describe("tagWeight", () => {
  it("scales against the busiest topic", () => {
    expect(tagWeight(10, 10)).toBe(1);
    expect(tagWeight(5, 10)).toBe(0.5);
    expect(tagWeight(1, 4)).toBe(0.25);
  });

  it("keeps a long tail visible with the floor", () => {
    expect(tagWeight(1, 100)).toBe(0.08);
    expect(tagWeight(1, 100, 0.2)).toBe(0.2);
  });

  it("degenerates safely", () => {
    expect(tagWeight(0, 10)).toBe(0);
    expect(tagWeight(3, 0)).toBe(0);
  });
});

describe("weighTags", () => {
  const tags = [
    { slug: "react", label: "React", count: 2 },
    { slug: "ai", label: "AI", count: 7 },
    { slug: "tdd", label: "TDD", count: 5 },
    { slug: "agile", label: "Agile", count: 1 }
  ];

  it("ranks by count and splits the lead from the tail", () => {
    const { lead, more } = weighTags(tags, 2);
    expect(lead.map((tag) => tag.slug)).toEqual(["ai", "tdd"]);
    expect(more.map((tag) => tag.slug)).toEqual(["react", "agile"]);
  });

  it("weights the lead against the busiest topic", () => {
    const { lead } = weighTags(tags, 4);
    expect(lead.map((tag) => tag.slug)).toEqual(["ai", "tdd", "react", "agile"]);
    const weights = lead.map((tag) => tag.weight);
    expect(weights[0]).toBe(1);
    // The busiest topic of four is still a meaningful share, so the floor does not bite.
    expect(weights.slice(1)).toEqual([5 / 7, 2 / 7, 1 / 7]);
  });

  it("applies the floor to a topic far behind the busiest one", () => {
    const longTail = [
      { slug: "ai", label: "AI", count: 40 },
      { slug: "agile", label: "Agile", count: 1 }
    ];
    expect(weighTags(longTail, 2).lead[1]!.weight).toBe(0.08);
  });

  it("breaks ties by label, not by input order", () => {
    const tied = [
      { slug: "b", label: "Beta", count: 3 },
      { slug: "a", label: "Alpha", count: 3 }
    ];
    expect(weighTags(tied).lead.map((tag) => tag.label)).toEqual(["Alpha", "Beta"]);
  });

  it("handles fewer tags than the lead limit", () => {
    const { lead, more } = weighTags(tags, 50);
    expect(lead).toHaveLength(4);
    expect(more).toEqual([]);
  });

  it("handles an empty index", () => {
    expect(weighTags([])).toEqual({ lead: [], more: [] });
  });
});

/** Minimal posts: only the fields the tag route builder reads. */
function postsFor(specs: readonly { id: string; lang: string; tags: string[] }[]) {
  const raws: RawPost[] = specs.map((spec) => ({
    id: spec.id,
    body: "Body text for the post.",
    data: { title: spec.id, date: "2026-01-02 10:00:00", lang: spec.lang, tags: spec.tags, area: "engineering" }
  }));
  return raws.map(buildPost);
}

describe("tagPath", () => {
  it("keeps English at the root and Chinese under /zh/", () => {
    expect(tagPath("en", "react")).toBe("/tags/react/");
    expect(tagPath("zh", "react")).toBe("/zh/tags/react/");
  });
});

describe("tagRoutes", () => {
  const posts = postsFor([
    { id: "Shared-Topic", lang: "en", tags: ["React"] },
    { id: "Shared-Topic-zh", lang: "zh", tags: ["React"] },
    { id: "English-Only", lang: "en", tags: ["SICPJS"] },
    { id: "Chinese-Only-zh", lang: "zh", tags: ["系统设计"] }
  ]);

  it("generates one route per topic that exists in the language", () => {
    expect(
      tagRoutes(posts, "en")
        .map((route) => route.params.tag)
        .sort()
    ).toEqual(["react", "sicpjs"]);
    expect(
      tagRoutes(posts, "zh")
        .map((route) => route.params.tag)
        .sort()
    ).toEqual(["react", "系统设计"]);
  });

  it("carries the other language's path only when that page exists", () => {
    const en = Object.fromEntries(tagRoutes(posts, "en").map((route) => [route.params.tag, route.props.alternate]));
    const zh = Object.fromEntries(tagRoutes(posts, "zh").map((route) => [route.params.tag, route.props.alternate]));
    expect(en.react).toBe("/zh/tags/react/");
    expect(zh.react).toBe("/tags/react/");
    expect(en.sicpjs).toBeUndefined();
    expect(zh["系统设计"]).toBeUndefined();
  });

  it("routes the topic to its own posts, newest first", () => {
    const react = tagRoutes(posts, "en").find((route) => route.params.tag === "react");
    expect(react?.props.tag.posts).toHaveLength(1);
    expect(react?.props.tag.label).toBe("React");
  });

  it("uses lowercase, ASCII-safe slugs", () => {
    const slugs = tagRoutes(posts, "en").map((route) => route.params.tag);
    expect(slugs).toEqual(slugs.map((slug) => slug.toLowerCase()));
    expect(collectTags(posts, "en").every((tag) => tag.slug === tag.slug.toLowerCase())).toBe(true);
  });
});
