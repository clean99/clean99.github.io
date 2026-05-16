---
title: "AI Performance Optimization Needs a Harness, Not Just an Agent"
date: 2026-05-16 13:05:51
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: en
i18n_key: Public-PoC-Goal-Driven-Performance-Optimization-Skill
---

> **TL;DR**: The hard part of AI-driven performance work is not getting an agent to edit code. The hard part is forcing every edit through the same loop: profile, diagnose, change one thing, verify, compare, and record the result. A harness turns performance optimization from "the agent tried something plausible" into a sequence of measurable claims.

Most performance automation fails in a boring way: the AI finds code that looks suspicious, makes a plausible change, runs tests, sees green checks, and calls it a win.

That is not performance optimization. That is code editing with vibes.

The useful design is stricter:

```text
goal -> harness -> profile -> bottleneck -> patch
-> verify -> compare -> ledger -> next bottleneck
```

The agent can be creative inside one round. The harness decides whether the round counts.

## The Loop

The loop has five pieces.

| Piece | Job | What it prevents |
| --- | --- | --- |
| Goal | Defines the metric and target, such as "reduce p90 FMP by 30%" | Endless local polishing |
| Harness | Captures comparable profiles for the same route, state, throttling, and marker | Fake wins from inconsistent measurement |
| Triage | Picks one bottleneck before touching code | Stacked guesses |
| Patch | Changes one thing with a clear rollback path | Large unreviewable diffs |
| Ledger | Records baseline, change, evidence, verdict, and next bottleneck | Losing the reasoning after the chat scrolls away |

The important rule is simple:

```text
Evidence decides the next action.
```

If the marker is wrong, fix the marker. If the profile is not comparable, label it directional. If the metric improves but visible behavior gets worse, it is not a win.

## A Minimal Skill Excerpt

This is the reusable core of the skill. The exact tools do not matter. Playwright, Chrome DevTools Protocol, Lighthouse traces, WebPageTest, or a custom runner can all work as long as the harness makes before/after comparison honest.

````markdown
---
name: performance-optimization-loop
description: Run goal-driven frontend performance optimization loops for FMP, LCP, INP, TTI, tab-switch latency, long tasks, network waterfalls, or any user-visible metric with repeated profiling and verified deltas.
---

# Performance Optimization Loop

## Core Rule

Run a measured loop until the goal is reached, the user stops, or the next step is blocked.

```text
profile -> waterfall -> diagnose -> fix -> local verify
-> target-environment profile -> compare -> document -> repeat
```

Do not call a code change a performance win until a comparable profile proves it.

## Inputs

Accept partial inputs and infer safe defaults:

- target route or user flow;
- target metric;
- goal;
- baseline profile, or permission to capture one;
- target environment;
- profiling constraints.

Default constraints:

- same route and same final marker;
- same authenticated state if login is required;
- same cache policy;
- same CPU and network profile;
- finite capture window;
- raw profile saved;
- summary written to the ledger.

## Round State

Maintain this state after every round:

- current goal;
- route or flow;
- baseline metric and profile path;
- current metric and profile path;
- change summary;
- local checks;
- target-environment proof;
- verdict: `strict win`, `directional`, `measurement repair`, `not a win`, or `not measured`;
- next bottleneck.

## Triage Order

Before changing code, pick exactly one target:

1. Correctness regression: visible breakage, wrong content, white screen, severe jank.
2. Measurement gap: missing marker, wrong route, login capture, inconsistent throttling.
3. Negative prior round: worse metric, worse jank, missing comparison, or failed verification.
4. Frontend-owned bottleneck: network waterfall, main-thread task, render cost, bundle cost, or cache miss.

If measurement is broken, repair measurement before optimizing.

## Strict Profiling Gate

A strict comparison requires:

- same route or user flow;
- same metric and final marker;
- same login state;
- same cache policy;
- same CPU and network profile;
- same target environment class;
- same warmup policy.

If any of those differ, label the result `directional`, not `strict win`.

Never use these as performance proof:

- code inspection;
- build success;
- unit tests;
- deployment success;
- smoke tests;
- "the change looks obviously faster."

Those are safety gates. Profiling is the performance proof.

## Negative Optimization Protocol

Performance work is allowed to fail. Hiding failure is not allowed.

If a change improves one metric but worsens visible behavior, post-visible jank, long tasks, or the target metric, mark it `not a win`.

Then:

1. Record the attempted change.
2. Record the negative evidence.
3. Fix or revert before stacking another speculative optimization.
4. Re-profile after the fix or revert.
5. Update the ledger with the final verdict.
````

## Failed Cases Are the Point

The harness is most valuable when it rejects a plausible optimization.

| Attempt | Why it looked good | What the harness found | Verdict |
| --- | --- | --- | --- |
| Start first-screen data prefetch earlier | One local run showed an earlier marker | Comparable profiles showed duplicate network work and no stable p90 improvement | Reverted |
| Defer a heavy widget bundle | Initial JavaScript cost dropped | First interaction paid the deferred cost and created a worse post-visible long task | Reverted |
| Reuse warmed cache across navigation | The second route felt faster | Correctness checks found stale first-screen data under a different filter state | Reverted |
| Batch several render updates | Render count improved | The target metric stayed inside measurement noise | Not a performance win |

These rounds are not waste. They are exactly why the loop exists. Without a ledger, a failed idea comes back later with a new variable name. With a ledger, the team knows what was tried, what failed, and why.

## What Readers Can Reuse

You do not need a large platform to copy the pattern.

1. Pick one user-visible metric and one route.
2. Make the profile reproducible before optimizing.
3. Save raw profiles, not just summaries.
4. Force every round to produce a verdict.
5. Treat reverted changes as useful evidence.

The fastest way to make AI useful for performance work is to narrow its freedom. Let it propose and implement experiments, but make the harness own truth.

Good performance automation is boring: one metric, one bottleneck, one patch, one comparison, one ledger entry. Then repeat.
