---
name: x-growth-publishing
description: Use this skill whenever the user wants to distribute blog posts on X, grow the Clean993 X account, create Chinese X posts/articles from blog content, generate X images, track follower growth, or optimize X content performance. This skill is the default workflow for Chinese-audience X growth from the Hexo blog, even if the user says only "发推", "发 X", "推广文章", "涨粉", or "分发博客".
---

# X Growth Publishing

Use this skill to turn blog posts into a repeatable Chinese-audience X growth loop for `@Clean993`.

The system goal is one-week follower growth, currently `+1000 followers` from the baseline recorded in `data/social-growth/ledger.json`.

Before writing copy, read `references/chinese-x-style.md` when the user asks to improve Chinese X style, mentions Chinese creators, or asks why a post is not attractive.
Before optimizing metrics, queue selection, engagement, or follow conversion, read `references/x-recommendation-system.md`. It translates the public X recommender architecture into Clean993's measurable funnel: candidate entry, hydration, multi-action prediction, negative feedback, author diversity, profile handoff, and winner scaling.

## Hard Boundaries

- Public X actions require action-time confirmation in Chrome:
  - publish a post;
  - publish an X Article;
  - upload an image;
  - reply, like, repost, follow, or edit public content.
- Do not mass-reply, mass-like, follow/unfollow, or post generic engagement bait.
- Do not paste long blog URLs into the first short post. The short post should sell the idea. The X Article carries the substance. The blog link belongs at the end of the X Article.
- Default audience is Chinese technical readers unless the user explicitly asks for English.

## Reusable Skills

