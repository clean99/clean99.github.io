---
title: A Complete SEO Overhaul for My Hexo Blog — What I Found and How I Fixed It
date: 2026-03-10 14:00:00
tags: [Frontend, Software Engineering, Web Performance, SEO]
---

I recently did a full SEO audit on this blog and found a surprising number of issues — from missing structured data to broken font preloading paths. This post documents every problem I found, the fix I applied, and the underlying principle behind each decision.

If you're running a Hexo blog (or any static site), you'll likely find some of these issues in your own setup.

## The Audit Process

Before jumping into fixes, I needed a systematic approach. Here's how I diagnosed the issues:

1. **View Page Source**: Check the raw HTML output for meta tags, structured data, and semantic markup.
2. **Google Search Console**: See how Google actually crawls and indexes your pages.
3. **Lighthouse SEO Audit**: Chrome DevTools > Lighthouse > SEO category.
4. **Rich Results Test**: Google's [Rich Results Test](https://search.google.com/test/rich-results) to validate structured data.
5. **Manual Crawl Simulation**: Check `robots.txt`, `sitemap.xml`, canonical URLs, and feed links.

The key insight: **SEO is not about tricks — it's about making your content machine-readable**. Search engines are just programs trying to understand your pages. The better you structure your data, the better they can do their job.

## Problem 1: Missing JSON-LD Structured Data (Critical)

**What was wrong**: No structured data at all — no `BlogPosting`, no `WebSite` schema. Google had no way to generate rich snippets for my posts.

**Why it matters**: JSON-LD (JavaScript Object Notation for Linked Data) is how you tell search engines exactly what type of content your page contains. Without it, Google has to guess — and it often guesses wrong or simply doesn't show rich results.

**The fix**: I added two types of JSON-LD in the theme's `layout.ejs`:

For blog posts (`BlogPosting` schema):
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://your-blog.com/2024/04/10/your-post/"
  },
  "headline": "Your Post Title",
  "description": "First 160 chars of your content...",
  "author": {
    "@type": "Person",
    "name": "Your Name",
    "url": "https://your-blog.com/About/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Blog Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://your-blog.com/images/favicon.png"
    }
  },
  "datePublished": "2024-04-10T00:00:00.000Z",
  "dateModified": "2024-04-10T00:00:00.000Z",
  "keywords": ["tag1", "tag2"]
}
</script>
```

For the homepage (`WebSite` schema):
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Your Blog Name",
  "url": "https://your-blog.com",
  "description": "Your blog description"
}
</script>
```

In Hexo's EJS template, this is dynamically generated using variables like `page.title`, `date_xml(page.date)`, and tag iteration. The key is to conditionally render `BlogPosting` for posts and `WebSite` for the homepage — they serve completely different purposes.

## Problem 2: Page Title Missing Site Name

**What was wrong**: Post pages only showed the post title (e.g., "React Performance Optimization"), not "React Performance Optimization | Koh Hom's Blog".

**Why it matters**: The `<title>` tag is the single most important on-page SEO element. Including your site name helps with brand recognition in search results and improves CTR (click-through rate).

**The fix**:
```javascript
// Before
var title = page.title; // Just "React Performance Optimization"

// After
var pageTitle = page.title + ' | ' + config.title;
// "React Performance Optimization | Koh Hom's Blog"
```

This applies to all page types — posts, static pages, tag pages, and archive pages. Each gets a descriptive, unique title that includes the site brand.

## Problem 3: og:type Always Set to "article"

**What was wrong**: Every page, including the homepage and archive pages, had `og:type` set to `article`.

**Why it matters**: Open Graph types tell social platforms and search engines what kind of page this is. The homepage is not an article — it's a website. Setting the wrong type can confuse social media crawlers and reduce the quality of link previews.

**The fix**:
```javascript
var ogType = 'website'; // Default for homepage, archives, tags
if (is_post()) {
  ogType = 'article'; // Only for actual blog posts
}
```

## Problem 4: Missing Article Time Metadata

**What was wrong**: No `article:published_time` or `article:modified_time` Open Graph tags on post pages.

