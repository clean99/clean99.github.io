import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { articleFromMarkdown, addUtm, loadArticles, parseFrontmatter } from '../tools/social-growth/articles.mjs';
import { runSafeAutomationCycle } from '../tools/social-growth/automation.mjs';
import {
  applyCapturedMetrics,
  parseXPostMetrics,
  parseXProfileMetrics,
  updateMetricsTemplateFromText,
} from '../tools/social-growth/capture.mjs';
import { buildDistributionCandidates, buildXArticle, extractKeyPoints, selectHashtags } from '../tools/social-growth/copy.mjs';
import {
  applyCopyOverrideToQueue,
  buildCopyOverrideTemplate,
  selectCopyTarget,
  writeCopyOverrideReport,
  writeCopyOverrideTemplate,
} from '../tools/social-growth/copyOverride.mjs';
import { expandQueueOptionsForWeeklyCoverage, runDailyGrowthPlan, selectPackageItems } from '../tools/social-growth/daily.mjs';
import {
  buildDailyExecutionBrief,
  formatDailyExecutionBriefMarkdown,
  writeDailyExecutionBrief,
} from '../tools/social-growth/dailyBrief.mjs';
import { buildDayReadiness, formatDayReadinessMarkdown, writeDayReadiness } from '../tools/social-growth/dayReadiness.mjs';
import {
  buildEngagementPlan,
  buildEngagementSearchPlan,
  formatEngagementPlanMarkdown,
  formatEngagementSearchPlanMarkdown,
  readEngagementOpportunityTexts,
  writeEngagementPlan,
  writeEngagementSearchPlan,
} from '../tools/social-growth/engagement.mjs';
import {
  buildGrowthFunnel,
  formatGrowthFunnelMarkdown,
} from '../tools/social-growth/funnel.mjs';
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
import { runPostPublishMetricsCycle } from '../tools/social-growth/metricsCycle.mjs';
import { buildGrowthRecommendations, formatRecommendationsMarkdown } from '../tools/social-growth/recommendations.mjs';
import {
  buildImageBrief,
  formatImageBriefMarkdown,
  imageBriefPath,
  writeImageBrief,
} from '../tools/social-growth/imageBrief.mjs';
import { buildPublishPreflight, formatPublishPreflightMarkdown, registerPublishImage } from '../tools/social-growth/preflight.mjs';
import {
  buildPublishConfirmation,
  formatPublishConfirmationMarkdown,
  writePublishConfirmation,
} from '../tools/social-growth/publishConfirmation.mjs';
import {
  buildProfileAudit,
  buildProfileUpdatePackage,
  formatProfileUpdatePackageMarkdown,
  formatProfileAuditMarkdown,
  parseProfileText,
  writeProfileAudit,
} from '../tools/social-growth/profile.mjs';
import { buildWeeklyExecutionPlan, formatWeeklyExecutionPlanMarkdown } from '../tools/social-growth/schedule.mjs';
import { runScheduledGrowthLoop } from '../tools/social-growth/scheduledRun.mjs';
import { buildGrowthStatus, formatGrowthStatusMarkdown, writeGrowthStatus } from '../tools/social-growth/status.mjs';
import { runXGrowthDryRun } from '../tools/social-growth/flowDryRun.mjs';
import { buildXPublishPrep, formatXPublishPrepMarkdown, writeXPublishPrep } from '../tools/social-growth/xPrep.mjs';
import {
  buildXTechnicalSharingBrief,
  formatXTechnicalSharingBriefMarkdown,
  writeXTechnicalSharingBrief,
} from '../tools/social-growth/xTechBrief.mjs';
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

test('article loader skips dirty and untracked posts unless explicitly included', async () => {
  if (spawnSync('git', ['--version'], { encoding: 'utf8' }).status !== 0) return;

  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-articles-'));
  try {
    const postsDir = join(outDir, 'source/_posts');
    await mkdir(postsDir, { recursive: true });
    const trackedPost = `---
title: Tracked Post
date: 2026-05-18 10:00:00
tags: [AI]
lang: zh
i18n_key: Tracked-Post
permalink: zh/2026/05/18/Tracked-Post/
---

Tracked body.
`;
    const untrackedPost = `---
title: Untracked Draft
date: 2026-05-19 10:00:00
tags: [AI]
lang: zh
i18n_key: Untracked-Draft
permalink: zh/2026/05/19/Untracked-Draft/
---

Draft body.
`;
    await writeFile(join(postsDir, 'Tracked-Post-zh.md'), trackedPost);
    await writeFile(join(postsDir, 'Dirty-Post-zh.md'), trackedPost.replace(/Tracked Post/g, 'Dirty Post').replace(/Tracked-Post/g, 'Dirty-Post'));
    await writeFile(join(postsDir, 'Untracked-Draft-zh.md'), untrackedPost);
    assert.equal(spawnSync('git', ['init'], { cwd: outDir, encoding: 'utf8' }).status, 0);
    assert.equal(spawnSync('git', ['add', 'source/_posts/Tracked-Post-zh.md', 'source/_posts/Dirty-Post-zh.md'], { cwd: outDir, encoding: 'utf8' }).status, 0);
    assert.equal(spawnSync('git', [
      '-c', 'user.name=Test User',
      '-c', 'user.email=test@example.invalid',
      'commit',
      '-m',
      'init',
    ], { cwd: outDir, encoding: 'utf8' }).status, 0);
    await writeFile(join(postsDir, 'Dirty-Post-zh.md'), trackedPost.replace(/Tracked Post/g, 'Dirty Post Updated').replace(/Tracked-Post/g, 'Dirty-Post'));

    const trackedOnly = await loadArticles({ postsDir, gitCwd: outDir });
    const withUntracked = await loadArticles({ postsDir, gitCwd: outDir, includeUntracked: true });

    assert.deepEqual(trackedOnly.map((article) => article.slug), ['Tracked-Post']);
    assert.deepEqual(withUntracked.map((article) => article.slug), ['Untracked-Draft', 'Dirty-Post', 'Tracked-Post']);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
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

test('builds a growth funnel from views to follows', () => {
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
        posts: [
          {
            id: 'weak-handoff',
            articleSlug: 'A',
            variant: 'strong-thesis',
            metrics: {
              views: 1000,
              likes: 20,
              replies: 2,
            },
          },
          {
            id: 'weak-follow',
            articleSlug: 'B',
            variant: 'case-story',
            metrics: {
              views: 500,
              likes: 10,
              profileClicks: 8,
            },
          },
        ],
      },
    ],
  };

  const funnel = buildGrowthFunnel(ledger);
  const markdown = formatGrowthFunnelMarkdown(ledger);

  assert.equal(funnel.status, 'needs_follow_conversion');
  assert.equal(funnel.totals.views, 1500);
  assert.equal(funnel.totals.profileClicks, 8);
  assert.equal(funnel.totals.follows, 0);
  assert.ok(funnel.posts.some((post) => post.bottleneck === 'no_profile_click_handoff'));
  assert.ok(funnel.posts.some((post) => post.bottleneck === 'profile_clicks_not_converting'));
  assert.match(markdown, /X Growth Funnel/);
  assert.match(markdown, /Follow \/ profile click/);
});

