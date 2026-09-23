---
title: Agent Skills 探索实录 — AI Agent 时代的函数式蓝图
date: 2026-03-23 16:00:00
tags: [AI, Software Engineering, Claude Code, Agent, Skills]
lang: zh
i18n_key: Agent-Skills-The-Functional-Blueprint-for-AI-Agents
permalink: zh/2026/03/23/Agent-Skills-The-Functional-Blueprint-for-AI-Agents/
---

> **TL;DR**: Skill 就是跑在大模型上的函数——封装固定流程、定义输入输出、支持跨 Agent 复用。本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践，帮你把零散的 Prompt 经验沉淀为可复用的能力单元。

## 背景

![The Problem with Amnesic Agents](/img/agent-skills/amnesic-agents.png)

Agentic AI 领域概念层出不穷，而 Skills 是近几个月讨论最多、我认为也最重要的一个。本文记录了我探索 Skills 的过程，以及对其理解和实践的全面总结。

## Skills 的第一性原理

![First Principles: Skills as Functions for LLMs](/img/agent-skills/first-principles.png)

**Skill 本质上就是编程语言里的函数。**

传统编程中，我们把重复的业务逻辑抽象为函数，供后续复用。Skill 做的是同一件事，只不过执行者从计算机变成了大模型。函数跑在 CPU 上，Skill 跑在 LLM 上。因此，模块化编程的核心思想——单一职责、清晰接口、可组合性——同样适用于 Skill 设计。

## Skills 是什么？

> 官方定义：Skill 是一个封装了特定任务或工作流指令集的**简单文件夹**。它让 Agent 只需学习一次，就能在后续交互中重复使用你的偏好、流程和领域知识。

标准文件结构：

```
your-skill-name/
├── SKILL.md             # 必需：核心指令文件，YAML 元数据 + 工作流编排
├── scripts/             # 可选：可执行脚本 (Python, Bash 等)
├── references/          # 可选：按需读取的参考文档
└── assets/              # 可选：模板、图标等静态资源
```

## 什么时候需要 Skill？

把 Prompt 当作自然语言编程，那 Skill 就是"什么时候要抽函数"的问题。

**当一个相似模式在你的工作流中反复出现，就该把它抽象为 Skill。**

举个例子：我有一个生成全栈技术文档的流程，需要拉飞书 PRD、获取 Figma 设计稿、读取 Codebase，再按特定格式输出。这个流程可以拆成四个独立 Skill：

1. **获取飞书文档 Skill** — 下载 PRD，导出 AI 可理解的格式
2. **获取 Figma 设计稿 Skill** — 解析设计稿供 AI 理解
3. **获取 Codebase Skill** — 拉取目标仓库代码
4. **撰写技术文档 Skill** — 根据以上输入生成专业文档

每个 Skill 独立可复用，组合起来就是一个端到端的文档生成流水线。没有 Skill，每次都要在 Prompt 里手把手教 Agent 每一步——就像每次都给新员工从零培训一样低效。

![The Workflow Vision: Skill Chaining](/img/agent-skills/skill-chaining.png)

## 从抽象到落地：Skill 可以接管完整研发周期

我后来做过一个更复杂的 Skill：把一个前端研发任务从 TD 到泳道验收串成闭环。

它不是“让 AI 多写点代码”，而是让 Agent 按固定工程状态机推进：

```text
理解任务 -> 查 PRD / 设计 / 代码 -> 实现 -> 本地验证
-> commit / pipeline / 部署 -> 泳道运行时证明 -> 失败诊断
-> 修复或 blocker report -> ledger 记录
```

这类 Skill 的难点不在 prompt 写得多，而在状态设计：

| 状态 | 必须记录什么 |
| --- | --- |
| Task frame | 用户可见行为、影响路由、权威需求、验收环境 |
| Patch scope | 本轮改什么、不改什么、如何避免架构漂移 |
| Local gates | 单测、lint、build、必要的 E2E |
| Delivery proof | branch、commit、pipeline、部署版本、目标泳道 |
| Runtime proof | 页面版本、运行时环境、业务 API、可见 UI |
| Failure verdict | 前端 bug、后端阻塞、部署问题、认证问题、测量问题 |

