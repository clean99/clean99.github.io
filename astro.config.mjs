// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import rehypeRaw from "rehype-raw";
import remarkHexoTags from "./src/markdown/remark-hexo-tags.ts";
import remarkMath from "./src/markdown/remark-math.ts";
import rehypeHeadingAnchors from "./src/markdown/rehype-heading-anchors.ts";
import rehypeResponsiveImages from "./src/markdown/rehype-responsive-images.ts";
import rehypeLinks from "./src/markdown/rehype-links.ts";
import rehypeTables from "./src/markdown/rehype-tables.ts";
import { SITE_URL } from "./src/site.config.ts";

const LATIN_RANGE = [
  "U+0000-00FF",
  "U+0131",
  "U+0152-0153",
  "U+02BB-02BC",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0304",
  "U+0308",
  "U+0329",
  "U+2000-206F",
  "U+20AC",
  "U+2122",
  "U+2191",
  "U+2193",
  "U+2212",
  "U+2215",
  "U+FEFF",
  "U+FFFD"
];

const CJK_SERIF = ["Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "STSong", "SimSun"];
const CJK_SANS = ["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei"];

/** @param {string} file @param {"normal" | "italic"} style */
const variant = (file, style = "normal") => ({
  src: /** @type {[string]} */ ([`./src/assets/fonts/${file}`]),
  weight: "100 900",
  style
});

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "always"
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover"
  },
  devToolbar: { enabled: false },
  fonts: [
    {
      name: "Fraunces",
      cssVariable: "--font-display",
      provider: fontProviders.local(),
      // CJK faces sit before the generic family so Han glyphs never fall through to a system default.
      fallbacks: ["Fraunces Fallback", "Georgia", ...CJK_SERIF, "serif"],
      // Metric-matched by hand in src/styles/fonts.css; the generated ones wrap headings differently.
      optimizedFallbacks: false,
      unicodeRange: /** @type {[string, ...string[]]} */ (LATIN_RANGE),
      options: {
        variants: [variant("fraunces-latin-wght-normal.woff2"), variant("fraunces-latin-wght-italic.woff2", "italic")]
      }
    },
    {
      // The same files again under a second family, so the home hero can put its own fallback first:
      // one size-adjust cannot match every string, and the hero title is the line most likely to reflow.
      name: "Fraunces",
      cssVariable: "--font-hero",
      provider: fontProviders.local(),
      fallbacks: ["Fraunces Hero Fallback", "Fraunces Fallback", "Georgia", ...CJK_SERIF, "serif"],
      optimizedFallbacks: false,
      unicodeRange: /** @type {[string, ...string[]]} */ (LATIN_RANGE),
      options: {
        variants: [variant("fraunces-latin-wght-normal.woff2"), variant("fraunces-latin-wght-italic.woff2", "italic")]
      }
    },
    {
      name: "Newsreader",
      cssVariable: "--font-body",
      provider: fontProviders.local(),
      fallbacks: ["Newsreader Fallback", "Georgia", ...CJK_SANS, "serif"],
      optimizedFallbacks: false,
      unicodeRange: /** @type {[string, ...string[]]} */ (LATIN_RANGE),
      options: {
        variants: [
          variant("newsreader-latin-wght-normal.woff2"),
          variant("newsreader-latin-wght-italic.woff2", "italic")
        ]
      }
    },
    {
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.local(),
      fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", ...CJK_SANS, "monospace"],
      unicodeRange: /** @type {[string, ...string[]]} */ (LATIN_RANGE),
      options: {
        variants: [variant("jetbrains-mono-latin-wght-normal.woff2")]
      }
    }
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkHexoTags, remarkMath],
      // Astro parses raw HTML last; do it first so `<img>` / `<div>` written in posts get the same treatment.
      rehypePlugins: [rehypeRaw, rehypeHeadingAnchors, rehypeResponsiveImages, rehypeLinks, rehypeTables],
      smartypants: true,
      gfm: true
    })
  },
  integrations: [
    expressiveCode({
      themes: ["vitesse-light", "vitesse-dark"],
      themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
      useDarkModeMediaQuery: true,
      // Inline the block styles into each page: an external ec.css is render-blocking, and GitHub
      // Pages caches /_astro/ for only ten minutes, so the shared file rarely saves a request.
      emitExternalStylesheet: false,
      plugins: [pluginLineNumbers()],
      // Fence labels pasted from other editors; Shiki's language ids are lowercase.
      shiki: { langAlias: { Plain: "txt", HTML: "html" } },
      defaultProps: {
        showLineNumbers: false,
        wrap: true,
        overridesByLang: {
          "bash,sh,shell,zsh,console": { frame: "terminal" }
        }
      },
      styleOverrides: {
        borderRadius: "4px",
        borderColor: "var(--rule)",
        codeFontFamily: "var(--font-mono-stack)",
        uiFontFamily: "var(--font-mono-stack)",
        codeFontSize: "0.8125rem",
        codeLineHeight: "1.65",
        frames: {
          shadowColor: "transparent",
          editorActiveTabIndicatorTopColor: "var(--accent)",
          frameBoxShadowCssValue: "none"
        }
      }
    })
  ]
});
