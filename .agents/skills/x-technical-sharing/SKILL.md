---
name: x-technical-sharing
description: Create Chinese X posts, X Articles, image prompts, follow-up replies, and copy-override JSON for technical sharing content. Use when the user wants to adapt a technical sharing doc, blog post, design note, performance write-up, code change, or engineering story for X distribution and growth.
---

# X Technical Sharing

Use this skill to turn real engineering work into X-native Chinese technical content for `@Clean993`.

This is the X version of `technical-sharing-doc`: keep its causality discipline, but change the packaging for X.

## What Carries Over From `technical-sharing-doc`

Carry over the engineering taste, not the long-form shape:

- start from observable failure, not internal jargon;
- keep problem, cause, mechanism, tradeoff, and evidence separate;
- explain interfaces by caller intent;
- show one reusable frame instead of a file tour;
- make every claim falsifiable or clearly mark it as a hypothesis.

Change the delivery:

```text
Long technical article -> X-native package
observable failure     -> first-screen hook
technical cause        -> first mechanism sentence
architecture frame     -> X Article reusable framework
tradeoff/evidence      -> X Article proof section + follow-up replies
diagram                -> image 2 / gpt-image-2 scroll-stopper infographic
blog URL               -> last line of the X Article only
```

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

Return a complete JSON object by default:

```json
{
  "id": "<queue-id>",
  "source": "x-technical-sharing",
  "contentStatus": "ready_for_validation",
  "shortPost": "<Chinese X post, no raw blog URL>",
  "xArticle": {
    "title": "<Chinese X Article title>",
    "body": "<Markdown body ending with 博客原文：<targetUrl>>"
  },
  "image": {
    "alt": "<concise Chinese alt text>",
    "prompt": "<English image 2 prompt>"
  },
  "threadFallback": ["<post 1>", "<post 2>", "<link post>"],
  "followUpReplies": ["<substantive reply 1>", "<substantive reply 2>"]
}
```

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

## X Packaging Model

Do not try to summarize the blog. Package a path through the feed:

1. `shortPost`: make a reader stop and understand the argument in two lines.
2. `image`: turn the mechanism into a visual object worth opening.
3. `X Article`: satisfy the click inside X before asking for the blog click.
4. `followUpReplies`: add proof, caveat, or checklist; never bump.
5. `blog link`: only after the X Article has delivered value.

The short post must sell the X Article and image, not the external blog URL.

Bad short post:

```text
我写了一篇关于 AI 性能优化的文章，欢迎阅读。
```

Good short post:

```text
最近用 AI Agent 跑前端性能优化，第一个坑是测量口径。

同一条 path 换了 baseline，后面所有“优化收益”都会变成故事。

配图放 baseline -> change -> verify -> ledger，X Article 写完整复盘。
```

## Short Post Rules

- Chinese by default.
- 180-260 characters is the normal range.
- First line must be a concrete claim, discovery, or case; it must stand alone in the feed.
- No raw blog URL.
- One mechanism within the first two lines.
- Mention the image or X Article naturally.
- At most two hashtags.
- No engagement bait: no `点赞`, `转发`, `评论区`, `怎么看`, or generic questions.
- Do not mimic abusive creator voices. Borrow structure only.

Allowed opening shapes:

```text
最近做 <topic>，我先卡在 <observable failure>。
<topic> 最容易被 <single metric / surface symptom> 带偏。
我把 <topic> 拆成 <mechanism> 几个检查点。
这次复盘 <topic>，最容易误判的是 <specific false signal>。
```

Use strong wording only when the next sentence gives a falsifiable mechanism.

### Chinese X Style Adapter

You may borrow structure from strong Chinese technical creators, not their identity or aggression:

- `强判断`: one sharp claim, immediately backed by mechanism;
- `反常识`: name the common wrong frame, then replace it;
- `案例转折`: "我以为 X，后来发现根因是 Y";
- `工具感`: give a compact checklist or decision frame.

Never imitate personal attacks, political rage, slurs, or outrage bait. The account should read as technical, sharp, and useful.

Remove AI-smelling filler:

- `A technical post is useful only when`;
- `技术文章只有...才有用`;
- `不是 X，而是 Y`;
- `不是 X，是 Y`;
- `不只是 X，更是 Y`;
- `真正值钱的不是...而是...`;
- `验证闭环`;
- `判断框架`;
- `图里是...，长文放在 X Article`;
- `我写了一篇`;
- `欢迎阅读`;
- `希望对你有帮助`;
- `用白话说`;
- `这个问题很有意思`;
- `我们可以看到`;
- generic questions such as `你怎么看`.

If the project-level `x-writing` community skill is available, use its `references/anti-patterns.md` as a cleanup checklist for rhythm, inflated vocabulary, formal transitions, and reframing cliches. Do not inherit its English-only examples blindly; Chinese technical specificity and this skill's output contract win.

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
- If evidence is missing, write `还需要用 <metric/test> 验证` instead of pretending it is proven.

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
AI 性能优化先看 baseline
每轮都要能复测
```

When asked to generate the image, use the built-in `imagegen` skill directly. Do not require `OPENAI_API_KEY` for the preferred path. After generation, register the chosen image into the social-growth expected path with `social:register-image`.

## Follow-Up Replies

Write 1-2 replies only when they add substance:

- one failure mode;
- one checklist;
- one proof caveat;
- one implementation constraint.

No generic bumping, no mass replies, no unrelated thread hijacking.

## Rewrite Pass

Before returning the JSON, do this pass:

- Does the first line say something a technical reader can agree or disagree with?
- Is the mechanism visible before the first blank line?
- Would `social:validate` reject the first line as generic article praise or AI-smelling meta copy?
- Can the image be understood without the article?
- Does the copy avoid negative parallelism such as `不是 X，而是 Y` and template handoff lines such as `图里是...长文...`?
- Would this still read naturally if a human technical lead posted it?
- Does the X Article separate problem and cause?
- Does the blog URL appear only at the end of the X Article?
- Are replies adding new substance rather than repeating the hook?
- Would this still read naturally if a human technical lead posted it?

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
