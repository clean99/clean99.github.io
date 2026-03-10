---
title: SEO from First Principles — A Deep Dive through My Blog's Overhaul
date: 2026-03-10 14:00:00
tags: [Frontend, Software Engineering, Web Performance, SEO]
---

Most SEO guides give you a checklist: add this meta tag, install that plugin, set this config. But checklists don't help you understand **why** — and without understanding why, you'll never know what you're missing.

I recently did a full SEO overhaul on this blog. Instead of documenting each fix as a to-do item, I want to share the **mental model** I used. Once you see SEO through this lens, every optimization becomes obvious.

## The First Principle: Search Engines Are Programs

This is the only thing you need to remember. Google, Bing, Baidu — they're all just programs that:

1. **Discover** your pages (crawling)
2. **Parse** and **understand** them (indexing)
3. **Rank** them based on relevance and quality (ranking)

SEO is not about gaming an algorithm. It's about **making your content's data structure explicit and machine-readable**. A search engine crawler is fundamentally a parser — and like all parsers, it works best when the input is well-structured.

This gives us three layers to think about:

```
Layer 3: Distribution — How does your content spread on social platforms?
Layer 2: Understanding — Can search engines comprehend what your page is about?
Layer 1: Discoverability — Can search engines find your content in the first place?
```

Each layer builds on the one below. Let's go bottom-up.

## Layer 1: Discoverability

Before a search engine can rank your content, it needs to find it. There are several mechanisms that work together to make this happen.

### Sitemap: Your Site's Table of Contents

A sitemap is an XML file that tells crawlers every URL on your site, along with metadata like when each page was last modified. Think of it as a book's table of contents — crawlers *can* find your pages by following links, but a sitemap makes it explicit and complete.

```xml
<url>
  <loc>https://your-site.com/2024/04/10/my-post/</loc>
  <lastmod>2024-04-10</lastmod>
</url>
```

But generating a sitemap isn't enough — you also need to **tell crawlers where to find it**. There are two places:

1. **`robots.txt`** — the first file any crawler reads:
```
Sitemap: https://your-site.com/sitemap.xml
```

2. **HTML `<head>`** — for crawlers that start from the page itself:
```html
<link rel="sitemap" type="application/xml" href="/sitemap.xml" />
```

A subtle but important point: the `lastmod` field matters. If you use file modification time (`mtime`) as the source, running `git clone` or a CI rebuild will reset all timestamps. I switched my Hexo config from `updated_option: 'mtime'` to `updated_option: 'date'` so that the date comes from the post's front-matter — deterministic and version-controlled.

### RSS Feed: The Forgotten Discovery Channel

RSS/Atom feeds are often dismissed as a relic from the early web. But for a tech blog, they serve two important purposes:

1. **Content aggregators** (Feedly, dev.to, etc.) discover and index your content through feeds.
2. **Search engines** use feeds as a supplementary discovery mechanism, especially for fresh content.

The HTML `<head>` should declare the feed so browsers and crawlers can auto-discover it:
```html
<link rel="alternate" type="application/atom+xml" title="Your Blog" href="/atom.xml">
```

My blog had no feed at all. I added `hexo-generator-feed` and configured it in `_config.yml`. It's a one-time setup that makes your content discoverable through an entirely separate channel.

### URL Structure: The Canonical Identity of Each Page

Every page needs one — and only one — canonical URL. Duplicate URLs for the same content dilute ranking signals and confuse crawlers.

A common mistake in Hexo: having `trailing_index: true` generates URLs like `/2024/04/10/my-post/index.html`. The "clean" version `/2024/04/10/my-post/` is the same content at a different URL — instant duplication. The fix is simple:

```yaml
pretty_urls:
  trailing_index: false
  trailing_html: false
```

Additionally, every page should include a `<link rel="canonical">` tag that points to its authoritative URL. This is the definitive signal to crawlers: "If you find this content at multiple URLs, this is the one that counts."

## Layer 2: Understanding

Once a crawler finds your page, it needs to understand what the page is about, what type of content it contains, and how different pieces of information relate to each other. This is where most blogs fall short — and where the biggest wins are.

### Semantic HTML: Speaking the Crawler's Language

HTML5 introduced semantic elements for a reason. `<div>` tells a parser nothing. `<article>` tells it "this is the main content." `<nav>` says "this is navigation." `<time>` says "this is a date."

Search engines use these elements to build an internal representation of your page. Without them, the crawler has to guess based on heuristics — and heuristics are lossy.

