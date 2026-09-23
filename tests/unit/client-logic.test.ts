import { describe, expect, it } from "vitest";
import { isSearchShortcut, moveSelection, toSearchHit } from "../../src/lib/search";
import { resolveTheme, themeToStore, toggleTheme } from "../../src/lib/theme";
import { activeHeading } from "../../src/lib/toc";
import { isYoutubeId, youtubeEmbedUrl } from "../../src/lib/video";

describe("theme", () => {
  it("prefers the stored choice, then the OS", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("sepia", false)).toBe("light");
  });

  it("toggles and forgets choices that match the OS", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(themeToStore("dark", true)).toBeNull();
    expect(themeToStore("dark", false)).toBe("dark");
  });
});

describe("toc", () => {
  const headings = [
    { id: "a", top: -400 },
    { id: "b", top: 40 },
    { id: "c", top: 600 }
  ];

  it("marks the last heading above the reading line", () => {
    expect(activeHeading(headings, 100)).toBe("b");
    expect(activeHeading(headings, 0)).toBe("a");
    expect(activeHeading([{ id: "a", top: 300 }], 100)).toBeUndefined();
  });
});

describe("search", () => {
  const key = (k: string, extra: Partial<Parameters<typeof isSearchShortcut>[0]> = {}) =>
    isSearchShortcut({ key: k, metaKey: false, ctrlKey: false, altKey: false, inEditable: false, ...extra });

  it("opens on ⌘K, Ctrl+K and a bare slash outside text fields", () => {
    expect(key("k", { metaKey: true })).toBe(true);
    expect(key("K", { ctrlKey: true })).toBe(true);
    expect(key("/")).toBe(true);
    expect(key("/", { inEditable: true })).toBe(false);
    expect(key("k")).toBe(false);
    expect(key("k", { metaKey: true, altKey: true })).toBe(false);
  });

  it("wraps arrow-key selection through the input", () => {
    expect(moveSelection(-1, 1, 3)).toBe(0);
    expect(moveSelection(2, 1, 3)).toBe(-1);
    expect(moveSelection(-1, -1, 3)).toBe(2);
    expect(moveSelection(-1, 1, 0)).toBe(-1);
  });

  it("maps pagefind data to clean hits", () => {
    expect(
      toSearchHit({
        url: "/2023/01/05/React-Performance-Optimization/index.html",
        meta: { title: "React Performance · Koh Hom" },
        excerpt: "a <mark>b</mark>"
      })
    ).toEqual({
      url: "/2023/01/05/React-Performance-Optimization/",
      title: "React Performance",
      excerpt: "a <mark>b</mark>"
    });
  });
});

describe("video", () => {
  it("builds a privacy-enhanced embed URL for valid ids only", () => {
    expect(isYoutubeId("dQw4w9WgXcQ")).toBe(true);
    expect(isYoutubeId("javascript:1")).toBe(false);
    expect(isYoutubeId(undefined)).toBe(false);
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
    expect(() => youtubeEmbedUrl('x"><script>')).toThrow();
  });
});
