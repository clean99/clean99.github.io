---
title: "AI 性能优化需要 Harness，而不只是 Agent"
date: 2026-05-16 13:05:51
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: zh
i18n_key: Public-PoC-Goal-Driven-Performance-Optimization-Skill
permalink: zh/2026/05/16/Public-PoC-Goal-Driven-Performance-Optimization-Skill/
---

> **TL;DR**: AI 做性能优化，难点不是让 Agent 改代码，而是让每次修改都经过同一个闭环：profile、诊断、只改一个点、验证、对比、记录结果。Harness 的价值，就是把“Agent 做了一个看起来合理的修改”变成一组可验证的性能 claim。

很多性能自动化会死在一个很普通的问题上：AI 找到一段看起来可疑的代码，做了一个合理修改，测试全绿，然后宣布优化成功。

这不是性能优化。这只是带着体感的代码编辑。

真正有用的设计要更严格：

```text
goal -> harness -> profile -> bottleneck -> patch
-> verify -> compare -> ledger -> next bottleneck
```

Agent 可以在一轮里发挥创造力，但这一轮算不算数，必须由 harness 决定。

## 这个 Loop 由什么组成

这个闭环有五个核心部件。

| 部件 | 作用 | 防住什么问题 |
| --- | --- | --- |
| Goal | 定义指标和目标，比如“p90 FMP 下降 30%” | 无止境地局部打磨 |
| Harness | 在相同路由、状态、限速、marker 下抓可比 profile | 测量条件不同造成的虚假收益 |
| Triage | 改代码前只选一个瓶颈 | 连续叠猜测 |
| Patch | 一次只改一个点，并保留清晰回滚路径 | 巨大且不可 review 的 diff |
| Ledger | 记录 baseline、修改、证据、结论和下一个瓶颈 | 聊天记录滚过去以后丢失推理过程 |

最重要的规则很简单：

```text
Evidence decides the next action.
```

如果 marker 错了，先修 marker。profile 不可比，就只能标成 directional。指标变好但可见行为变差，不算成功。

## 核心 Skill 片段

下面是我认为真正可复用的部分。具体工具并不重要：Playwright、Chrome DevTools Protocol、Lighthouse trace、WebPageTest 或自研 runner 都可以。关键是 harness 必须让 before/after 对比可信。

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

## 失败 Case 才是重点

Harness 最有价值的时候，不是证明一个优化成功，而是拒绝一个看起来很合理的优化。

| 尝试 | 为什么看起来可行 | Harness 发现了什么 | 结论 |
| --- | --- | --- | --- |
| 更早触发首屏数据预取 | 某次本地运行里 marker 提前了 | 可比 profile 显示网络请求重复，p90 没有稳定改善 | 回滚 |
| 延后加载一个重组件 bundle | 初始 JavaScript 成本下降 | 首次交互承接了延后成本，可见后 long task 变差 | 回滚 |
| 跨导航复用 warm cache | 第二个页面体感更快 | 正确性检查发现不同筛选状态下首屏数据陈旧 | 回滚 |
| 把多次 render update 合成一次 | render 次数下降 | 目标指标变化仍在噪声区间 | 不算性能收益 |

这些 round 不是浪费，它们正是这个 loop 存在的原因。没有 ledger，一个失败点子过段时间会换个变量名重新出现。有了 ledger，团队知道试过什么、为什么失败、最后怎么处理。

## 读者可以直接复用什么

你不需要一个很大的平台才能复用这个模式。

1. 先选一个用户可感知指标和一个路由。
2. 优化前先让 profile 可复现。
3. 保存原始 profile，不只保存摘要。
4. 强制每一轮给出 verdict。
5. 把回滚过的修改也当成有价值的证据。

让 AI 真正适合性能优化，最快的方法不是给它更多自由，而是收窄自由：让它提出和实现实验，但让 harness 拥有最终解释权。

好的性能自动化应该很无聊：一个指标、一个瓶颈、一个 patch、一次对比、一条 ledger entry。然后重复。
