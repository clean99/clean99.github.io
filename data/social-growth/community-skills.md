# Community Skills Installed for X Growth

Last updated: 2026-05-19

## Installed

### `social-writer`

- Source: `itechmeat/llm-code`, path `skills/social-writer`
- Local path: `.agents/skills/social-writer`
- Use: X hook/thread/style reference, AI-writing avoidance, technical-blog-to-X critique.
- Boundary: advisory only. It cannot publish, schedule, call APIs, or write public actions.

Why it is useful here: it has concrete X post/thread references, an AI-writing avoidance checklist, hook references, and technical style notes. That directly addresses the current failure mode: posts sounding like generic AI summaries.

### `twitter-algorithm-optimizer`

- Source: `composiohq/awesome-claude-skills`, path `twitter-algorithm-optimizer`
- Local path: `.agents/skills/twitter-algorithm-optimizer`
- Use: algorithmic critique for Real-graph, SimClusters, TwHIN, Tweepcred, early engagement, and negative feedback hypotheses.
- Boundary: advisory only. It cannot publish, schedule, call X APIs, or overwrite `queue.json`.

Why it is useful here: it gives a second review lens for whether a draft has follower fit, niche fit, topic identity, and measurable engagement triggers before we spend a publish slot.

### `agent-browser`

- Source: `vercel-labs/agent-browser`, path `skills/agent-browser`
- Local path: `$HOME/.codex/skills/agent-browser`
- Use: optional browser-diagnostics fallback for CDP/accessibility snapshots after Codex restart and after the `agent-browser` CLI is actually installed.
- Boundary: not part of the X publishing path yet. The current project Chrome/CDP scripts remain authoritative for X prep, metrics capture, login recovery, and confirmation stops.

Why it is useful here: it is a mature open-source browser automation skill with Chrome/CDP support and persistent sessions. It may help diagnose login/profile/browser state if the existing Chrome plugin or project CDP scripts are insufficient.

Current blocker: this environment does not have `npm`/`npx`, so the skill is installed as a reference only. Do not call `agent-browser` until the CLI exists.

### `playwright`

- Source: `openai/skills`, path `skills/.curated/playwright`
- Local path: `$HOME/.codex/skills/playwright`
- Use: optional local browser QA and read-only diagnostics through `playwright-cli` when `npx` exists.
- Boundary: not part of the X publishing path. It must not publish, upload media, reply, like, repost, follow, or edit profile.

Why it is useful here: it gives a standard fallback workflow for real-browser snapshots, screenshots, and form diagnostics if local browser QA is needed outside X account actions.

Current blocker: the wrapper requires `npx`, which is absent in this environment.

## Installed Globally

These skills are installed under `$HOME/.codex/skills/` and are available as advisory layers for this project. They are not copied into `.agents/skills/` because the global install is already active in Codex.

### `x-twitter-growth`

- Local path: `$HOME/.codex/skills/x-twitter-growth`
- Use: X-specific profile audits, thread strategy, reply strategy, competitor research prompts, posting cadence checks, and algorithm signal reminders.
- Boundary: advisory only. Its composer and Python scripts are scaffolds, not the publishing controller. Final Chinese copy still goes through `x-technical-sharing`, `humanizer-zh`, and the local quality gate.

Why it is useful here: it gives an outside X-native operating model for a small account: profile promise, pinned post, replies as distribution, no links in the primary post, and cadence pressure.

### `social-media-analyzer`

- Local path: `$HOME/.codex/skills/social-media-analyzer`
- Use: compare exported X metrics, calculate engagement-rate style summaries, rank top and bottom posts, and sanity-check post variant performance.
- Boundary: use formulas and interpretation only. The canonical data source remains `data/social-growth/ledger.json`, `data/social-growth/posts.local.json`, and the local metrics/funnel/recommendation commands.

Why it is useful here: it reinforces the measurement loop: impressions/views are not enough; engagement rate, CTR/profile-click proxies, saves/bookmarks, and follower conversion decide whether a post actually created influence.

### `writing-voice`

- Local path: `$HOME/.codex/skills/writing-voice`
- Use: remove press-release tone, stilted AI phrasing, over-structured sections, vague superlatives, and fake specificity.
- Boundary: English-oriented voice reference. For final Chinese X copy, `humanizer-zh` remains the stricter pass.

Why it is useful here: it names the exact failure mode the user flagged: the post sounds generated even when it is technically correct.

### `social-media`

- Local path: `$HOME/.codex/skills/social-media`
- Use: platform-native X brevity, one idea per post, no hype language, no hashtags by default, no generic CTA, and short thread pacing.
- Boundary: writing reference only. It must not replace the local browser confirmation boundary or queue/package format.

Why it is useful here: it keeps X copy from turning into a compressed blog abstract.

### `marketing-social`

- Source: `coreyhaines31/marketingskills`, path `skills/social`, installed as `marketing-social` to avoid colliding with the existing `social` skill name.
- Local path: `$HOME/.codex/skills/marketing-social`
- Use: content pillars, blog-to-social repurposing angles, calendar shape, reverse-engineering prompts, and broad engagement strategy.
- Boundary: strategy input only. Ignore scheduling/direct automation advice that would bypass this repository's queue, metrics, and Chrome confirmation checklist.

Why it is useful here: it broadens the local system beyond one-off posts. It gives a reusable way to turn each technical article into multiple X-native angles while preserving the local metrics loop.

