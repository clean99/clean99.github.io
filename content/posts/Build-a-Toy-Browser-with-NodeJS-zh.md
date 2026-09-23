---
title: 用 NodeJS 构建一个玩具浏览器
date: 2022-04-27 20:45:44
tags: browser
lang: zh
i18n_key: Build-a-Toy-Browser-with-NodeJS
permalink: zh/2022/04/27/Build-a-Toy-Browser-with-NodeJS/
---
## 开始之前

没错，我又给自己挖了一个坑。我看到了一本名为《Web Browser Engineering》的有趣书籍，它教如何用 Python 构建一个浏览器。由于我现在正在学习 SICPJS，并将在课程结束时构建一个编译器，我认为这两门课程可能有些关联。我阅读了这本书的目录，确实，这本书主要聚焦于浏览器的核心功能：渲染、网络、解析 DOM 等。但它似乎回避了深入探讨 JS 引擎部分，而是使用 `eval()` 来解析 JS 代码。所以我认为将两者结合起来是个好主意。

此外，我决定用 NodeJS 而非 Python 来实现这个浏览器。原因如下：
1. 这是练习和学习 NodeJS API 的好机会。
2. NodeJS 原生支持 JavaScript，这使我们的玩具浏览器速度更快。
3. NodeJS 拥有一个强大的社区，几乎能找到你所需的每一个模块。
4. 我非常喜欢 JavaScript，因为它快速演进，并且具有强大的表达能力，比如一等函数。

但为什么原书不用 JavaScript 或其他语言实现呢？作者在博客中实际上给出了[原因](https://browser.engineering/blog/why-python.html)。基本上，JavaScript 会遇到很多技术问题，比如如何让 eval 不影响其他页面，以及在 JavaScript 中处理多进程消息模型相当棘手。此外，浏览器中的网络受到限制。

但我会尝试用 NodeJS 来实现它，NodeJS 支持 [TLS](https://nodejs.org/api/tls.html)、Canvas 以及其他一些必要的模块。使用这门语言应该不会遇到太多麻烦，因为 NodeJS 有很多现成可用的模块。总之，让我们试一试，尽可能地克服挑战！

## 参考资料

[Web Browser Engineering](https://browser.engineering/)
[How Browsers Work: Behind the scenes of modern web browsers](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/)
[Structure and Interpretation of Computer Programs, JS Edtion](https://sourceacademy.org/sicpjs/)