- Use `x-technical-sharing` as the writing layer when turning technical sharing docs, design notes, performance write-ups, or blog posts into X-native Chinese copy. It preserves the `technical-sharing-doc` causality chain but outputs short post, X Article, image prompt, fallback thread, and follow-up replies for the copy override bridge.
- Use the installed community `humanizer-zh` skill as the final Chinese cleanup pass before applying a copy override. It is stricter than the English `humanizer` for this workflow: remove negative reframing, inflated phrases, generic transitions, and template handoff lines that make the post feel machine-written.
- Use the installed community `marketing-psychology` skill to audit the first-screen hook and image headline. The hook must expose a concrete reader loss, false belief, status gain, or decision pressure; if it only sounds clever, rewrite it.
- Use the installed community `marketing-ideas` skill only when the queue needs new growth experiments, topic angles, or distribution tactics beyond the current X Article/image/thread package. Translate ideas into local queue/metric experiments; do not turn it into automatic public action.
- Use the installed community `niche-research` skill for weekly topic intelligence when the backlog needs fresh events, debates, or source links. Treat it as read-only research: browsing, search, and source capture are allowed; replies, likes, reposts, follows, profile edits, and publishing still require the local confirmation boundary.
- Use the installed community `content-matrix` skill only as an ideation grid for queue expansion. It is LinkedIn-oriented, so convert its output into X-native Chinese technical angles before adding queue items; do not paste its raw post ideas directly into publish packages.
- Use the installed community `hook-generator` skill as a hook sparring partner, not a final writer. Reject clickbait, inflated contrast, and `不是 X，而是 Y` patterns; every hook still must pass `x-technical-sharing`, `humanizer-zh`, and the local quality gate before publishing.
- Use `humanizer` as a final style cleanup pass when copy feels AI-written. Its most relevant rule for this workflow is to remove negative parallelism such as `不是 X，而是 Y`, inflated words, and template handoff lines. If that skill is not loaded in the current session, apply the same rule manually.
- Use the community `x-writing` skill as a style reference, not as the publishing controller. Its useful parts are first-line hook discipline, one-sentence-per-line X formatting, specificity checks, and `references/anti-patterns.md`. Keep our Chinese technical constraints, image-first packaging, thread fallback, metrics ledger, and browser confirmation boundary as the source of truth.
- Use the installed community `x-mastery-mentor` skill as a Chinese X growth and review reference when diagnosing hooks, topic selection, profile positioning, or account-stage tactics. It is not the publishing controller: do not follow its checkpoint/confirmation rules when they conflict with this skill's local automation, browser metrics, and public-action boundary.
- Use the installed community `social-writer` skill as an open-source writing reference for X hooks, threads, technical styles, and AI-writing avoidance. Treat it as a critique layer only: apply the useful X-native constraints, then pass the result through `x-technical-sharing`, `humanizer-zh`, and the local quality gate. Do not use its platform integrations or generic English growth-copy defaults.
- Use the installed community `twitter-algorithm-optimizer` skill as an algorithmic audit layer for draft reach hypotheses: Real-graph follower fit, SimClusters niche fit, TwHIN topic identity, Tweepcred, early engagement, and negative feedback risk. Cross-check its recommendations against `references/x-recommendation-system.md` and local ledger metrics before changing the queue.
- Use the installed community `x-algo-pipeline`, `x-algo-engagement`, `x-algo-scoring`, `x-algo-ml`, and `x-algo-filters` skills as low-level reference notes for X's public recommender architecture. Use them to sharpen local metrics, hypotheses, and draft audits; they do not replace `references/x-recommendation-system.md`, and they never authorize browser publishing or interaction.
- Use the installed community `last30days` skill for weekly topic intelligence when the backlog needs recent audience language, objections, or proof from Reddit, X, YouTube, TikTok, Hacker News, GitHub, and the broader web. Treat it as read-only research; do not use optional X cookies or any publish/interaction path from it.
- Use the installed community `x-trends` skill for fast public trend checks before queue expansion or timing decisions. It uses public aggregators and no X login. Convert trends into local hypotheses, not generic trend-jacking posts.
- Use the installed community `x-article-editor` skill as an X Article audit layer for title, hook, skimmability, natural voice, and cover-image suggestions. Its output is not final copy until it passes `x-technical-sharing`, `humanizer-zh`, and the local quality gate.
- Use the installed community `tweet-writer` skill as an outside X hook/thread sparring partner. Reject viral-formula output that drifts into clickbait, generic creator advice, inflated contrast, or English Twitter defaults.
- Use the installed community `x-algorithm` skill only as a secondary checklist for no-link main posts, early-reply windows, media use, and negative-feedback risk. The local `references/x-recommendation-system.md` remains the source of truth for this project.
- Use the installed community `de-ai-ify` skill as an extra cleanup pass when a draft still sounds translated, corporate, or generated. For Chinese final copy, `humanizer-zh` remains stricter and authoritative.
- Use the installed community `product-marketing` skill to maintain `.agents/product-marketing.md` as the shared positioning file for Clean993. Update it when the account promise, target reader, proof, or CTA changes; do not scatter positioning rules across individual publish packages.
- Use the installed community `copy-editing` skill as a focused final critique pass for short posts, X Articles, and profile copy. Keep the core technical claim unchanged; use it to remove vagueness, sharpen the CTA, and cut marketing filler before `humanizer-zh`.
- Use the installed community `blog-writing-guide` skill only as a technical-writing quality bar: senior-engineer usefulness, specificity, and banned corporate/AI language. Ignore its Sentry brand voice where it conflicts with Clean993.
- Use the installed community `prompt-optimizer` skill when improving reusable prompts for image generation, copy overrides, browser handoff instructions, or automation prompts. Keep the prompt contract explicit and eval-driven; do not use it to loosen public-action boundaries.
- Use the installed community `skill-scanner` skill before adopting additional open-source skills. If its Python dependencies are unavailable, do a manual static audit for scripts, secret access, external network calls, prompt injection, and excessive permissions before installation or workflow integration.
- Use the imported `blacktwist/social-media-skills` package only as advisory support. The project override inside each `*-sms` skill disables BlackTwist, X API, third-party publishing APIs, and direct scheduling for this repository. Public X actions still belong to this skill's browser confirmation boundary.
- Use `hook-writer-sms`, `post-writer-sms`, and `thread-writer-sms` as outside critiques for opening lines, standalone post shape, and reply-chain pacing. Do not accept their generic English growth-copy defaults without passing the result through `x-technical-sharing`, `humanizer-zh`, and the local quality gate.
- Use `content-repurposer-sms` when turning one blog post into a short post, thread fallback, follow-up replies, and later derivative angles. Keep `queue.json`, package ids, image paths, and metric fields owned by the local CLI.
- Use `performance-analyzer-sms`, `audience-growth-tracker-sms`, `content-pattern-analyzer-sms`, and `optimization-advisor-sms` when interpreting local ledger snapshots and post metrics. They may propose hypotheses, but this skill owns which experiment enters the queue.
- Use `.agents/social-media-context-sms.md` as the shared voice/profile file for the imported `*-sms` skills. Update that file when the account positioning changes, not each individual skill.
- Use the community `social` skill for platform-native content calendars, repurposing angles, and engagement ideas. Treat it as strategy input only; this skill still owns queue ids, browser readiness, metrics capture, and public-action confirmation.
- Use the installed community `community-marketing` skill for relationship loops, advocate discovery, and non-spam engagement strategy. Translate its advice into small manual engagement targets and local metrics; do not use it for mass replies, DMs, follows, or account actions.
- Use the community `content-strategy` skill before queue expansion when the backlog needs topic pillars, audience jobs, or a searchable/shareable split.
- Use the community `analytics` skill when changing measurement names, UTM conventions, attribution fields, or funnel diagnostics. Keep `data/social-growth/ledger.json` as the canonical local data store.
- Use the community `copywriting` skill only for clarity, concrete value proposition, and CTA checks. Run `humanizer` / `x-writing` cleanup afterward so the result does not drift into generic marketing copy.
- Use the installed open-source `agent-browser` skill only as an optional browser-diagnostics fallback after Codex restart and after its CLI is actually installed. It can help with CDP/accessibility snapshots, but it must not replace the current project Chrome/CDP scripts for X publishing, metrics capture, or public-action confirmation.
- Use the installed OpenAI curated `playwright` skill only for local browser QA or read-only diagnostics when `npx` exists. This environment currently has no `npx`, so do not route the X publishing loop through Playwright until Node/npm tooling is available and explicitly verified.
- Use the built-in `imagegen` skill as the primary image path. It uses image 2 / `gpt-image-2` and does not require `OPENAI_API_KEY`. After generation, copy or register the selected PNG into the expected `output/imagegen/<queue-id>.png` path. If the generated file is under Codex's default generated-images directory, prefer `npm run social:ingest-imagegen -- --id <queue-id>` over manually hunting for the path.
- Use `baoyu-post-to-x` as the preferred Chrome/CDP helper for preparing X Articles, regular image posts, quote posts, or media posts when a scripted browser handoff is useful. Its scripts fill content in Chrome and leave the final public publish click to the user, which matches this skill's confirmation boundary.
- Use `baoyu-danger-x-to-markdown` only for consented research or competitor/content archiving. It uses a reverse-engineered X API and must not become the default publishing or metrics path.

