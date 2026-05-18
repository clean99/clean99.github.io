# Social Growth System

This repository now has a small, testable growth pipeline for turning blog posts into X distribution candidates and measuring follower/interaction progress.

## Boundary

The code can automate safe local work:

- read Hexo posts;
- generate UTM links;
- draft X posts and threads;
- create and persist a browser publishing queue;
- prepare exact handoff text for Chrome;
- mark published X URLs back into the queue;
- initialize a one-week follower target ledger;
- append follower and interaction snapshots;
- calculate follower and interaction progress from snapshots;
- generate reports.

The code must not silently perform public social actions. Posting, replying, liking, reposting, following, or changing account state in Chrome is a public action from the user's account. The browser operator must stop at the action point and get confirmation before the final click.

The system also does not implement mass interaction. That is bad engineering and bad distribution: it creates negative feedback risk and damages account trust.

## Data Model

```mermaid
flowchart LR
  A["Hexo article"] --> B["Distribution candidate"]
  B --> C["Browser publish action"]
  C --> D["X post URL"]
  D --> E["Metrics snapshot"]
  E --> F["Growth report"]
  F --> G["Next content plan"]
```

Core records:

- `Article`: parsed from `source/_posts/*.md`.
- `DistributionCandidate`: one article, one X variant, one UTM URL, one or more post bodies. The post text and `targetUrl` are separate so long UTM links are not truncated by local text guards.
- `PublishQueue`: local draft queue of candidates to hand to Chrome.
- `MetricsSnapshot`: date, follower count, per-post interactions.
- `GrowthReport`: follower delta, target progress, interaction totals, top posts.

## Commands

List recent posts:

```bash
npm run social:articles -- --limit 5
```

Draft X candidates for one post:

```bash
npm run social:draft -- --slug Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
```

Generate a multi-post plan from recent articles:

```bash
npm run social:plan -- --limit 3
```

Write a local publishing queue:

```bash
npm run social:queue -- --limit 3 --out data/social-growth/queue.json
```

Prepare the exact text a browser executor should fill:

```bash
npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>
```

After a confirmed browser publish, write the public X URL back to the queue:

```bash
npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url https://x.com/Clean993/status/<id>
```

Initialize a one-week follower ledger:

```bash
npm run social:init-ledger -- --followers 1234 --target 1000 --out data/social-growth/ledger.json
```

Append a snapshot:

```bash
npm run social:snapshot -- --ledger data/social-growth/ledger.json --date 2026-05-19 --followers 1300 --posts-file data/social-growth/posts.local.json
```

Summarize growth progress from a ledger:

```bash
npm run social:report -- --ledger data/social-growth/example-ledger.json
```

Generate a Markdown report:

```bash
npm run social:report -- --ledger data/social-growth/example-ledger.json --format markdown
```

Validate code:

```bash
npm run lint
npm test
npm run build
```

## Metrics

Primary metric for the first week:

```text
Follower Delta = latest followers - baseline followers
```

Supporting metrics:

```text
Interaction Total = replies + reposts + quotes + likes + bookmarks
Interaction Rate = Interaction Total / views
Post Score = follows*25 + reposts*8 + quotes*8 + replies*6 + bookmarks*5 + likes
```

The weights are deliberately simple. They are not "the X algorithm". They are a local business scoring rule that values follows and high-intent interactions above likes.

## Manual Snapshot Format

Use `data/social-growth/example-ledger.json` as the shape. Real local data should go into one of the ignored files:

- `data/social-growth/ledger.json`
- `data/social-growth/*.local.json`
- `data/social-growth/queue.json`
- `data/social-growth/snapshots/`

Do not commit private analytics or account history.

`posts.local.json` can be a plain array:

```json
[
  {
    "id": "Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops__en__sharp-take__00",
    "articleSlug": "Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops",
    "variant": "sharp-take",
    "url": "https://x.com/Clean993/status/0000000000000000000",
    "metrics": {
      "replies": "2",
      "reposts": "3",
      "quotes": "1",
      "likes": "40",
      "bookmarks": "5",
      "views": "1.5K",
      "profileClicks": "8",
      "follows": "4"
    }
  }
]
```

## First-Week Loop

1. Generate a queue with `npm run social:queue -- --limit 5 --out data/social-growth/queue.json`.
2. Pick 2-4 strong queue items for the day.
3. Run `npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>`.
4. Use Chrome to prepare the post.
5. Stop before publishing and confirm the exact text and account.
6. Publish only after confirmation.
7. Mark the published URL with `npm run social:mark-published`.
8. Record follower count and post interactions twice per day.
9. Run `npm run social:snapshot`.
10. Run `npm run social:report -- --format markdown`.
11. Double down on posts that create follows, replies, reposts, bookmarks, or profile clicks.

## Chrome Integration Plan

The browser layer should be thin. It should accept a `DistributionCandidate`, open X, fill the composer, and stop before the final publish action.

When publishing, append `targetUrl` to the post at `linkPostIndex`. Keep the link out of local truncation logic; X will shorten it through its own URL handling.

Do not put growth logic in the browser layer. The browser layer is only an executor. Article parsing, copy generation, UTM creation, and scoring stay in `tools/social-growth/`.

If Chrome is not logged in to X, stop and ask the user to log in.
