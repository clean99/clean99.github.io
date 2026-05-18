import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { articleFromMarkdown, addUtm, parseFrontmatter } from '../tools/social-growth/articles.mjs';
import { buildDistributionCandidates, buildXArticle, selectHashtags } from '../tools/social-growth/copy.mjs';
import { runDailyGrowthPlan } from '../tools/social-growth/daily.mjs';
import { appendSnapshot, createLedger, formatMarkdownReport } from '../tools/social-growth/ledger.mjs';
import { parseCompactNumber, postScore, summarizeGrowthLedger } from '../tools/social-growth/metrics.mjs';
import {
  buildPublishPackage,
  buildPublishQueue,
  composePublishPosts,
  markQueueItemPublished,
  writePublishPackage,
} from '../tools/social-growth/queue.mjs';

test('parses Hexo frontmatter and builds canonical URLs', () => {
  const source = `---
title: "Hello World"
date: 2026-05-18 10:00:00
tags: [AI, Software Engineering]
lang: en
i18n_key: Hello-World
---

> **TL;DR**: This is the useful summary.

Body text.
`;

  const article = articleFromMarkdown({
    file: 'Hello-World.md',
    source,
    siteUrl: 'https://clean99.github.io',
  });

  assert.equal(article.title, 'Hello World');
  assert.equal(article.url, 'https://clean99.github.io/2026/05/18/Hello-World/');
  assert.deepEqual(article.tags, ['AI', 'Software Engineering']);
  assert.equal(article.excerpt, 'This is the useful summary.');
});

test('keeps Chinese permalink instead of deriving a root URL', () => {
  const source = `---
title: 中文标题
date: 2026-05-18 10:00:00
tags: [AI]
lang: zh
i18n_key: Hello-World
permalink: zh/2026/05/18/Hello-World/
---

正文。
`;

  const article = articleFromMarkdown({
    file: 'Hello-World-zh.md',
    source,
    siteUrl: 'https://clean99.github.io/',
  });

  assert.equal(article.url, 'https://clean99.github.io/zh/2026/05/18/Hello-World/');
});

test('adds stable UTM parameters', () => {
  const url = addUtm('https://clean99.github.io/2026/05/18/Post/', {
    campaign: 'blog-growth',
    content: 'Post-sharp-take',
  });

  assert.equal(
    url,
    'https://clean99.github.io/2026/05/18/Post/?utm_source=x&utm_medium=social&utm_campaign=blog-growth&utm_content=Post-sharp-take',
  );
});

test('generates bounded X distribution candidates', () => {
  const article = {
    title: 'Automated AI Performance Optimization with Harness and Goal-Driven Loops',
    excerpt: 'The key is a measurable harness, a goal-driven loop, and a ledger that records every baseline.',
    slug: 'Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops',
    lang: 'en',
    tags: ['AI', 'Software Engineering', 'Web Performance'],
    url: 'https://clean99.github.io/2026/05/16/Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops/',
  };

  const candidates = buildDistributionCandidates(article, { campaign: 'test' });

  assert.equal(candidates.length, 3);
  assert.equal(candidates[0].requiresBrowserConfirmation, true);
  assert.ok(candidates.every((candidate) => candidate.posts.every((post) => post.length <= 260)));
  assert.ok(candidates[0].targetUrl.includes('utm_source=x'));
  assert.equal(candidates[0].variant, 'strong-thesis');
  assert.equal(candidates[0].linkPostIndex, null);
  assert.equal(candidates[2].variant, 'case-story');
  assert.equal(candidates[2].linkPostIndex, null);
  assert.ok(candidates[0].xArticle.body.includes('Full blog post:'));
  assert.equal(candidates[0].media.model, 'gpt-image-2');
  assert.ok(candidates[0].threadFallback[2].includes('https://clean99.github.io'));
});

test('parses compact metrics and computes growth summary', () => {
  assert.equal(parseCompactNumber('1.2K'), 1200);
  assert.equal(parseCompactNumber('3万'), 30000);
  assert.equal(postScore({ follows: 2, reposts: 1, replies: 3, likes: 10 }), 86);

  const summary = summarizeGrowthLedger({
    target: {
      startDate: '2026-05-18',
      followersIn7Days: 1000,
      baselineFollowers: 100,
    },
    snapshots: [
      {
        date: '2026-05-18',
        followers: 100,
        posts: [],
      },
      {
        date: '2026-05-20',
        followers: 250,
        posts: [
          {
            id: 'a',
            metrics: {
              likes: '1.2K',
              reposts: 10,
              replies: 5,
              views: '10K',
            },
          },
        ],
      },
    ],
  });

  assert.equal(summary.followerDelta, 150);
  assert.equal(summary.daysElapsed, 3);
  assert.equal(summary.totalInteractions, 1215);
  assert.equal(summary.topPosts[0].id, 'a');
});

test('frontmatter parser ignores inline comments outside quotes', () => {
  const parsed = parseFrontmatter(`---
title: "A # quoted title"
date: 2026-05-18 10:00:00 # Asia/Singapore
---
x`);

  assert.equal(parsed.data.title, 'A # quoted title');
  assert.equal(parsed.data.date, '2026-05-18 10:00:00');
});