## Workflow

For the normal daily loop, start with:

```bash
npm run social:automation -- --day today --slot 1
```

This safe automation cycle creates or refreshes `data/social-growth/queue.json`, exports the first publish packages under `data/social-growth/packages/`, writes `data/social-growth/posts.local.json` for metrics capture, writes `data/social-growth/daily-run.md`, writes `data/social-growth/weekly-plan.md` when the ledger exists, writes `data/social-growth/status.md`, writes `data/social-growth/publish-preflight.md`, writes `data/social-growth/profile-audit.md`, and writes `data/social-growth/automation-run.md`.
It also writes `data/social-growth/profile-update.md` when profile conversion needs a browser handoff for display name, bio, link, or pinned post.
It writes `data/social-growth/x-publish-prep.md` with `baoyu-post-to-x` commands that can prefill Chrome for the X Article and image-backed short post while preserving the final confirmation boundary.
It writes `data/social-growth/publish-confirmation.md` with the exact X Article, image-backed short post, follow-up replies, fallback thread, browser prep commands, and public-action stop points for action-time review.
It writes `data/social-growth/browser-readiness.md` as the browser probe handoff: selected package, expected account, Chrome/profile signals, extension/native-host status, X Article availability, media upload status, blockers, and next actions.
It also reads and updates `data/social-growth/browser-probe.local.json` when browser signals are provided, so recurring safe automation keeps the last known Chrome blocker instead of reverting to unknown.
It writes `data/social-growth/engagement-search.md` with read-only X search URLs for finding relevant technical threads.
It writes `data/social-growth/engagement-plan.md` from copied relevant thread opportunities when available; missing opportunities are a capture task, not an automation blocker.
It writes `data/social-growth/experiment-plan.md` to turn the current Algorithm Lens into concrete hypotheses, candidate queue ids, edit focus, success metrics, and stop conditions for the next publish package.
It writes `data/social-growth/daily-brief.md` as the single operator-facing action order across publish readiness, engagement, metrics, conversion funnel, and profile conversion.
It writes `data/social-growth/manual-publish-kits/day<N>-ready-slots.md` plus one kit per ready slot so a logged-in normal Chrome profile can continue confirmed publishing when the CDP publishing profile is blocked.

For day-level readiness across all publish slots, run:

```bash
npm run social:day-readiness -- --day today --out data/social-growth/day-readiness.md
```

This does not open Chrome. It summarizes each slot's image readiness, publish preflight, `baoyu-post-to-x` handoff status, blockers, and exact slot commands.

For the day-level operator runbook, run:

```bash
npm run social:daily-brief -- --day today --out data/social-growth/daily-brief.md
```

Use this before browser work. It combines publish readiness, read-only engagement search, reply-candidate status, metrics capture readiness, profile conversion, and a prioritized action order.

