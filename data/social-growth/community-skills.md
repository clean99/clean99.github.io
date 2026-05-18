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

## Rejected for This System

- Twitter/X API automation skills: conflicts with the explicit no-X-API constraint.
- Typefully or scheduler skills: creates a third-party publishing path outside the browser confirmation boundary.
- Generic automation skills that can like, follow, repost, or reply directly: too much public-action risk for the Clean993 account.

## Invocation Order

1. `x-growth-publishing` remains the controller.
2. `x-technical-sharing` produces X-native Chinese technical copy.
3. `social-writer` audits hook shape, thread pacing, and AI-writing patterns.
4. `twitter-algorithm-optimizer` audits algorithmic reach hypotheses.
5. `humanizer-zh` removes stiff phrasing and template residue.
6. Local quality gate, image readiness, browser readiness, and confirmation boundary decide whether the package is eligible.
