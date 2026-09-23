# ADR 0005: Astro Static Rebuild

Date: 2026-09-23

Status: Accepted

Supersedes: [ADR 0001](0001-liquid-glass-nextjs-monorepo.md), [ADR 0002](0002-refractive-component-library.md), [ADR 0003](0003-static-export-and-github-pages.md), [ADR 0004](0004-testing-and-visual-regression.md)

## Context

The site began as a Hexo blog with EJS templates and global CSS, publishing to the
`master` branch from `dev`. ADRs 0001-0004 planned a different destination: a pnpm
monorepo with a Next.js bilingual blog, a Storybook component library, and a
hand-built refractive "liquid glass" component system.

That plan was abandoned before it shipped. The monorepo (`apps/blog`, `apps/docs`,
`packages/liquid-glass`) and its CI were deleted. What remains to migrate is the
content and the contract the published site has with the outside world:

- **63 posts**, 31 of them bilingual pairs, in `content/posts` as Markdown with YAML
  frontmatter carried over from Hexo.
- **A URL contract that cannot break.** The Hexo site published `/YYYY/MM/DD/<TITLE>/`
  for English and `/zh/YYYY/MM/DD/<key>/` for Chinese. Every one of those URLs has been
  linked, indexed, and possibly bookmarked for years. A migration that changes any of
  them silently breaks inbound links and search rankings.
- **A performance and SEO bar set by the content being read.** The site is a frontend
  engineer's portfolio: Core Web Vitals, accessibility, and AI-crawler legibility are
  themselves part of what it demonstrates.

The prior ADRs also accumulated decisions that no longer apply: a refractive component
library, Storybook-based visual regression, and a Next.js static export. Keeping them
as "Accepted" would mislead anyone reading the ADR log about what the codebase is.

## Decision

Rebuild the blog as a single Astro 7 static site. One framework, one package, no
workspace, no component library to maintain.

The site is prerendered in full — `output` stays at Astro's default `static`, every
page is HTML on disk, and there is no runtime server, no client-side router, and no
hydration framework. Interactivity is limited to a few small vanilla `<script>` blocks
(theme toggle, search dialog, filters), each of which Astro bundles and type-checks.

### Bilingual routing

`LANGS = ["en", "zh"]` with `en` as the default. English pages live at the site root;
Chinese pages are mirrored under `/zh/`. One shared component renders each page type
(`HomePage.astro`, `PostLayout.astro`, …) and the two route files under
`src/pages/` and `src/pages/zh/` are thin wrappers that pass a `Lang`. All
user-visible strings come from `src/lib/i18n.ts` or a page-local
`src/lib/copy/<page>.ts`, never from inline literals in markup.

`trailingSlash: "always"` and `build.format: "directory"` match how GitHub Pages—
and the Hexo site before it—resolved a directory to its `index.html`, so
`/writing/` and `/writing` both keep working exactly as they did.

### Legacy URL preservation

`postUrl()` in `src/lib/posts.ts` encodes the Hexo permalink contract directly:

- `en` → `/YYYY/MM/DD/<file-stem>/`, e.g. `/2026/06/19/Designing-an-Operations-Heartbeat-System/`
- `zh` → an explicit `permalink` in frontmatter when present, else `/zh/YYYY/MM/DD/<i18n_key>/`

A post's `i18n_key` ties the two halves of a pair together; `translationKey()` falls
back to the file stem with a trailing `-zh` stripped, so an unpaired post still gets a
stable key.

Dates are authored as naive wall-clock times (`2026-06-19 12:00:00`) and stored as UTC
instants whose UTC fields equal the authored fields, so a URL's date segment never
depends on the timezone of the machine running the build.

`scripts/check-legacy-urls.mjs` walks the full historical URL list in
`tests/fixtures/legacy-urls.txt` against a fresh build, using GitHub Pages' own
resolution rules (case-sensitive paths, `/foo/` → `foo/index.html`, `404.html`
fallback). It exits non-zero on any unreachable URL, and CI runs it after every build,
so a broken link fails the deploy instead of reaching a reader.

### Zero third-party scripts, local fonts

No analytics, no tag manager, no CDN, no embedded widget. Every byte the browser
executes is either bundled by Astro or unavailable—which is what makes a 100
Lighthouse performance score on a content-heavy page reachable at all.

Fonts are self-hosted and declared through Astro's `fontProviders.local()`: Fraunces
(display), Newsreader (body), JetBrains Mono (code), variable WOFF2, subset to a Latin
`unicode-range` with an explicit CJK fallback stack per family. A font is never
fetched from a third-party origin, and a Han glyph never falls through to a system
default mid-paragraph.

