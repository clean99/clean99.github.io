---
title: "A Public PoC for a Goal-Driven Performance Optimization Skill"
date: 2026-05-16 13:05:51
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: en
i18n_key: Public-PoC-Goal-Driven-Performance-Optimization-Skill
---

> **TL;DR**: This is a public, sanitized PoC version of the performance optimization skill I used in a real frontend project. The internal version connected to company-specific deployment, logging, profiling, and documentation systems. This version removes all of that and keeps the part readers can reuse: a harness-first, goal-driven loop that forces every optimization through profiling, comparison, and a ledger.

## What This PoC Keeps

The useful part of the original skill was not the internal tooling. The useful part was the shape of the work.

| Keep | Why |
| --- | --- |
| One round, one bottleneck | Prevents stacked guesses |
| Harness before optimization | Bad measurements create fake wins |
| Strict before/after comparison | Performance claims need comparable data |
| Negative optimization protocol | Failed rounds must be reversible |
| Ledger | The loop needs memory, not chat history |

Everything company-specific should be removed: internal URLs, deployment systems, ticket systems, monitoring products, internal trace IDs, lane names, repository names, team names, and private document links. A good public skill should still work if the user only has Playwright, Chrome DevTools Protocol, a test route, and a Markdown file.

## The Minimal Skill

Below is the public PoC. It is intentionally shorter than the internal version. If a rule does not change the agent's behavior, it does not belong here.

````markdown
---
name: performance-optimization-loop
description: Run goal-driven frontend performance optimization loops. Use when the user wants to improve FMP, LCP, INP, TTI, tab-switch latency, long tasks, network waterfalls, or any user-visible performance metric with repeated profiling and verified deltas.
---

# Performance Optimization Loop

## Core Rule

Run a measured loop until the goal is reached, the user stops, or the next step is blocked.

Expected loop:

```text
profile -> waterfall -> diagnose -> fix -> local verify
-> deploy or run in target environment -> profile again
-> compare -> document -> repeat
```

Do not call a code change a performance win until a comparable profile proves it.

## Required Inputs

Accept partial inputs and infer safe defaults:

- target route or user flow;
- target metric, such as FMP, LCP, INP, TTI, tab-switch time, or long-task budget;
- goal, such as "reduce p90 FMP by 30%" or "keep INP under 200ms";
- baseline profile, or permission to capture one;
- target environment, such as local, staging, or production-like test lane;
- profiling constraints.

Default profiling constraints:

- same route and same final marker;
- authenticated state if the page requires login;
- browser cache disabled for cold-start comparisons;
- 4x CPU throttling for frontend startup work;
- network throttling suitable for the product's users;
- finite capture window;
- raw profile saved locally;
- summary written to the ledger.

## Round State

Maintain this state after every round:

- current goal;
- route or flow;
- baseline metric and profile path;
- current metric and profile path;
- changed files or change summary;
- local checks;
- target environment proof;
- verdict: `strict win`, `directional`, `measurement repair`, `not a win`, or `not measured`;
- next bottleneck.

## Triage Order

Before changing code, pick exactly one target using this order:

1. Correctness regression: visible breakage, wrong content, white screen, severe jank.
2. Measurement gap: missing marker, wrong route, login page capture, inconsistent throttling.
3. Negative prior round: worse metric, worse jank, missing comparison, or failed verification.
4. Frontend-owned bottleneck: network waterfall, main-thread task, render cost, bundle cost, or cache miss.

If the measurement is broken, repair measurement before optimizing.

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

## Diagnosis Rules

Classify the bottleneck before fixing:

- measurement bug: marker missing, marker too early, wrong route, login page capture;
- network critical path: first-screen API starts late, duplicates, misses cache, or blocks render;
- main-thread work: long task, heavy evaluation, render, layout, or hydration;
- resource cost: large critical JS/CSS, unused startup code, expensive vendor chunk;
- cache/prefetch bug: warmed data not consumed, key mismatch, unsafe stale data;
- backend blocker: slow required endpoint with no safe frontend workaround.

Choose the smallest safe frontend experiment. Do not optimize random large files.

## Fix Rules

For each code change:

1. State the bottleneck and evidence.
2. Make one focused patch.
3. Add or update focused tests when logic changed.
4. Run local checks.
5. Capture a new profile under comparable conditions.
6. Compare against the previous valid baseline.
7. Update the ledger.

## Negative Optimization Protocol

Performance work is allowed to fail. Hiding failure is not allowed.

If a change improves one metric but worsens visible behavior, post-visible jank, long tasks, or the target metric, mark it `not a win`.

Then:

1. Record the attempted change.
2. Record the negative evidence.
3. Fix or revert before stacking another speculative optimization.
4. Re-profile after the fix or revert.
5. Update the ledger with the final verdict.

## Ledger Template

Append one section per round:

```markdown
## Round N: <short goal>

### Scope
- Route/flow:
- Metric:
- Goal:
- Environment:
- Throttling:

### Evidence Before Change
- Baseline metric:
- Top bottleneck:
- Why this bottleneck is next:

### Change
- Patch:
- Risk:
- Rollback:

### Verification
- Local checks:
- Target environment proof:
- Correctness check:

### Profile Comparison
| Metric | Previous | Current | Delta | Verdict |
| --- | ---: | ---: | ---: | --- |

### Waterfall Notes
- Critical API:
- Main-thread blocker:
- Resource blocker:
- Marker wait:

### Next Round
- Next bottleneck:
- Why:
```

## Stop Conditions

Stop and ask for input only when:

- the user says stop or changes scope;
- login or test data is required and no safe session exists;
- the next action would expose secrets;
- the next required change is destructive or production-affecting;
- the remaining bottleneck is proven outside frontend ownership with no safe experiment.
````

## Why These Rules Matter

The important design choice is not "make the agent persistent." Persistence without a harness just makes the agent confidently wrong for longer.

The important design choice is this:

```text
Evidence decides the next action.
```

That one line prevents most bad performance automation:

- It prevents optimizing before the marker is valid.
- It prevents claiming success from deployment.
- It prevents stacking five speculative changes.
- It prevents hiding regressions behind a single improved number.
- It forces the work to produce a ledger that another engineer can review.

## Failed Cases the Harness Caught

The most useful ledger entries were not always wins. Some were reverted changes that looked reasonable from code inspection, or even looked faster in one local run, but failed under a comparable profile.

| Attempt | Why it looked good | Harness evidence | Verdict |
| --- | --- | --- | --- |
| Start first-screen data prefetch earlier | The marker moved earlier in one local run | The comparable target profile showed duplicate network work and no stable p90 improvement | Reverted |
| Defer a heavy widget bundle | Initial JavaScript cost dropped | First interaction paid the deferred cost and created a worse post-visible long task | Reverted |
| Reuse warmed cache across navigation | The second route felt faster | Correctness check found stale first-screen data under a different filter state | Reverted |
| Batch several render updates | Render count improved | The waterfall was unchanged and the target metric stayed inside measurement noise | Not a win; reverted unless the patch also simplified code |

That is the point of the harness. It turns "this should be faster" into a falsifiable claim. A failed round is not wasted work if the ledger records the attempted change, the evidence, and the rollback. Without that loop, the same bad idea usually comes back two weeks later with a different variable name.

## What I Removed from the Internal Version

The internal version contained many adapters. They are useful inside one company and useless everywhere else.

| Removed | Public replacement |
| --- | --- |
| internal deployment systems | "deploy or run in target environment" |
| company monitoring/logging tools | "profile path, console/network evidence, request IDs if available" |
| private document update workflow | Markdown ledger |
| organization-specific route names | "target route or user flow" |
| exact team/process names | generic ownership labels |
| private URLs, tokens, headers | local/staging/prod-like environment proof |

This is the right abstraction boundary. The skill should define the loop and the proof rules. Tool adapters should live in separate private skills or scripts.

## How to Extend It

Add adapters only after the PoC loop works manually:

1. Add a script that captures a profile for one route.
2. Add a parser that extracts the target metric and top waterfall entries.
3. Add a ledger writer.
4. Add a deployment or preview adapter.
5. Add regression checks for the user flow.

Do not start by integrating every tool. That is how a simple loop turns into an unusable orchestration monster.

The good version is boring: one metric, one harness, one bottleneck, one patch, one comparison, one ledger entry.
