---
title: Github Copilot 值得订阅吗？
date: 2022-12-18 18:42:26
tags: [development, copilot, tdd]
lang: zh
i18n_key: Does-Github-Copilot-Worth-It
permalink: zh/2022/12/18/Does-Github-Copilot-Worth-It/
---

我个人使用 Copilot 加速编程已经有很长一段时间了。我发现了一些 GitHub Copilot 能给我带来很大帮助的使用场景。对我来说，Copilot 至少将我的编程效率提升了 **30%**。所以，用一杯咖啡的价格（**每月 10 美元**）来订阅它对我来说绝对是值得的。
在这里，我想向你展示一些 Copilot 能够**加速**我们开发的场景，同时也为你介绍一些类似的工具，供你在日常工作中使用。

## 测试代码

对于前端开发者来说，编写测试的一大痛点是**对测试框架 API 的不熟悉**。自动化测试通常包含一些简单的脚本以及大量的**重复**内容，而这恰恰是 AI 的强项。经过一段时间的使用，我发现 **TDD**（测试驱动开发）是将测试与 Copilot 结合起来使用的**最佳**方式之一。
Copilot 对各种类型的测试都有很好的支持，例如**单元测试**、**端到端测试（e2e）**。Copilot 背后的数据集几乎涵盖了整个开源社区，你不必担心是否存在 Copilot 从未见过的 API。

### 尝试将 TDD 与 Copilot 结合

我将 TDD 与 Copilot 结合使用的原因在于，**Copilot 会读取你的代码库并给出提示**。所以如果我先写测试，Copilot 就会根据我之前写的测试来尝试生成代码。这节省了为了让 Copilot 生成代码而写**不必要注释**的时间。
下面是一个结合 TDD 和 Copilot 开发的简单 Todo 组件示例。

{% youtube VhRrEiR2rY0 %}

## 编写样式表

我**不喜欢**记忆大量的 **API** 和**样式规则**。说实话，人类并不擅长记忆，但计算机擅长。所以当我需要用一些**不熟悉**的样式规则编写样式表时，我会让 Copilot 来帮我。比如，我对 grid 的相关函数和规则不太熟悉，所以我会用 Copilot 来帮我完成。

<img alt="CSS with Copilot" src="/img/copilot/css.gif">

## 创建有用的映射

前端开发者需要为本地化创建**映射**。我们可以直接让 Copilot 来完成，而不必在网上搜索。

<img alt="Mapping with Copilot" src="/img/copilot/mapping.gif">

## 生成桩数据

如果你写了大量测试，就需要生成足够随机的桩数据（stubs）。你会发现这些数据不过是一些**相似**且**重复**的内容。**Copilot 在这方面同样表现出色。**

<img alt="Stubs with Copilot" src="/img/copilot/stubs.gif">

## 正则表达式 / 验证器

每当我需要编写**正则表达式**或**验证器**时，我总是需要去网上搜索，然后打开一个在线正则表达式运行器来测试它是否正常工作。现在有了 Copilot，我们只需告诉它我们需要什么规则，它就会为我们生成表达式或验证器。**当然，你也可以为此编写单元测试。**

<img alt="Validator with Copilot" src="/img/copilot/validator.gif">

## 信号流风格的数据处理

处理数据的一个强大技巧是将其视为信号流，这使得整个处理过程可以轻松地**解耦**为多个单元（如过滤、映射、归并……）。Copilot 在这种模式下表现良好。**我们只需写一条注释告诉 Copilot（以及其他开发者）数据是如何流动的，代码就会被完美生成。**
**小贴士**：拥有更高**模块化**程度的设计总是更容易**创建**、**修改**和**测试**。**当设计良好时，Copilot 也会生成更加准确的代码**。

<img alt="Signal with Copilot" src="/img/copilot/signal.gif">

## 一些有用的工具函数

我随机从代码库中挑了一个 `safeStringify` 工具函数。结果发现 Copilot 写出的版本比我自己的**更好**。

<img alt="Utils with Copilot" src="/img/copilot/utils.gif">

## 编写 vscode setting.json（或类似配置文件）

另一个实用的场景是，当我想在 vscode 中**配置某些内容**时，我会**只写一条注释**，然后让 Copilot 来完成。大多数情况下，它都能正常工作。
下面是一个为 vscode 配置 eslint 自动保存的示例：

<img alt="Vscode with Copilot" src="/img/copilot/eslint.gif">

## 其他有用的工具 / 竞品

### ChatGPT

我认为 ChatGPT 对我们来说是一个更强大的工具，因为**它不仅限于代码生成**。它还可以**解释代码**、**重构代码**，并**告诉你代码出错的原因**。（有很多创意性的使用方式。）但**Copilot 与 IDE 的协作更紧密**。目前 ChatGPT 仍然是一个独立的网站，其 vscode 插件并不好用。

#### 查询

随意向 ChatGPT **提问任何内容**。例如：如何在 Linux 中安装 xxx？社交网络应用的最佳数据库是什么？我有这样一个系统……我如何改进它？学习 React 的最佳资料是什么？

<img alt="Query with ChatGPT" src="/img/copilot/query.png">

#### 根据用例列表添加测试

告诉机器人你的用例是什么，它会给你非常准确的测试代码。太棒了！

<img alt="Tests with ChatGPT" src="/img/copilot/tests.png">

#### 解释代码

它可以**非常清晰地**解释你的代码。一个**技巧**是你应该**尽可能地提供上下文**，否则机器人会**根据函数名和参数来猜测**函数的用途，这可能导致**准确性降低**。
下面是我从教材中随机挑选的一段代码片段。

<img alt="Explain with ChatGPT" src="/img/copilot/explain.png">

#### 重构

令我震惊的是，它不仅提供了重构后的代码，还**告诉你为什么要这样重构**。

<img alt="Refactor with ChatGPT" src="/img/copilot/refactor.png">

#### 为什么我的代码出错了？

告诉你代码出问题的原因。在学习新语言或新库时非常有帮助。

<img alt="Broken with ChatGPT" src="/img/copilot/why broken.png">

### Tabnine

Tabnine 的功能与 GitHub Copilot 基本相同，但它支持**更多编程语言**并**强调隐私保护**。此外，GitHub Copilot 是**所有语言共用一个模型**，而 Tabnine 更倾向于使用**个性化的语言模型**。这会导致两者在建议上有一些**差异**。
我试用了 Tabnine Pro，但它**并没有像我预期的那样好用**。它似乎没有读取我的代码库，甚至**在 JS 文件中提供了 TS 语法**。
我的建议是：**如果你使用的语言被 GitHub Copilot 支持，请优先使用 GitHub Copilot**。

<img alt="Tabnine compare with Copilot" src="/img/copilot/tabnine.png">

## 总结

AI 还有很多其他可以帮助我们提升生活质量的场景。但**关键原则在于了解人类擅长什么，以及人类的局限性在哪里。** 我是一个不喜欢做**重复**工作或**记忆**大量细节的人。所以我非常高兴 AI 出现来帮助我完成大量工作。AI 会取代人类吗？可能不会。**因为目前 AI 仍然没有像人类那样的创造力。** 但在 AI 的帮助下，**我们可以专注于自己擅长的事情，更高效、更愉快地完成工作。**
