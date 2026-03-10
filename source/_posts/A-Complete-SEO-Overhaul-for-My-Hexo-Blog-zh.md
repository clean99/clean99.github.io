---
title: 从第一性原理理解 SEO —— 一次博客全面改造的深度复盘
date: 2026-03-10 14:00:00
tags: [Frontend, Software Engineering, Web Performance, SEO]
lang: zh
i18n_key: A-Complete-SEO-Overhaul-for-My-Hexo-Blog
permalink: zh/2026/03/10/A-Complete-SEO-Overhaul-for-My-Hexo-Blog/
---

大多数 SEO 指南都是清单式的：加这个 meta 标签、装那个插件、改这个配置。但清单无法帮你理解 **为什么** ——不理解为什么，你永远不知道自己遗漏了什么。

最近我对这个博客做了一次全面的 SEO 改造。比起逐条记录"发现了什么、修了什么"，我更想分享的是背后的**思维模型**。一旦用这个视角看 SEO，所有优化都变得显而易见。

## 第一性原理：搜索引擎是程序

这是唯一需要记住的事。Google、Bing、Baidu——它们本质上都是程序，做三件事：

1. **发现**你的页面（爬取）
2. **解析并理解**页面内容（索引）
3. 根据相关性和质量**排序**（排名）

SEO 不是在玩弄算法，而是**让你的内容的数据结构显式化、机器可读**。搜索引擎的爬虫本质上是一个 parser——和所有 parser 一样，输入的结构越清晰，它工作得越好。

从这个原理出发，我们可以把所有 SEO 工作分成三个层次：

```
第三层：分发层 — 你的内容在社交平台上如何呈现？
第二层：理解层 — 搜索引擎能否理解你的页面在说什么？
第一层：发现层 — 搜索引擎能否找到你的内容？
```

每一层都依赖下面一层。我们自底向上来看。

## 第一层：发现（Discoverability）

搜索引擎在排名你的内容之前，首先得找到它。有几个机制协同工作来实现这一点。

### Sitemap：站点的目录

Sitemap 是一个 XML 文件，告诉爬虫你站点上的每个 URL，以及每个页面最后修改的时间。可以类比为一本书的目录——爬虫当然*可以*通过跟随链接找到你的页面，但 sitemap 把这件事变得显式而完整。

```xml
<url>
  <loc>https://your-site.com/2024/04/10/my-post/</loc>
  <lastmod>2024-04-10</lastmod>
</url>
```

但光生成 sitemap 不够——你还需要**告诉爬虫去哪里找它**。有两个位置：

1. **`robots.txt`** ——任何爬虫访问站点时读取的第一个文件：
```
Sitemap: https://your-site.com/sitemap.xml
```

2. **HTML `<head>`** ——给从页面本身开始爬取的爬虫：
```html
<link rel="sitemap" type="application/xml" href="/sitemap.xml" />
```

这里有一个容易忽略的细节：`lastmod` 字段的数据源。如果用文件修改时间（`mtime`）作为来源，每次 `git clone` 或 CI 重新构建都会重置所有时间戳——爬虫会以为你整个站点都刚更新过，这反而是一个负面信号。我把 Hexo 配置从 `updated_option: 'mtime'` 改为 `updated_option: 'date'`，让日期来自文章 front-matter——确定性的、版本控制的。

### RSS Feed：被遗忘的发现渠道

RSS/Atom 订阅源经常被认为是早期 Web 的遗物。但对技术博客来说，它有两个重要用途：

1. **内容聚合器**（Feedly、dev.to 等）通过 feed 发现和索引你的内容。
2. **搜索引擎**把 feed 作为补充的内容发现机制，特别是对新鲜内容。

HTML `<head>` 中需要声明 feed，这样浏览器和爬虫才能自动发现：
```html
<link rel="alternate" type="application/atom+xml" title="Your Blog" href="/atom.xml">
```

我的博客之前完全没有 feed。加上 `hexo-generator-feed` 插件并配置好之后，内容多了一个完全独立的被发现渠道。

### URL 结构：每个页面的唯一身份

每个页面需要且只需要一个 canonical URL。同一内容的多个 URL 会稀释排名信号，让爬虫困惑。

Hexo 中一个常见的错误：`trailing_index: true` 会生成类似 `/2024/04/10/my-post/index.html` 的 URL。而"干净版" `/2024/04/10/my-post/` 是同一个内容、不同的 URL——瞬间产生了重复内容问题。修复很简单：

```yaml
pretty_urls:
  trailing_index: false
  trailing_html: false
```

同时，每个页面应该包含一个 `<link rel="canonical">` 标签指向它的权威 URL。这是给爬虫的明确信号："如果你在多个 URL 找到了这个内容，这个才是算数的。"

## 第二层：理解（Understanding）

爬虫找到你的页面后，需要理解页面说的是什么、包含什么类型的内容、不同信息之间是什么关系。这是大多数博客最薄弱的环节——也是提升空间最大的地方。

### 语义化 HTML：用爬虫听得懂的语言说话

