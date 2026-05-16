---
title: "全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计"
date: 2026-05-16 12:30:31
tags: [AI, Software Engineering, Web Performance, Frontend]
lang: zh
i18n_key: Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
permalink: zh/2026/05/16/Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops/
---

> **TL;DR**: AI 性能优化真正有价值的部分，不是“让 Agent 把页面变快”。真正有价值的是搭一个能观测性能的 harness，给它一个可度量目标，然后强制每次代码修改都经过 profile、诊断、修复、部署、对比和记录的闭环。本文讲的是我如何围绕这个思路设计一个全自动性能优化 skill。

## 为什么要做这个

以前做性能优化，流程通常非常手工：

1. 打开 Chrome DevTools。
2. 抓一次 profile。
3. 猜哪个 waterfall 条目最重要。
4. 改一点代码。
5. 部署到某个环境。
6. 如果还有耐心，就再测一次。
7. 如果还记得 baseline，就把结果写下来。

这个流程的数据结构是错的。瓶颈、代码修改、部署版本、测量条件、最终结论都散落在不同地方。一旦循环超过几轮，人就变成了数据库。

我做的这个 skill，解决的就是这个问题。它不把 AI 当代码生成器，而是把 AI 当成一个严格性能闭环的执行者。

![AI performance optimization architecture](/img/ai-performance-loop/architecture.svg)

## 核心思路

这个系统有三个关键部分。

| 部分 | 职责 | 为什么重要 |
| --- | --- | --- |
| Harness | 让目标路由、指标、限速、请求头、运行版本和 waterfall 可观测 | 没有它，Agent 只是在优化感觉 |
| Goal | 定义什么叫成功，例如让某个指标下降 30% | 没有它，循环没有停止条件 |
| 能力层 | 接入文档、测试、部署、日志、profiling、监控和 ledger | 没有它，Agent 只能提建议，不能闭环 |

这里真正新的 AI 概念，不只是“Agent 会写代码”，而是**在可度量 harness 中进行 goal-driven execution**。

当目标是“把 FMP 降低 30%”时，Agent 不应该随机套用懒加载、预取、拆包这些常见建议。它应该先证明当前 FMP 花在哪里，选一个瓶颈，做一个聚焦修改，部署它，再用同样条件 profile 同一路由、同一个 marker。

如果指标没有变化，这个修改就不是性能收益。它可以是清理、测量修复，或者正确性修复，但不能被叫作优化成功。

## 这个 Loop 怎么跑

这个 skill 故意采用一个很朴素的循环：

![Performance loop flow](/img/ai-performance-loop/loop.svg)

```text
profile -> waterfall -> diagnose -> fix -> local verify -> commit/push
-> deploy to swimlane -> profile again -> compare -> document -> repeat
```

这里的基本单位是 round。代码能编译，不代表一个 round 完成。部署成功，也不代表完成。冒烟测试能打开页面，也不代表完成。

一个 round 必须有 verdict。

| Verdict | 含义 |
| --- | --- |
| strict win | 同一路由、同一 marker、同一限速、同一登录态，结果变好 |
| directional | 有参考价值，但不是严格对比 |
| measurement repair | 抓数错了、marker 缺失、marker 太早，或者测到的是登录页不是应用页 |
| not a win | 指标回退、jank 被挪到 visible 之后，或者结果混杂 |
| not measured | 代码发出去了，但性能测量缺失 |

很多性能自动化的问题就在这里：它自动化了 patch，却没有自动化 proof。这样只会更快地产生自欺欺人的结果。

## Harness 才是产品

Harness 定义了 Agent 可以相信什么。

做前端 FMP 优化时，我默认的严格 profiling 条件包括：

- 已登录会话；
- 同一个目标路由；
- 同一个最终 marker，例如 `fmpReportDuration` 或业务自定义 FMP marker；
- 同一个 swimlane 或部署请求头；
- 在需要严格对比时禁用浏览器缓存；
- 4x CPU throttling；
- 4G 网络 throttling；
- 运行时证明，例如部署版本和环境；
- 有限的采集窗口，避免旧 profiler 污染后续 round。

最重要的设计选择是：部署成功、单测、E2E、代码 review 都不能被当作性能证明。它们是安全门禁，不是性能收益证明。性能证明必须来自 profiling。

这个分离能让循环保持诚实。

## Ledger 的价值

Ledger 不只是报告，它是这个循环的记忆模型。

![Performance ledger example](/img/ai-performance-loop/ledger.svg)