When the user says not to publish content yet, run the full dry-run instead:

```bash
npm run social:flow-dry-run -- --day today --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
```

This exercises the whole local flow without public actions: selected package, preflight, `baoyu-post-to-x` handoff, simulated publication URLs on `x.example.invalid`, metrics template, dry ledger snapshot, report, and recommendations. It must not open Chrome and must not write to the real `queue.json` or `ledger.json`.

When a separate writing skill will produce better copy, use the copy override bridge:

```bash
npm run social:copy-template -- --day today --slot 1
```

Give the generated JSON file under `data/social-growth/copy-overrides/` to the writing skill. It should replace only `shortPost`, `xArticle`, `image`, `threadFallback`, and `followUpReplies`.
For technical sharing content, use the project skill at `.agents/skills/x-technical-sharing/SKILL.md` to rewrite those fields. It adapts `technical-sharing-doc` into X-native Chinese copy: first-screen claim, X Article causality chain, image prompt, and substantive replies.
Prefer this handoff command because it writes both the JSON template and a source-aware writing brief:

```bash
npm run social:x-tech-brief -- --day today --slot 1
```

That brief also includes an X-native writing frame plus ledger-based growth feedback: target pace, measured variant performance, measured article/topic performance, and the next recommendations. Treat those signals as writing constraints before optimizing the next X copy.

After the JSON is optimized, apply it locally:

```bash
npm run social:apply-copy -- --input data/social-growth/copy-overrides/<queue-id>.json
```

Then rerun `social:validate` or `social:flow-dry-run`. Applying copy is local-only and must not open Chrome or publish.

Automation is still local-only: it must not publish, upload media, reply, like, repost, follow, or edit the X profile. Daily package selection is article-diverse first: prefer one strong variant per article, then fall back to extra variants only when there are not enough distinct draft articles. Daily packages are exported only for items that pass the local quality gate. When the ledger exists, the daily command inside automation expands the queue enough to cover the default 7-day, 3-posts/day cadence, capped by available Chinese articles.
Article loading defaults to clean tracked `source/_posts/*.md` files only. Do not include untracked or dirty local drafts in recurring automation unless the user explicitly passes `--include-untracked true`.
Queue ids are stable by article slug, language, and variant. Scheduled runs prefer a later slot with a prepared image over the literal first slot when that prevents a local image-readiness blocker.

If you only need the lower-level preparation step, run:

```bash
npm run social:daily -- --limit 5 --package-limit 3 --lang zh
```

Before opening Chrome, check the queue:

```bash
npm run social:validate -- --queue data/social-growth/queue.json --format markdown
```

Do not publish candidates that fail validation. Fix the candidate first.

Then inspect the week-level execution plan:

```bash
npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json
```

Use `data/social-growth/weekly-plan.md` as the day-level schedule. It maps validated candidates to publish slots, metric capture times, and the follower pace required for the `+1000` target.
Before browser work, the healthy default state is `21/21 passed` and `Unfilled slots: 0`. If the quality gate fails, fix copy generation or reduce scope before posting.
For the active day, also check `data/social-growth/day-readiness.md`; the healthy day state is every slot showing `Preflight: ready` and `X prep: ready`.

For one consolidated status view, write:

```bash
npm run social:status -- --day today --slot 1 --out data/social-growth/status.md
```

Use `data/social-growth/status.md` to see follower pace, queue coverage, selected preflight, image readiness, blockers, and the next commands in one place.

Run publish preflight for the selected slot:

```bash
npm run social:preflight -- --day today --slot 1 --out data/social-growth/publish-preflight.md
```

Preflight checks the selected package, quality gate result, expected image file, image generation handoff, and browser stop points. Do not open Chrome for publishing until the preflight blockers are understood.
When the image is missing or needs review, export the reusable image handoff:

```bash
npm run social:image-brief -- --day today --slot 1
```

The brief contains the selected short post, X Article title, exact image 2 / `gpt-image-2` prompt, built-in `imagegen` instructions, CLI fallback command, visual QA checklist, expected output path, register command, and preflight rerun command.
If the image was generated by built-in `imagegen` under Codex's default generated-images directory, ingest the newest generated PNG with:

```bash
npm run social:ingest-imagegen -- --id <queue-id>
```

If the image was generated by any other external path, register it with:

```bash
npm run social:register-image -- --day today --slot 1 --source /absolute/path/to/generated.png
```

For batch image readiness across the weekly plan, write the image backlog:

```bash
npm run social:image-backlog -- --day 1 --out data/social-growth/image-backlog.md
```

