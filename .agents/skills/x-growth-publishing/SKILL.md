---
name: x-growth-publishing
description: Use this skill whenever the user wants to distribute blog posts on X, grow the Clean993 X account, create Chinese X posts/articles from blog content, generate X images, track follower growth, or optimize X content performance. This skill is the default workflow for Chinese-audience X growth from the Hexo blog, even if the user says only "发推", "发 X", "推广文章", "涨粉", or "分发博客".
---

# X Growth Publishing

Use this skill to turn blog posts into a repeatable Chinese-audience X growth loop for `@Clean993`.

The system goal is one-week follower growth, currently `+1000 followers` from the baseline recorded in `data/social-growth/ledger.json`.

Before writing copy, read `references/chinese-x-style.md` when the user asks to improve Chinese X style, mentions Chinese creators, or asks why a post is not attractive.

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
- Use the built-in `imagegen` skill as the primary image path. It uses image 2 / `gpt-image-2` and does not require `OPENAI_API_KEY`. After generation, copy or register the selected PNG into the expected `output/imagegen/<queue-id>.png` path.
- Use `baoyu-post-to-x` as the preferred Chrome/CDP helper for preparing X Articles, regular image posts, quote posts, or media posts when a scripted browser handoff is useful. Its scripts fill content in Chrome and leave the final public publish click to the user, which matches this skill's confirmation boundary.
- Use `baoyu-danger-x-to-markdown` only for consented research or competitor/content archiving. It uses a reverse-engineered X API and must not become the default publishing or metrics path.

## Workflow

For the normal daily loop, start with:

```bash
npm run social:automation -- --day 1 --slot 1
```

This safe automation cycle creates or refreshes `data/social-growth/queue.json`, exports the first publish packages under `data/social-growth/packages/`, writes `data/social-growth/posts.local.json` for metrics capture, writes `data/social-growth/daily-run.md`, writes `data/social-growth/weekly-plan.md` when the ledger exists, writes `data/social-growth/status.md`, writes `data/social-growth/publish-preflight.md`, writes `data/social-growth/profile-audit.md`, and writes `data/social-growth/automation-run.md`.
It also writes `data/social-growth/profile-update.md` when profile conversion needs a browser handoff for display name, bio, link, or pinned post.
It writes `data/social-growth/x-publish-prep.md` with `baoyu-post-to-x` commands that can prefill Chrome for the X Article and image-backed short post while preserving the final confirmation boundary.
It writes `data/social-growth/engagement-search.md` with read-only X search URLs for finding relevant technical threads.
It writes `data/social-growth/engagement-plan.md` from copied relevant thread opportunities when available; missing opportunities are a capture task, not an automation blocker.
It writes `data/social-growth/daily-brief.md` as the single operator-facing action order across publish readiness, engagement, metrics, conversion funnel, and profile conversion.

For day-level readiness across all publish slots, run:

```bash
npm run social:day-readiness -- --day 1 --out data/social-growth/day-readiness.md
```

This does not open Chrome. It summarizes each slot's image readiness, publish preflight, `baoyu-post-to-x` handoff status, blockers, and exact slot commands.

For the day-level operator runbook, run:

```bash
npm run social:daily-brief -- --day 1 --out data/social-growth/daily-brief.md
```

Use this before browser work. It combines publish readiness, read-only engagement search, reply-candidate status, metrics capture readiness, profile conversion, and a prioritized action order.

When the user says not to publish content yet, run the full dry-run instead:

```bash
npm run social:flow-dry-run -- --day 1 --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
```

This exercises the whole local flow without public actions: selected package, preflight, `baoyu-post-to-x` handoff, simulated publication URLs on `x.example.invalid`, metrics template, dry ledger snapshot, report, and recommendations. It must not open Chrome and must not write to the real `queue.json` or `ledger.json`.

When a separate writing skill will produce better copy, use the copy override bridge:

```bash
npm run social:copy-template -- --day 1 --slot 1
```

Give the generated JSON file under `data/social-growth/copy-overrides/` to the writing skill. It should replace only `shortPost`, `xArticle`, `image`, `threadFallback`, and `followUpReplies`.
For technical sharing content, use the project skill at `.agents/skills/x-technical-sharing/SKILL.md` to rewrite those fields. It adapts `technical-sharing-doc` into X-native Chinese copy: first-screen claim, X Article causality chain, image prompt, and substantive replies.
Prefer this handoff command because it writes both the JSON template and a source-aware writing brief:

```bash
npm run social:x-tech-brief -- --day 1 --slot 1
```

That brief also includes an X-native writing frame plus ledger-based growth feedback: target pace, measured variant performance, measured article/topic performance, and the next recommendations. Treat those signals as writing constraints before optimizing the next X copy.

After the JSON is optimized, apply it locally:

```bash
npm run social:apply-copy -- --input data/social-growth/copy-overrides/<queue-id>.json
```

Then rerun `social:validate` or `social:flow-dry-run`. Applying copy is local-only and must not open Chrome or publish.

