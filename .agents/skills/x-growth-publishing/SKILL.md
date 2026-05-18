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

## Workflow

For the normal daily loop, start with:

```bash
npm run social:daily -- --limit 5 --package-limit 3 --lang zh
```

This creates `data/social-growth/queue.json`, exports the first publish packages under `data/social-growth/packages/`, writes `data/social-growth/posts.local.json` for metrics capture, writes `data/social-growth/daily-run.md`, and writes `data/social-growth/weekly-plan.md` when the ledger exists.

Daily package selection is article-diverse first: prefer one strong variant per article, then fall back to extra variants only when there are not enough distinct draft articles. Daily packages are exported only for items that pass the local quality gate. When the ledger exists, the daily command expands the queue enough to cover the default 7-day, 3-posts/day cadence, capped by available Chinese articles.

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

Run publish preflight for the selected slot:

```bash
npm run social:preflight -- --day 1 --slot 1 --out data/social-growth/publish-preflight.md
```

Preflight checks the selected package, quality gate result, expected image file, `OPENAI_API_KEY`, and browser stop points. Do not open Chrome for publishing until the preflight blockers are understood.
When the local image CLI is blocked or the image needs review, export the reusable image handoff:

```bash
npm run social:image-brief -- --day 1 --slot 1
```

The brief contains the selected short post, X Article title, exact `gpt-image-2` prompt, visual QA checklist, expected output path, register command, and preflight rerun command.
If the image was generated outside the local CLI, register it with:

```bash
npm run social:register-image -- --day 1 --slot 1 --source /absolute/path/to/generated.png
```

After an image is registered, `OPENAI_API_KEY` is not required for preflight readiness.

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
7. Generate a `gpt-image-2` image from `image-prompt.txt`.
   - Preferred CLI when the user explicitly asks for image model control:
     ```bash
     python "$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py" generate \
       --model gpt-image-2 \
       --prompt-file <prompt-file> \
       --size 1536x1024 \
       --quality medium \
       --out output/imagegen/<slug>.png
     ```
   - If `OPENAI_API_KEY` is missing, stop and ask the user for the key or use built-in image generation as a preview path.
8. If the image was generated outside the local CLI, register it:
   ```bash
   npm run social:register-image -- --id <queue-id> --source /absolute/path/to/generated.png
   ```
9. Re-run preflight and require the image blocker to be gone.
10. In Chrome, prepare the X Article first. If X Article publishing is unavailable for the account, fall back to a thread using `thread-fallback.md`:
   - title: `xArticle.title`;
   - body: `xArticle.body`;
   - attach the generated image when the UI supports it.
11. Stop before the final Article publish click and ask for confirmation.
12. After the X Article or thread is public, create the short X post:
   - attach the generated image;
   - use `short-post.txt`;
   - include the X Article URL, not the blog URL.
13. Stop before the final post click and ask for confirmation.
14. After the short post is public, prepare 1-2 substantive follow-up replies from `follow-up-replies.md`.
15. Stop before each public reply click and ask for confirmation.
16. Record the published URL:
   ```bash
   npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url <x-post-url> --article-url <x-article-url>
   ```
17. Prepare the metrics template:
   ```bash
   npm run social:metrics-template -- --queue data/social-growth/queue.json --out data/social-growth/posts.local.json
   ```
18. Capture read-only visible X text into the metrics template when available:
   ```bash
   npm run social:capture-metrics -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   ```
19. Fill any missing `data/social-growth/posts.local.json` fields from X with current followers and per-post metrics: views, likes, replies, reposts, quotes, bookmarks, profileClicks, follows.
20. Record metrics twice per day:
   ```bash
   npm run social:snapshot -- --ledger data/social-growth/ledger.json --posts-file data/social-growth/posts.local.json
   ```
21. Review progress:
   ```bash
   npm run social:report -- --ledger data/social-growth/ledger.json --format markdown
   ```
22. Generate the next optimization decision:
   ```bash
   npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
   ```
23. Regenerate the week-level plan after each queue or ledger update:
   ```bash
   npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --out data/social-growth/weekly-plan.md
   ```

Use the daily command for scheduled automation. It is allowed to prepare local artifacts and reports, but it must not publish, reply, like, repost, follow, or upload media without action-time confirmation.

## Copy Rules

Short post:

- one clear Chinese claim;
- no raw blog URL;
- one concrete reader payoff;
- concrete mechanism within the first two lines;
- 1-2 Chinese-readable hashtags;
- image attached;
- link to the X Article after it exists.
- choose one structure from `references/chinese-x-style.md`: research utility, strong thesis, or case story.
- pass `npm run social:validate` before browser publishing.

Follow-up replies:

- add technical substance, not generic engagement bait;
- expand the mechanism, checklist, or failure mode from the post;
- no mass replies and no replies into unrelated viral threads;
- every public reply still requires action-time confirmation.

X Article:

- Chinese title;
- summarize the article's argument;
- include a reusable framework;
- include the blog link only at the end under `博客原文：`;
- avoid saying "I wrote about" or other low-value meta copy.

Image:

- use `gpt-image-2`;
- 1536x1024 landscape;
- editorial infographic style;
- one clear visual metaphor or loop;
- readable on mobile;
- no fake UI, platform logos, watermarks, or tiny paragraphs.

Quality gate:

- reject raw blog URLs in the short post;
- reject short posts that do not state a Chinese claim plus a concrete mechanism in the first screen;
- reject duplicated short posts across different articles;
- require the X Article to carry the blog URL at the end under `博客原文：`;
- require `gpt-image-2`, `1536x1024`, and mobile-readable image prompts;
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

- run `npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown`;
- double down on topics that create follows, replies, reposts, bookmarks, or profile clicks;
- kill templates that only get impressions or likes without follower lift;
- prefer posts that make a concrete technical claim and invite a serious reply;
- preserve the ledger so future iterations can compare against real data.