test('growth funnel treats follows as conversion even when profile clicks are unavailable', () => {
  const ledger = {
    target: {
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    },
    snapshots: [
      {
        date: '2026-05-18',
        followers: 32,
        posts: [
          {
            id: 'follow-without-profile-clicks',
            articleSlug: 'A',
            variant: 'strong-thesis',
            metrics: {
              views: 1000,
              likes: 20,
              follows: 2,
            },
          },
        ],
      },
    ],
  };

  const funnel = buildGrowthFunnel(ledger);

  assert.equal(funnel.status, 'converting');
  assert.equal(funnel.posts[0].bottleneck, 'converting');
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

    const profileOnlyPath = join(outDir, 'profile-only.local.json');
    await writeJson(profileOnlyPath, template);
    const profileOnly = await updateMetricsTemplateFromText({
      metricsPath: profileOnlyPath,
      profileTextPath,
      postTextDir: join(outDir, 'missing-post-texts'),
    });
    const profileOnlyPersisted = JSON.parse(await readFile(profileOnlyPath, 'utf8'));

    assert.equal(profileOnly.followers, '37');
    assert.equal(profileOnly.postMetricsUpdated, 0);
    assert.equal(profileOnlyPersisted.posts[0].metrics.views, '');
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
  assert.equal(queue.items[0].id, 'Useful-Systems__zh__strong-thesis');
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

test('queue ids stay stable when newer articles are inserted', () => {
  const baseArticle = {
    title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
    excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
    slug: 'Agent-Skills',
    lang: 'zh',
    tags: ['AI', 'Software Engineering'],
    url: 'https://clean99.github.io/zh/agent-skills/',
  };
  const insertedArticle = {
    title: 'Workspace v2 Tab System',
    excerpt: '把浏览器级 Tab 体验搬进 Workspace。',
    slug: 'Workspace-v2-Tab-System',
    lang: 'zh',
    tags: ['Frontend', 'Software Engineering'],
    url: 'https://clean99.github.io/zh/workspace-v2/',
  };
  const firstQueue = buildPublishQueue([baseArticle], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const secondQueue = buildPublishQueue([insertedArticle, baseArticle], {
    campaign: 'test',
    createdAt: '2026-05-19T00:00:00.000Z',
    limit: 2,
  });

  assert.ok(secondQueue.items.some((item) => item.id === firstQueue.items[0].id));
});

test('generates article-specific Chinese X copy instead of repeating one template', () => {
  const queue = buildPublishQueue([
    {
      title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
      excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
      slug: 'Agent-Skills',
      lang: 'zh',
      tags: ['AI', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/agent-skills/',
    },
    {
      title: '从第一性原理理解 SEO —— 一次博客全面改造的深度复盘',
      excerpt: '大多数 SEO 指南都是清单式的：加这个 meta 标签、装那个插件。',
      slug: 'SEO-Overhaul',
      lang: 'zh',
      tags: ['Frontend', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/seo/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 2,
  });
  const strongPosts = queue.items.filter((item) => item.variant === 'strong-thesis');

  assert.match(strongPosts[0].shortPost, /Agent Skill/);
  assert.match(strongPosts[1].shortPost, /技术博客 SEO/);
  assert.notEqual(strongPosts[0].shortPost, strongPosts[1].shortPost);
  assert.match(strongPosts[0].shortPost, /图里是判断框架，长文放在 X Article/);
  assert.match(strongPosts[0].xArticle.body, /Skill 的价值不是多一段提示词/);
  assert.match(strongPosts[1].xArticle.body, /SEO 不是标签清单/);
  assert.equal(validateQueue(queue).status, 'pass');
});

test('Chinese short posts sell the image and X Article before the blog link', () => {
  const queue = buildPublishQueue([
    {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
      slug: 'Automated-AI-Performance-Optimization',
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const item = queue.items[0];

  assert.doesNotMatch(item.shortPost, /https?:\/\//i);
  assert.match(item.shortPost, /很多人把「AI 性能优化」想错了/);
  assert.match(item.shortPost, /真正值钱的不是让模型多给几条优化建议/);
  assert.match(item.shortPost, /图里是判断框架，长文放在 X Article/);
  assert.match(item.xArticle.body, /博客原文：https:\/\/clean99\.github\.io\/zh\/automated-ai-performance\//);
  assert.match(item.media.prompt, /Scroll-stopper headline: AI 性能优化：不是建议，是验证闭环/);
  assert.equal(validateQueueItem(item).status, 'pass');
});

test('filters heading-glued fragments from Chinese X Article extraction', () => {
  const points = extractKeyPoints([
    '真正的问题 目标看起来很简单：优化 Workspace FMP。',
    '实际目标更严格： | 指标 | 目标 | | --- | ---: | | 子应用 FMP P90 | 2。',
    '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
    '测量契约修复后，loop 才开始优化真实瓶颈。',
  ].join(' '));
  const article = {
    title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
    excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
    slug: 'Automated-AI-Performance-Optimization',
    lang: 'zh',
    tags: ['AI', 'Software Engineering', 'Web Performance'],
    text: [
      '真正的问题 目标看起来很简单：优化 Workspace FMP。',
      '实际目标更严格： | 指标 | 目标 | | --- | ---: | | 子应用 FMP P90 | 2。',
      '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
      '测量契约修复后，loop 才开始优化真实瓶颈。',
    ].join(' '),
  };
  const xArticle = buildXArticle(article, 'https://clean99.github.io/zh/post/');

  assert.deepEqual(points, [
    '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline',
    '测量契约修复后，loop 才开始优化真实瓶颈',
  ]);
  assert.doesNotMatch(xArticle.body, /真正的问题 目标/);
  assert.doesNotMatch(xArticle.body, /\| 指标 \|/);
  assert.match(xArticle.body, /没有可重复测量/);
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

test('copy override bridge lets a writing skill replace queue copy locally', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-copy-override-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const item = selectCopyTarget(queue, ledger, {
      day: 1,
      slot: 1,
      now: '2026-05-18T00:00:00.000Z',
    });
    const template = buildCopyOverrideTemplate(item);
    const optimized = {
      ...template,
      shortPost: [
        '别把「AI 性能优化」做成建议清单。',
        '',
        '真正要验证的是 baseline -> change -> verify -> ledger 这条链路有没有闭合。',
        '',
        '图里放判断框架，完整推演放 X Article。',
        '',
        '#AI #软件工程',
      ].join('\n'),
      xArticle: {
        title: 'AI 性能优化，先别谈建议',
        body: [
          '这篇文章要解决的不是“让模型多给几条建议”，而是验证优化闭环到底有没有成立。',
          '',
          '## 关键结论',
          '',
          '- 没有 baseline，任何收益都只是感觉。',
          '- 没有同一个 harness，前后对比没有意义。',
          '- 没有 ledger，优化过程不能复盘。',
          '',
          '## 可复用框架',
          '',
          'baseline -> change -> verify -> ledger',
          '',
          `博客原文：${item.targetUrl}`,
        ].join('\n'),
      },
      image: {
        ...template.image,
        alt: 'AI 性能优化验证闭环图',
        prompt: `${template.image.prompt}\nUse natural Chinese technical wording, readable at mobile size, no brand logos.`,
      },
      threadFallback: [
        '别把 AI 性能优化做成建议清单。图里是验证闭环。',
        '真正要看的不是模型说了什么，而是同一个 harness 复测后指标有没有变。',
        `完整过程：${item.targetUrl}`,
      ],
      followUpReplies: [
        '补一个判断：如果 baseline、场景、网络条件任意一个变了，这轮优化结果就不能直接归因。',
      ],
      notes: 'test optimized copy',
    };

    const result = applyCopyOverrideToQueue(queue, optimized, {
      now: '2026-05-18T00:00:00.000Z',
    });
    const templatePath = await writeCopyOverrideTemplate(template, join(outDir, 'template.json'));
    const reportPath = await writeCopyOverrideReport({
      ...result,
      generatedAt: '2026-05-18T00:00:00.000Z',
    }, join(outDir, 'copy-override.md'));
    const persistedTemplate = JSON.parse(await readFile(templatePath, 'utf8'));
    const report = await readFile(reportPath, 'utf8');

    assert.equal(queue.items[0].shortPost, template.shortPost);
    assert.equal(result.item.shortPost, optimized.shortPost);
    assert.equal(result.item.posts[0], optimized.shortPost);
    assert.equal(result.item.contentStatus, 'ready_for_validation');
    assert.equal(result.item.copySource, 'external-writing-skill');
    assert.equal(result.validation.status, 'pass');
    assert.equal(result.queueValidation.status, 'pass');
    assert.equal(persistedTemplate.id, item.id);
    assert.match(report, /This only updates local queue copy/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('copy override refuses to mutate published queue items by default', () => {
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
  const publishedQueue = markQueueItemPublished(queue, {
    id: queue.items[0].id,
    xPostUrl: 'https://x.com/Clean993/status/1',
    publishedAt: '2026-05-18T01:00:00.000Z',
  });

  assert.throws(
    () => applyCopyOverrideToQueue(publishedQueue, {
      id: queue.items[0].id,
      shortPost: '不会写入已发布项目',
    }),
    /Refusing to change published queue item/,
  );
});

test('x technical sharing brief packages source article and copy override template', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-x-tech-brief-'));
  try {
    const article = {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
      slug: 'Automated-AI-Performance-Optimization',
      i18nKey: 'Automated-AI-Performance-Optimization',
      absolutePath: join(outDir, 'post.md'),
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
      text: [
        '没有可重复 measurement，AI 优化就是在讲故事。',
        'generated by gpt-image-2。',
        '所以我把 skill 的核心契约设计成： 图：目标、harness、能力层、代码修改。',
        '每轮只攻击一个瓶颈。',
        '没有可比数据，就不要声明收益。',
      ].join(' '),
    };
    const queue = buildPublishQueue([article], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = appendSnapshot(createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }), {
      date: '2026-05-19',
      followers: 46,
      posts: [
        {
          id: 'winning-post',
          articleSlug: 'Automated-AI-Performance-Optimization',
          variant: 'strong-thesis',
          metrics: {
            views: 1200,
            likes: 18,
            replies: 4,
            reposts: 3,
            bookmarks: 6,
            profileClicks: 12,
            follows: 4,
          },
        },
      ],
    });
    const brief = await buildXTechnicalSharingBrief({
      articles: [article],
      queue,
      ledger,
      day: 1,
      slot: 1,
      now: '2026-05-18T00:00:00.000Z',
      briefPath: join(outDir, 'brief.md'),
      templatePath: join(outDir, 'override.json'),
    });
    const markdown = formatXTechnicalSharingBriefMarkdown(brief);
    const written = await writeXTechnicalSharingBrief(brief);
    const persistedBrief = await readFile(written.briefPath, 'utf8');
    const persistedTemplate = JSON.parse(await readFile(written.templatePath, 'utf8'));

    assert.equal(brief.selected.id, queue.items[0].id);
    assert.equal(brief.article.absolutePath, article.absolutePath);
    assert.equal(brief.template.source, 'x-technical-sharing');
    assert.equal(brief.template.contentStatus, 'needs_x_technical_sharing');
    assert.match(markdown, /Observable problem/);
    assert.match(markdown, /X Native Frame/);
    assert.match(markdown, /Opening options/);
    assert.match(markdown, /Growth Feedback/);
    assert.match(markdown, /Follower delta: 16 \/ 1000/);
    assert.match(markdown, /Algorithm lens/);
    assert.match(markdown, /Stage: winner_scaling/);
    assert.match(markdown, /Metric to move: follow_per_view/);
    assert.match(markdown, /strong-thesis: score/);
    assert.match(markdown, /Automated-AI-Performance-Optimization: score/);
    assert.match(markdown, /profile clicks 12/);
    assert.match(markdown, /npm run social:apply-copy/);
    assert.match(markdown, /Current Generated Copy/);
    assert.ok(brief.xNativeFrame.openingOptions.some((item) => item.includes('AI 性能优化')));
    const sourcePoints = markdown.split('## Current Generated Copy')[0];
    assert.doesNotMatch(sourcePoints, /generated by gpt-image-2/);
    assert.doesNotMatch(sourcePoints, /图：目标/);
    assert.match(persistedBrief, /X Technical Sharing Brief/);
    assert.equal(persistedTemplate.id, queue.items[0].id);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('engagement plan creates selective reply candidates from captured technical threads', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-engagement-'));
  try {
    const opportunityDir = join(outDir, 'opportunities');
    await mkdir(opportunityDir, { recursive: true });
    await writeFile(join(opportunityDir, 'ai-performance.txt'), [
      'https://x.com/example/status/1',
      '最近用 AI Agent 做前端性能优化，最大的问题不是模型不会写代码，而是每次优化后 baseline 口径都不一样。',
      '如果没有 harness，所谓收益很难复现。',
    ].join('\n'));
    await writeFile(join(opportunityDir, 'giveaway.txt'), [
      '转发抽奖',
      '关注我领取福利。',
    ].join('\n'));
    const article = {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
      slug: 'Automated-AI-Performance-Optimization',
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
    };
    const queue = buildPublishQueue([article], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const opportunityTexts = await readEngagementOpportunityTexts(opportunityDir);
    const plan = buildEngagementPlan({
      queue,
      opportunityTexts,
      now: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const markdown = formatEngagementPlanMarkdown(plan);
    const outPath = join(outDir, 'engagement-plan.md');
    await writeEngagementPlan(plan, outPath);
    const persisted = await readFile(outPath, 'utf8');

    assert.equal(plan.status, 'ready_for_browser_confirmation');
    assert.equal(plan.selectedCount, 1);
    assert.equal(plan.opportunities[0].queueId, queue.items[0].id);
    assert.equal(plan.opportunities[0].browserAction.requiresConfirmation, true);
    assert.match(plan.opportunities[0].draftReply, /可验证链路/);
    assert.doesNotMatch(plan.opportunities[0].draftReply, /https?:\/\//);
    assert.ok(plan.skipped.some((item) => item.status === 'skipped_low_value'));
    assert.match(markdown, /final public Reply click/);
    assert.match(persisted, /X Engagement Plan/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('engagement plan asks for captured opportunities before browser work', () => {
  const queue = buildPublishQueue([
    {
      title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
      excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
      slug: 'Agent-Skills',
      lang: 'zh',
      tags: ['AI', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/agent-skills/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });

  const plan = buildEngagementPlan({
    queue,
    opportunityTexts: [],
    now: '2026-05-18T00:00:00.000Z',
  });

  assert.equal(plan.status, 'needs_opportunity_capture');
  assert.equal(plan.selectedCount, 0);
  assert.match(formatEngagementPlanMarkdown(plan), /engagement-opportunities/);
  assert.match(plan.boundary, /Do not reply/);
});

test('engagement search plan creates read-only X searches from queue topics', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-engagement-search-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
      {
        title: 'React Performance Optimization',
        excerpt: 'React 性能优化要先定位 render、network 和 interaction 成本。',
        slug: 'React-Performance-Optimization',
        lang: 'zh',
        tags: ['React', 'Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/react-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const plan = buildEngagementSearchPlan({
      queue,
      now: '2026-05-18T00:00:00.000Z',
      limit: 4,
      daysBack: 3,
    });
    const markdown = formatEngagementSearchPlanMarkdown(plan);
    const outPath = join(outDir, 'engagement-search.md');
    await writeEngagementSearchPlan(plan, outPath);
    const persisted = await readFile(outPath, 'utf8');

    assert.equal(plan.status, 'ready_for_read_only_search');
    assert.equal(plan.since, '2026-05-15');
    assert.ok(plan.searches.length <= 4);
    assert.ok(plan.searches.some((item) => item.topic === 'AI 工程化'));
    assert.ok(plan.searches.every((item) => item.url.startsWith('https://x.com/search?')));
    assert.ok(plan.searches.every((item) => item.query.includes('lang:zh')));
    assert.ok(plan.searches.every((item) => item.captureHint.includes('engagement-opportunities')));
    assert.match(markdown, /Read-only discovery/);
    assert.match(persisted, /X Engagement Search Plan/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily execution brief combines publish, engagement, metrics, and profile actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-brief-'));
  try {
    const article = {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
      slug: 'Automated-AI-Performance-Optimization',
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
    };
    const queue = buildPublishQueue([article], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const skillDir = join(outDir, 'baoyu-post-to-x');
    const imageDir = join(outDir, 'images');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

    const brief = await buildDailyExecutionBrief({
      queue,
      ledger,
      profileText: [
        'Clean99 | AI 工程化与前端性能',
        '@Clean993',
        '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
        'https://clean99.github.io',
        'Pinned',
        '30 Followers',
      ].join('\n'),
      opportunityTexts: [],
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      env: {},
    });
    const markdown = formatDailyExecutionBriefMarkdown(brief);
    const outPath = join(outDir, 'daily-brief.md');
    await writeDailyExecutionBrief(brief, outPath);
    const persisted = await readFile(outPath, 'utf8');

    assert.equal(brief.status, 'ready_to_publish');
    assert.equal(brief.dayReadiness.readySlots, 1);
    assert.equal(brief.engagementSearch.status, 'ready_for_read_only_search');
    assert.equal(brief.engagementPlan.status, 'needs_opportunity_capture');
    assert.equal(brief.metricsReadiness.totalPosts, 0);
    assert.equal(brief.funnel.status, 'needs_published_posts');
    assert.ok(brief.actionItems.some((item) => item.action.includes('Prepare 1 ready X Article')));
    assert.match(markdown, /Daily X Growth Brief/);
    assert.match(markdown, /Conversion Funnel/);
    assert.match(markdown, /Action Order/);
    assert.match(persisted, /metrics-cycle/);
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

test('safe automation cycle prepares local artifacts without public X actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-automation-'));
  try {
    await writeJson(join(outDir, 'ledger.json'), createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    const skillDir = join(outDir, 'baoyu-post-to-x');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(outDir, 'profile.local.txt'), [
      'clean',
      '@Clean993',
      'Software Engineer at Tiktok',
      'Singaporeclean99.github.io',
      '30 Followers',
    ].join('\n'));

    const result = await runSafeAutomationCycle({
      articles: [
        {
          title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
          excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
          slug: 'Automated-AI-Performance-Optimization',
          lang: 'zh',
          tags: ['AI', 'Software Engineering', 'Web Performance'],
          url: 'https://clean99.github.io/zh/automated-ai-performance/',
        },
        {
          title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
          excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
          slug: 'Agent-Skills',
          lang: 'zh',
          tags: ['AI', 'Software Engineering'],
          url: 'https://clean99.github.io/zh/agent-skills/',
        },
      ],
      now: '2026-05-18T00:00:00.000Z',
      day: 1,
      slot: 1,
      queuePath: join(outDir, 'queue.json'),
      packageOutDir: join(outDir, 'packages'),
      dailyReportPath: join(outDir, 'daily-run.md'),
      dailyBriefPath: join(outDir, 'daily-brief.md'),
      weeklyPlanPath: join(outDir, 'weekly-plan.md'),
      ledgerPath: join(outDir, 'ledger.json'),
      metricsPath: join(outDir, 'posts.local.json'),
      statusPath: join(outDir, 'status.md'),
      preflightPath: join(outDir, 'publish-preflight.md'),
      profileTextPath: join(outDir, 'profile.local.txt'),
      profileAuditPath: join(outDir, 'profile-audit.md'),
      profileUpdatePath: join(outDir, 'profile-update.md'),
      automationReportPath: join(outDir, 'automation-run.md'),
      imageBriefDir: join(outDir, 'image-briefs'),
      imageDir: join(outDir, 'images'),
      xPublishPrepPath: join(outDir, 'x-publish-prep.md'),
      publishConfirmationPath: join(outDir, 'publish-confirmation.md'),
      engagementOpportunityDir: join(outDir, 'engagement-opportunities'),
      engagementPlanPath: join(outDir, 'engagement-plan.md'),
      engagementSearchPath: join(outDir, 'engagement-search.md'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      packageLimit: 2,
      queueOptions: {
        limit: 2,
        lang: 'zh',
        campaign: 'test',
      },
      env: {},
    });

    const report = await readFile(join(outDir, 'automation-run.md'), 'utf8');
    const dailyBrief = await readFile(join(outDir, 'daily-brief.md'), 'utf8');
    const status = await readFile(join(outDir, 'status.md'), 'utf8');
    const preflight = await readFile(join(outDir, 'publish-preflight.md'), 'utf8');
    const profileAudit = await readFile(join(outDir, 'profile-audit.md'), 'utf8');
    const profileUpdate = await readFile(join(outDir, 'profile-update.md'), 'utf8');
    const xPrep = await readFile(join(outDir, 'x-publish-prep.md'), 'utf8');
    const confirmation = await readFile(join(outDir, 'publish-confirmation.md'), 'utf8');
    const engagementSearch = await readFile(join(outDir, 'engagement-search.md'), 'utf8');
    const engagementPlan = await readFile(join(outDir, 'engagement-plan.md'), 'utf8');

    assert.equal(result.status, 'blocked_preflight');
    assert.match(result.blockers.join('\n'), /Image file is missing/);
    assert.ok(!result.blockers.join('\n').includes('pin a post'));
    assert.equal(result.profileConversion.status, 'needs_work');
    assert.match(result.profileConversion.issues.join('\n'), /pin a post/);
    assert.ok(result.paths.imageBrief.endsWith('.md'));
    assert.equal(result.paths.dailyBrief, join(outDir, 'daily-brief.md'));
    assert.equal(result.paths.xPublishPrep, join(outDir, 'x-publish-prep.md'));
    assert.equal(result.paths.publishConfirmation, join(outDir, 'publish-confirmation.md'));
    assert.equal(result.paths.engagementSearch, join(outDir, 'engagement-search.md'));
    assert.equal(result.paths.engagementPlan, join(outDir, 'engagement-plan.md'));
    assert.equal(result.engagement.searchStatus, 'ready_for_read_only_search');
    assert.equal(result.engagement.status, 'needs_opportunity_capture');
    assert.match(report, /No public X action was performed/);
    assert.match(report, /Daily brief/);
    assert.match(dailyBrief, /Daily X Growth Brief/);
    assert.match(report, /X publish prep/);
    assert.match(report, /Engagement plan/);
    assert.match(report, /Profile update package/);
    assert.match(report, /Profile Conversion/);
    assert.match(status, /Profile Conversion/);
    assert.match(preflight, /Status: blocked/);
    assert.match(profileAudit, /Status: needs_work/);
    assert.match(profileUpdate, /final profile save click/);
    assert.match(xPrep, /baoyu-post-to-x Bridge/);
    assert.match(confirmation, /X Publish Confirmation Packet/);
    assert.match(confirmation, /X Article To Review/);
    assert.match(confirmation, /Image-backed Short Post To Review/);
    assert.match(engagementSearch, /X Engagement Search Plan/);
    assert.match(engagementPlan, /needs_opportunity_capture/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('scheduled growth loop combines safe prep and read-only metrics cycle', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-scheduled-'));
  try {
    const articles = [
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ];
    const expectedQueue = buildPublishQueue(articles, {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const skillDir = join(outDir, 'baoyu-post-to-x');
    const imageDir = join(outDir, 'images');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(imageDir, `${expectedQueue.items[0].id}.png`), 'fake image');
    await writeJson(join(outDir, 'ledger.json'), createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeFile(join(outDir, 'profile.local.txt'), [
      'Clean99 | AI 工程化与前端性能',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
      'https://clean99.github.io',
      'Pinned',
      '30 Followers',
    ].join('\n'));

    const result = await runScheduledGrowthLoop({
      articles,
      now: '2026-05-18T00:00:00.000Z',
      queuePath: join(outDir, 'queue.json'),
      packageOutDir: join(outDir, 'packages'),
      dailyReportPath: join(outDir, 'daily-run.md'),
      dailyBriefPath: join(outDir, 'daily-brief.md'),
      weeklyPlanPath: join(outDir, 'weekly-plan.md'),
      ledgerPath: join(outDir, 'ledger.json'),
      metricsPath: join(outDir, 'posts.local.json'),
      statusPath: join(outDir, 'status.md'),
      preflightPath: join(outDir, 'publish-preflight.md'),
      profileTextPath: join(outDir, 'profile.local.txt'),
      postTextDir: join(outDir, 'post-texts'),
      profileAuditPath: join(outDir, 'profile-audit.md'),
      profileUpdatePath: join(outDir, 'profile-update.md'),
      automationReportPath: join(outDir, 'automation-run.md'),
      metricsCyclePath: join(outDir, 'metrics-cycle.md'),
      growthReportPath: join(outDir, 'growth-report.md'),
      recommendationsPath: join(outDir, 'recommendations.md'),
      funnelPath: join(outDir, 'funnel.md'),
      scheduledReportPath: join(outDir, 'scheduled-run.md'),
      imageBriefDir: join(outDir, 'image-briefs'),
      imageDir,
      xPublishPrepPath: join(outDir, 'x-publish-prep.md'),
      publishConfirmationPath: join(outDir, 'publish-confirmation.md'),
      engagementOpportunityDir: join(outDir, 'engagement-opportunities'),
      engagementPlanPath: join(outDir, 'engagement-plan.md'),
      engagementSearchPath: join(outDir, 'engagement-search.md'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      queueOptions: {
        limit: 1,
        lang: 'zh',
        campaign: 'test',
      },
      packageLimit: 1,
      env: {},
    });
    const scheduledReport = await readFile(join(outDir, 'scheduled-run.md'), 'utf8');
    const metricsReport = await readFile(join(outDir, 'metrics-cycle.md'), 'utf8');
    const funnelReport = await readFile(join(outDir, 'funnel.md'), 'utf8');

    assert.equal(result.status, 'needs_copy_review');
    assert.equal(result.automation.status, 'needs_copy_review');
    assert.equal(result.metrics.status, 'needs_published_posts');
    assert.equal(result.automation.profileConversion.status, 'pass');
    assert.equal(result.automation.publishConfirmation.status, 'needs_copy_review');
    assert.equal(result.automation.engagement.searchStatus, 'ready_for_read_only_search');
    assert.equal(result.automation.engagement.status, 'needs_opportunity_capture');
    assert.equal(result.selected.id, expectedQueue.items[0].id);
    assert.match(scheduledReport, /Scheduled X Growth Run/);
    assert.match(scheduledReport, /Daily brief/);
    assert.match(scheduledReport, /Engagement search/);
    assert.match(scheduledReport, /Engagement plan/);
    assert.match(scheduledReport, /Publish confirmation/);
    assert.match(scheduledReport, /Content review: needs_copy_review/);
    assert.match(scheduledReport, /Profile Conversion/);
    assert.match(scheduledReport, /Funnel report/);
    assert.match(scheduledReport, /safe for recurring execution/);
    assert.match(metricsReport, /No browser publish/);
    assert.match(funnelReport, /X Growth Funnel/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('full flow dry run simulates publication and metrics without touching real state', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-flow-dry-run-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const dryRunDir = join(outDir, 'dry-run');
    const imageDir = join(outDir, 'images');
    const imagePath = join(imageDir, `${queue.items[0].id}.png`);
    const skillDir = join(outDir, 'baoyu-post-to-x');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(imagePath, 'fake image');

    const result = await runXGrowthDryRun({
      queue,
      ledger,
      now: '2026-05-18T00:00:00.000Z',
      dryRunDir,
      outPath: join(dryRunDir, 'flow-dry-run.md'),
      imageDir,
      packageOutDir: join(dryRunDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
    });
    const flow = await readFile(join(dryRunDir, 'flow-dry-run.md'), 'utf8');
    const dryQueue = JSON.parse(await readFile(join(dryRunDir, 'queue.dry-run.json'), 'utf8'));
    const dryMetrics = JSON.parse(await readFile(join(dryRunDir, 'posts.dry-run.json'), 'utf8'));
    const dryLedger = JSON.parse(await readFile(join(dryRunDir, 'ledger.dry-run.json'), 'utf8'));
    const xPrep = await readFile(join(dryRunDir, 'x-publish-prep.dry-run.md'), 'utf8');

    assert.equal(result.status, 'dry_run_complete');
    assert.equal(result.contentStatus, 'paused_for_copy_refinement');
    assert.equal(result.preflight.status, 'ready');
    assert.equal(result.xPrep.status, 'ready');
    assert.equal(queue.items[0].status, 'draft');
    assert.equal(dryQueue.items[0].status, 'published');
    assert.match(dryQueue.items[0].xPostUrl, /x\.example\.invalid/);
    assert.equal(dryMetrics.followers, '31');
    assert.equal(dryMetrics.posts[0].metrics.follows, '1');
    assert.equal(dryLedger.snapshots[0].followers, 31);
    assert.match(flow, /No browser was opened/);
    assert.match(flow, /Keep real publishing paused/);
    assert.match(xPrep, /x\.example\.invalid/);
    assert.doesNotMatch(flow, /https:\/\/x\.com\/Clean993\/status/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('weekly execution plan schedules only validated draft candidates', () => {
  const queue = buildPublishQueue([
    {
      title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
      excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
      slug: 'First-Post',
      lang: 'zh',
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/First-Post/',
    },
    {
      title: '从第一性原理理解 SEO —— 一次博客全面改造的深度复盘',
      excerpt: '大多数 SEO 指南都是清单式的：加这个 meta 标签、装那个插件。',
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

test('quality gate rejects duplicated short posts across different articles', () => {
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
      tags: ['AI'],
      url: 'https://clean99.github.io/zh/2026/05/18/Second-Post/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 2,
  });

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.ok(validation.items.some((item) => item.errors.some((error) => error.includes('duplicates'))));
});

test('daily queue options expand to cover the weekly cadence when a ledger exists', () => {
  const articles = Array.from({ length: 10 }, (_, index) => ({
    title: `第 ${index + 1} 篇`,
    excerpt: '一篇中文文章。',
    slug: `Post-${index + 1}`,
    lang: 'zh',
    tags: ['AI'],
    url: `https://clean99.github.io/zh/post-${index + 1}/`,
  }));
  const ledger = createLedger({
    startDate: '2026-05-18',
    baselineFollowers: 30,
    followersIn7Days: 1000,
  });

  const expanded = expandQueueOptionsForWeeklyCoverage(articles, {
    limit: 5,
    lang: 'zh',
  }, {
    ledger,
    weeklyDays: 7,
    weeklyPostsPerDay: 3,
  });

  assert.equal(expanded.limit, 7);
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

test('publish preflight reports missing image and confirmation boundary', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-preflight-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
        excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });

    const preflight = await buildPublishPreflight({
      queue,
      ledger,
      now: '2026-05-18T00:00:00.000Z',
      imageDir: join(outDir, 'images'),
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });
    const markdown = formatPublishPreflightMarkdown(preflight);

    assert.equal(preflight.status, 'blocked');
    assert.equal(preflight.image.ready, false);
    assert.equal(preflight.image.hasOpenAiKey, false);
    assert.equal(preflight.image.keyRequired, false);
    assert.equal(preflight.image.cliFallbackKeyRequired, true);
    assert.ok(preflight.blockers.some((blocker) => blocker.includes('Image file is missing')));
    assert.ok(preflight.blockers.every((blocker) => !blocker.includes('OPENAI_API_KEY')));
    assert.ok(preflight.browser.stopBefore.includes('final X Article publish click'));
    assert.match(markdown, /OPENAI_API_KEY present: false/);
    assert.match(markdown, /OPENAI_API_KEY required for preferred path: false/);
    assert.match(markdown, /OPENAI_API_KEY required for CLI fallback: true/);
    assert.match(markdown, /Preferred built-in imagegen path/);
    assert.doesNotMatch(preflight.image.command, /\n\+/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('image brief exports prompt, visual checks, and register command', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-image-brief-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '这篇文章讨论的是让每一轮修改都能被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      id: queue.items[0].id,
      now: '2026-05-18T00:00:00.000Z',
      imageDir: join(outDir, 'images'),
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });

    const brief = await buildImageBrief(preflight, {
      sourcePlaceholder: '/tmp/generated.png',
    });
    const markdown = formatImageBriefMarkdown(brief);
    const writtenPath = await writeImageBrief(brief, imageBriefPath(brief, join(outDir, 'briefs')));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(brief.image.outputPath, preflight.image.outputPath);
    assert.match(brief.prompt, /Model: gpt-image-2/);
    assert.match(markdown, /Generate With imagegen \(Preferred\)/);
    assert.match(markdown, /CLI Fallback/);
    assert.match(markdown, /Visual Review Checklist/);
    assert.match(markdown, /social:register-image/);
    assert.match(markdown, /--source '\/tmp\/generated.png'/);
    assert.match(markdown, /Do not open Chrome for publishing until preflight is ready/);
    assert.match(persisted, /Short Post First Screen/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('x publish prep bridges selected package to baoyu-post-to-x commands', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-x-prep-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '这篇文章讨论的是让每一轮修改都能被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    const imagePath = join(imageDir, `${queue.items[0].id}.png`);
    const skillDir = join(outDir, 'baoyu-post-to-x');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await mkdir(imageDir, { recursive: true });
    await writeFile(imagePath, 'fake image');

    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      id: queue.items[0].id,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });
    const prep = await buildXPublishPrep(preflight, {
      skillDir,
      bunCommand: 'bun',
      articleUrlPlaceholder: 'https://x.com/Clean993/articles/123',
    });
    const markdown = formatXPublishPrepMarkdown(prep);
    const writtenPath = await writeXPublishPrep(prep, join(outDir, 'x-publish-prep.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(prep.status, 'ready');
    assert.equal(prep.blockers.length, 0);
    assert.match(prep.commands.prepareArticle, /x-article\.ts/);
    assert.match(prep.commands.prepareArticle, /--cover/);
    assert.match(prep.commands.prepareShortPost, /x-browser\.ts/);
    assert.match(prep.commands.prepareShortPost, /--image/);
    assert.match(markdown, /baoyu-post-to-x Bridge/);
    assert.match(markdown, /Stop before the final public post click/);
    assert.match(persisted, /ARTICLE_URL='https:\/\/x\.com\/Clean993\/articles\/123'/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish confirmation packet combines copy, commands, and public action stop points', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-confirmation-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    queue.items[0] = {
      ...queue.items[0],
      xArticle: {
        title: 'Agent Skill，不是提示词仓库',
        body: [
          'Agent Skill 要解决的不是“多写几段提示词”，而是把能力变成可检查的执行契约。',
          '',
          '## 关键结论',
          '',
          '- 上下文决定 Skill 能不能启动。',
          '- 契约决定 Skill 能不能复用。',
          '- eval 决定 Skill 能不能改进。',
          '',
          '## 可复用框架',
          '',
          'context -> contract -> execution -> eval',
          '',
          '## 验证',
          '',
          '如果同一个输入不能稳定产出同类结果，这个 Skill 就还不是工程资产。',
          '',
          `博客原文：${queue.items[0].targetUrl}`,
        ].join('\n'),
      },
      followUpReplies: [
        '我更关心 Skill 的失败样本：同一个输入漂移，说明契约没写清；同一个输出不可验收，说明 eval 没接上。',
        '落地时先写输入、输出、停止条件，再写提示词。否则只是把上下文变长，不是把能力产品化。',
      ],
    };
    const imageDir = join(outDir, 'images');
    const imagePath = join(imageDir, `${queue.items[0].id}.png`);
    const skillDir = join(outDir, 'baoyu-post-to-x');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await mkdir(imageDir, { recursive: true });
    await writeFile(imagePath, 'fake image');

    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      id: queue.items[0].id,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });
    const prep = await buildXPublishPrep(preflight, {
      skillDir,
      bunCommand: 'bun',
    });
    const packet = buildPublishConfirmation({
      queue,
      preflight,
      xPublishPrep: prep,
    });
    const markdown = formatPublishConfirmationMarkdown(packet);
    const writtenPath = await writePublishConfirmation(packet, join(outDir, 'publish-confirmation.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(packet.status, 'ready_for_confirmation');
    assert.equal(packet.contentReview.status, 'pass');
    assert.equal(packet.blockers.length, 0);
    assert.match(packet.content.imagePost, /<x-article-url>/);
    assert.match(markdown, /X Publish Confirmation Packet/);
    assert.match(markdown, /Confirm the Chrome account is `@Clean993`/);
    assert.match(markdown, /X Article To Review/);
    assert.match(markdown, /Image-backed Short Post To Review/);
    assert.match(markdown, /final image-backed short-post publish click/);
    assert.match(markdown, /social:mark-published/);
    assert.match(persisted, /This file is not permission to perform public X actions/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish confirmation packet requires copy review for article-summary framing', async () => {
  const queue = buildPublishQueue([
    {
      title: 'Agent Skills 探索实录',
      excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
      slug: 'Agent-Skills',
      lang: 'zh',
      tags: ['AI', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/agent-skills/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const preflight = {
    generatedAt: '2026-05-18T00:00:00.000Z',
    blockers: [],
    selected: {
      id: queue.items[0].id,
      packageDir: 'data/social-growth/packages/Agent-Skills__zh__strong-thesis',
      imagePath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
    },
    image: {
      outputPath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
      ready: true,
    },
    browser: {
      recordCommand: 'npm run social:mark-published -- --queue data/social-growth/queue.json --id Agent-Skills__zh__strong-thesis --url <x-post-url> --article-url <x-article-url>',
    },
  };

  const packet = buildPublishConfirmation({
    queue,
    preflight,
    xPublishPrep: {
      blockers: [],
      commands: {
        prepareArticle: 'bun x-article.ts',
        prepareShortPost: 'bun x-browser.ts',
      },
    },
  });
  const markdown = formatPublishConfirmationMarkdown(packet);

  assert.equal(packet.status, 'needs_copy_review');
  assert.equal(packet.contentReview.status, 'needs_copy_review');
  assert.match(packet.contentReview.issues.join('\n'), /long-form article-summary/);
  assert.match(markdown, /Content Review/);
  assert.match(markdown, /npm run social:x-tech-brief/);
});

test('day readiness summarizes all daily publish slots without public actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-day-readiness-'));
  try {
    const articles = [
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '每一轮修改都应该被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
      {
        title: 'Vibe Coding VS Spec-Driven Coding',
        excerpt: '复杂改动需要先固定意图、边界和验收标准。',
        slug: 'Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/spec/',
      },
    ];
    const queue = buildPublishQueue(articles, {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 3,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const skillDir = join(outDir, 'baoyu-post-to-x');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

    const readiness = await buildDayReadiness({
      queue,
      ledger,
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
    });
    const markdown = formatDayReadinessMarkdown(readiness);
    const writtenPath = await writeDayReadiness(readiness, join(outDir, 'day-readiness.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(readiness.status, 'needs_images');
    assert.equal(readiness.totalSlots, 3);
    assert.equal(readiness.readySlots, 1);
    assert.equal(readiness.slots[0].preflightStatus, 'ready');
    assert.equal(readiness.slots[1].preflightStatus, 'blocked');
    assert.match(readiness.slots[1].blockers.join('\n'), /Image file is missing/);
    assert.match(markdown, /Ready slots: 1\/3/);
    assert.match(markdown, /social:x-prep -- --day 1 --slot 2/);
    assert.match(persisted, /Opening Chrome, uploading media, publishing/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('profile audit turns visible profile text into conversion checks', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-profile-audit-'));
  try {
    const profileText = [
      'Clean99',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。',
      'https://clean99.github.io',
      '30 Following',
      '30 Followers',
      'Pinned',
    ].join('\n');
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
      {
        title: 'React Performance Optimization',
        excerpt: '先定位 render、网络和交互成本真正落在哪一层。',
        slug: 'React-Performance',
        lang: 'zh',
        tags: ['React', 'Web Performance'],
        url: 'https://clean99.github.io/zh/react-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const parsed = parseProfileText(profileText);
    const audit = await buildProfileAudit({
      profileText,
      queue,
      generatedAt: '2026-05-18T00:00:00.000Z',
    });
    const markdown = formatProfileAuditMarkdown(audit);
    const writtenPath = await writeProfileAudit(audit, join(outDir, 'profile-audit.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(parsed.handle, '@Clean993');
    assert.equal(parsed.followers, 30);
    assert.equal(parsed.pinned, true);
    assert.equal(audit.status, 'pass');
    assert.ok(audit.themes.includes('AI 工程化'));
    assert.ok(audit.themes.includes('前端性能'));
    assert.match(markdown, /Suggested Profile Copy/);
    assert.match(persisted, /Do not edit X profile/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('profile update package prepares browser-confirmed profile changes', async () => {
  const audit = await buildProfileAudit({
    profileText: [
      'clean',
      '@Clean993',
      'Software Engineer at Tiktok',
      'Singaporeclean99.github.io',
      '30 Followers',
    ].join('\n'),
    queue: buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '核心是可度量的 harness、goal-driven loop，以及记录每个 baseline。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    }),
    generatedAt: '2026-05-18T00:00:00.000Z',
  });
  const profilePackage = buildProfileUpdatePackage(audit);
  const markdown = formatProfileUpdatePackageMarkdown(profilePackage);

  assert.equal(profilePackage.status, 'needs_browser_confirmation');
  assert.equal(profilePackage.current.displayName, 'clean');
  assert.match(profilePackage.proposed.bio, /AI 工程化/);
  assert.match(markdown, /final profile save click/);
  assert.match(markdown, /Pinned post draft/);
  assert.match(markdown, /action-time confirmation/);
});

test('profile parser ignores X navigation chrome around the profile card', () => {
  const parsed = parseProfileText([
    'To view keyboard shortcuts, press question mark',
    'Home',
    'Profile',
    'clean',
    '@Clean993',
    'clean',
    '57 posts',
    'See new posts',
    'Edit profile',
    'clean',
    '@Clean993',
    'Software Engineer at Tiktok',
    'Singaporeclean99.github.io',
    'Joined July 2021',
    '105 Following',
    '30 Followers',
  ].join('\n'));

  assert.equal(parsed.displayName, 'clean');
  assert.equal(parsed.handle, '@Clean993');
  assert.equal(parsed.bio, 'Software Engineer at Tiktok');
  assert.equal(parsed.link, 'clean99.github.io');
  assert.equal(parsed.followers, 30);
});

test('profile audit flags missing captured profile conversion signals', async () => {
  const audit = await buildProfileAudit({
    profileText: '',
    queue: { items: [] },
    generatedAt: '2026-05-18T00:00:00.000Z',
  });

  assert.equal(audit.status, 'needs_work');
  assert.ok(audit.checks.some((check) => check.status === 'fail' && check.message.includes('copy visible X profile text')));
  assert.ok(audit.checks.some((check) => check.status === 'fail' && check.message.includes('pin a post')));
});

test('growth status summarizes blocker, pace, and next commands', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '这篇文章讨论的是让每一轮修改都能被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });

    const status = await buildGrowthStatus({
      queue,
      ledger,
      now: '2026-05-18T00:00:00.000Z',
      imageDir: join(outDir, 'images'),
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });
    const markdown = formatGrowthStatusMarkdown(status);
    const writtenPath = await writeGrowthStatus(status, join(outDir, 'status.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(status.status, 'blocked_preflight');
    assert.equal(status.validation.status, 'pass');
    assert.equal(status.weeklyPlan.missingSlots, 18);
    assert.equal(status.preflight.status, 'blocked');
    assert.equal(status.profileAudit.status, 'needs_work');
    assert.ok(status.nextActions.some((item) => item.action.includes('Generate the image with built-in imagegen')));
    assert.ok(status.nextActions.some((item) => item.action.includes('profile promise')));
    assert.match(markdown, /Follower delta: 0/);
    assert.match(markdown, /Profile Conversion/);
    assert.match(markdown, /social:image-brief/);
    assert.match(markdown, /social:x-prep/);
    assert.match(markdown, /social:profile-audit/);
    assert.match(markdown, /social:profile-package/);
    assert.match(persisted, /Public X actions still require action-time confirmation/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('growth status is ready for browser confirmation when the selected image exists', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-ready-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
      {
        title: '从第一性原理理解 SEO',
        excerpt: '理解搜索引擎如何读取、归类和信任页面。',
        slug: 'SEO-Overhaul',
        lang: 'zh',
        tags: ['Software Engineering'],
        url: 'https://clean99.github.io/zh/seo/',
      },
      {
        title: 'Vibe Coding VS Spec-Driven Coding',
        excerpt: '复杂改动需要先固定意图、边界和验收标准。',
        slug: 'Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/spec/',
      },
      {
        title: 'Building Fault Tolerant React App With Error Boundary',
        excerpt: '把崩溃隔离、错误上报和恢复路径都设计进去。',
        slug: 'Error-Boundary',
        lang: 'zh',
        tags: ['React', 'Frontend'],
        url: 'https://clean99.github.io/zh/error-boundary/',
      },
      {
        title: 'React Performance Optimization',
        excerpt: '先定位 render、网络和交互成本真正落在哪一层。',
        slug: 'React-Performance',
        lang: 'zh',
        tags: ['React', 'Web Performance'],
        url: 'https://clean99.github.io/zh/react-performance/',
      },
      {
        title: 'React Server Component Internals',
        excerpt: '理解 server/client 边界如何改变数据流和打包模型。',
        slug: 'React-Server-Component',
        lang: 'zh',
        tags: ['React', 'Frontend'],
        url: 'https://clean99.github.io/zh/rsc/',
      },
      {
        title: '前端测试用例设计',
        excerpt: '用行为用例保护重构空间。',
        slug: 'Frontend-Testing',
        lang: 'zh',
        tags: ['testing'],
        url: 'https://clean99.github.io/zh/testing/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 7,
    });
    const imageDir = join(outDir, 'images');
    const imagePath = join(imageDir, `${queue.items[0].id}.png`);
    await mkdir(imageDir, { recursive: true });
    await writeFile(imagePath, 'fake image');

    const status = await buildGrowthStatus({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      profileText: [
        'Clean99 | AI 工程化与前端性能',
        '@Clean993',
        '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
        'https://clean99.github.io',
        'Pinned',
        '30 Followers',
      ].join('\n'),
      env: {},
    });

    assert.equal(status.status, 'ready_for_browser_confirmation');
    assert.equal(status.profileAudit.status, 'pass');
    assert.equal(status.weeklyPlan.missingSlots, 0);
    assert.equal(status.preflight.status, 'ready');
    assert.equal(status.preflight.image.ready, true);
    assert.ok(status.nextActions.some((item) => item.action.includes('Prepare the X Article')));
    const markdown = formatGrowthStatusMarkdown(status);
    assert.match(markdown, /social:x-prep/);
    assert.match(markdown, /social:profile-package/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish preflight is ready when the generated image exists', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-preflight-ready-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
        excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    const imagePath = join(imageDir, `${queue.items[0].id}.png`);
    await mkdir(imageDir, { recursive: true });
    await writeFile(imagePath, 'fake image');

    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      id: queue.items[0].id,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      env: {
        OPENAI_API_KEY: 'test-key',
      },
    });

    assert.equal(preflight.status, 'ready');
    assert.equal(preflight.blockers.length, 0);
    assert.equal(preflight.image.ready, true);
    assert.equal(preflight.image.hasOpenAiKey, true);
    assert.equal(preflight.image.keyRequired, false);
    assert.equal(preflight.image.cliFallbackKeyRequired, false);
    assert.match(preflight.browser.recordCommand, /social:mark-published/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish preflight can prefer a later ready image and legacy image name', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-preflight-ready-prefer-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System',
        excerpt: '把浏览器级 Tab 体验搬进 Workspace。',
        slug: 'Workspace-v2-Tab-System',
        lang: 'zh',
        tags: ['Frontend', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/workspace-v2/',
      },
      {
        title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
        excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const readyItem = queue.items.find((item) => item.articleSlug === 'Agent-Skills' && item.variant === 'strong-thesis');
    const imageDir = join(outDir, 'images');
    const legacyImage = join(imageDir, `${readyItem.id}__03.png`);
    await mkdir(imageDir, { recursive: true });
    await writeFile(legacyImage, 'fake image');

    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      day: 1,
      slot: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      preferReadyImage: true,
      env: {},
    });

    assert.equal(preflight.status, 'ready');
    assert.equal(preflight.selected.id, readyItem.id);
    assert.equal(preflight.image.outputPath, legacyImage);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish preflight is ready without key when a generated image is registered', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-preflight-register-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录 — AI Agent 时代的函数式蓝图',
        excerpt: '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const sourceImage = join(outDir, 'generated.png');
    await writeFile(sourceImage, 'fake image');

    const registered = await registerPublishImage({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      sourceImage,
      day: 1,
      slot: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir: join(outDir, 'images'),
    });
    const preflight = await buildPublishPreflight({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      id: queue.items[0].id,
      now: '2026-05-18T00:00:00.000Z',
      imageDir: join(outDir, 'images'),
      packageOutDir: join(outDir, 'packages'),
      env: {},
    });

    assert.equal(registered.outputPath, preflight.image.outputPath);
    assert.equal(preflight.status, 'ready');
    assert.equal(preflight.image.ready, true);
    assert.equal(preflight.image.hasOpenAiKey, false);
    assert.equal(preflight.image.keyRequired, false);
    assert.equal(preflight.image.cliFallbackKeyRequired, false);
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

test('quality gate rejects AI-smelling generic short posts', () => {
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
    shortPost: [
      '技术文章只有留下可复用框架才有用。',
      '',
      '我写了一篇关于系统设计的文章，欢迎阅读。',
      '',
      '图里是判断框架，长文放在 X Article。',
    ].join('\n'),
  };

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.ok(validation.items[0].errors.some((error) => error.includes('low-value meta copy')));
  assert.ok(validation.items[0].errors.some((error) => error.includes('concrete technical claim')));
});

test('quality gate rejects heading-glued Chinese X Article fragments', () => {
  const queue = buildPublishQueue([
    {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop。',
      slug: 'Automated-AI-Performance-Optimization',
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  queue.items[0] = {
    ...queue.items[0],
    xArticle: {
      ...queue.items[0].xArticle,
      body: `${queue.items[0].xArticle.body}\n- 真正的问题 目标看起来很简单：优化 Workspace FMP`,
    },
  };

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.ok(validation.items[0].errors.some((error) => error.includes('heading-glued')));
});

test('quality gate rejects table fragments in Chinese X Article bullets', () => {
  const queue = buildPublishQueue([
    {
      title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
      excerpt: '核心是可度量的 harness、goal-driven loop。',
      slug: 'Automated-AI-Performance-Optimization',
      lang: 'zh',
      tags: ['AI', 'Software Engineering', 'Web Performance'],
      url: 'https://clean99.github.io/zh/automated-ai-performance/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  queue.items[0] = {
    ...queue.items[0],
    xArticle: {
      ...queue.items[0].xArticle,
      body: `${queue.items[0].xArticle.body}\n- 实际目标更严格： | 指标 | 目标 |`,
    },
  };

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.ok(validation.items[0].errors.some((error) => error.includes('table fragments')));
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
    const explicitUndefined = await updateLedgerSnapshot({
      ledgerPath,
      postsFile: postsPath,
      snapshot: {
        date: undefined,
        followers: undefined,
      },
    });

    assert.equal(template.posts.length, 1);
    assert.equal(updated.snapshots[1].followers, 35);
    assert.equal(explicitUndefined.snapshots[1].followers, 35);
    assert.equal(updated.snapshots[1].posts[0].metrics.views, 1200);
    assert.equal(summarizeGrowthLedger(updated).followerDelta, 5);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish metrics cycle captures text, snapshots ledger, and writes reports', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-metrics-cycle-'));
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
      id: queue.items[0].id,
      xPostUrl: 'https://x.com/Clean993/status/1',
      xArticleUrl: 'https://x.com/Clean993/articles/1',
      publishedAt: '2026-05-18T01:00:00.000Z',
    });
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const metricsPath = join(outDir, 'posts.local.json');
    const profileTextPath = join(outDir, 'profile.local.txt');
    const postTextDir = join(outDir, 'post-texts');
    await writeJson(queuePath, publishedQueue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await mkdir(postTextDir);
    await writeFile(profileTextPath, 'Clean993\n31 Followers\n');
    await writeFile(join(postTextDir, `${queue.items[0].id}.txt`), [
      'Views',
      '1.2K',
      'Likes',
      '12',
      'Replies',
      '3',
      'Reposts',
      '2',
      'Bookmarks',
      '5',
      'Profile clicks',
      '9',
      'New follows',
      '1',
    ].join('\n'));

    const result = await runPostPublishMetricsCycle({
      queuePath,
      ledgerPath,
      metricsPath,
      profileTextPath,
      postTextDir,
      cycleReportPath: join(outDir, 'metrics-cycle.md'),
      growthReportPath: join(outDir, 'growth-report.md'),
      recommendationsPath: join(outDir, 'recommendations.md'),
      funnelPath: join(outDir, 'funnel.md'),
      now: '2026-05-19T00:00:00.000Z',
    });
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    const cycleReport = await readFile(join(outDir, 'metrics-cycle.md'), 'utf8');
    const growthReport = await readFile(join(outDir, 'growth-report.md'), 'utf8');
    const recommendations = await readFile(join(outDir, 'recommendations.md'), 'utf8');
    const funnel = await readFile(join(outDir, 'funnel.md'), 'utf8');

    assert.equal(result.status, 'snapshotted');
    assert.equal(result.followers, '31');
    assert.equal(result.readiness.postsWithViews, 1);
    assert.equal(metrics.posts[0].metrics.views, '1200');
    assert.equal(metrics.posts[0].metrics.follows, '1');
    assert.equal(ledger.snapshots.length, 2);
    assert.equal(ledger.snapshots[1].followers, 31);
    assert.equal(ledger.snapshots[1].posts[0].metrics.views, 1200);
    assert.match(cycleReport, /Post-Publish Metrics Cycle/);
    assert.match(cycleReport, /Read-only metrics parsing only/);
    assert.match(growthReport, /Follower delta: 1/);
    assert.match(recommendations, /Growth Recommendations/);
    assert.match(funnel, /Status: converting/);
    assert.match(cycleReport, /Funnel report/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish metrics cycle does not snapshot when follower count is missing', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-metrics-cycle-missing-'));
  try {
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
    const publishedQueue = markQueueItemPublished(queue, {
      id: queue.items[0].id,
      xPostUrl: 'https://x.com/Clean993/status/1',
      publishedAt: '2026-05-18T01:00:00.000Z',
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    await writeJson(queuePath, publishedQueue);
    await writeJson(ledgerPath, ledger);

    const result = await runPostPublishMetricsCycle({
      queuePath,
      ledgerPath,
      metricsPath: join(outDir, 'posts.local.json'),
      profileTextPath: join(outDir, 'missing-profile.txt'),
      postTextDir: join(outDir, 'missing-post-texts'),
      cycleReportPath: join(outDir, 'metrics-cycle.md'),
      growthReportPath: join(outDir, 'growth-report.md'),
      recommendationsPath: join(outDir, 'recommendations.md'),
      now: '2026-05-19T00:00:00.000Z',
    });
    const persistedLedger = JSON.parse(await readFile(ledgerPath, 'utf8'));

    assert.equal(result.status, 'needs_profile_capture');
    assert.equal(result.readiness.followersReady, false);
    assert.deepEqual(persistedLedger, ledger);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish metrics cycle does not snapshot before any published post exists', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-metrics-cycle-empty-'));
  try {
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
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const profileTextPath = join(outDir, 'profile.local.txt');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, ledger);
    await writeFile(profileTextPath, 'Clean993\n31 Followers\n');

    const result = await runPostPublishMetricsCycle({
      queuePath,
      ledgerPath,
      metricsPath: join(outDir, 'posts.local.json'),
      profileTextPath,
      postTextDir: join(outDir, 'post-texts'),
      cycleReportPath: join(outDir, 'metrics-cycle.md'),
      growthReportPath: join(outDir, 'growth-report.md'),
      recommendationsPath: join(outDir, 'recommendations.md'),
      now: '2026-05-19T00:00:00.000Z',
    });
    const persistedLedger = JSON.parse(await readFile(ledgerPath, 'utf8'));

    assert.equal(result.status, 'needs_published_posts');
    assert.equal(result.followers, '31');
    assert.equal(result.publishedPosts, 0);
    assert.deepEqual(persistedLedger, ledger);
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
  const legacyQueue = buildPublishQueue(articles, {
    campaign: 'old',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  legacyQueue.items[0] = {
    ...legacyQueue.items[0],
    id: 'Useful-Systems__zh__strong-thesis__00',
  };
  const existingQueue = markQueueItemPublished(legacyQueue, {
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
  assert.equal(merged.items[0].id, 'Useful-Systems__zh__strong-thesis');
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
  assert.equal(result.algorithmLens.stage, 'winner_scaling');
  assert.equal(result.algorithmLens.metricToMove, 'follow_per_view');
  assert.ok(result.recommendations.some((item) => item.action.includes('strong-thesis')));
  assert.match(formatRecommendationsMarkdown(ledger), /Variant Performance/);
  assert.match(formatRecommendationsMarkdown(ledger), /Algorithm Lens/);
  assert.match(formatRecommendationsMarkdown(ledger), /Stage: winner_scaling/);
});
