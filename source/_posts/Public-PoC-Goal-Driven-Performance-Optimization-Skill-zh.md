---
title: "一个公开版 Goal-Driven 性能优化 Skill PoC"
date: 2026-05-16 13:05:51
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: zh
i18n_key: Public-PoC-Goal-Driven-Performance-Optimization-Skill
permalink: zh/2026/05/16/Public-PoC-Goal-Driven-Performance-Optimization-Skill/
---

> **TL;DR**: 这是我真实项目里性能优化 skill 的公开脱敏 PoC 版本。内部版本接了公司里的部署、日志、监控、文档和 profiling 系统；这份版本把这些都删掉，只保留读者能复用的核心：harness-first、goal-driven loop，以及每轮都记录 baseline、修改点、严格对比和失败结果的 ledger。

## 这个 PoC 保留什么

原始 skill 真正有价值的不是内部工具，而是工作形状。

| 保留 | 原因 |
| --- | --- |
| 一轮只打一个瓶颈 | 防止叠猜测 |
| 先修 harness，再优化 | 错误测量会制造虚假胜利 |
| 严格 before/after 对比 | 性能收益必须有可比数据 |
| Negative optimization protocol | 失败 round 必须可回滚、可解释 |
| Ledger | loop 需要记忆，不是靠聊天记录 |

所有公司相关内容都应该删除：内部 URL、部署系统、工单系统、监控产品、内部追踪 ID、泳道名、仓库名、团队名、私有文档链接。一个好的公开版 skill，应该在读者只有 Playwright、Chrome DevTools Protocol、一个测试路由和一份 Markdown 文件时也能跑起来。

## 最小 Skill

下面是公开 PoC。它故意比内部版本短。不能改变 Agent 行为的规则，不应该出现在这里。

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

## 为什么这些规则重要

关键设计不是“让 Agent 持续运行”。没有 harness 的持续运行，只会让 Agent 更长时间地自信犯错。

关键设计是这句：

```text
Evidence decides the next action.
```

它能防住大多数糟糕的性能自动化：

- 防止 marker 没修好就开始优化。
- 防止把部署成功当性能成功。
- 防止连续叠五个猜测修改。
- 防止用一个变好的数字掩盖回归。
- 强制产出另一个工程师能 review 的 ledger。

## Harness 抓住的失败 case

最有价值的 ledger entry 不一定是成功。有些是已经回滚的修改：看代码很合理，甚至某次本地 profile 看起来更快，但在可比 profile 里失败了。

| 尝试 | 为什么看起来可行 | Harness 证据 | 结论 |
| --- | --- | --- | --- |
| 更早触发首屏数据预取 | 某次本地运行里 marker 提前了 | 可比环境 profile 显示网络请求重复，p90 没有稳定改善 | 回滚 |
| 延后加载一个重组件 bundle | 初始 JavaScript 成本下降 | 首次交互承接了延后成本，可见后 long task 变差 | 回滚 |
| 跨导航复用 warm cache | 第二个页面体感更快 | 正确性检查发现不同筛选状态下首屏数据陈旧 | 回滚 |
| 把多次 render update 合成一次 | render 次数下降 | waterfall 不变，目标指标变化仍在噪声区间 | 不算收益；除非代码更简单，否则回滚 |

这就是 harness 的价值。它把“理论上应该更快”变成可证伪的 claim。失败 round 不是浪费，只要 ledger 记录了尝试、证据和回滚结果。没有这个 loop，同一个坏点子两周后通常会换个变量名再出现。

## 我从内部版本删掉了什么

内部版本包含大量 adapter。这些 adapter 在公司内部有用，但公开后没有价值。

| 删除内容 | 公开替代 |
| --- | --- |
| 内部部署系统 | "deploy or run in target environment" |
| 公司监控和日志工具 | "profile path, console/network evidence, request IDs if available" |
| 私有文档更新流程 | Markdown ledger |
| 具体业务路由名 | "target route or user flow" |
| 团队和流程名 | generic ownership labels |
| 私有 URL、token、header | local/staging/prod-like environment proof |

这才是正确抽象边界。Skill 应该定义 loop 和 proof rules。工具 adapter 应该放在私有 skill 或脚本里。

## 如何扩展它

先手动跑通 PoC loop，再加 adapter：

1. 加一个脚本，为单个路由抓 profile。
2. 加一个 parser，提取目标指标和关键 waterfall 条目。
3. 加一个 ledger writer。
4. 加一个部署或 preview adapter。
5. 加用户流程回归检查。

不要一开始就集成所有工具。那会把一个简单 loop 做成没人能用的编排怪物。

好的版本很无聊：一个指标、一个 harness、一个瓶颈、一个 patch、一个 comparison、一条 ledger entry。