社区里常说的 [Ralph Loop](https://ralphloop.sh/) 解决的是“Agent 失败后继续迭代”的问题。但如果没有这些状态和外部验证，它只会变成更持久的随机游走。完整研发周期 Skill 的价值，是把 loop 约束在真实工程制度里：测试不过不能提交，部署版本不匹配不能宣称完成，后端阻塞要输出可交给 owner 的证据，而不是让 Agent 自己脑补成功。

所以它表面上看像一个“大 Skill”，本质上仍然符合单一职责：**它负责研发闭环的控制面，不负责替每个子任务发明新流程。** 文档读取、设计解析、代码搜索、部署诊断、性能 profiling 都可以继续拆成独立 Skill，由这个控制面按状态调用。

## Skill vs MCP

![Defining the Boundaries: Skill vs MCP](/img/agent-skills/skill-vs-mcp.png)

很多人把 Skill 和 MCP 搞混，甚至认为 Skill 会取代 MCP。它们其实是不同维度的概念。

**Skill 是菜谱，MCP 是厨房。**

- **MCP** 提供的是**能力接入面**——Agent 能连上哪些系统、执行哪些动作。相当于厨房里的炉灶、刀具、冰箱。
- **Skill** 提供的是**做事方法**——什么情况做什么、先后顺序、火候控制、验收标准。

Skill 经常依赖一个或多个 MCP，而不是独立存在。两者是协作关系，不是替代关系。

## Skills 的底层原理

### 渐进式披露：按需加载上下文

![Progressive Disclosure](/img/agent-skills/progressive-disclosure.png)

Skill 区别于长 Prompt 的关键在于加载方式：**先暴露最小必要信息，确认相关后再逐层展开**。

- **第一层（YAML Frontmatter）**：始终加载在系统提示中，只包含名称、用途和触发条件。任务是让模型知道"什么时候该想到我"。
- **第二层（SKILL.md 主体）**：Agent 判断 Skill 相关时才加载，包含完整的指令和工作流。
- **第三层（补充文件）**：`references/` 或 `scripts/` 中的详细说明、示例和模板，只在执行过程中确实需要时才进入上下文。

核心价值：**经验可以沉淀很多，但每次只拿出当前需要的那一部分。**

### 单一职责：像微服务一样设计

![The Microservice Mindset](/img/agent-skills/microservice-mindset.png)

Skill 不应做"包打天下的大总管"，而应像边界清晰的工作流单元。

真实任务往往是多个环节拼接而成。比如线上故障处理：先用"日志查询"Skill 定位异常，接着用"变更核对"Skill 比对发布，最后用"结论汇总"Skill 输出报告。如果每个 Skill 都想从头做到尾，最终得到的是一堆职责重叠的超大 Prompt。

**好的 Skill 只负责自己最擅长的那一段，并能与其他 Skill 协同工作。**

### 纯文本、零绑定

Skill 是纯文本文件（Markdown + 辅助脚本），不绑定特定工具、框架、模型或部署环境。只要目标环境支持 Skill 规范且具备相应依赖，它就能继续工作。这为经验带来了可传递性和可迁移性。

## 如何设计好的 Skill

### 工程原则

- **原子化与单一职责**：一个 Skill 只做一件事。避免"万能" Skill，拆分为多个更小的单元。
- **稳定的输入输出契约**：触发条件和执行结果可预测。`description` 字段就是这个契约最重要的部分。
- **幂等性**：有副作用的操作（创建、删除）需要考虑重复执行的安全性，加入"是否已存在"的检查。
- **可观测性**：在指令中定义关键步骤的日志输出格式，方便问题定位。

### YAML 元数据：触发的关键

`SKILL.md` 头部的 YAML Front Matter 直接决定 Agent 是否以及何时加载你的 Skill。

最小格式：

```yaml
---
name: your-skill-name
description: What it does. Use when user asks to [specific phrases].
---
```

`description` 的核心任务是告诉 Agent 两件事：**这个 Skill 做什么，什么时候用它。**

好的写法：

```yaml
# 具体且包含触发短语
description: Analyzes Figma design files and generates developer handoff documentation. Use when user uploads .fig files, asks for "design specs" or "design-to-code handoff".
```

坏的写法：

```yaml
# 过于模糊，缺少触发条件
description: Helps with projects.
```

### 文件命名规范

- 文件夹使用 **kebab-case**，例如 `notion-project-setup`
- 核心文件必须命名为 **`SKILL.md`**（区分大小写）
- 文件夹内**不应包含** `README.md`

## 评估与测试

![QA for Agents: The Evaluation Matrix](/img/agent-skills/evaluation-matrix.png)

与传统软件测试类似，Skill 的验证需要覆盖三个层面：

1. **触发测试** — Skill 是否在正确的场景被激活
2. **功能测试** — API 调用和输出是否符合预期
3. **性能对比** — 相比手动 Prompt，Skill 是否真正提升了效率

## 快速创建 Skill 的最佳实践

目前我的工作流：**开始任务 → 用 Prompt + MCP 完成 → 调用 `skill-creator` 快速生成 Skill → 后续复用 → 持续改进。**

核心思路是先手动跑通一次，确认流程可行后再抽象为 Skill，而不是凭空设计。

---

*Skills 是 Agentic AI 时代的函数抽象。掌握好 Skill 的设计，就像掌握好函数设计一样——它决定了你能把多少经验沉淀为可复用的能力，而不是每次都从零开始。*
