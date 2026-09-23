import { describe, expect, it } from "vitest";
import { counterpartPath, navItems, sectionForPath } from "../../src/lib/nav";

const LABELS = { writing: "Writing", projects: "Work", tags: "Topics", about: "About" };

describe("sectionForPath", () => {
  it.each([
    ["/", undefined],
    ["/zh/", undefined],
    ["/writing/", "writing"],
    ["/zh/writing/", "writing"],
    ["/projects/", "projects"],
    ["/zh/projects/", "projects"],
    ["/tags/", "tags"],
    ["/about/", "about"],
    ["/links/", "about"],
    ["/zh/links/", "about"],
    ["/ai-coding-lab/", "projects"],
    ["/zh/ai-coding-lab/", "projects"]
  ] as const)("maps %s to %s", (path, expected) => {
    expect(sectionForPath(path)).toBe(expected);
  });

  it("puts nested tag pages under Topics", () => {
    expect(sectionForPath("/tags/frontend/")).toBe("tags");
    expect(sectionForPath("/zh/tags/frontend/")).toBe("tags");
  });

  it("puts post pages under Writing", () => {
    expect(sectionForPath("/2026/06/19/Designing-an-Operations-Heartbeat-System/")).toBe("writing");
    expect(sectionForPath("/zh/2022/05/02/SICPJS-2-Building-Abstractions-with-Data/")).toBe("writing");
  });

  it("does not treat an ordinary path as a post", () => {
    expect(sectionForPath("/definitely-not-a-post/")).toBeUndefined();
  });
});

describe("navItems", () => {
  it("marks the section index itself as the current page", () => {
    const items = navItems({ lang: "en", path: "/projects/", section: undefined, labels: LABELS });
    expect(items.map((item) => [item.id, item.current])).toEqual([
      ["writing", undefined],
      ["projects", "page"],
      ["tags", undefined],
      ["about", undefined]
    ]);
  });

  it("marks a nested page as inside its section, not the page itself", () => {
    const items = navItems({ lang: "en", path: "/tags/frontend/", section: undefined, labels: LABELS });
    expect(items.find((item) => item.id === "tags")?.current).toBe("true");
    expect(items.filter((item) => item.current === "page")).toHaveLength(0);
  });

  it("uses the page's own section over the path, for pages whose URL sits elsewhere", () => {
    const items = navItems({ lang: "zh", path: "/zh/links/", section: "writing", labels: LABELS });
    // `/zh/links/` lives under about in the nav, but an explicit section wins.
    expect(items.find((item) => item.id === "writing")?.current).toBe("true");
  });

  it("links into the reader's own language", () => {
    const items = navItems({ lang: "zh", path: "/zh/about/", section: undefined, labels: LABELS });
    expect(items.map((item) => item.href)).toEqual(["/zh/writing/", "/zh/projects/", "/zh/tags/", "/zh/about/"]);
  });
});

describe("counterpartPath", () => {
  it("prefers an explicit alternate", () => {
    expect(counterpartPath("/about/", "zh", { zh: "/zh/about/" })).toBe("/zh/about/");
  });

  it("prefixes a section path for Chinese", () => {
    expect(counterpartPath("/tags/frontend/", "zh")).toBe("/zh/tags/frontend/");
    expect(counterpartPath("/zh/tags/frontend/", "en")).toBe("/tags/frontend/");
  });

  it("maps the home page both ways", () => {
    expect(counterpartPath("/", "zh")).toBe("/zh/");
    expect(counterpartPath("/zh/", "en")).toBe("/");
  });

  it("refuses to guess a translation for a dated post", () => {
    // The English original has no Chinese edition; a guessed URL would land on a redirect stub.
    expect(counterpartPath("/2026/06/19/Designing-an-Operations-Heartbeat-System/", "zh")).toBeUndefined();
    expect(counterpartPath("/zh/2026/06/19/Designing-an-Operations-Heartbeat-System/", "en")).toBeUndefined();
  });

  it("uses a post's explicit translation when the page passes one", () => {
    expect(
      counterpartPath("/2026/06/19/Designing-an-Operations-Heartbeat-System/", "zh", {
        zh: "/zh/2026/06/19/Designing-an-Operations-Heartbeat-System/"
      })
    ).toBe("/zh/2026/06/19/Designing-an-Operations-Heartbeat-System/");
  });
});