**Why it matters**: These tags help search engines understand content freshness. Google may favor recently updated content for certain queries. Without these tags, crawlers can't determine when your content was last modified.

**The fix**:
```html
<meta property="article:published_time" content="2024-04-16T00:32:53.000Z" />
<meta property="article:modified_time" content="2024-04-16T00:32:53.000Z" />
<meta property="article:author" content="Koh Hom" />
<meta property="article:tag" content="React" />
```

I also changed the Hexo `updated_option` from `mtime` to `date`. Using `mtime` (file modification time) is unreliable — running `git clone` or CI/CD rebuild can change all file modification times. The `date` option uses the front-matter date, which is deterministic.

## Problem 5: Pretty URLs Configuration

**What was wrong**: `trailing_index: true` and `trailing_html: true` in `_config.yml`, generating URLs like `/2024/04/10/my-post/index.html` instead of clean `/2024/04/10/my-post/`.

**Why it matters**: Clean URLs are more shareable, more readable, and slightly better for SEO. URL structure is a minor ranking factor, but clean URLs also reduce the risk of duplicate content issues (same page accessible via different URLs).

**The fix**:
```yaml
pretty_urls:
  trailing_index: false
  trailing_html: false
```

Also, I fixed the canonical URL generation which had a redundant `.replace()`:
```javascript
// Before (redundant double replace)
url.replace(/index\.html$/, '').replace(/index\.html$/, '')

// After (clean single operation)
url.replace(/index\.html$/, '')
```

## Problem 6: No RSS/Atom Feed

**What was wrong**: No feed generator installed, no feed links in the HTML head.

**Why it matters**: RSS feeds are still widely used by developers and tech readers. They also serve as an additional signal to search engines about your content structure. Many aggregator sites and tools (like Feedly, RSS readers) rely on feeds to discover and index your content.

**The fix**:
```bash
npm install hexo-generator-feed --save
```

And in `_config.yml`:
```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  content: true
  content_limit: 200
  content_limit_delim: ' '
```

The template automatically adds `<link rel="alternate" type="application/atom+xml">` to the HTML head, making the feed discoverable by browsers and crawlers.

## Problem 7: Broken Font Preload Paths

**What was wrong**: Font preload links used relative paths (`../fonts/filename.woff2`). This works on the homepage but breaks on nested pages like `/2024/04/10/my-post/`.

**Why it matters**: If font preloading fails, the browser downloads fonts on-demand (render-blocking), causing layout shifts (CLS) and slower perceived load times. Both are Core Web Vitals metrics that directly impact SEO ranking.

**The fix**:
```html
<!-- Before (relative, breaks on nested pages) -->
<link rel="preload" href="../fonts/dm-serif-display.woff2" as="font" type="font/woff2" crossorigin>

<!-- After (absolute via Hexo config.root) -->
<link rel="preload" href="<%- config.root %>fonts/dm-serif-display.woff2" as="font" type="font/woff2" crossorigin>
```

## Problem 8: Post-Specific Keywords

**What was wrong**: The `<meta name="keywords">` tag was site-wide — every page showed the same keywords from `_config.yml`.

**Why it matters**: While Google has publicly stated they don't use meta keywords for ranking, other search engines (Bing, Baidu) still consider them. More importantly, having relevant keywords per page helps with overall topic relevance signals.

**The fix**:
```html
<% if (is_post() && page.tags && page.tags.length) { %>
<meta name="keywords" content="<%= page.tags.map(function(tag){ return tag.name; }).join(', ') %>">
<% } else if (config.keywords) { %>
<meta name="keywords" content="<%= config.keywords %>">
<% } %>
```

Now each post page shows its own tags as keywords, while non-post pages fall back to site-wide keywords.

## Problem 9: Missing Twitter Card Metadata

**What was wrong**: No `twitter:site` or `twitter:creator` tags. The Twitter Card was incomplete.

**Why it matters**: `twitter:site` associates the card with your Twitter account. `twitter:creator` credits the content author. Without these, Twitter (X) can't properly attribute the content, and the card preview may be less prominent.