This lists missing image assets by publish slot, prompt file, expected output path, image brief command, register command, and preflight rerun command. It is local-only; image upload and X publishing still require action-time confirmation in Chrome.

`OPENAI_API_KEY` is never required for the preferred built-in `imagegen` path. It is only needed when the user explicitly requests the local CLI fallback.

Prepare the Chrome publishing handoff with the existing `baoyu-post-to-x` skill:

```bash
npm run social:x-prep -- --day today --slot 1 --out data/social-growth/x-publish-prep.md
```

This command does not publish. It emits commands for the `x-article.ts` and `x-browser.ts` scripts and keeps the stop-before-final-click boundary explicit.
It also emits a `--probe --json --probe-out data/social-growth/browser-probe.local.json` project CDP command. Run that first when Chrome/X readiness is unknown: it opens or attaches the logged-in Chrome profile, records whether the X compose editor and image file input are available, and does not type text, upload media, or click any public button.
If the account/browser probe shows `https://x.com/compose/articles` is unavailable, use the thread fallback mode instead of pretending X Article publishing works:

```bash
npm run social:x-prep -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/x-publish-prep.md
npm run social:confirmation -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/publish-confirmation.md
npm run social:browser-readiness -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/browser-readiness.md
```

Thread fallback mode prepares the first thread post with the generated image, lists the remaining thread replies, removes the `<x-article-url>` placeholder, and records only the public thread URL after confirmed publication.
If CDP publishing remains blocked but a normal Chrome profile is logged into X, write the compact manual publish kit:

```bash
npm run social:manual-publish-kit -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/manual-publish-kit.md
```

This kit is local-only. It contains the first post, image path, remaining thread posts, the preferred `post-publish-recovery` command, and metrics copy targets. It is not permission to publish, upload media, reply, like, repost, follow, edit profile, or pin content.
For multiple ready manual slots, prefer the batch kit index:

```bash
npm run social:manual-publish-kits -- --day today --publishMode thread_fallback --out data/social-growth/manual-publish-kits/day<N>-ready-slots.md
```

After each confirmed manual publication, fill the public X status URL with the local helper so the slot, kit path, recovery command, and metrics text path stay aligned:

```bash
npm run social:manual-publish-url -- --input data/social-growth/manual-publish-kits/day<N>-published-urls.json --id <queue-id> --url <x-thread-url>
```

Leave unpublished slots blank, then run:

```bash
npm run social:post-publish-recovery-batch -- --input data/social-growth/manual-publish-kits/day<N>-published-urls.json --queue data/social-growth/queue.json --metrics data/social-growth/posts.local.json --reply-out-dir data/social-growth/thread-replies --launch-window-dir data/social-growth/launch-windows
```

This batch recovery is local-only. It validates X status URLs, marks queue items as published, refreshes `posts.local.json`, writes per-post reply handoffs, and creates per-post launch-window plans. It must not publish, upload media, reply, like, repost, follow, edit profile, or pin content.
If the default `baoyu-post-to-x` browser opens without the expected X login, pass a persistent logged-in profile directory:

```bash
npm run social:x-prep -- --day today --slot 1 --publishMode thread_fallback --xProfileDir "$HOME/Library/Application Support/baoyu-skills/chrome-profile" --out data/social-growth/x-publish-prep.md
```

Do not point this at a profile that is currently locked by another running Chrome unless you have verified the helper can reuse it.
If the user-data dir has multiple Chrome profiles, diagnose them before asking the user to log in again:

```bash
npm run social:x-profile-diagnostics -- --includeSystemChrome true --out data/social-growth/x-profile-diagnostics.md
```

Then make the intended Chrome profile explicit:

```bash
npm run social:login-recovery -- --day today --slot 1 --publishMode thread_fallback --xProfileDirectory "Profile 1"
```

`login-recovery` refreshes `browser-probe.local.json`, `browser-readiness.md`, `status.md`, `x-publish-prep.md`, `x-profile-diagnostics.md`, and `login-handoff.md`. If it still returns `needs_x_login`, stop and use the refreshed `login-handoff.md` rather than guessing which Chrome profile is active.

Before opening Chrome for a public-action handoff, run or update the browser readiness report:

```bash
npm run social:browser-readiness -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/browser-readiness.md
```

If browser readiness reports that the compose editor already contains a different draft, do not overwrite it. Resolve and back it up locally first:

```bash
npm run social:compose-draft-resolution -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/compose-draft-resolution.md
npm run social:compose-draft-stash -- --day today --slot 1 --publishMode thread_fallback --out-dir data/social-growth/compose-drafts
```