Here's what my post template looked like before:
```html
<h2>Post Title</h2>
<div>Post content...</div>
<p>tag1, tag2 — Apr 10, 2024</p>
```

And after:
```html
<article itemscope itemtype="https://schema.org/BlogPosting">
  <header>
    <h1 itemprop="headline">Post Title</h1>
    <time datetime="2024-04-10T00:00:00Z" itemprop="datePublished">Apr 10, 2024</time>
  </header>
  <div itemprop="articleBody">
    Post content...
  </div>
</article>
```

Several things changed here:

**`<article>` wrapping** — explicitly marks the boundary of the content. This is especially important on pages that have navigation, footers, sidebars — the crawler needs to know which part is the *actual content* versus chrome.

**`<h1>` instead of `<h2>`** — heading hierarchy matters. Each page should have exactly one `<h1>` that represents the page's primary topic. Using `<h2>` for post titles was a heading hierarchy violation — it implied the post title was secondary to some non-existent `<h1>`.

**`<time>` with `datetime` attribute** — human-readable dates like "Apr 10, 2024" are ambiguous (is it month-first or day-first?). The `datetime` attribute provides an unambiguous ISO 8601 timestamp that any parser can reliably extract.

**`<nav>` for navigation** — I also wrapped the header navigation in `<nav aria-label="Main navigation">`. This serves both SEO (crawlers can identify and de-prioritize navigation links when analyzing content) and accessibility (screen readers can skip directly to navigation or skip past it).

### JSON-LD Structured Data: The Explicit Data Contract

Semantic HTML is good, but it's still implicit — crawlers have to *infer* relationships. JSON-LD makes them explicit. It's a contract between you and the search engine: "Here is the structured data for this page, no inference required."

For a blog, two schemas matter most:

**`WebSite` schema** on the homepage — tells search engines what your site is called and where it lives:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Your Blog Name",
  "url": "https://your-site.com",
  "description": "Your blog description"
}
</script>
```

**`BlogPosting` schema** on each post — provides the full metadata graph for a single article:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://..." },
  "headline": "Post Title",
  "datePublished": "2024-04-10T00:00:00Z",
  "dateModified": "2024-04-10T00:00:00Z",
  "author": { "@type": "Person", "name": "Author Name" },
  "publisher": {
    "@type": "Organization",
    "name": "Blog Name",
    "logo": { "@type": "ImageObject", "url": "https://.../logo.png" }
  },
  "keywords": ["tag1", "tag2"]
}
</script>
```

The key insight about JSON-LD is that **it enables rich results**. Without it, Google shows your page as a plain blue link. With it, Google can render rich snippets — author info, publish date, article breadcrumbs — which dramatically improve click-through rates.

You can validate your structured data using Google's [Rich Results Test](https://search.google.com/test/rich-results). If the test shows zero eligible rich results, you're leaving traffic on the table.

### The `<title>` Tag: Your Search Result Headline

The `<title>` tag is the most visible piece of SEO — it's literally what users see as the clickable headline in search results. Two rules:

1. **It must be unique per page.** If every page has the same title, Google can't distinguish them.
2. **It should include your site name.** This builds brand recognition and helps users identify your content in a sea of results.

My blog was rendering post pages with just the post title — "React Performance Optimization". After the fix, it becomes "React Performance Optimization | Koh Hom's Blog". Every page type gets a descriptive, unique title:

```javascript
if (is_post()) {
  pageTitle = page.title + ' | ' + config.title;
} else if (is_archive()) {
  pageTitle = 'All Posts - ' + config.title;
} else if (is_tag()) {
  pageTitle = 'Posts about ' + page.tag + ' | ' + config.title;
}
```

### Per-Page Meta Description and Keywords

The meta description doesn't directly affect ranking, but it *does* affect click-through rate — Google often uses it as the snippet text below your title in search results. A good description is a 150-160 character summary that tells the reader exactly what they'll get from the page.

The same logic applies to keywords. While Google ignores `<meta name="keywords">`, Bing and Baidu still consider them. More importantly, per-page keywords are a signal of topical relevance. My blog was using the same site-wide keywords on every page. After the fix, each post page uses its tags as keywords:

```html
<!-- Post page: uses post-specific tags -->
<meta name="keywords" content="React, Frontend, Software Engineering">

<!-- Homepage: falls back to site-wide keywords -->
<meta name="keywords" content="frontend development, testing, software engineering">
```

## Layer 3: Distribution

SEO isn't just about Google. When someone shares your post on Twitter, LinkedIn, or Slack, those platforms crawl your page too — and they use a different set of meta tags to generate link previews.

