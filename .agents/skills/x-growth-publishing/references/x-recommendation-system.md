# X Recommendation System Notes

Checked on 2026-05-18 for Clean993 growth work.

Use this as an operating model, not as a claim that we know every production weight. X changes production systems continuously, and the open-source repositories are snapshots or representative implementations. The useful part for us is the data flow: candidate entry, hydration, filtering, multi-action prediction, diversity, and conversion.

## Sources

Primary sources:

- X Help, `Recommender Systems`: https://help.x.com/en/resources/recommender-systems
- X Help, `For You Home Timeline Recommendations`: https://help.x.com/en/resources/recommender-systems/for-you-home-timeline-recommendations
- `xai-org/x-algorithm` README: https://github.com/xai-org/x-algorithm
- `xai-org/x-algorithm` Phoenix README: https://github.com/xai-org/x-algorithm/blob/main/phoenix/README.md
- `twitter/the-algorithm` README: https://github.com/twitter/the-algorithm
- `twitter/the-algorithm` Home Mixer README: https://github.com/twitter/the-algorithm/blob/main/home-mixer/README.md
- `twitter/the-algorithm` SimClusters README: https://github.com/twitter/the-algorithm/blob/main/src/scala/com/twitter/simclusters_v2/README.md
- `twitter/the-algorithm` Real Graph README: https://github.com/twitter/the-algorithm/blob/main/src/scala/com/twitter/interaction_graph/README.md

## What The Current Open Source Model Says

The 2026 `xai-org/x-algorithm` release describes the For You feed as:

1. Query hydration: load viewer context such as engagement history and followed accounts.
2. Candidate sourcing: combine in-network posts from `Thunder` with out-of-network posts from `Phoenix Retrieval`.
3. Candidate hydration: add post, author, media, language, subscription, engagement, brand-safety, and graph features.
4. Pre-scoring filters: remove duplicates, old posts, self posts, blocked/muted authors, muted keywords, previously seen/served posts, and ineligible content.
5. Scoring: Phoenix predicts probabilities for many actions, then a weighted scorer combines them.
6. Diversity and out-of-network adjustment: repeated authors and out-of-network content are adjusted before final selection.
7. Post-selection filtering: final visibility and duplicate conversation filters.

The practical implication: there is no single "PV trick". We need a candidate that can enter the right pools, survive filters, predict meaningful actions, and convert attention into follows.

## What The Older 2023 Repository Adds

The 2023 `twitter/the-algorithm` repository is still useful for vocabulary and older architecture:

- Home Mixer orchestrates For You, Following, Lists, ads, who-to-follow, conversations, social context, and serving.
- For You used candidate generation, feature hydration, ML scoring, filters/heuristics, mixing, and product serving.
- The Home Mixer README explicitly names author diversity, content balance, feedback fatigue, deduplication, previously seen removal, and visibility filtering.
- Candidate sources included in-network search, User Tweet Entity Graph, CR Mixer, and Follow Recommendation Service.
- SimClusters explains community/topic embeddings built from follow and engagement graphs.
- Real Graph estimates the probability that one user will interact with another user, using decayed interaction aggregates such as favorites, reposts, follows, profile views, and post clicks.

The practical implication: distribution is graph-shaped. A post that earns replies, reposts, bookmarks, profile clicks, or follows from the right technical cluster is more valuable than a generic post that gets shallow likes from random viewers.

## What X Help Confirms Publicly

X Help says For You includes posts from accounts and Topics a user follows plus recommended content from accounts they do not follow. It names signals such as:

- accounts the viewer follows;
- Topics the viewer follows;
- posts the viewer likes;
- posts liked by people in the viewer's network;
- accounts followed by people in the viewer's network;
- user controls such as mutes, blocks, reports, and other feedback.

The practical implication: Clean993 needs a consistent topic promise. If the account looks like a generic personal profile, profile clicks leak before they become follows.

## Mapping To Clean993 Metrics

