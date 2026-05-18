# Chinese X Creator Style Notes

Sources checked on 2026-05-18:

- `@lxfater` Rattibha profile and threads: https://en.rattibha.com/lxfater
- `@lxfater` public X profile (`铁锤人`): https://x.com/lxfater/with_replies
- `@lxfater` TwStalker public mirror: https://www.twstalker.com/lxfater
- `@lxfater` Karpathy knowledge-system thread: https://en.rattibha.com/thread/2039902366624010494
- `@lxfater` OpenClaw memory-system thread: https://en.rattibha.com/thread/2033748548915741131
- `@lidangzzz` Rattibha profile: https://en.rattibha.com/lidangzzz
- `@lidangzzz` TwStalker public mirror: https://twstalker.com/lidangzzz
- `@lidangzzz` Followin mirror: https://followin.io/zh-Hant/kol/4075583655
- `@lidangzzz` example discussion mirror: https://pincong.rocks/article/84235
- `@lxfater` SuperX profile sample and engagement snapshot: https://superx.so/creators/lxfater
- `@lxfater` TwStalker public mirror sample: https://www6.twstalker.com/lxfater

Do not imitate these creators' exact voice. Extract structure only.

## Patterns Worth Reusing

### 2026-05-18 Creator-Derived Update

From `@lxfater`:

- Strong posts often start with a concrete discovery, ranked list, milestone, or surprising result before adding the link.
- The technical content is packaged as practical utility: tool list, workflow, course order, article result, or what changed in day-to-day work.
- Engagement-heavy posts often expose proof or stakes early: views, stars, cost, time, concrete artifact, or operational result.

From `@lidangzzz`:

- The strongest reusable structure is not the profanity; it is the compressed market map: a blunt claim, a concrete case, then many observable criteria.
- Long posts create momentum by enumerating factors until the reader feels the model is complete.
- The profile promise is extremely explicit. Readers know what topics the account repeatedly judges.

Clean993 should borrow the structure, not the persona:

- first line: strong claim or useful discovery;
- second screen: concrete mechanism, proof marker, or diagnostic criteria;
- image: diagram the mechanism, not decoration;
- X Article: satisfy the click inside X;
- blog link: only archive/full detail at the end of the X Article.

### Research Utility Pattern

Observed in `@lxfater` style technical posts:

- Title states the useful discovery or measurable result, often with a number, ranking, saved cost, or concrete artifact.
- First paragraph names the pain in the reader's own words.
- The strongest posts translate a new paper/tool/agent trick into "what changed for my work tomorrow".
- Middle section breaks the system into numbered steps.
- Images are not decoration; they carry setup steps, architecture, or before/after proof.
- Ending gives the reader the next action.
- A strong post can link an X Article, but only after the short post has already sold the mechanism.

Use when the blog post is about AI tools, workflows, debugging, performance, or engineering process.

Template:

```text
我把 <topic> 拆成 <mechanism> 几个检查点。

先看 <observable failure>，再看哪一步有证据。

配图放检查顺序，X Article 写完整证据和取舍。
```

### Strong Thesis Pattern

Observed in `@lidangzzz` style posts:

- First sentence is a strong judgment.
- The post moves quickly into a concrete case.
- Lists are used to create argumentative momentum.
- The conclusion tells the reader what to do or stop doing.
- The useful part is the diagnostic frame. The toxic part is personal attack. Keep the first, drop the second.
- When borrowing this structure, keep the certainty tied to a falsifiable engineering criterion.

Use the structure, not the abusive tone. Avoid insults, slurs, personal attacks, and unsupported sweeping claims.

Template:

```text
<topic> 最容易被 <surface metric / false signal> 带偏。

我会先追 <mechanism>：场景、指标、动作、证据缺一项，结论就先放下。

配图把检查点摊开，X Article 写完整复盘。
```

### Case Story Pattern

Use when there is a concrete project result:

```text
这次复盘 <topic>，最容易误判的是 <surface issue>。

后来按 <mechanism> 拆开，才知道要先处理 <root cause>。

配图放排查顺序，X Article 写证据和取舍。
```

## Rules for Clean993

- Audience: Chinese technical readers who care about AI, frontend, testing, performance, and engineering judgment.
- Positioning: practical engineer, not guru; measured systems, not empty AI hype.
- First-line job: make a Chinese reader feel "这个和我遇到的问题有关".
- Strong openings need a concrete mechanism within the next two lines; pure attitude is cheap.
- Image job: explain structure faster than text.
- X Article job: satisfy the click inside X before sending the reader to the blog.
- Blog link job: archive and full detail, placed at the end of the X Article.
- First screen order: claim or pain -> mechanism/proof -> image. Do not lead with the blog URL.
- For technical posts, use first-person only when it points to a concrete project observation, metric, or failure signal.
- Avoid negative parallelism (`不是 X，而是 Y`, `不只是 X，更是 Y`) in short posts. It is now a high-frequency AI tell.
- Avoid template handoff lines such as `图里是...，长文放在 X Article`; use a concrete asset promise such as `配图放排查顺序，X Article 写证据和取舍`.
- Use a number only when it is real: saved tokens, views, steps, weeks, files, test count, or measured improvement.
- Replies should extend the technical frame. They are not a place to ask for likes or generic discussion.

## Do Not Use

- generic English hooks;
- raw long blog URLs in short posts;
- abusive personal style;
- fake certainty without evidence;
- "AI will change everything" without a mechanism;
- `验证闭环`;
- `判断框架`;
- `真正值钱`;
- `不是...而是...`;
- `图里是...长文放在 X Article`;
- more than two hashtags;
- mass replies or low-quality engagement bait.
