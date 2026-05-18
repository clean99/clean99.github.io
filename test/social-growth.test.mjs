import test from 'node:test';
import assert from 'node:assert/strict';
import { articleFromMarkdown, addUtm, parseFrontmatter } from '../tools/social-growth/articles.mjs';
import { buildDistributionCandidates } from '../tools/social-growth/copy.mjs';
import { appendSnapshot, createLedger, formatMarkdownReport } from '../tools/social-growth/ledger.mjs';
import { parseCompactNumber, postScore, summarizeGrowthLedger } from '../tools/social-growth/metrics.mjs';
import { buildPublishQueue, composePublishPosts, markQueueItemPublished } from '../tools/social-growth/queue.mjs';

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
  assert.equal(candidates[0].linkPostIndex, 0);
  assert.equal(candidates[2].linkPostIndex, 2);
  assert.equal(candidates[2].posts[2], 'Full post:');
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
      title: 'Useful Systems',
      excerpt: 'A useful system keeps the data model small and the feedback loop honest.',
      slug: 'Useful-Systems',
      lang: 'en',
      tags: ['AI'],
      url: 'https://clean99.github.io/2026/05/18/Useful-Systems/',
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
  assert.ok(composed[0].includes('https://clean99.github.io/2026/05/18/Useful-Systems/'));

  const updated = markQueueItemPublished(queue, {
    id: queue.items[0].id,
    xPostUrl: 'https://x.com/Clean993/status/1',
    publishedAt: '2026-05-18T01:00:00.000Z',
  });
  assert.equal(updated.items[0].status, 'published');
  assert.equal(updated.items[0].xPostUrl, 'https://x.com/Clean993/status/1');
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