每个 round 都记录 baseline、修改点、部署版本、marker 对比、waterfall 证据、本地门禁、部署证明、verdict 和下一个瓶颈。有价值的 ledger 片段不是原始命令日志，而是能让另一个工程师快速回答这些问题的证据行：

- 为什么选这个修改？
- 它攻击的是哪个瓶颈？
- 同一个 marker 是否在同样条件下变好了？
- 结果是 accepted、directional、measurement-only、negative，还是 blocked？
- 下一轮应该打哪里？

下面是一些脱敏后的 ledger 模式，它们比流水账更有教学价值：

| Ledger 模式 | 它教会了什么 |
| --- | --- |
| “上一次有效 strict profile 是下一次修改的 baseline” | 不要拿过期或方便的数字做对比 |
| “Waterfall 必须是 profiling waterfall，不是 action/deploy timeline” | 部署时间线解释不了浏览器性能 |
| “如果 shell-visible 变快但 post-visible jank 变差，标记为 not a win” | 更快的坏体验仍然是坏体验 |
| “如果 capture 落到 SSO，这不是应用 FMP capture” | 先修测量，再谈优化 |
| “一个瓶颈、一个聚焦 patch、一个严格对比” | 不要叠一堆猜测修改，再调试混合失败 |

即使明天换一个 Agent，我也会保留这部分设计。好的 ledger 让循环可迁移。

## Skill 设计：策略优先于聪明

这个 skill 非常强约束。它包含一些防止 Agent 走捷径的规则：

1. **从证据开始，不从想法开始。** 下一个修改必须来自最新 waterfall、marker table、long task、console 信号或可见回归。
2. **正确性优先于性能。** 如果修改导致 ghost frame、旧内容、白屏或严重 jank，循环会暂停优化，先修复或回滚。
3. **失败 round 是一等公民。** 性能优化可以失败，但必须被标记、记录，并在下一次猜测修改前处理掉。
4. **严格对比不可侵犯。** 同一路由、同一 marker、同一限速、同一运行时证明。否则最多只能叫 directional。
5. **文档是门禁。** round 没有解释清楚修改、证据、verdict 和 next target，就不算结束。

这很重要，因为 AI Agent 很擅长“继续做”。没有策略，它也会继续朝错误方向做。Skill 的作用就是给 Agent 定义工作形状：什么时候推进，什么时候停，什么时候回滚，什么时候只问缺失输入。

## 能力层：把建议变成执行

一句 prompt 可以告诉你“试试预取”。一个真正的性能闭环要做更多事情：

- 读取内部文档和历史 profiling 记录；
- 跑本地 lint、单测和目标 E2E；
- 部署到隔离环境；
- 证明当前路由加载的是目标版本；
- 用正确请求头打开已登录路由；
- 采集浏览器 marker 和 waterfall；
- 当瓶颈转移到后端时，查 request ID 或日志；
- 检查监控数据；
- 每一轮更新 ledger。

这个能力层，才让 Agent 从建议引擎变成执行者。

结论很简单：如果 Agent 不能观测、部署、验证和记忆，它就不能真正负责性能优化。它只能写 patch。

## 读者可以复用什么

你不需要同样的内部基建，也可以复用这个设计。核心结构是：

1. 选一个用户可感知指标。
2. 为这个指标搭一个可重复 harness。
3. 定义 strict comparison 规则。
4. 把上一次有效 profile 作为下一轮 baseline。
5. 强制每次修改都有 verdict。
6. 记录失败 round，而不是掩盖它。
7. 把 ledger 当成系统的一部分，而不是事后文档。

一个小团队可以从 Playwright、Chrome DevTools Protocol、类生产测试账号、固定路由列表和一份 Markdown ledger 开始。这已经足够消除大部分模糊地带。

## 真正的落地结果

成功落地的点，不是 AI Agent 某一次写出了聪明优化，而是这个 loop 能持续运转：

- 找出当前最大瓶颈；
- 做一个聚焦修改；
- 验证本地安全性；
- 部署精确 commit；
- 再次 profile 同一路由；
- 对比 strict metrics；
- 记录 verdict；
- 决定下一轮瓶颈。

这改变了 AI 在性能优化中的角色。Agent 不再只是辅助实现，它开始执行一个可度量的工程过程。

我认为 AI 工程工作流会越来越往这个方向走：少一点“生成一些代码”，多一点“在真实 harness 和真实目标下运营一个闭环”。
