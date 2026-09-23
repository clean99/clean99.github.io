export interface NotFoundCopy {
  htmlLang: string;
  documentTitle: string;
  eyebrow: string;
  title: string;
  lede: string;
  home: string;
  homePath: string;
  writing: string;
  writingPath: string;
  searchHint: string;
  recent: string;
}

/**
 * Copy for the 404 page. It is the one page a reader arrives at by accident, so
 * it says what happened in plain words and offers three ways onward: home, the
 * writing index, and the search shortcut. Both languages ship in the single
 * document because GitHub Pages serves one `404.html` for every unmatched path;
 * the browser picks the column from the requested path (see `not-found-logic`).
 */
export const NOT_FOUND_COPY = {
  en: {
    htmlLang: "en",
    documentTitle: "Page not found · Koh Hom",
    eyebrow: "404",
    title: "This page isn't here",
    lede: "The address you followed does not match anything on the site. It may have moved, or the link may have a typo.",
    home: "Back to the home page",
    homePath: "/",
    writing: "Browse all writing",
    writingPath: "/writing/",
    searchHint: "Or press / to search every note.",
    recent: "Recently published"
  },
  zh: {
    htmlLang: "zh-CN",
    documentTitle: "页面不存在 · 许峰",
    eyebrow: "404",
    title: "这个页面不存在",
    lede: "你访问的地址在站点里找不到。它可能被移动过，也可能链接里有笔误。",
    home: "返回首页",
    homePath: "/zh/",
    writing: "浏览全部文章",
    writingPath: "/zh/writing/",
    searchHint: "也可以按 / 搜索全部笔记。",
    recent: "最近发布"
  }
} satisfies Record<"en" | "zh", NotFoundCopy>;
