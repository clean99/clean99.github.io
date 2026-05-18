---
name: x-technical-sharing
description: Create Chinese X posts, X Articles, image prompts, follow-up replies, and copy-override JSON for technical sharing content. Use when the user wants to adapt a technical sharing doc, blog post, design note, performance write-up, code change, or engineering story for X distribution and growth.
---

# X Technical Sharing

Use this skill to turn real engineering work into X-native Chinese technical content for `@Clean993`.

This is the X version of `technical-sharing-doc`: keep its causality discipline, but change the packaging for X.

## Output Contract

Default output is a copy override JSON that can be applied by:

```bash
npm run social:apply-copy -- --input data/social-growth/copy-overrides/<queue-id>.json
```

Only change these fields:

- `shortPost`
- `xArticle.title`
- `xArticle.body`
- `image.alt`
- `image.prompt`
- `threadFallback`
- `followUpReplies`

Do not publish, upload images, reply, like, repost, follow, edit profile, or pin content.

## Source Reading

Read the source material before writing:

- blog post or draft;
- technical sharing doc;
- code diff, commit, or spec if relevant;
- metrics, screenshots, logs, or test evidence when available;
- existing queue item from `social:copy-template`.
- preferably the generated brief from:
  ```bash
  npm run social:x-tech-brief -- --day 1 --slot 1
  ```

Do not infer a mechanism from the title alone. If evidence is missing, write a more modest claim.
When the brief includes a `Growth Feedback` section, use it as a constraint: preserve measured winning mechanisms, repair weak conversion signals, and avoid repeating failed variants or duplicated surface wording.

## Causality Chain

Convert every piece of technical content into this chain:

```text
Observable problem -> technical cause -> mechanism -> evidence -> reusable lesson
```

For X, compress it like this:

- short post: problem + mechanism + why the image/X Article is worth opening;
- X Article: full causality chain plus reusable frame;
- image prompt: one visual model of the mechanism;
- replies: one extra failure mode or proof detail each.

Bad short post:

```text
我写了一篇关于 AI 性能优化的文章，欢迎阅读。
```

Good short post:

```text
别把「AI 性能优化」做成建议清单。

真正要验证的是 baseline -> change -> verify -> ledger 这条链路有没有闭合。

图里放判断框架，完整推演放 X Article。
```

## Short Post Rules

- Chinese by default.
- 180-260 characters is the normal range.
- First line must be a concrete claim, discovery, or case.
- No raw blog URL.
- One mechanism within the first two lines.
- Mention the image or X Article naturally.
- At most two hashtags.
- No engagement bait: no `点赞`, `转发`, `评论区`, `怎么看`, or generic questions.
- Do not mimic abusive creator voices. Borrow structure only.

Allowed opening shapes:

```text
别把「<topic>」做成 <wrong frame>。
我发现 <topic> 真正该先画成一张图。
我以为 <topic> 卡在 <surface issue>，后来发现根因是 <cause>。
很多人把 <topic> 想错了。
```

Use strong wording only when the next sentence gives a falsifiable mechanism.

## X Article Structure

Use X Article to satisfy the click inside X before the blog link.

Recommended shape:

```text
<one paragraph: what this is really about>

## 关键结论

- <observable problem>
- <technical cause>
- <core mechanism>

## 可复用框架

<3-5 steps, no filler>

## 取舍

<one design tradeoff if it matters>

## 验证

<metrics/tests/gates/evidence; if missing, say what would prove it>

博客原文：<targetUrl>
```

Rules:

- Keep problem and cause separate.
- Do not dump implementation order.
- Prefer one reusable frame over many details.
- Put the blog link only at the end under `博客原文：`.
- Avoid theatrical phrases such as `最硬的部分`.

## Image Prompt Rules

Use built-in `imagegen` / image 2 / `gpt-image-2`.

Prompt must be in English and generate the final bitmap directly:

- 1536x1024 landscape editorial infographic;
- one Chinese scroll-stopper headline;
- 3-5 labeled steps or layers;
- readable at mobile size;
- no brand logos, fake UI, watermarks, or tiny paragraphs;
- one visual metaphor tied to the mechanism, not decoration.

Image headline should not sound like a corporate slogan. Prefer concrete mechanism language:

```text
AI 性能优化，先别谈建议
先把验证链路闭合
```

## Follow-Up Replies

Write 1-2 replies only when they add substance:

- one failure mode;
- one checklist;
- one proof caveat;
- one implementation constraint.

No generic bumping, no mass replies, no unrelated thread hijacking.

## Quality Gate

After applying the copy override, run:

```bash
npm run social:validate -- --queue data/social-growth/queue.json --format markdown
```

If available, also run:

```bash
npm run social:flow-dry-run -- --day 1 --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
```

Do not proceed to Chrome prep unless validation passes.