### `x-article-editor`

- Local path: `$HOME/.codex/skills/x-article-editor`
- Use: audit X Article title, opening, skimmability, argument flow, and cover-image concept before applying a copy override.
- Boundary: advisory only. Its final copy is not publishable until it passes `x-technical-sharing`, `humanizer-zh`, and the local quality gate.

### `x-trends`

- Local path: `$HOME/.codex/skills/x-trends`
- Use: public, no-login trend checks before queue expansion or timing decisions.
- Boundary: use trend signals as topic intelligence only; do not trend-jack generic topics or perform X account actions.

### `last30days`

- Local path: `$HOME/.codex/skills/last30days`
- Use: weekly topic intelligence from recent public discussion, objections, and proof points.
- Boundary: read-only research. Do not use optional X cookies or any publish/interaction path from the skill.

### `tweet-writer`

- Local path: `$HOME/.codex/skills/tweet-writer`
- Use: outside hook and thread critique.
- Boundary: reject generic viral formulas, clickbait, and English Twitter defaults before the local Chinese quality gate.

### `de-ai-ify`

- Local path: `$HOME/.codex/skills/de-ai-ify`
- Use: extra cleanup pass when copy still sounds translated, corporate, or generated.
- Boundary: for Chinese copy, `humanizer-zh` remains the stricter final authority.

### `product-marketing`

- Local path: `$HOME/.codex/skills/product-marketing`
- Use: maintain `.agents/product-marketing.md` as the shared positioning file for Clean993.
- Boundary: account positioning only; do not scatter profile promise or target-reader rules across individual queue items.

### `copy-editing`

- Local path: `$HOME/.codex/skills/copy-editing`
- Use: focused critique pass for short posts, X Articles, image headlines, and profile copy.
- Boundary: preserve the technical claim; cut vagueness, filler, and weak CTAs.

### `blog-writing-guide`

- Local path: `$HOME/.codex/skills/blog-writing-guide`
- Use: technical-writing quality bar for specificity, senior-engineer usefulness, and banned AI/corporate wording.
- Boundary: ignore Sentry-specific brand voice where it conflicts with Clean993.

### `prompt-optimizer`

- Local path: `$HOME/.codex/skills/prompt-optimizer`
- Use: improve reusable prompts for image generation, copy override, browser handoff, and automation runs.
- Boundary: keep prompt contracts explicit and eval-driven; do not loosen public-action boundaries.

### `community-marketing`

- Local path: `$HOME/.codex/skills/community-marketing`
- Use: relationship-loop and non-spam engagement strategy.
- Boundary: translate recommendations into small manual engagement targets and local metrics; no mass replies, DMs, follows, or account actions.

## Rejected for This System

- Twitter/X API automation skills: conflicts with the explicit no-X-API constraint.
- Cookie/GraphQL X automation skills such as `bird`: conflicts with the browser-only publishing constraint even when they are not official X API.
- Typefully or scheduler skills: creates a third-party publishing path outside the browser confirmation boundary.
- Generic automation skills that can like, follow, repost, or reply directly: too much public-action risk for the Clean993 account.

## Invocation Order

1. `x-growth-publishing` remains the controller.
2. `x-technical-sharing` produces X-native Chinese technical copy.
3. `x-twitter-growth`, `marketing-social`, and `social-media` provide outside X/content-strategy critique.
4. `social-writer` audits hook shape, thread pacing, and AI-writing patterns.
5. `twitter-algorithm-optimizer` audits algorithmic reach hypotheses.
6. `social-media-analyzer` helps interpret exported metrics after publication.
7. `writing-voice`, `de-ai-ify`, and `humanizer-zh` remove stiff phrasing and template residue.
8. `agent-browser` / `playwright` may help only with browser diagnostics after their CLIs are available.
9. Local quality gate, image readiness, browser readiness, public-action checklist, and action-time confirmation decide whether the package is eligible.

## Security Audit Notes

- `x-twitter-growth`: includes Python scripts for profile auditing, competitor analysis, content planning, tweet composing, and local growth tracking. The scripts are local CLIs; they do not publish to X or use X API credentials. One script writes under its own `.growth-data` folder, so keep it advisory and do not use it as the project ledger.
- `social-media-analyzer`: includes local Python scripts for metric calculations and benchmark analysis. No X publishing, browser automation, cookie access, or account actions were found.
- `writing-voice` and `social-media`: instruction-only skills. No scripts or public-action tools were bundled.
- `marketing-social`: instruction/reference-only skill. Its references mention external scraping/scheduling tools as generic strategy ideas; those are not allowed for this project unless separately approved and still cannot bypass the browser confirmation boundary.
- `agent-browser`: installed skill contains only `SKILL.md`. It asks for restricted Bash commands (`agent-browser:*`, `npx agent-browser:*`) and points to a separate CLI install. No bundled scripts, symlinks, lifecycle hooks, or secret reads were present in the installed skill directory.
- `playwright`: installed skill includes one wrapper script, `scripts/playwright_cli.sh`. The wrapper exits when `npx` is missing, then runs `npx --yes --package @playwright/cli playwright-cli "$@"`; no secret reads, config writes, symlinks, lifecycle hooks, or arbitrary project writes were found.
- `uv` is not installed, so the `skill-scanner` automated scanner could not be run. This note records the manual fallback audit.
