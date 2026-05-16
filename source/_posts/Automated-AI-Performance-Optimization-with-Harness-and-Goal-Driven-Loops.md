---
title: "Automated AI Performance Optimization with Harness and Goal-Driven Loops"
date: 2026-05-16 12:30:31
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: en
i18n_key: Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
---

> **TL;DR**: The useful part of AI performance optimization is not "ask an agent to make the page faster." The useful part is building a harness that makes performance observable, setting a measurable goal, and forcing every code change through a loop of profile, diagnose, fix, deploy, compare, and record. This post explains how I designed a fully automated performance optimization skill around that idea.

## Why I Built This

Performance optimization used to be a very manual workflow for me:

1. Open Chrome DevTools.
2. Capture a profile.
3. Guess which waterfall bar matters.
4. Make a small change.
5. Deploy it somewhere.
6. Measure again, if I still have enough patience.
7. Write down the result, if I still remember the baseline.

That workflow has a bad data structure. The bottleneck, the code change, the deployed version, the measurement condition, and the final verdict all live in different places. Once the loop spans multiple rounds, the human becomes the database.

The skill I built tries to fix exactly that. It does not treat AI as a code generator. It treats AI as the operator of a strict performance loop.

![AI performance optimization architecture](/img/ai-performance-loop/architecture.svg)

## The Core Idea

The system has three important parts.

| Part | Responsibility | Why it matters |
| --- | --- | --- |
| Harness | Makes the target route, metric, throttling, headers, runtime version, and waterfall observable | Without this, the agent is optimizing vibes |
| Goal | Defines what success means, such as reducing a specific metric by 30% | Without this, the loop has no stop condition |
| Capability layer | Connects docs, tests, deployment, logs, profiling, monitoring, and the ledger | Without this, the agent can suggest work but cannot close the round |

The modern AI concept here is not only "agentic coding." It is **goal-driven execution inside a measurable harness**.

When the goal is "reduce FMP by 30%," the agent should not randomly apply common tips like lazy loading, prefetching, or bundle splitting. It should first prove where the current FMP is spent, choose one bottleneck, make one focused change, deploy it, profile the same route again, and compare the same marker under the same conditions.

If the metric does not move, the change is not a performance win. It may still be a cleanup, a measurement repair, or a correctness fix, but it is not a win.

## The Loop

The skill follows a boring loop on purpose:

![Performance loop flow](/img/ai-performance-loop/loop.svg)

```text
profile -> waterfall -> diagnose -> fix -> local verify -> commit/push
-> deploy to swimlane -> profile again -> compare -> document -> repeat
```

The round is the unit of work. A round is not complete when the code compiles. It is not complete when the deployment succeeds. It is not complete when a smoke test opens the page.

A round is complete only when it has a verdict:

| Verdict | Meaning |
| --- | --- |
| strict win | Same route, same marker, same throttling, same login state, better result |
| directional | Useful signal, but not a strict comparison |
| measurement repair | The capture was wrong, missing, too early, or measuring login instead of the app |
| not a win | A metric regressed, jank moved after visible, or the result is mixed |
| not measured | The change shipped, but the performance capture is missing |

This is where most performance automation fails. It automates the patch but not the proof. That produces faster iteration, but also faster self-deception.

## The Harness Is the Product

The harness defines what the agent is allowed to believe.

For frontend FMP work, my default strict profiling setup includes:

- authenticated session;
- the same target route;
- the same final marker, such as `fmpReportDuration` or an app-specific FMP marker;
- the same swimlane or deployment headers;
- disabled browser cache when the comparison requires it;
- 4x CPU throttling;
- 4G network throttling;
- runtime proof, such as deployed version and environment;
- a finite capture window so stale profilers do not contaminate later rounds.

The important design choice is that deployment success, unit tests, E2E, and code review are not allowed to become performance proof. They are gates for safety. Performance proof must come from profiling.

That separation keeps the loop honest.

## What the Ledger Adds

The ledger is more than a report. It is the memory model of the loop.