The resolver maps the existing draft back to a likely queue item, checks whether it matches the quality-gated first post, checks whether the matched image is ready, reports same-article alternate images, and gives either a post-publish recovery command or a safe discard path. The stash command is local-only and does not touch Chrome; use it before asking for confirmation to discard the browser draft.

If Chrome probing has already observed facts, record them explicitly:

```bash
npm run social:browser-readiness -- --day today --slot 1 --publishMode thread_fallback \
  --chromeRunning yes --extensionInstalled yes --nativeHost yes --extensionPipe closed \
  --articleAvailable no --mediaUpload blocked --observedAccount @Clean993 \
  --out data/social-growth/browser-readiness.md
```

This also persists the probe to `data/social-growth/browser-probe.local.json` by default. Future `scheduled-run` executions read that local file automatically. If the Chrome extension native pipe is `closed`, ask for confirmation before opening a fresh Chrome window for reconnect. A readiness report is not permission to publish, upload, reply, like, repost, follow, edit, pin, or click any final public X button.

For single-item control:

1. Read the target blog post from `source/_posts/`.
2. Generate a queue item:
   ```bash
   npm run social:queue -- --limit 5 --lang zh --out data/social-growth/queue.json
   ```
3. Inspect the handoff:
   ```bash
   npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>
   ```
4. Export the publish package:
   ```bash
   npm run social:package -- --queue data/social-growth/queue.json --id <queue-id>
   ```
   Use the generated files as the source of truth:
   - `image-prompt.txt`;
   - `x-article.md`;
   - `short-post.txt`;
   - `thread-fallback.md`;
   - `follow-up-replies.md`;
   - `browser-handoff.json`;
   - `quality-gate.md`;
   - `publish-checklist.md`.
5. Run preflight for the selected id:
   ```bash
   npm run social:preflight -- --id <queue-id> --out data/social-growth/publish-preflight.md
   ```
6. Export the reusable image handoff:
   ```bash
   npm run social:image-brief -- --id <queue-id>
   ```
7. Generate an image from `image-prompt.txt`.
   - Preferred path: use the built-in `imagegen` skill with image 2 / `gpt-image-2`, then copy or register the final selected PNG into `output/imagegen/<queue-id>.png`.
   - CLI fallback only when the user explicitly asks for CLI/API/model control:
     ```bash
     python "$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py" generate \
       --model gpt-image-2 \
       --prompt-file <prompt-file> \
       --size 1536x1024 \
       --quality medium \
       --out output/imagegen/<slug>.png
     ```
   - If `OPENAI_API_KEY` is missing for the CLI fallback, do not block the workflow. Use the built-in `imagegen` path instead.
8. If the image was generated by built-in `imagegen` under Codex's default generated-images directory, ingest it:
   ```bash
   npm run social:ingest-imagegen -- --id <queue-id>
   ```
   If it came from any other external path, register it:
   ```bash
   npm run social:register-image -- --id <queue-id> --source /absolute/path/to/generated.png
   ```
9. Re-run preflight and require the image blocker to be gone.
10. Generate the `baoyu-post-to-x` handoff:
   ```bash
   npm run social:x-prep -- --id <queue-id> --out data/social-growth/x-publish-prep.md
   ```
11. Generate the confirmation packet:
   ```bash
   npm run social:confirmation -- --id <queue-id> --out data/social-growth/publish-confirmation.md
   ```
   Review this file before every browser publish/upload/reply step. It is not permission to perform public X actions.
   If it reports `needs_copy_review`, do not open Chrome yet; run the `x-technical-sharing` copy override loop first.
12. In Chrome, prepare the X Article first. If X Article publishing is unavailable for the account, fall back to a thread using `thread-fallback.md`:
   - title: `xArticle.title`;
   - body: `xArticle.body`;
   - attach the generated image when the UI supports it.
13. Stop before the final Article publish click and ask for confirmation.
14. After the X Article or thread is public, create the short X post:
   - attach the generated image;
   - use `short-post.txt`;
   - include the X Article URL, not the blog URL.
