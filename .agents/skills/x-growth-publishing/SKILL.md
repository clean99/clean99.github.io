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
   - `browser-handoff.json`;
   - `publish-checklist.md`.
5. Generate a `gpt-image-2` image from `image-prompt.txt`.
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
6. In Chrome, prepare the X Article first. If X Article publishing is unavailable for the account, fall back to a thread using `thread-fallback.md`:
   - title: `xArticle.title`;
   - body: `xArticle.body`;
   - attach the generated image when the UI supports it.
7. Stop before the final Article publish click and ask for confirmation.
8. After the X Article or thread is public, create the short X post:
   - attach the generated image;
   - use `short-post.txt`;
   - include the X Article URL, not the blog URL.
9. Stop before the final post click and ask for confirmation.
10. Record the published URL:
   ```bash
   npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url <x-post-url>
   ```
11. Record metrics twice per day:
   ```bash
   npm run social:snapshot -- --ledger data/social-growth/ledger.json --date YYYY-MM-DD --followers <count> --posts-file data/social-growth/posts.local.json
   ```
12. Review progress:
   ```bash
   npm run social:report -- --ledger data/social-growth/ledger.json --format markdown
   ```

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

## Optimization Loop

The local scoring rule values followers and meaningful interactions:

```text
Post Score = follows*25 + reposts*8 + quotes*8 + replies*6 + bookmarks*5 + likes
```

After every snapshot:

- double down on topics that create follows, replies, reposts, bookmarks, or profile clicks;
- kill templates that only get impressions or likes without follower lift;
- prefer posts that make a concrete technical claim and invite a serious reply;
- preserve the ledger so future iterations can compare against real data.