**The fix**:
```html
<meta name="twitter:site" content="@Clean993">
<meta name="twitter:creator" content="@Clean993">
```

## Problem 10: Semantic HTML and Accessibility

**What was wrong**: Multiple issues across templates:
- Post content not wrapped in `<article>` tags
- No `<time>` elements for dates
- Navigation not wrapped in `<nav>`
- Missing ARIA labels on interactive elements
- `<h2>` used for post titles instead of `<h1>` (heading hierarchy violation)

**Why it matters**: Semantic HTML is one of the most underrated SEO factors. Search engines use HTML5 semantic elements to understand your page structure. `<article>` tells crawlers "this is the main content", `<time>` makes dates machine-readable, `<nav>` identifies navigation sections. This also benefits accessibility — screen readers rely heavily on semantic markup.

**The fix** (post template example):
```html
<!-- Before -->
<h2><%- page.title %></h2>
<%- page.content%>
<p>tags — date</p>

<!-- After -->
<article itemscope itemtype="https://schema.org/BlogPosting">
  <header>
    <h1 itemprop="headline"><%- page.title %></h1>
    <div class="post-meta">
      <time datetime="2024-04-10T00:00:00Z" itemprop="datePublished">
        Apr 10, 2024
      </time>
    </div>
  </header>
  <div itemprop="articleBody">
    <%- page.content%>
  </div>
  <footer>
    <p>tags</p>
  </footer>
</article>
```

## Problem 11: Missing DNS Prefetch and Preconnect

**What was wrong**: No resource hints for external domains (Google Analytics, Google Tag Manager).

**Why it matters**: `dns-prefetch` resolves the DNS of external domains early, and `preconnect` goes further by establishing the TCP connection and TLS handshake ahead of time. This can save 100-300ms per external resource, which directly impacts Core Web Vitals (LCP, FCP).

**The fix**:
```html
<link rel="dns-prefetch" href="//www.googletagmanager.com">
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
```

## Problem 12: Minor Fixes

A few smaller issues that add up:
- **`robots.txt`**: Removed duplicate `/vendors/` Disallow rule
- **Custom 404 page**: Created a `source/404.md` so users who hit broken links get a helpful page instead of a generic error
- **Sitemap configuration**: Added explicit sitemap config with `rel: true` to include `<link rel="sitemap">` in HTML head
- **`meta name="robots"`**: Added `index, follow` directive to explicitly tell crawlers to index and follow links

## Summary: The SEO Checklist

Here's a checklist you can use for your own static site:

| Category | Check | Impact |
| --- | --- | --- |
| Structured Data | JSON-LD BlogPosting schema | High |
| Structured Data | JSON-LD WebSite schema (homepage) | Medium |
| Meta Tags | Unique `<title>` with site name | High |
| Meta Tags | Per-page `<meta description>` (< 160 chars) | High |
| Meta Tags | Per-post keywords from tags | Low |
| Open Graph | Correct `og:type` (article vs website) | Medium |
| Open Graph | `article:published_time` / `modified_time` | Medium |
| Open Graph | `article:tag` for each post tag | Low |
| Twitter Card | `twitter:site` and `twitter:creator` | Medium |
| Technical | Clean URLs (no trailing index.html) | Medium |
| Technical | Canonical URLs (no duplicates) | High |
| Technical | RSS/Atom feed | Medium |
| Technical | Sitemap with rel link | Medium |
| Technical | Custom 404 page | Low |
| Performance | Font preload with absolute paths | Medium |
| Performance | DNS prefetch / preconnect for external domains | Medium |
| HTML | Semantic elements (article, nav, time, header) | Medium |
| HTML | Proper heading hierarchy (h1 > h2 > h3) | Medium |
| Accessibility | ARIA labels on interactive elements | Low |

The most important takeaway: **SEO optimization is fundamentally about data structure design**. Just like how good code starts with the right data structures, good SEO starts with properly structured markup. The meta tags, JSON-LD, semantic HTML — they're all just ways of making your content's data structure explicit and machine-readable.

As Linus would say: *"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."* The same applies to SEO — stop worrying about keyword density and start thinking about how search engines parse your page's data.