15. Stop before the final post click and ask for confirmation.
16. After the short post is public, prepare 1-2 substantive follow-up replies from `follow-up-replies.md`.
17. Stop before each public reply click and ask for confirmation.
18. Record the published URL:
   ```bash
   npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url <x-post-url> --article-url <x-article-url>
   ```
   If the post was published manually from a logged-in Chrome profile while the CDP publishing profile is blocked, use the recovery command instead:
   ```bash
   npm run social:post-publish-recovery -- --day today --slot 1 --url <x-post-url>
   ```
   This validates the public X status URL, marks the selected queue item as published, refreshes the metrics template, writes the reply handoff, and runs the read-only metrics cycle from local copied text by default. It does not open Chrome unless `--skip-browser false` is explicitly passed.
   For multiple manually confirmed posts from the same day, fill the batch URL template with the local helper and run:
   ```bash
   npm run social:manual-publish-url -- --input data/social-growth/manual-publish-kits/day<N>-published-urls.json --id <queue-id> --url <x-thread-url>
   ```
   Then recover the filled URLs:
   ```bash
   npm run social:post-publish-recovery-batch -- --input data/social-growth/manual-publish-kits/day<N>-published-urls.json
   ```
   The batch command validates every filled URL before mutating the queue, skips blank slots, refreshes the metrics template once, and writes reply handoffs under `data/social-growth/thread-replies/`.
19. Prepare the metrics template:
   ```bash
   npm run social:metrics-template -- --queue data/social-growth/queue.json --out data/social-growth/posts.local.json
   ```
20. Capture read-only visible X text into the metrics template when available:
   ```bash
   npm run social:capture-metrics -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   ```
   Prefer the browser-backed read-only capture when Chrome is logged into X:
   ```bash
   npm run social:browser-metrics-capture -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --metrics data/social-growth/posts.local.json
   ```
   This opens profile/post URLs and writes visible text into local files before running the metrics cycle. It must not type text, upload media, click public buttons, reply, like, repost, follow, edit, or publish.
21. Audit profile conversion from copied visible profile text:
   ```bash
   npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md
   ```
   Treat profile edits, link edits, and pinned-post changes as public account actions requiring action-time confirmation.
22. Prepare the profile update handoff when the audit says `needs_work`:
   ```bash
   npm run social:profile-package -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-update.md
   ```
   Use the package only to prepare Chrome fields. Stop before profile save, pinned-post publish, and pin confirmation.
23. Fill any missing `data/social-growth/posts.local.json` fields from X with current followers and per-post metrics: views, likes, replies, reposts, quotes, bookmarks, profileClicks, follows.
24. Prefer the consolidated post-publish metrics cycle when copied visible profile/post text is available:
   ```bash
   npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   ```
   This parses read-only local text, writes `metrics-cycle.md`, writes a growth report and recommendations, and appends a ledger snapshot only when follower count is present.
25. Record metrics twice per day if you are not using `social:metrics-cycle`:
   ```bash
   npm run social:snapshot -- --ledger data/social-growth/ledger.json --posts-file data/social-growth/posts.local.json
   ```
26. Review progress:
   ```bash
   npm run social:report -- --ledger data/social-growth/ledger.json --format markdown
   ```
27. Diagnose the conversion funnel:
   ```bash
   npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown
   ```
   This separates weak reach, weak interaction, weak profile handoff, and weak follow conversion. Fix the bottleneck before scaling more posts.
28. Generate the next optimization decision:
   ```bash
   npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
   ```
29. Generate the next experiment plan:
   ```bash
   npm run social:experiments -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --out data/social-growth/experiment-plan.md
   ```
   Use this to decide what the next copy override should change: first-line hook, image prompt, thread replies, profile promise, or winner scaling. This is local-only planning, not permission to publish.
30. Regenerate the week-level plan after each queue or ledger update:
   ```bash
   npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --out data/social-growth/weekly-plan.md
   ```

Use the daily command for scheduled automation. It is allowed to prepare local artifacts and reports, but it must not publish, reply, like, repost, follow, or upload media without action-time confirmation.

For recurring safe jobs, prefer:

```bash
/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tools/social-growth/cli.mjs scheduled-run --day today --slot 1 --publishMode thread_fallback --funnel-out data/social-growth/funnel.md
```

This combines safe local publishing preparation with read-only metrics-cycle parsing and writes `data/social-growth/scheduled-run.md`.
The scheduled run also writes `data/social-growth/funnel.md` so each recurring pass exposes the current views -> interactions -> profile clicks -> follows bottleneck before the next writing or publishing decision.
The Codex App automation `x-growth-safe-automation` runs this safe scheduled loop. Keep the older `prepare-x-growth-daily-run` automation paused unless it is deliberately repurposed, because it duplicates part of the same local report generation.

For selective distribution into relevant technical conversations, capture copied visible X thread text into `data/social-growth/engagement-opportunities/*.txt`, then run:

```bash
npm run social:engagement-search -- --out data/social-growth/engagement-search.md
```

Open only the read-only search URLs from that file to find candidate threads. Then save copied visible X thread text into `data/social-growth/engagement-opportunities/*.txt` and run:

