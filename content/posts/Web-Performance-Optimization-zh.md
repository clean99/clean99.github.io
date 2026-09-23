---
title: Web 性能优化策略与实践
date: 2024-04-10 18:41:30
tags: [Software Engineering, Web Performance, Frontend]
lang: zh
i18n_key: Web-Performance-Optimization
permalink: zh/2024/04/10/Web-Performance-Optimization/
---

Web 性能优化至关重要，实现方式也多种多样。这是我优化公司项目的笔记，总结出了几种可以在不同情况下应用的通用策略：

- **性能分析（Profiling）**：在应用以下策略优化网站之前，我们需要了解网站的负载所在。Chrome 提供了一个 Profiling 工具来帮助我们做到这一点。
- **缓存（Caching）**：利用缓存来减少加载时间。
- **懒加载（Lazy Loading）**：通过仅在需要时加载资源来减少加载时间。
- **接口集成（BFF）**：利用 BFF 来整合 API 调用。

## 性能分析（构建上下文）

1. **PV/UV（页面访问量/独立访客）**：我们可以先获取网站的 PV/UV，从而了解网站中每个页面的重要程度，哪些页面可能是负载瓶颈，以便后续决定是否要优化它们。
2. **FMP（首次有效绘制）**：从打开 URL 到用户可以开始使用它，需要多长时间？
3. **性能分析**：使用 Profiling 来分析打开网站的整个流程，找出哪些部分拖慢了网站速度。此部分不详细介绍，请参考：（[分析运行时性能 - Chrome](https://developer.chrome.com/docs/devtools/performance)）

经过这些步骤，我得出了以下数据：

1. FMP：约 10000ms（极慢，这是我接手这个网站时的速度）
2. 性能分析结果细分，初步诊断主要问题：

| 优先级 | 项目 | FMP 耗时 | 可能的下一步 |
| --- | --- | --- | --- |
| P1 | UI 库初始化 | 300ms | 1. 预加载 <br> 2. 懒加载首页未使用的部分。 |
| P0 | 阻塞网络请求 <br> - 阻塞第一部分：<br> - API A 请求 - 720ms<br> - 配置 API - 689ms <br> - 阻塞第二部分：<br> - 权限检查 - 1000ms | 1600ms | 1. 缓存<br> 2. 懒加载<br> 3. 并行请求执行<br> 4. API 集成 |
| P3 | 下载子应用 HTML | 21ms | - |
| P0 | 下载并运行子应用 <br> 1. UI 库初始化 800ms <br> 2. 公共库 900ms | 1700ms | 1. 使用 Chrome 缓存。 |
| P0 | 查询配置 | 1000ms | 1. 整合并删除不必要的请求内容 <br> 2. 缓存 <br> 3. 预加载 |
| P0 | 加载了不必要的组件 | 1210ms | 1. 懒加载（动态导入） |

## 缓存：高效减少加载时间

缓存是 Web 性能优化中的常用策略，尤其在处理高流量网站时。基于在大多数情况下空间不如时间宝贵的概念，将频繁访问的数据缓存在存储区域可以减少加载时间和服务器负载，使网站更具响应性和效率。

**通过利用 Chrome 脚本缓存特性来减少重复公共库的下载**：
我们公司的微前端框架使用 `eval` 来加载子应用脚本：

```javascript
eval(proxyWindow){
    // ...code
}
eval(lodash) {
    // ...code
}
```

<img alt="OP 1" src="/img/web-op/1.png">

有一个更好的选项 `script`，它可以利用 Chrome 中的 [JS 代码缓存](https://v8.dev/blog/code-caching-for-devs)特性来缓存编译后的代码。这样下次加载代码时：

1. 我们不需要再次从远程下载它。
2. 我们不需要再次编译它。

因此我们改为使用 `script` 作为加载微前端脚本和库的方式，并防止下载主应用和子应用共用的 UI 库等公共库。

```javascript
// Execute Subapp's script
    const iframe = createIframe();
    patchWindow(iframe);
    patchDocument(iframe);

    scriptUrls.forEach(scriptUrl -> {
        const script = document.createElement('script');
        script.src = scriptUrl // Will create compile cache - Chrome feature
        iframe.append(script);
    });
```

## 懒加载：按需加载

懒加载是一种延迟加载某些资源直到真正需要时才加载的策略。这种方式可以显著减少初始加载时间并节省带宽，对于拥有大量图片或其他重型资源的网站尤其有益。

**使用 `React.lazy()` 来延迟组件的加载**

我发现有一些容器：

1. 用户很少使用它们。
2. 它们不影响用户在主页面上的工作流程。

因此在我进行性能分析时，它们没有必要在用户真正需要进入它们之前就加载（什么应该加载、什么应该延迟取决于用户的行为，这就是为什么我们在优化之前需要建立足够的上下文（收集数据、与产品经理和用户交流））。
所以我利用 [Code-Splitting – React](https://legacy.reactjs.org/docs/code-splitting.html) 来移除用户打开页面时对它们的加载：

```jsx
const XXX = lazy(() => import('./containers/XXX'));
const YYY = lazy(() => import('./containers/YYY'));
```

## 请求时序

我的项目有一组如下的请求调用链：

config API 1 call -> config API 2 call -> sidebar info API call -> sidebar loading -> main list API call -> main list loading

然而，配置加载和侧边栏加载并不影响用户的操作，真正重要的是主列表。

所以我改变了请求时序，让主列表优先于其他内容加载：

main list API call -> main list loading -> config API 1 call -> config API 2 call -> sidebar info API call -> sidebar loading

这使得主列表的显示速度大大加快。

## API 集成（BFF）：减少请求以提升速度

由于历史原因，我网站的 API 相当陈旧：

1. **功能相同的 API 被拆分**：一些 API 做的是同样的事情，但需要用不同的参数调用，例如 `getConfig(id)` 会用不同的 id 被多次调用，这显著降低了浏览器中的网络请求速度，因为浏览器的网络请求池有一定的限制。
2. **响应中有不必要的数据**：API 服务于不同的网站，它们各有不同的需求。我网站的响应中有很多不必要的数据，这也减慢了网络请求速度。

在我的项目中，我实现了一个 BFF 层来整合和优化 API 调用。这涉及合并多个（14+）配置 API。

## 结果与总结

经过第一轮优化，我的网站在 FMP 上有了显著改善（从 10000ms 降低到 4000ms）。
优化网站的关键在于：

1. **建立足够的上下文**：你必须了解用户的行为、项目的瓶颈所在，以及优化方向，这样才能做出合理的权衡。
2. **时序**：我们不想在某些时刻加载不必要的资源（懒加载），同时我们也想提前为未来加载某些内容（预加载）。
3. **缓存**：时间通常比空间更宝贵，我们可以利用空间进行缓存，从而在未来不需要再花费时间资源。
