import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  blogPostingNode,
  breadcrumbNode,
  documentTitle,
  hreflangAlternates,
  jsonLdGraph,
  postOgImage,
  serializeJsonLd,
  websiteNode
} from "../../src/lib/seo";
import { findTranslation } from "../../src/lib/posts";
import { loadPosts } from "./content";

const posts = loadPosts();
const en = posts.find((p) => p.key === "React-Performance-Optimization" && p.lang === "en")!;
const zh = findTranslation(posts, en)!;

describe("seo helpers", () => {
  it("resolves absolute URLs against the site origin", () => {
    expect(absoluteUrl("/about/")).toBe("https://clean99.github.io/about/");
    expect(absoluteUrl(en.url)).toMatch(
      /^https:\/\/clean99\.github\.io\/\d{4}\/\d{2}\/\d{2}\/React-Performance-Optimization\/$/
    );
  });

  it("puts the page name before the site name", () => {
    expect(documentTitle(undefined, "en")).toBe("Koh Hom — Engineer's Field Notes");
    expect(documentTitle("Writing", "en")).toBe("Writing · Koh Hom");
    expect(documentTitle("文章", "zh")).toBe("文章 · Koh Hom");
  });

  it("emits an hreflang cluster only when a page has a translation", () => {
    expect(hreflangAlternates({ en: "/about/" })).toEqual([]);
    expect(hreflangAlternates({ en: "/about/", zh: "/zh/about/" })).toEqual([
      { hreflang: "en", href: "https://clean99.github.io/about/" },
      { hreflang: "zh-CN", href: "https://clean99.github.io/zh/about/" },
      { hreflang: "x-default", href: "https://clean99.github.io/about/" }
    ]);
  });

  it("describes a post as a BlogPosting linked to its translation", () => {
    const node = blogPostingNode(en, { translation: zh });
    expect(node).toMatchObject({
      "@type": "BlogPosting",
      "@id": `${absoluteUrl(en.url)}#article`,
      headline: en.title,
      inLanguage: "en",
      author: { "@id": "https://clean99.github.io/#person" },
      workTranslation: { "@id": `${absoluteUrl(zh.url)}#article` }
    });
    expect(node.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
    expect(node.image).toEqual([absoluteUrl(postOgImage(en))]);
    expect(blogPostingNode(zh, { translation: en })).toMatchObject({
      inLanguage: "zh-CN",
      translationOfWork: { "@id": `${absoluteUrl(en.url)}#article` }
    });
  });

  it("every post has a non-empty description within snippet length", () => {
    const bad = posts.filter((p) => !p.description || p.description.length > 170).map((p) => p.id);
    expect(bad).toEqual([]);
  });

  it("numbers breadcrumb items from 1", () => {
    expect(
      breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Writing", path: "/writing/" }
      ])
    ).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://clean99.github.io/" },
        { "@type": "ListItem", position: 2, name: "Writing", item: "https://clean99.github.io/writing/" }
      ]
    });
  });

  it("serialises JSON-LD without a script breakout", () => {
    const json = serializeJsonLd(jsonLdGraph([websiteNode("en"), { name: "</script><script>alert(1)</script>" }]));
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)["@graph"][1].name).toBe("</script><script>alert(1)</script>");
  });
});
