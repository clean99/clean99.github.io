import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { articleFromMarkdown, addUtm, parseFrontmatter } from '../tools/social-growth/articles.mjs';
import {
  applyCapturedMetrics,
  parseXPostMetrics,
  parseXProfileMetrics,
  updateMetricsTemplateFromText,
} from '../tools/social-growth/capture.mjs';
import { buildDistributionCandidates, buildXArticle, selectHashtags } from '../tools/social-growth/copy.mjs';
import { runDailyGrowthPlan, selectPackageItems } from '../tools/social-growth/daily.mjs';
import {
  appendSnapshot,
  createLedger,
  createMetricsTemplateFromQueue,
  formatMarkdownReport,
  updateLedgerSnapshot,
} from '../tools/social-growth/ledger.mjs';
import {
  latestPostsFromSnapshots,
  parseCompactNumber,
  postScore,
  summarizeGrowthLedger,
} from '../tools/social-growth/metrics.mjs';
import { buildGrowthRecommendations, formatRecommendationsMarkdown } from '../tools/social-growth/recommendations.mjs';
import { buildWeeklyExecutionPlan, formatWeeklyExecutionPlanMarkdown } from '../tools/social-growth/schedule.mjs';
import { validateQueue, validateQueueItem } from '../tools/social-growth/validation.mjs';
import {
  buildPublishPackage,
  buildPublishQueue,
  composePublishPosts,
  markQueueItemPublished,
  mergePublishQueues,
  writePublishPackage,
  writeJson,
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
  assert.equal(candidates[0].followUpReplies.length, 2);
  assert.ok(candidates[0].followUpReplies.every((reply) => reply.length <= 260));
  assert.ok(candidates[0].threadFallback[2].includes('https://clean99.github.io'));
  assert.equal(validateQueueItem(candidates[0]).status, 'pass');
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

test('uses the latest post metrics per post instead of double-counting snapshots', () => {
  const snapshots = [
    {
      date: '2026-05-18',
      posts: [
        {
          id: 'same-post',
          metrics: {
            likes: 10,
            views: 100,
          },
        },
      ],
    },
    {
      date: '2026-05-19',
      posts: [
        {
          id: 'same-post',
          metrics: {
            likes: 15,
            replies: 2,
            views: 150,
          },
        },
      ],
    },
  ];
  const ledger = {
    target: {
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    },
    snapshots: [
      {
        date: '2026-05-18',
        followers: 30,
        posts: snapshots[0].posts,
      },
      {
        date: '2026-05-19',
        followers: 35,
        posts: snapshots[1].posts,
      },
    ],
  };

  assert.equal(latestPostsFromSnapshots(snapshots)[0].metrics.likes, 15);
  const summary = summarizeGrowthLedger(ledger);
  assert.equal(summary.totalInteractions, 17);
  assert.equal(summary.totalViews, 150);
  assert.equal(summary.topPosts[0].score, 27);
});

test('parses visible X profile and post metrics text', () => {
  assert.deepEqual(parseXProfileMetrics('Clean993\n30 Following\n1.2K Followers'), {
    followers: 1200,
  });
  assert.deepEqual(parseXProfileMetrics('Clean993\n30 正在关注\n35 位关注者'), {
    followers: 35,
  });

  const postMetrics = parseXPostMetrics([
    'Views',
    '1.5K',
    '12 Likes',
    '3 Replies',
    '2 Reposts',
    '1 Quote',
    '4 Bookmarks',
    'Profile clicks',
    '8',
    'New follows',
    '5',
  ].join('\n'));

  assert.equal(postMetrics.views, 1500);
  assert.equal(postMetrics.likes, 12);
  assert.equal(postMetrics.replies, 3);
  assert.equal(postMetrics.reposts, 2);
  assert.equal(postMetrics.quotes, 1);
  assert.equal(postMetrics.bookmarks, 4);
  assert.equal(postMetrics.profileClicks, 8);
  assert.equal(postMetrics.follows, 5);
});

test('applies captured visible text to metrics template', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-capture-'));
  try {
    const template = {
      version: 1,
      date: '2026-05-19',
      followers: '',
      posts: [
        {
          id: 'post-1',
          articleSlug: 'A',
          variant: 'strong-thesis',
          url: 'https://x.com/Clean993/status/1',
          metrics: {
            views: '',
            likes: '',
          },
        },
      ],
    };
    const updated = applyCapturedMetrics(template, {
      profileText: 'Clean993\n36 Followers',
      postTextsById: {
        'post-1': 'Views\n1.2K\nLikes\n10\nReplies\n2',
      },
    });

    assert.equal(updated.followers, '36');
    assert.equal(updated.posts[0].metrics.views, '1200');
    assert.equal(updated.posts[0].metrics.likes, '10');
    assert.equal(updated.posts[0].metrics.replies, '2');

    const metricsPath = join(outDir, 'posts.local.json');
    const profileTextPath = join(outDir, 'profile.local.txt');
    const postTextDir = join(outDir, 'post-texts');
    await writeJson(metricsPath, template);
    await import('node:fs/promises').then(async ({ mkdir, writeFile }) => {
      await mkdir(postTextDir);
      await writeFile(profileTextPath, 'Clean993\n37 Followers\n');
      await writeFile(join(postTextDir, 'post-1.txt'), 'Views\n2K\nLikes\n20\n');
    });

    const result = await updateMetricsTemplateFromText({
      metricsPath,
      profileTextPath,
      postTextDir,
    });
    const persisted = JSON.parse(await readFile(metricsPath, 'utf8'));

    assert.equal(result.followers, '37');
    assert.equal(persisted.posts[0].metrics.views, '2000');
    assert.equal(persisted.posts[0].metrics.likes, '20');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
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
  assert.ok(publishPackage.files['follow-up-replies.md'].includes('Reply 1'));
  assert.ok(publishPackage.files['quality-gate.md'].includes('Status: pass'));
  assert.ok(publishPackage.files['publish-checklist.md'].includes('Stop before the final'));

  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-package-'));
  try {
    const written = await writePublishPackage(item, { outDir });
    assert.equal(written.files.length, 8);
    const prompt = await readFile(join(written.packageDir, 'image-prompt.txt'), 'utf8');
    const replies = await readFile(join(written.packageDir, 'follow-up-replies.md'), 'utf8');
    const checklist = await readFile(join(written.packageDir, 'publish-checklist.md'), 'utf8');
    const qualityGate = await readFile(join(written.packageDir, 'quality-gate.md'), 'utf8');
    assert.ok(prompt.includes('1536x1024'));
    assert.ok(replies.includes('Reply 2'));
    assert.ok(checklist.includes(item.id));
    assert.ok(qualityGate.includes(item.id));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily growth run writes queue, packages, and a browser-safe report', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-'));
  try {
    const existingQueue = buildPublishQueue([
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
      createdAt: '2026-05-17T00:00:00.000Z',
      limit: 1,
    });
    const publishedQueue = markQueueItemPublished(existingQueue, {
      id: existingQueue.items[0].id,
      xPostUrl: 'https://x.com/Clean993/status/1',
      xArticleUrl: 'https://x.com/Clean993/articles/1',
      publishedAt: '2026-05-17T01:00:00.000Z',
    });
    await writeJson(join(outDir, 'queue.json'), publishedQueue);

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
      weeklyPlanPath: join(outDir, 'weekly-plan.md'),
      ledgerPath: join(outDir, 'missing-ledger.json'),
      metricsPath: join(outDir, 'posts.local.json'),
      packageLimit: 2,
      queueOptions: {
        limit: 1,
        lang: 'zh',
        campaign: 'test',
      },
    });

    assert.equal(result.queuedItems, 3);
    assert.equal(result.packages.length, 2);
    assert.equal(result.metricPosts, 1);
    assert.equal(result.ledgerSummary, null);
    assert.equal(result.validationSummary.status, 'pass');
    assert.equal(result.weeklyPlanSummary, null);

    const queue = JSON.parse(await readFile(join(outDir, 'queue.json'), 'utf8'));
    const metricsTemplate = JSON.parse(await readFile(join(outDir, 'posts.local.json'), 'utf8'));
    const report = await readFile(join(outDir, 'daily-run.md'), 'utf8');
    const shortPost = await readFile(join(result.packages[0].packageDir, 'short-post.txt'), 'utf8');

    assert.equal(queue.items.length, 3);
    assert.equal(queue.items[0].status, 'published');
    assert.equal(queue.items[0].xPostUrl, 'https://x.com/Clean993/status/1');
    assert.equal(metricsTemplate.posts.length, 1);
    assert.equal(metricsTemplate.posts[0].metrics.views, '');
    assert.ok(report.includes('Daily X Growth Run'));
    assert.ok(report.includes('Weekly execution plan: not generated; ledger missing.'));
    assert.ok(report.includes('Package selection: article-diverse first'));
    assert.ok(report.includes('X Publishing Quality Gate'));
    assert.ok(report.includes('Quality gate: 3/3 passed'));
    assert.ok(report.includes('Stop before the final public publish click'));
    assert.ok(report.includes('Metrics Capture'));
    assert.ok(report.includes('social:capture-metrics'));
    assert.ok(!shortPost.includes('https://clean99.github.io'));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('weekly execution plan schedules only validated draft candidates', () => {
  const queue = buildPublishQueue([
    {
      title: '第一篇',
      excerpt: '第一篇文章解释一个可复用的工程判断框架。',
      slug: 'First-Post',
      lang: 'zh',
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/First-Post/',
    },
    {
      title: '第二篇',
      excerpt: '第二篇文章解释一个可复用的工程判断框架。',
      slug: 'Second-Post',
      lang: 'zh',
      tags: ['Software Engineering'],
      url: 'https://clean99.github.io/zh/2026/05/18/Second-Post/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 2,
  });
  queue.items[1] = {
    ...queue.items[1],
    shortPost: '这篇文章不错 https://clean99.github.io/bad/',
  };
  const ledger = createLedger({
    startDate: '2026-05-18',
    baselineFollowers: 30,
    followersIn7Days: 1000,
  });

  const plan = buildWeeklyExecutionPlan({
    queue,
    ledger,
    now: '2026-05-18T00:00:00.000Z',
    postsPerDay: 2,
  });
  const scheduledIds = plan.days.flatMap((day) => day.publishSlots.map((slot) => slot.item.id));

  assert.equal(plan.validationSummary.failed, 1);
  assert.ok(!scheduledIds.includes(queue.items[1].id));
  assert.equal(plan.days.length, 7);
  assert.equal(plan.candidates.missingSlots, 9);
  assert.match(formatWeeklyExecutionPlanMarkdown(plan), /Weekly X Growth Execution Plan/);
  assert.match(formatWeeklyExecutionPlanMarkdown(plan), /Need 9 more validated candidates/);
});

test('daily growth run writes a weekly execution plan when a ledger exists', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-weekly-daily-'));
  try {
    const ledgerPath = join(outDir, 'ledger.json');
    const weeklyPlanPath = join(outDir, 'weekly-plan.md');
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));

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
      weeklyPlanPath,
      ledgerPath,
      metricsPath: join(outDir, 'posts.local.json'),
      packageLimit: 1,
      queueOptions: {
        limit: 1,
        lang: 'zh',
        campaign: 'test',
      },
    });
    const report = await readFile(join(outDir, 'daily-run.md'), 'utf8');
    const weeklyPlan = await readFile(weeklyPlanPath, 'utf8');

    assert.equal(result.weeklyPlanPath, weeklyPlanPath);
    assert.equal(result.weeklyPlanSummary.plannedPosts, 3);
    assert.ok(report.includes('Weekly execution plan:'));
    assert.ok(weeklyPlan.includes('Weekly X Growth Execution Plan'));
    assert.ok(weeklyPlan.includes('Unfilled slots: 18'));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('quality gate rejects raw blog URLs and low-value X copy', () => {
  const queue = buildPublishQueue([
    {
      title: '有用的系统',
      excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈闭环诚实。',
      slug: 'Useful-Systems',
      lang: 'zh',
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/Useful-Systems/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  queue.items[0] = {
    ...queue.items[0],
    shortPost: `这篇文章很有用\nhttps://clean99.github.io/zh/2026/05/18/Useful-Systems/`,
  };

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.equal(validation.failed, 1);
  assert.ok(validation.items[0].errors.some((error) => error.includes('raw blog URLs')));
});

test('daily package selection prefers distinct articles before extra variants', () => {
  const articles = [
    {
      title: '第一篇',
      excerpt: '第一篇文章解释一个可复用的工程判断框架。',
      slug: 'First-Post',
      lang: 'zh',
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/First-Post/',
    },
    {
      title: '第二篇',
      excerpt: '第二篇文章解释一个可复用的工程判断框架。',
      slug: 'Second-Post',
      lang: 'zh',
      tags: ['Software Engineering'],
      url: 'https://clean99.github.io/zh/2026/05/18/Second-Post/',
    },
    {
      title: '第三篇',
      excerpt: '第三篇文章解释一个可复用的工程判断框架。',
      slug: 'Third-Post',
      lang: 'zh',
      tags: ['Web Performance'],
      url: 'https://clean99.github.io/zh/2026/05/18/Third-Post/',
    },
  ];
  const queue = buildPublishQueue(articles, {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 3,
  });

  const selected = selectPackageItems(queue, { limit: 3 });

  assert.deepEqual(selected.map((item) => item.articleSlug), ['First-Post', 'Second-Post', 'Third-Post']);
  assert.deepEqual(selected.map((item) => item.variant), ['strong-thesis', 'strong-thesis', 'strong-thesis']);
});

test('metrics template includes only published posts and snapshot can read it', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-metrics-'));
  try {
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
    const publishedQueue = markQueueItemPublished(queue, {
      id: queue.items[1].id,
      xPostUrl: 'https://x.com/Clean993/status/2',
      publishedAt: '2026-05-18T01:00:00.000Z',
    });
    const template = createMetricsTemplateFromQueue(publishedQueue, {
      date: '2026-05-19',
      followers: '35',
    });
    template.posts[0].metrics.views = '1.2K';
    template.posts[0].metrics.likes = '12';
    template.posts[0].metrics.replies = '3';

    const ledgerPath = join(outDir, 'ledger.json');
    const postsPath = join(outDir, 'posts.local.json');
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeJson(postsPath, template);

    const updated = await updateLedgerSnapshot({
      ledgerPath,
      postsFile: postsPath,
      snapshot: {},
    });

    assert.equal(template.posts.length, 1);
    assert.equal(updated.snapshots[1].followers, 35);
    assert.equal(updated.snapshots[1].posts[0].metrics.views, 1200);
    assert.equal(summarizeGrowthLedger(updated).followerDelta, 5);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('merges daily queues without losing published URLs', () => {
  const articles = [
    {
      title: '有用的系统',
      excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈闭环诚实。',
      slug: 'Useful-Systems',
      lang: 'zh',
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/Useful-Systems/',
    },
  ];
  const existingQueue = markQueueItemPublished(buildPublishQueue(articles, {
    campaign: 'old',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  }), {
    id: 'Useful-Systems__zh__strong-thesis__00',
    xPostUrl: 'https://x.com/Clean993/status/1',
    publishedAt: '2026-05-18T01:00:00.000Z',
  });
  const nextQueue = buildPublishQueue(articles, {
    campaign: 'new',
    createdAt: '2026-05-19T00:00:00.000Z',
    limit: 1,
  });

  const merged = mergePublishQueues(existingQueue, nextQueue);

  assert.equal(merged.items[0].status, 'published');
  assert.equal(merged.items[0].xPostUrl, 'https://x.com/Clean993/status/1');
  assert.ok(merged.items[0].targetUrl.includes('utm_campaign=new'));
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
  assert.match(formatMarkdownReport(updated), /Growth Recommendations/);
});

test('builds growth recommendations from variant performance', () => {
  const ledger = {
    target: {
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    },
    snapshots: [
      {
        date: '2026-05-18',
        followers: 30,
        posts: [],
      },
      {
        date: '2026-05-19',
        followers: 45,
        posts: [
          {
            id: 'a',
            articleSlug: 'A',
            variant: 'strong-thesis',
            metrics: {
              views: 1000,
              likes: 20,
              replies: 4,
              reposts: 2,
              bookmarks: 3,
              follows: 5,
            },
          },
          {
            id: 'b',
            articleSlug: 'B',
            variant: 'case-story',
            metrics: {
              views: 500,
              likes: 15,
            },
          },
        ],
      },
    ],
  };

  const result = buildGrowthRecommendations(ledger);

  assert.equal(result.variantPerformance[0].key, 'strong-thesis');
  assert.ok(result.recommendations.some((item) => item.action.includes('strong-thesis')));
  assert.match(formatRecommendationsMarkdown(ledger), /Variant Performance/);
});
