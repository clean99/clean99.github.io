# clean99.github.io

Koh Hom (Xu Feng), a frontend engineer. Bilingual personal site: engineering
case studies, long-form technical notes, and a project index. English at the root,
Chinese under `/zh/`.

Static HTML, no server, no analytics, no third-party scripts.

## Stack

| Piece                                          | What it does                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Astro](https://astro.build) 7                 | Prerenders every page; `output: static`                                                             |
| Markdown + rehype/remark                       | Post pipeline (`src/markdown/`): headings, links, tables, responsive images, Hexo tag compatibility |
| [Expressive Code](https://expressive-code.com) | Code blocks, with line numbers and a terminal frame for shell                                       |
| Pagefind                                       | Static full-text search over the built HTML                                                         |
| satori + resvg                                 | Build-time OG cards (`src/lib/og.ts`)                                                               |
| sharp                                          | AVIF/WebP width variants for content images                                                         |
| Fontsource variable faces                      | Self-hosted Fraunces, Newsreader, JetBrains Mono                                                    |
| Vitest / node:test / Playwright                | Unit, tooling, and end-to-end tests                                                                 |

Design system "Ink & Seal": tokens in `src/styles/tokens.css`, utilities (`.wrap`,
`.label`, `.eyebrow`, `.section-head`, `.arrow-link`, `.chip`, `.visually-hidden`) in
`src/styles/global.css`.

## Commands

Run every command from the repository root. Node >= 22.12 (see `.nvmrc`), pnpm 11.5.2.

| Command            | Does                                                         |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | Image/vendor assets, then the dev server                     |
| `pnpm build`       | Assets, `astro build`, then Pagefind → `dist/`               |
| `pnpm preview`     | Serve `dist/` with Astro's preview server                    |
| `pnpm check`       | `astro check` — types across `.astro` and `.ts`              |
| `pnpm lint`        | ESLint, Prettier `--check`, and the social-growth lint       |
| `pnpm format`      | Prettier `--write`                                           |
| `pnpm test`        | Unit tests, then the tooling tests                           |
| `pnpm test:unit`   | Vitest only                                                  |
| `pnpm test:tools`  | `node --test test/*.test.mjs` only                           |
| `pnpm test:e2e`    | Playwright against a build                                   |
| `pnpm test:urls`   | Every historical URL still resolves in `dist/`               |
| `pnpm verify`      | Lint → check → test → build → test:urls → test:e2e           |
| `pnpm lhci`        | Lighthouse CI, desktop preset                                |
| `pnpm lhci:mobile` | Lighthouse CI, mobile preset                                 |
| `pnpm new:post`    | Scaffold a post (see below)                                  |
| `pnpm icons`       | Regenerate `public/favicon.ico`, icons, and the web manifest |
| `pnpm assets`      | Regenerate content image variants and vendored files         |

`pnpm verify` is the gate: if it passes locally, CI's verify job passes.

`test:e2e` and `test:urls` need a build first (`pnpm build`). Playwright's browser
comes from `pnpm exec playwright install chromium`; set `E2E_CHANNEL=chrome` to use an
installed Chrome instead.

## Writing a post

A post is one Markdown file in `content/posts/`. The file's name **is** its URL
segment, so it is part of the public contract — see _Legacy URLs_ below.

### Scaffold one

```sh
pnpm new:post --title "Designing an Operations Heartbeat System" \
  --area engineering --tags "Software Engineering, reliability"

pnpm new:post --title "My English Title" --title-zh "我的中文标题" --pair
```

| Flag           | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `--title`      | Post title (required)                                                            |
| `--lang`       | `en` or `zh` (default `en`)                                                      |
| `--title-zh`   | Chinese title; required with `--pair` (defaults to the English title)            |
| `--slug`       | File stem / URL key (default: derived from the title)                            |
| `--area`       | `engineering`, `ai`, `systems`, `mind`, `life` (default: inferred from the tags) |
| `--tags`       | Comma-separated; repeatable                                                      |
| `--case-study` | Add an empty `case_study:` block                                                 |
| `--pair`       | Also write the `zh` half, sharing one `i18n_key`                                 |

It writes into `content/posts/` with today's date in Asia/Shanghai, refuses to
overwrite an existing file, and prints the URL each half will be served at.

### Frontmatter

```yaml
---
title: "Designing an Operations Heartbeat System"
date: 2026-06-19 12:00:00 # naive wall-clock, Asia/Shanghai
tags: [Software Engineering, reliability]
area: engineering
summary: "One or two sentences. Becomes the meta description and the list blurb."
featured: true
audience: [public, interviewers]
lang: en
i18n_key: Designing-an-Operations-Heartbeat-System
---
```

| Field         | Required | Notes                                                                            |
| ------------- | -------- | -------------------------------------------------------------------------------- |
| `title`       | yes      | Rendered as the page `h1`; do not repeat it as `# ` in the body                  |
| `date`        | yes      | `YYYY-MM-DD HH:MM:SS`, authored in Asia/Shanghai. The date part becomes the URL  |
| `lang`        | no       | `en` (default) or `zh`                                                           |
| `tags`        | no       | List or comma-separated string. Drives tag pages and the `area` fallback         |
| `area`        | no       | One of `engineering`, `ai`, `systems`, `mind`, `life`; inferred when omitted     |
| `summary`     | no       | Falls back to `description`, then the first paragraph. Keep it under ~200 chars  |
| `description` | no       | `<meta name="description">`; derived from the summary when omitted               |
| `featured`    | no       | Surfaces the post on the home page                                               |
| `audience`    | no       | Free-form labels such as `public`, `interviewers`                                |
| `i18n_key`    | no       | Links the two halves of a pair. Defaults to the file stem minus a trailing `-zh` |
| `permalink`   | zh only  | Explicit URL. Defaults to `zh/YYYY/MM/DD/<i18n_key>/` (no leading slash)         |
| `draft`       | no       | `true` keeps the post out of the build and the feeds                             |
| `case_study`  | no       | See below                                                                        |

`case_study` renders a fact box on the post and marks it in lists:

```yaml
case_study:
  role: Frontend engineer
  period: 2024-2025
  team: 8 engineers
  stack: [React, TypeScript, Node]
  impact:
    - Cut p95 time-to-interactive from 4.1s to 1.6s
  links:
    - label: Design doc
      url: https://example.com/doc
```

### Images

Put the file under `content/img/<topic>/` and reference it by its public path:

```md
![The final target state platform](/img/hcm-heartbeat-design/v13-final-target.png)
```

`pnpm build` (and `pnpm dev`) run the image pipeline, which copies the original into
`public/img/` — so legacy `/img/...` URLs keep resolving — and encodes AVIF and WebP
variants at 360/720/1080/1440px beside it. A rehype plugin rewrites the `<img>` into a
`<picture>` with `srcset`/`sizes`, so writing plain Markdown is all that is needed.

Encoding is cached under `.cache/images` by a hash of the source bytes and the encoder
options, so only changed images are re-encoded.

Prefer PNG or JPEG for screenshots and diagrams; GIF is copied through untouched to
preserve animation, and SVG is passed through as-is.

### Chinese posts

A Chinese post is a sibling file with a `-zh` suffix and `lang: zh`. Both halves share
one `i18n_key`, which is what links them (the language switch and the `hreflang`
alternates follow it):

```
content/posts/Designing-an-Operations-Heartbeat-System.md      # en
content/posts/Designing-an-Operations-Heartbeat-System-zh.md   # zh
```

The `zh` half gets an explicit `permalink` because its URL is not derivable from the
file stem:

```yaml
lang: zh
i18n_key: Designing-an-Operations-Heartbeat-System
permalink: zh/2026/06/19/Designing-an-Operations-Heartbeat-System/
```

`pnpm new:post --pair` writes both files with matching keys and dates.

## Legacy URLs

The URL contract predates this codebase and does not change:

- English: `/YYYY/MM/DD/<file-stem>/`
- Chinese: `zh/YYYY/MM/DD/<i18n_key>/`

Renaming a file changes a published URL. `pnpm test:urls` checks every URL the site
has ever served — the list lives in `tests/fixtures/legacy-urls.txt` — against a fresh
build, and CI runs it before deploying. If you must move a post, add a redirect stub
rather than leaving the old path to 404.

Dates are stored so their UTC fields equal the authored wall-clock fields, which is why
a URL's date segment is the same whatever timezone the build machine runs in.

## Deploy

Push to `dev` (or run the workflow manually). `.github/workflows/deploy.yml`:

1. **verify** — install, lint, `astro check`, unit + tooling tests, build, legacy-URL
   check, Playwright against the build. The built `dist/` is uploaded as an artifact.
2. **lighthouse** — Lighthouse CI (desktop, then mobile) against that artifact,
   uploading to temporary public storage. Non-blocking.
3. **deploy** — publishes `dist/` to the `master` branch with
   `peaceiris/actions-gh-pages`. `master` holds generated HTML only; `dev` is the
   source branch. `public/.nojekyll` is part of the build so GitHub Pages serves the
   `_astro/` asset directory.

A separate workflow (`update-ai-coding-lab.yml`) refreshes
`content/ai-coding-lab/catalog.json` on a schedule from the `codex-setup` repository,
when the `CODEX_SETUP_TOKEN` secret is configured.

## Layout

```
content/posts/        posts (Markdown, the URL contract)
content/pages/        about, links (en + zh)
content/img/          post images, source of the variant pipeline
content/ai-coding-lab/ generated skills catalog
src/pages/            routes; en at the root, zh under zh/
src/components/       .astro components, one per page type
src/layouts/          BaseLayout (head, nav, footer), PostLayout
src/lib/              pure logic: posts, dates, i18n, og, seo, feed, sitemap, taxonomy
src/markdown/         remark/rehype plugins
src/styles/           tokens.css, global.css
scripts/              build steps: images, icons, vendor, serve-static, new-post
tools/                social-growth and ai-coding-lab tooling (not part of the build)
tests/unit/           vitest
test/                 node:test for the scripts
tests/e2e/            Playwright specs
docs/adr/             architecture decisions; 0005 describes this rebuild
```

Business logic belongs in `src/lib/` as pure functions with a unit test; a page is a
thin route file plus a shared component. See `docs/adr/0005-astro-static-rebuild.md`
for why the site is built this way.