![Performance ledger example](/img/ai-performance-loop/ledger.svg)

Each round records the baseline, change, deployed version, marker comparison, waterfall evidence, local gates, deployment proof, verdict, and next bottleneck. The useful ledger snippets are not raw command logs. They are compact evidence rows that let another engineer answer:

- Why was this change chosen?
- Which bottleneck did it attack?
- Did the same marker improve under the same conditions?
- Was the result accepted, directional, measurement-only, negative, or blocked?
- What should the next round attack?

Here are a few public-safe examples of ledger patterns that turned out to be important:

| Ledger pattern | What it teaches |
| --- | --- |
| "Previous valid strict profile is the baseline for the next change" | Do not compare against a stale or convenient number |
| "Waterfall must be profiling-only, not an action/deploy timeline" | A deployment timeline is not a browser performance explanation |
| "If shell-visible improves but post-visible jank gets worse, label it not a win" | A faster broken experience is still broken |
| "If the capture lands on SSO, it is not an app FMP capture" | Measurement repair comes before optimization |
| "One bottleneck, one focused patch, one strict comparison" | Avoid stacking speculative changes and debugging a mixed result |

This is the part I would keep even if the agent changed tomorrow. A good ledger makes the loop portable.

## Skill Design: Policy Before Cleverness

The skill is deliberately opinionated. It contains rules that prevent the agent from taking shortcuts:

1. **Start from evidence, not ideas.** The next change must come from the latest waterfall, marker table, long-task list, console signal, or visible regression.
2. **Correctness outranks performance.** If a change causes ghost frames, stale content, white screens, or severe jank, the loop pauses optimization and fixes or reverts first.
3. **Negative rounds are first-class.** Failed optimization is allowed, but it must be labeled, recorded, and handled before another speculative patch.
4. **Strict comparison is sacred.** Same route, same marker, same throttling, same runtime proof. Otherwise, the result is directional at best.
5. **Documentation is a gate.** The round is not finished until the ledger explains the change, evidence, verdict, and next target.

This matters because AI agents are very good at continuing. Without policy, they continue in the wrong direction. The skill gives the agent a shape of work: when to move, when to stop, when to revert, and when to ask for missing input.

## Capability Layer: Turning Advice into Execution

A prompt can tell you "try prefetching." A real performance loop must do much more:

- read internal docs and previous profiling records;
- run local lint, unit tests, and targeted E2E;
- deploy to an isolated environment;
- prove the deployed version;
- open an authenticated route with the right headers;
- capture browser markers and waterfall entries;
- inspect request IDs or logs when the bottleneck moves to backend;
- check monitoring data;
- update the ledger after every round.

That capability layer is what turns the agent from a suggestion engine into an operator.

The lesson is simple: if the agent cannot observe, deploy, verify, and remember, it cannot own performance optimization. It can only write patches.

## What Readers Can Reuse

You do not need the same internal infrastructure to copy the design. The reusable structure is:

1. Pick one user-visible metric.
2. Build a repeatable harness for that metric.
3. Define strict comparison rules.
4. Make the previous valid profile the next baseline.
5. Force every change to have a verdict.
6. Record negative rounds instead of hiding them.
7. Treat the ledger as part of the system, not as after-the-fact documentation.

For example, a small team can start with Playwright, Chrome DevTools Protocol, a production-like test account, a fixed route list, and a Markdown ledger. That is enough to remove most of the ambiguity.

## The Real Result

The successful landing was not that an AI agent wrote a clever optimization once. The result was a loop that could keep going:

- find the current top bottleneck;
- make a focused change;
- verify local safety;
- deploy the exact commit;
- profile the exact route again;
- compare strict metrics;
- record the verdict;
- decide the next bottleneck.

That changes the role of AI in performance work. The agent is no longer just helping with implementation. It is running a measurable engineering process.

That is the direction I think AI engineering workflows are moving toward: less "generate some code," more "operate a closed loop with a real harness and a real goal."