Automation is still local-only: it must not publish, upload media, reply, like, repost, follow, or edit the X profile. Daily package selection is article-diverse first: prefer one strong variant per article, then fall back to extra variants only when there are not enough distinct draft articles. Daily packages are exported only for items that pass the local quality gate. When the ledger exists, the daily command inside automation expands the queue enough to cover the default 7-day, 3-posts/day cadence, capped by available Chinese articles.

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
npm run social:status -- --day 1 --slot 1 --out data/social-growth/status.md
```

Use `data/social-growth/status.md` to see follower pace, queue coverage, selected preflight, image readiness, blockers, and the next commands in one place.

Run publish preflight for the selected slot:

```bash
npm run social:preflight -- --day 1 --slot 1 --out data/social-growth/publish-preflight.md
```

Preflight checks the selected package, quality gate result, expected image file, image generation handoff, and browser stop points. Do not open Chrome for publishing until the preflight blockers are understood.
When the image is missing or needs review, export the reusable image handoff:

```bash
npm run social:image-brief -- --day 1 --slot 1
```

The brief contains the selected short post, X Article title, exact image 2 / `gpt-image-2` prompt, built-in `imagegen` instructions, CLI fallback command, visual QA checklist, expected output path, register command, and preflight rerun command.
If the image was generated by built-in `imagegen` or any other external path, register it with:

```bash
npm run social:register-image -- --day 1 --slot 1 --source /absolute/path/to/generated.png
```

`OPENAI_API_KEY` is never required for the preferred built-in `imagegen` path. It is only needed when the user explicitly requests the local CLI fallback.

Prepare the Chrome publishing handoff with the existing `baoyu-post-to-x` skill:

```bash
npm run social:x-prep -- --day 1 --slot 1 --out data/social-growth/x-publish-prep.md
```

This command does not publish. It emits commands for the `x-article.ts` and `x-browser.ts` scripts and keeps the stop-before-final-click boundary explicit.

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
8. If the image was generated by built-in `imagegen` or any other external path, register it:
   ```bash
   npm run social:register-image -- --id <queue-id> --source /absolute/path/to/generated.png
   ```
9. Re-run preflight and require the image blocker to be gone.
10. Generate the `baoyu-post-to-x` handoff:
   ```bash
   npm run social:x-prep -- --id <queue-id> --out data/social-growth/x-publish-prep.md
   ```
11. In Chrome, prepare the X Article first. If X Article publishing is unavailable for the account, fall back to a thread using `thread-fallback.md`:
   - title: `xArticle.title`;
   - body: `xArticle.body`;
   - attach the generated image when the UI supports it.
12. Stop before the final Article publish click and ask for confirmation.
13. After the X Article or thread is public, create the short X post:
   - attach the generated image;
   - use `short-post.txt`;
   - include the X Article URL, not the blog URL.
14. Stop before the final post click and ask for confirmation.
15. After the short post is public, prepare 1-2 substantive follow-up replies from `follow-up-replies.md`.
16. Stop before each public reply click and ask for confirmation.
17. Record the published URL:
   ```bash
   npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url <x-post-url> --article-url <x-article-url>
   ```
18. Prepare the metrics template:
   ```bash
   npm run social:metrics-template -- --queue data/social-growth/queue.json --out data/social-growth/posts.local.json
   ```
19. Capture read-only visible X text into the metrics template when available:
   ```bash
   npm run social:capture-metrics -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   ```
20. Audit profile conversion from copied visible profile text:
   ```bash
   npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md
   ```
   Treat profile edits, link edits, and pinned-post changes as public account actions requiring action-time confirmation.
21. Prepare the profile update handoff when the audit says `needs_work`:
   ```bash
   npm run social:profile-package -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-update.md
   ```
   Use the package only to prepare Chrome fields. Stop before profile save, pinned-post publish, and pin confirmation.
22. Fill any missing `data/social-growth/posts.local.json` fields from X with current followers and per-post metrics: views, likes, replies, reposts, quotes, bookmarks, profileClicks, follows.
23. Prefer the consolidated post-publish metrics cycle when copied visible profile/post text is available:
   ```bash
   npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   ```
   This parses read-only local text, writes `metrics-cycle.md`, writes a growth report and recommendations, and appends a ledger snapshot only when follower count is present.
24. Record metrics twice per day if you are not using `social:metrics-cycle`:
   ```bash
   npm run social:snapshot -- --ledger data/social-growth/ledger.json --posts-file data/social-growth/posts.local.json
   ```
25. Review progress:
   ```bash
   npm run social:report -- --ledger data/social-growth/ledger.json --format markdown
   ```
26. Diagnose the conversion funnel:
   ```bash
   npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown
   ```
   This separates weak reach, weak interaction, weak profile handoff, and weak follow conversion. Fix the bottleneck before scaling more posts.
27. Generate the next optimization decision:
   ```bash
   npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
   ```
28. Regenerate the week-level plan after each queue or ledger update:
   ```bash
   npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --out data/social-growth/weekly-plan.md
   ```

Use the daily command for scheduled automation. It is allowed to prepare local artifacts and reports, but it must not publish, reply, like, repost, follow, or upload media without action-time confirmation.

For recurring safe jobs, prefer:

```bash
npm run social:scheduled-run -- --day 1 --slot 1
```

This combines safe local publishing preparation with read-only metrics-cycle parsing and writes `data/social-growth/scheduled-run.md`.

For selective distribution into relevant technical conversations, capture copied visible X thread text into `data/social-growth/engagement-opportunities/*.txt`, then run:

```bash
npm run social:engagement-search -- --out data/social-growth/engagement-search.md
```

Open only the read-only search URLs from that file to find candidate threads. Then save copied visible X thread text into `data/social-growth/engagement-opportunities/*.txt` and run:

```bash
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

## Optimization Loop

The local scoring rule values followers and meaningful interactions:

```text
Post Score = follows*25 + reposts*8 + quotes*8 + replies*6 + bookmarks*5 + likes
```

After every snapshot:

- run `npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown`;
- run `npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown`;
- run `npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md` after profile text is captured;
- double down on topics that create follows, replies, reposts, bookmarks, or profile clicks;
- kill templates that only get impressions or likes without follower lift;
- prefer posts that make a concrete technical claim and invite a serious reply;
- preserve the ledger so future iterations can compare against real data.