HTML5 引入语义元素是有原因的。`<div>` 告诉 parser 的信息量是零。`<article>` 告诉它"这是主要内容"。`<nav>` 说"这是导航"。`<time>` 说"这是一个日期"。

搜索引擎用这些元素来构建页面的内部表示。没有它们，爬虫只能基于启发式规则猜测——而启发式是有损的。

我的文章模板改造前后对比：

```html
<!-- 改造前 -->
<h2>文章标题</h2>
<div>文章内容...</div>
<p>tag1, tag2 — Apr 10, 2024</p>
```

```html
<!-- 改造后 -->
<article itemscope itemtype="https://schema.org/BlogPosting">
  <header>
    <h1 itemprop="headline">文章标题</h1>
    <time datetime="2024-04-10T00:00:00Z" itemprop="datePublished">Apr 10, 2024</time>
  </header>
  <div itemprop="articleBody">
    文章内容...
  </div>
</article>
```

这里有几个关键变化：

**`<article>` 包裹** ——显式标记内容的边界。这在有导航、侧边栏、页脚的页面上尤其重要——爬虫需要分清哪部分是*真正的内容*，哪部分是页面装饰。

**`<h1>` 替代 `<h2>`** ——标题层级很重要。每个页面应该有且只有一个 `<h1>` 代表页面的主题。用 `<h2>` 做文章标题是层级违规——暗示文章标题从属于某个不存在的 `<h1>`。

**`<time>` 及 `datetime` 属性** ——人类可读的日期 "Apr 10, 2024" 是有歧义的（月在前还是日在前？）。`datetime` 属性提供了一个无歧义的 ISO 8601 时间戳，任何 parser 都能可靠地解析。

**导航的 `<nav>` 标签** ——我还把头部导航包在了 `<nav aria-label="Main navigation">` 里。这同时服务于 SEO（爬虫可以识别并降权导航链接，在分析内容时不被干扰）和无障碍访问（屏幕阅读器可以直接跳到导航或跳过导航）。

### JSON-LD 结构化数据：显式的数据契约

语义化 HTML 已经很好了，但它仍然是隐式的——爬虫需要*推断*关系。JSON-LD 把这些关系变成显式的。它是你和搜索引擎之间的契约："这是这个页面的结构化数据，不需要推断。"

对于博客，两种 schema 最重要：

**首页的 `WebSite` schema** ——告诉搜索引擎你的站点叫什么、在哪里：
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "博客名",
  "url": "https://your-site.com",
  "description": "博客描述"
}
```

**每篇文章的 `BlogPosting` schema** ——为单篇文章提供完整的元数据图：
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "文章标题",
  "datePublished": "2024-04-10T00:00:00Z",
  "dateModified": "2024-04-10T00:00:00Z",
  "author": { "@type": "Person", "name": "作者名" },
  "publisher": {
    "@type": "Organization",
    "name": "博客名",
    "logo": { "@type": "ImageObject", "url": "https://.../logo.png" }
  },
  "keywords": ["标签1", "标签2"]
}
```

JSON-LD 的关键价值在于**它让富媒体结果（Rich Results）成为可能**。没有它，Google 只能把你的页面显示为一条普通的蓝色链接。有了它，Google 可以渲染富摘要——作者信息、发布日期、文章面包屑导航——显著提升搜索结果中的点击率。