### Image pipeline

`scripts/build-images.mjs` walks `content/img`, copies every original byte-for-byte so
legacy `/img/...` URLs keep resolving, and encodes AVIF and WebP width variants
(360/720/1080/1440 plus the original width) beside each raster source. Encoded
variants are cached by a hash of the source bytes plus every option that affects the
output, under `.cache/images`, so a rerun—and CI's restored cache—only pays encoding
time for images that actually changed.

The result is written to `src/data/image-manifest.json`, keyed by the path an author
wrote in Markdown. A rehype plugin (`rehype-responsive-images.ts`) looks each `<img>`
up in that manifest and rewrites it into a `<picture>` with `srcset`/`sizes`. An author
writes `![alt](/img/foo/bar.png)`; the build emits responsive AVIF/WebP.

### OG generation

`src/lib/og.ts` renders every social card at build time as a PNG endpoint
(`src/pages/og/[...file].png.ts`): one per published post plus one per language. Cards
are composed with satori and rasterised with resvg, using the same local faces as the
site.

Card _layout_ is decided by pure functions rather than by rendering: `ogTitleSize()`
picks the largest size on a ladder whose wrapped title fits both a line cap and a
computed vertical budget, and `fitCard()` then fits the standfirst into the space the
title leaves, clamping it by wrapped lines (not characters) and dropping it entirely if
even one line would collide with the footer rule. All of it is unit-tested against the
real post collection, so no post can produce an overflowing card.

### Search

Pagefind indexes the built HTML as the final build step (`pagefind --site dist`),
giving a static full-text search with no service and no index shipped to the browser up
front. The search dialog fetches the index only when a reader opens it.

### Testing strategy

Three layers, each testing something the layer below cannot:

- **Unit** (`vitest`, `tests/unit/`) — pure functions: URL construction, the OG
  layout model, i18n, taxonomy, markdown transforms, image manifest readers.
- **Tooling** (`node --test`, `test/*.test.mjs`) — the Node scripts the build depends
  on: ICO packing, image variant planning, the AI-Lab catalog, the post scaffolder.
- **End-to-end** (`@playwright/test`, `tests/e2e/`) — a real browser against a real
  build, served by `scripts/serve-static.mjs`, which imitates GitHub Pages' resolution
  rules so trailing slashes and the 404 fallback are exercised rather than assumed.
  Includes an axe-core accessibility scan.

There are no visual-regression snapshot tests: they were part of the abandoned
component-library plan (ADR 0004), and pixel snapshots of a content site cost more to
maintain than the regressions they catch. Design changes are reviewed by looking at
screenshots, not by diffing them in CI.

`pnpm verify` runs the whole chain in order: lint, type-check, unit tests, build,
legacy-URL check, end-to-end tests.

### Deployment

`.github/workflows/deploy.yml` runs on a push to `dev` (and on manual dispatch): lint,
`astro check`, tests, build, legacy-URL check, then Playwright against the built
output. The build is uploaded as an artifact, published to `master` with
`peaceiris/actions-gh-pages`, and Lighthouse CI runs as a separate non-blocking job.

## Consequences

**What this buys.** One package and one toolchain, so a dependency bump or a config
change has exactly one place to land. A full prerender, so every page is fast and
crawlable without a hydration budget to reason about. Self-hosted fonts and zero
third-party scripts, which is what the performance and privacy story rests on. And a
legacy-URL check wired into CI, so the migration's central risk—breaking an old
link—is now a build failure rather than a discovery made months later.

**What it costs.** Astro's own idioms must be followed rather than a familiar
component model: logic lives in `src/lib` as pure functions and markup in `.astro`
files, and there is no client-side state library to reach for. Bilingual routing is
hand-rolled, so a new page type means writing both a route file and its `zh/` twin.
The image and OG pipelines are bespoke and must be maintained; a wider static-site
toolchain would have given parts of this for free, at the cost of the control that
makes the scores what they are.

**What was given up.** The refractive component library and its Storybook
documentation (ADRs 0001-0002) are gone, along with the visual-regression suite and
the Next.js static-export route (ADRs 0003-0004). The design system is now CSS custom
properties in `src/styles/tokens.css` with utility classes in `global.css`, not a
published component package. If a component library is ever wanted again, it should be
a new ADR rather than a revival of these.

**Open.** Lighthouse's mobile preset does not yet pass the desktop preset's thresholds
(see the deploy workflow): the header's search button has no accessible name, its
language switch's `aria-label` disagrees with the visible text, and the hero lede
shifts on load. These are fixable and tracked; the desktop preset is blocking today.