test('builds publish queue and composes handoff posts without losing the URL', () => {
  const articles = [
    {
      title: '有用的系统',
      excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈闭环诚实。',
      slug: 'Useful-Systems',
      lang: 'zh',
      tags: ['AI', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/2026/05/18/Useful-Systems/',
    },
  ];

  const queue = buildPublishQueue(articles, {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });

  assert.equal(queue.items.length, 3);
  assert.equal(queue.items[0].status, 'draft');
  const composed = composePublishPosts(queue.items[0]);
  assert.equal(composed.length, 1);
  assert.ok(!composed[0].includes('https://clean99.github.io/zh/2026/05/18/Useful-Systems/'));
  assert.ok(composed[0].includes('#软件工程'));
  assert.ok(queue.items[0].xArticle.body.includes('博客原文：https://clean99.github.io/zh/2026/05/18/Useful-Systems/'));
  assert.ok(queue.items[0].media.prompt.includes('gpt-image-2') || queue.items[0].media.model === 'gpt-image-2');
  assert.ok(queue.items[0].threadFallback[2].includes('完整过程'));

  const updated = markQueueItemPublished(queue, {
    id: queue.items[0].id,
    xPostUrl: 'https://x.com/Clean993/status/1',
    publishedAt: '2026-05-18T01:00:00.000Z',
  });
  assert.equal(updated.items[0].status, 'published');
  assert.equal(updated.items[0].xPostUrl, 'https://x.com/Clean993/status/1');
});

test('exports a browser publish package with image, article, and checklist artifacts', async () => {
  const queue = buildPublishQueue([
    {
      title: '有用的系统',
      excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈闭环诚实。',
      slug: 'Useful-Systems',
      lang: 'zh',
      tags: ['AI', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/2026/05/18/Useful-Systems/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const item = queue.items[0];
  const publishPackage = buildPublishPackage(item);

  assert.ok(publishPackage.files['image-prompt.txt'].includes('Model: gpt-image-2'));
  assert.ok(publishPackage.files['x-article.md'].includes('博客原文：'));
  assert.ok(!publishPackage.files['short-post.txt'].includes('https://clean99.github.io'));
  assert.ok(publishPackage.files['publish-checklist.md'].includes('Stop before the final'));

  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-package-'));
  try {
    const written = await writePublishPackage(item, { outDir });
    assert.equal(written.files.length, 6);
    const prompt = await readFile(join(written.packageDir, 'image-prompt.txt'), 'utf8');
    const checklist = await readFile(join(written.packageDir, 'publish-checklist.md'), 'utf8');
    assert.ok(prompt.includes('1536x1024'));
    assert.ok(checklist.includes(item.id));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily growth run writes queue, packages, and a browser-safe report', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-'));
  try {
    const result = await runDailyGrowthPlan({
      articles: [
        {
          title: '有用的系统',
          excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈闭环诚实。',
          slug: 'Useful-Systems',
          lang: 'zh',
          tags: ['AI', 'Software Engineering'],
          url: 'https://clean99.github.io/zh/2026/05/18/Useful-Systems/',
        },
      ],
      now: '2026-05-18T00:00:00.000Z',
      queuePath: join(outDir, 'queue.json'),
      packageOutDir: join(outDir, 'packages'),
      reportPath: join(outDir, 'daily-run.md'),
      ledgerPath: join(outDir, 'missing-ledger.json'),
      packageLimit: 2,
      queueOptions: {
        limit: 1,
        lang: 'zh',
        campaign: 'test',
      },
    });

    assert.equal(result.queuedItems, 3);
    assert.equal(result.packages.length, 2);
    assert.equal(result.ledgerSummary, null);

    const queue = JSON.parse(await readFile(join(outDir, 'queue.json'), 'utf8'));
    const report = await readFile(join(outDir, 'daily-run.md'), 'utf8');
    const shortPost = await readFile(join(result.packages[0].packageDir, 'short-post.txt'), 'utf8');

    assert.equal(queue.items.length, 3);
    assert.ok(report.includes('Daily X Growth Run'));
    assert.ok(report.includes('Stop before the final public publish click'));
    assert.ok(report.includes('npm run social:init-ledger'));
    assert.ok(!shortPost.includes('https://clean99.github.io'));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('maps existing tags to Chinese audience hashtags', () => {
  assert.equal(selectHashtags(['AI', 'Software Engineering', 'Web Performance'], 'zh'), '#AI #软件工程');
  assert.equal(selectHashtags(['Software Engineering'], 'en'), '#SoftwareEngineering');
});

test('builds Chinese X Article before the blog link', () => {
  const article = {
    title: '全自动 AI 性能优化',
    excerpt: '我做了一个性能优化 skill，让 AI Agent 执行真正的优化闭环。',
    text: '没有可重复 measurement，AI 优化就是在讲故事。每轮只攻击一个瓶颈。没有可比数据，就不要声明收益。',
    lang: 'zh',
  };

  const xArticle = buildXArticle(article, 'https://clean99.github.io/zh/post/');

  assert.match(xArticle.body, /## 关键结论/);
  assert.ok(!xArticle.body.startsWith('# 全自动 AI 性能优化'));
  assert.ok(xArticle.body.indexOf('## 关键结论') < xArticle.body.indexOf('博客原文：'));
  assert.ok(xArticle.body.endsWith('https://clean99.github.io/zh/post/'));
});

test('creates ledger, replaces same-day snapshots, and renders markdown report', () => {
  const ledger = createLedger({
    startDate: '2026-05-18',
    baselineFollowers: 100,
    followersIn7Days: 1000,
  });
  const updated = appendSnapshot(ledger, {
    date: '2026-05-19',
    followers: 180,
    posts: [
      {
        id: 'post-1',
        url: 'https://x.com/Clean993/status/1',
        metrics: {
          replies: '2',
          reposts: '3',
          likes: '40',
          views: '1.5K',
        },
      },
    ],
  });

  const replaced = appendSnapshot(updated, {
    date: '2026-05-19',
    followers: 190,
    posts: [],
  });

  assert.equal(replaced.snapshots.length, 2);
  assert.equal(replaced.snapshots[1].followers, 190);
  assert.match(formatMarkdownReport(updated), /Follower delta: 80/);
});