你可以用 Google 的 [Rich Results Test](https://search.google.com/test/rich-results) 来验证结构化数据。如果测试结果显示零个合格的富媒体结果，说明你在白白浪费流量。

### `<title>` 标签：搜索结果中的标题

`<title>` 标签是 SEO 中最显眼的部分——它就是用户在搜索结果中看到的可点击标题。两个规则：

1. **每个页面必须唯一。** 如果所有页面标题一样，Google 无法区分它们。
2. **应该包含站点名称。** 这有助于品牌识别，帮助用户在一堆搜索结果中认出你的内容。

我的博客之前文章页面只显示文章标题——"React Performance Optimization"。修改后变成 "React Performance Optimization | Koh Hom's Blog"。每种页面类型都有描述性的、唯一的标题：

```javascript
if (is_post()) {
  pageTitle = page.title + ' | ' + config.title;
} else if (is_archive()) {
  pageTitle = 'All Posts - ' + config.title;
} else if (is_tag()) {
  pageTitle = 'Posts about ' + page.tag + ' | ' + config.title;
}
```

### 页面级的 Meta Description 和 Keywords

Meta description 不直接影响排名，但它**直接影响点击率**——Google 经常把它用作搜索结果标题下面的摘要文本。好的 description 是一段 150-160 字符的总结，告诉读者点进来能得到什么。

Keywords 同理。虽然 Google 已经不看 `<meta name="keywords">`，但 Bing 和百度仍然参考。更重要的是，页面级别的关键词是主题相关性的信号。我的博客之前每个页面都用全站统一的关键词。修改后，文章页面用自己的标签生成关键词：

```html
<!-- 文章页：使用文章标签 -->
<meta name="keywords" content="React, Frontend, Software Engineering">

<!-- 首页：使用全站关键词 -->
<meta name="keywords" content="frontend development, testing, software engineering">
```

## 第三层：分发（Distribution）

SEO 不仅仅是关于 Google。当有人在 Twitter、LinkedIn 或 Slack 分享你的文章时，这些平台也会爬取你的页面——它们用另一套 meta 标签来生成链接预览卡片。

### Open Graph：社交媒体的数据契约

Open Graph（OG）标签是 Facebook 发明的协议，但现在被 Twitter、LinkedIn、Slack、Discord 和所有主流平台通用支持。它们控制链接预览卡片中显示什么内容。

我的博客中最常见的错误：**`og:type` 在所有页面都被设为 `"article"`**，包括首页和归档页。这在语义上是错的——首页是 `website`，不是 `article`。设错不会导致明显的错误，但会降低社交分享预览的质量，发送错误的信号。

更关键的是，博客文章应该包含时间元数据。没有 `article:published_time` 和 `article:modified_time`，平台无法展示内容的写作时间——而对于技术内容，时效性极其重要。读者会跳过看起来过时的文章。

```html
<!-- 只在真正的博客文章页面 -->
<meta property="og:type" content="article" />
<meta property="article:published_time" content="2024-04-10T00:00:00Z" />
<meta property="article:modified_time" content="2024-04-10T00:00:00Z" />
<meta property="article:author" content="Author Name" />
<meta property="article:tag" content="React" />

<!-- 首页、归档页、标签页 -->
<meta property="og:type" content="website" />
```

### Twitter Cards：平台定制化

Twitter (X) 有自己的卡片系统，叠加在 Open Graph 之上。大多数博客缺少的关键标签：`twitter:site`（把卡片和你的 Twitter 账号关联）和 `twitter:creator`（标注内容作者）。没有它们，分享链接时就失去了和个人主页的关联——白白错过涨粉和内容归属的机会。

## 性能维度

Google 的 Core Web Vitals 已经是确认的排名因素。我发现的两个性能相关的 SEO 问题值得展开讨论，因为它们体现了一个更广泛的原则。

### 资源提示（Resource Hints）：降低外部依赖的延迟

页面加载时，浏览器需要为每个外部域名解析 DNS、建立 TCP 连接、执行 TLS 握手。仅 Google Analytics 一项，就是 `www.googletagmanager.com`——在任何数据传输之前大约 100-300ms 的延迟。

资源提示让你提前启动这个过程：

```html
<link rel="dns-prefetch" href="//www.googletagmanager.com">
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
```

`dns-prefetch` 只处理 DNS 解析。`preconnect` 更进一步——还建立 TCP 连接和 TLS 握手。原理和 Web 性能优化中的 prefetch 一样：**把工作提前到时间线更早的位置，让它不再阻塞关键路径**。

### 字体预加载：一个隐蔽的路径解析 Bug

我的博客的字体预加载链接使用了相对路径：`../fonts/font.woff2`。这在首页（`/index.html` → 解析为 `/fonts/font.woff2`）能正常工作，但在嵌套页面（`/2024/04/10/post/index.html` → 解析为 `/2024/04/10/fonts/font.woff2`，404）就挂了。

预加载失败时，浏览器回退到按需加载字体，造成 FOUT（Flash of Unstyled Text）并增加 CLS（Cumulative Layout Shift）——三个 Core Web Vitals 指标之一。

修复方法是通过 Hexo 的 `config.root` 使用绝对路径：
```html
<link rel="preload" href="<%- config.root %>fonts/font.woff2" as="font" type="font/woff2" crossorigin>
```

这是一个通用教训：**HTML `<head>` 中引用的资源永远使用绝对路径**，因为 `<head>` 在每个嵌套层级的页面间是共享的。

## 全貌

自底向上看完整的心智模型：

```
┌──────────────────────────────────────────────────┐
│  第三层：分发                                      │
│  Open Graph, Twitter Cards, 文章时间元数据          │
│  → 控制你的内容在社交平台上如何呈现                   │
├──────────────────────────────────────────────────┤
│  第二层：理解                                      │
│  JSON-LD, 语义化 HTML, <title>, meta 标签          │
│  → 告诉搜索引擎你的内容是什么意思                     │
├──────────────────────────────────────────────────┤
│  第一层：发现                                      │
│  Sitemap, robots.txt, RSS Feed, Canonical URL     │
│  → 确保搜索引擎能找到你的内容                        │
├──────────────────────────────────────────────────┤
│  基础：性能                                        │
│  Core Web Vitals, 资源提示, 预加载                  │
│  → 通过页面体验影响排名                              │
└──────────────────────────────────────────────────┘
```

每一项 SEO 优化都落在这些层中的某一个。当你遇到新的 SEO 建议时，问自己：这属于哪一层？它是帮助爬虫**发现**我的内容、**理解**它、还是**分发**它？这个框架把一堆看似随机的最佳实践变成了一个连贯的系统。

根本性的收获：**SEO 就是面向机器的数据结构设计**。你的 HTML 是搜索引擎消费的 API。Meta 标签是响应头。JSON-LD 是响应体。语义元素是 schema 定义。你把这个 API 设计得越好，机器就越能理解和呈现你的内容。