| X algorithm stage | What it means for us | Local metric/proxy | Clean993 action |
|---|---|---|---|
| Candidate entry | The post must be eligible and relevant to a technical graph | published posts, image readiness, language/topic fit | publish image-backed X Article packages, not raw blog links |
| Hydration quality | The system can understand post, media, author, language, and topic | article topic, Chinese copy, image alt/prompt, hashtags | keep Chinese technical framing and one clear mechanism |
| Multi-action prediction | The ranker predicts many possible actions, not just likes | replies, reposts, quotes, bookmarks, profile clicks, follows | write claims that earn saves, corrections, serious replies, and profile visits |
| Negative feedback | Predicted mute, block, report, not-interested pushes content down | low interaction after views, visible negative replies, follower loss | avoid rage bait, duplicate templates, mass replies, fake certainty |
| Author diversity/fatigue | Repeated author/content patterns can be attenuated | duplicate short posts, same frame reused | rotate topics and variants; do not flood with the same hook |
| Profile handoff | A viewer who likes a post must understand why to follow | profile clicks, follows, profile audit | fix bio and pinned post before scaling volume |
| Winner scaling | Reuse patterns that create follows, not just views | follow per view, follow per profile click | reuse the mechanism, not identical surface wording |

## Content Rules Derived From The Algorithm

Short post:

- First screen must state a concrete Chinese claim plus mechanism.
- Do not put the blog URL in the short post; the external click happens after the in-X Article has delivered value.
- Sell the image and X Article because media and in-product engagement help the candidate earn actions before an external bounce.
- Prefer content that naturally creates bookmarks, replies, reposts, quotes, profile clicks, or follows.

X Article:

- Finish the value inside X before asking for a blog click.
- Separate problem, cause, mechanism, tradeoff, and verification.
- Put the blog URL only at the end as archive/full detail.
- Add a reason to follow the account when the article establishes a repeatable series.

Image:

- Use image 2 / `gpt-image-2` for a mobile-readable technical diagram.
- The image should explain the mechanism faster than text, not decorate the post.
- Avoid fake UI, tiny text, logos, or generic AI visuals.

Replies:

- Replies should add a proof caveat, failure mode, or reusable checklist.
- Do not use mass replies, comment bait, or unrelated viral hijacking.
- Treat every public reply as a public action requiring confirmation.

Profile:

- Bio must state the recurring promise: AI engineering, frontend performance, React/testing, technical blogging, measurable loops.
- Pinned post must answer why a technical reader should follow.
- Profile conversion is part of the ranking loop because profile clicks without follows waste distribution.

## What Not To Do

- Do not optimize for raw PV alone. Views without interactions or follows only prove entry, not influence.
- Do not assume fixed public weights such as "bookmark equals N likes"; the 2026 release describes weighted multi-action prediction but does not publish a universal production weight table.
- Do not post many near-duplicates. Diversity/fatigue and duplicate filters are explicit system concerns.
- Do not use controversy that attracts mutes, blocks, reports, or "not interested" feedback.
- Do not evaluate content before metrics are hydrated. A post with no captured views/profile clicks/follows is not enough evidence.

## Operating Loop

Use this loop after every confirmed publication:

1. Record the X Article URL and image-backed short-post URL.
2. Capture visible profile followers and per-post metrics.
3. Run:
   ```bash
   npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
   npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown
   npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
   ```
4. Read the funnel bottleneck:
   - no published posts: ship the first package;
   - no views: capture metrics first;
   - views but no interactions: rewrite hook, image promise, mechanism;
   - interactions but no profile clicks: add account promise in X Article/replies;
   - profile clicks but no follows: fix bio and pinned post;
   - follows recorded: scale the winning mechanism with new surface wording.
5. Regenerate the next X technical sharing brief and apply only the fields allowed by the copy override bridge.

## One-Week Target Implication

The `+1000 followers in 7 days` target is aggressive for a small baseline. The local system should therefore optimize for measurable influence, not for a comfortable publishing checklist:

- ship 2-4 confirmed high-quality posts per day when images and confirmation are ready;
- prioritize posts that are likely to earn bookmarks, serious replies, reposts/quotes, profile clicks, and follows;
- use read-only search to find relevant technical conversations, but only reply where the reply adds real mechanism or proof;
- fix profile promise and pinned post early, because every viral-ish post will otherwise leak profile interest.