```bash
npm run social:engagement-capture-template -- --out data/social-growth/engagement-opportunities/_capture-template.md
npm run social:engagement -- --opportunities data/social-growth/engagement-opportunities --out data/social-growth/engagement-plan.md
```

Use only candidates that add a mechanism, proof caveat, checklist, or correction. Stop before every public Reply click and get action-time confirmation. Never use this as mass replies, likes, reposts, follows, or trend hijacking.

## Copy Rules

Short post:

- one clear Chinese claim;
- no raw blog URL;
- one concrete reader payoff;
- concrete mechanism within the first two lines;
- use a creator-tested opening shape from `references/chinese-x-style.md`: strong judgment, useful discovery, or concrete case;
- sell the generated image and X Article in the first screen; the first post should make the reader want the in-X long form before seeing the blog link;
- 1-2 Chinese-readable hashtags;
- image attached;
- link to the X Article after it exists.
- choose one structure from `references/chinese-x-style.md`: research utility, strong thesis, or case story.
- pass `npm run social:validate` before browser publishing.

Follow-up replies:

- add technical substance, not generic engagement bait;
- expand the mechanism, checklist, or failure mode from the post;
- for replies to other threads, use `data/social-growth/engagement-plan.md` as the source of truth;
- no mass replies and no replies into unrelated viral threads;
- every public reply still requires action-time confirmation.

X Article:

- Chinese title;
- summarize the article's argument;
- include a reusable framework;
- include the blog link only at the end under `博客原文：`;
- avoid saying "I wrote about" or other low-value meta copy.

Image:

- use built-in `imagegen` with image 2 / `gpt-image-2` by default;
- 1536x1024 landscape;
- editorial infographic style;
- include one scroll-stopper Chinese headline plus the mechanism the post claims;
- one clear visual metaphor or loop;
- readable on mobile;
- no fake UI, platform logos, watermarks, or tiny paragraphs.

Quality gate:

- reject raw blog URLs in the short post;
- reject AI-smelling meta copy such as "A technical post is useful only when", `我写了一篇`, `欢迎阅读`, `技术文章只有...才有用`;
- reject short posts that do not state a Chinese claim plus a concrete mechanism in the first screen;
- reject short posts that merely say the blog exists without selling the image-backed mechanism or X Article;
- reject duplicated short posts across different articles;
- require the X Article to carry the blog URL at the end under `博客原文：`;
- reject X Article extraction artifacts such as heading-glued fragments or Markdown table fragments in bullet points;
- require image 2 / `gpt-image-2`, `1536x1024`, and mobile-readable image prompts;
- reject low-value follow-up replies such as "怎么看", "点赞", "转发", or generic comment bait.

Article-specific frames:

- do not reuse the same AI/performance frame for every article;
- infer a topic frame from the title, excerpt, and tags, for example Agent Skill, Spec-Driven Coding, SEO, Error Boundary, React performance, React Server Component, or testing;
- if no specific frame matches, use the generic engineering-judgment frame and let the duplicate-post quality gate catch overuse.

## X Recommendation Model

Use `references/x-recommendation-system.md` as the durable research base. The practical model is:

- candidate entry: publish eligible Chinese technical content that can enter the right graph/topic pools;
- hydration: make post text, image, language, author promise, and topic unambiguous;
- multi-action prediction: optimize for replies, reposts, quotes, bookmarks, profile clicks, and follows, not only likes or PV;
- negative feedback: avoid duplicate templates, rage bait, mass replies, and generic engagement bait;
- diversity/fatigue: rotate topics and variants instead of flooding the same frame;
- profile handoff: turn profile clicks into follows through bio and pinned-post promise;
- winner scaling: reuse the winning mechanism with new surface wording.

Do not claim fixed public action weights. The public X/xAI sources describe weighted multi-action prediction, but they do not provide a universal production formula we can trust for every account or viewer.

## Optimization Loop

The local scoring rule values followers and meaningful interactions:

```text
Post Score = follows*25 + reposts*8 + quotes*8 + replies*6 + bookmarks*5 + likes
```

After every snapshot:

- run `npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown`;
- run `npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown`;
  - read the `Algorithm Lens` section first; it maps the current funnel to candidate entry, measurement hydration, multi-action prediction, profile handoff, follow conversion, or winner scaling;
- run `npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md` after profile text is captured;
- double down on topics that create follows, replies, reposts, bookmarks, or profile clicks;
- kill templates that only get impressions or likes without follower lift;
- prefer posts that make a concrete technical claim and invite a serious reply;
- preserve the ledger so future iterations can compare against real data.