### Open Graph: The Social Media Data Contract

Open Graph (OG) tags are Facebook's protocol, but they're now universally supported by Twitter, LinkedIn, Slack, Discord, and every major platform. They control what appears in the link preview card.

The most common mistake I found on my blog: **`og:type` was set to `"article"` on every page**, including the homepage and archive pages. This is semantically wrong — the homepage is a `website`, not an `article`. Getting this wrong doesn't cause visible errors, but it degrades the quality of social sharing previews and sends incorrect signals.

More importantly, blog posts should include temporal metadata. Without `article:published_time` and `article:modified_time`, platforms can't show when the content was written — and for technical content, freshness matters enormously. Readers skip articles that look outdated.

```html
<!-- Only on actual blog post pages -->
<meta property="og:type" content="article" />
<meta property="article:published_time" content="2024-04-10T00:00:00Z" />
<meta property="article:modified_time" content="2024-04-10T00:00:00Z" />
<meta property="article:author" content="Author Name" />
<meta property="article:tag" content="React" />

<!-- On homepage, archives, tag pages -->
<meta property="og:type" content="website" />
```

### Twitter Cards: Platform-Specific Optimization

Twitter (X) has its own card system that layers on top of Open Graph. The critical tags most blogs miss: `twitter:site` (associates the card with your Twitter account) and `twitter:creator` (credits the content author). Without them, your shared links lose the connection to your profile — missed opportunity for follower growth and content attribution.

## The Performance Dimension

Google's Core Web Vitals are now a confirmed ranking factor. Two performance-related SEO issues I found are worth discussing because they illustrate a broader principle.

### Resource Hints: Reducing Latency for External Dependencies

When your page loads, the browser needs to resolve DNS, establish TCP connections, and perform TLS handshakes for every external domain. For Google Analytics alone, that's `www.googletagmanager.com` — roughly 100-300ms of latency before any data can flow.

Resource hints let you start this process early:

```html
<link rel="dns-prefetch" href="//www.googletagmanager.com">
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
```

`dns-prefetch` handles DNS resolution only. `preconnect` goes further — it also establishes the TCP connection and TLS handshake. The principle is the same as prefetching in web performance optimization: **move work earlier in the timeline so it doesn't block the critical path**.

### Font Preloading: A Subtle Path Resolution Bug

My blog had font preload links using relative paths: `../fonts/font.woff2`. This works correctly on the homepage (`/index.html` → resolves to `/fonts/font.woff2`), but breaks on nested pages (`/2024/04/10/post/index.html` → resolves to `/2024/04/10/fonts/font.woff2`, a 404).

When preloading fails, the browser falls back to on-demand font loading, which causes FOUT (Flash of Unstyled Text) and increases CLS (Cumulative Layout Shift) — one of the three Core Web Vitals metrics.

The fix is to use absolute paths via Hexo's `config.root`:
```html
<link rel="preload" href="<%- config.root %>fonts/font.woff2" as="font" type="font/woff2" crossorigin>
```

This is a general lesson: **always use absolute paths for resources referenced in the HTML `<head>`**, because the `<head>` is shared across pages at every nesting level.

## Putting It All Together

Here's the mental model, bottom-up:

```
┌──────────────────────────────────────────────────┐
│  Layer 3: Distribution                           │
│  Open Graph, Twitter Cards, article metadata     │
│  → Controls how your content appears when shared │
├──────────────────────────────────────────────────┤
│  Layer 2: Understanding                          │
│  JSON-LD, semantic HTML, <title>, meta tags      │
│  → Tells search engines what your content means  │
├──────────────────────────────────────────────────┤
│  Layer 1: Discoverability                        │
│  Sitemap, robots.txt, RSS feed, canonical URLs   │
│  → Ensures search engines can find your content  │
├──────────────────────────────────────────────────┤
│  Foundation: Performance                         │
│  Core Web Vitals, resource hints, preloading     │
│  → Affects ranking through page experience       │
└──────────────────────────────────────────────────┘
```

Every SEO optimization falls into one of these layers. When you encounter a new SEO recommendation, ask yourself: which layer does this belong to? Is it helping crawlers **find** my content, **understand** it, or **distribute** it? This framework turns a seemingly random collection of best practices into a coherent system.

The fundamental takeaway: **SEO is data structure design for machines**. Your HTML is an API that search engines consume. Meta tags are the response headers. JSON-LD is the response body. Semantic elements are the schema. The better you design this API, the better machines can understand and surface your content.
