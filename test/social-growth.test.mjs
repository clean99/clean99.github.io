import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
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
  buildBrowserReadiness,
  formatBrowserReadinessMarkdown,
  readBrowserProbe,
  writeBrowserReadiness,
  writeBrowserProbe,
} from '../tools/social-growth/browserReadiness.mjs';
import {
  buildComposeDraftResolution,
  formatComposeDraftResolutionMarkdown,
  writeComposeDraftStash,
  writeComposeDraftResolution,
} from '../tools/social-growth/composeDraftResolution.mjs';
import {
  buildDailyExecutionBrief,
  formatDailyExecutionBriefMarkdown,
  writeDailyExecutionBrief,
} from '../tools/social-growth/dailyBrief.mjs';
import { buildDayReadiness, formatDayReadinessMarkdown, writeDayReadiness } from '../tools/social-growth/dayReadiness.mjs';
import {
  buildEngagementPlan,
  buildEngagementCaptureTemplate,
  buildEngagementSearchPlan,
  formatEngagementCaptureTemplateMarkdown,
  formatEngagementPlanMarkdown,
  formatEngagementSearchPlanMarkdown,
  readEngagementOpportunityTexts,
  writeEngagementCaptureTemplate,
  writeEngagementPlan,
  writeEngagementSearchPlan,
} from '../tools/social-growth/engagement.mjs';
import {
  buildGrowthExperimentPlan,
  formatGrowthExperimentPlanMarkdown,
  writeGrowthExperimentPlan,
} from '../tools/social-growth/experimentPlan.mjs';
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
import {
  refreshMetricsTemplateFromQueue,
  runPostPublishMetricsCycle,
} from '../tools/social-growth/metricsCycle.mjs';
import { buildGrowthRecommendations, formatRecommendationsMarkdown } from '../tools/social-growth/recommendations.mjs';
import {
  buildImageBrief,
  formatImageBriefMarkdown,
  imageBriefPath,
  writeImageBrief,
} from '../tools/social-growth/imageBrief.mjs';
import {
  buildImageBacklog,
  formatImageBacklogMarkdown,
  writeImageBacklog,
} from '../tools/social-growth/imageBacklog.mjs';
import {
  buildPublishPreflight,
  formatPublishPreflightMarkdown,
  ingestLatestGeneratedImage,
  registerPublishImage,
} from '../tools/social-growth/preflight.mjs';
import {
  buildThreadReplyHandoff,
  buildPublishConfirmation,
  formatPublishConfirmationMarkdown,
  formatThreadReplyHandoffMarkdown,
  writePublishConfirmation,
} from '../tools/social-growth/publishConfirmation.mjs';
import {
  buildManualPublishKit,
  buildManualPublishUrlTemplate,
  formatManualPublishKitMarkdown,
} from '../tools/social-growth/manualPublishKit.mjs';
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
import {
  buildLoginHandoff,
  formatLoginHandoffMarkdown,
  writeLoginHandoff,
} from '../tools/social-growth/loginHandoff.mjs';
import { buildXPublishPrep, formatXPublishPrepMarkdown, writeXPublishPrep } from '../tools/social-growth/xPrep.mjs';
import {
  buildXTechnicalSharingBrief,
  formatXTechnicalSharingBriefMarkdown,
  writeXTechnicalSharingBrief,
} from '../tools/social-growth/xTechBrief.mjs';
import {
  buildXProfileDiagnostics,
  formatXProfileDiagnosticsMarkdown,
  inferXPageStateForDiagnostics,
  writeXProfileDiagnostics,
} from '../tools/social-growth/xProfileDiagnostics.mjs';
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

test('growth experiment plan turns the algorithm lens into measurable next experiments', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-experiments-'));
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
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const plan = buildGrowthExperimentPlan({
      queue,
      ledger,
      now: '2026-05-18T00:00:00.000Z',
      limit: 2,
      selectedId: queue.items[1].id,
    });
    const markdown = formatGrowthExperimentPlanMarkdown(plan);
    const writtenPath = await writeGrowthExperimentPlan(plan, join(outDir, 'experiment-plan.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(plan.status, 'ready');
    assert.equal(plan.algorithmLens.stage, 'candidate_entry');
    assert.equal(plan.selectedAligned, true);
    assert.equal(plan.experiments.length, 2);
    assert.equal(plan.experiments[0].queueId, queue.items[1].id);
    assert.equal(plan.experiments[0].successMetric, 'published_posts');
    assert.ok(plan.experiments[0].editFocus.includes('public URL recording'));
    assert.match(plan.commands.brief, /social:x-tech-brief/);
    assert.match(plan.commands.brief, new RegExp(queue.items[1].id));
    assert.match(markdown, /X Growth Experiment Plan/);
    assert.match(markdown, /Selected aligned: yes/);
    assert.match(markdown, /Minimum evidence/);
    assert.match(persisted, /Local experiment planning only/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
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
  assert.throws(
    () => markQueueItemPublished(queue, {
      id: 'missing-queue-id',
      xPostUrl: 'https://x.com/Clean993/status/404',
      publishedAt: '2026-05-18T01:00:00.000Z',
    }),
    /Queue item not found: missing-queue-id/,
  );
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
  assert.match(strongPosts[0].shortPost, /配图放我现在用的检查顺序，后面贴完整过程|配图放路径，后面贴完整证据和取舍/);
  assert.doesNotMatch(strongPosts[0].shortPost, /不是.+而是|验证闭环|判断框架|图里是|先别急着看|一个总分/u);
  assert.match(strongPosts[0].xArticle.body, /Skill 要把可复用能力写成稳定契约/);
  assert.match(strongPosts[1].xArticle.body, /技术博客做 SEO/);
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
  assert.match(item.shortPost, /AI 性能优化最怕假进步/);
  assert.match(item.shortPost, /baseline -> change -> verify -> ledger/);
  assert.match(item.shortPost, /后面贴证据和失败轮次/);
  assert.doesNotMatch(item.shortPost, /不是.+而是|真正值钱|验证闭环|判断框架|图里是|先别急着看|一个总分/u);
  assert.match(item.xArticle.body, /博客原文：https:\/\/clean99\.github\.io\/zh\/automated-ai-performance\//);
  assert.match(item.xArticle.body, /## 证据/);
  assert.doesNotMatch(item.xArticle.body, /为什么值得读原文|原文围绕|短帖只能|本文从/);
  assert.doesNotMatch(item.followUpReplies.join('\n'), /你现在是不是|有没有证据|下一步能不能/);
  assert.match(item.media.prompt, /Scroll-stopper headline: AI 性能优化：先看证据/);
  assert.equal(validateQueueItem(item).status, 'pass');
});

test('distinguishes workspace tab performance from AI performance loop copy', () => {
  const queue = buildPublishQueue([
    {
      title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
      excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
      slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
      lang: 'zh',
      tags: ['Frontend', 'Web Performance', 'Software Engineering', 'React'],
      url: 'https://clean99.github.io/zh/workspace-tab-performance/',
    },
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
    limit: 2,
  });

  const workspace = queue.items.find((item) => item.articleSlug === 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure' && item.variant === 'strong-thesis');
  const aiLoop = queue.items.find((item) => item.articleSlug === 'Automated-AI-Performance-Optimization' && item.variant === 'strong-thesis');

  assert.match(workspace.shortPost, /工作台一上 Tab/);
  assert.match(workspace.shortPost, /first load \/ hot switch \/ background pressure/);
  assert.match(workspace.shortPost, /FMP 很容易变成假安慰/);
  assert.equal(workspace.threadFallback[0], workspace.shortPost);
  assert.doesNotMatch(workspace.threadFallback[0], /^Workspace v2 Tab System 性能优化/u);
  assert.match(workspace.xArticle.body, /strict FMP、tab-switch probe 和 stress gate/);
  assert.match(workspace.xArticle.body, /14773ms.*11926ms/s);
  assert.match(workspace.media.prompt, /Workspace Tab 性能/);
  assert.doesNotMatch(workspace.media.prompt, /visible reason to open the X Article/);
  assert.match(aiLoop.shortPost, /AI 性能优化/);
  assert.notEqual(workspace.shortPost, aiLoop.shortPost);
  assert.equal(validateQueue(queue).status, 'pass');
});

test('generates browser-grade tab system copy instead of default engineering template', () => {
  const queue = buildPublishQueue([
    {
      title: 'Workspace v2 Tab System：把浏览器标签页能力带进单页工作台',
      excerpt: '工作台要支持多个 workstream、子应用视图和工单对象，体验要接近浏览器标签页。',
      slug: 'Workspace-v2-Tab-System-Browser-Grade-Tabs',
      lang: 'zh',
      tags: ['Frontend', 'React', 'Software Engineering'],
      url: 'https://clean99.github.io/zh/browser-grade-tabs/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const item = queue.items.find((entry) => entry.variant === 'strong-thesis');

  assert.match(item.shortPost, /把浏览器标签页搬进工作台/);
  assert.match(item.shortPost, /intent \/ ownership \/ runtime \/ isolation/);
  assert.doesNotMatch(item.shortPost, /工程判断/);
  assert.equal(item.threadFallback[0], item.shortPost);
  assert.match(item.xArticle.body, /URL 不能退化成 `\/tabs\/:id`/);
  assert.match(item.xArticle.body, /hidden runtime 的 history、overlay、focus event/);
  assert.match(item.media.prompt, /Browser-grade 工作台 Tab 分层/);
  assert.equal(validateQueue(queue).status, 'pass');
});

test('filters heading-glued fragments from Chinese X Article extraction', () => {
  const points = extractKeyPoints([
    '本文从第一性原理出发，拆解性能优化的自动化闭环。',
    '真正的问题 目标看起来很简单：优化 Workspace FMP。',
    '图 0：一个通用工作台里的 tab system 演示。',
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
      '本文从第一性原理出发，拆解性能优化的自动化闭环。',
      '真正的问题 目标看起来很简单：优化 Workspace FMP。',
      '图 0：一个通用工作台里的 tab system 演示。',
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
  assert.doesNotMatch(xArticle.body, /图 0/);
  assert.doesNotMatch(xArticle.body, /本文从第一性原理/);
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
        '最近用 AI Agent 做前端性能优化，我最先卡住的是 baseline 口径。',
        '',
        '同一条 path 换了测量条件，后面所有收益都会变成故事。',
        '',
        '配图放 baseline -> change -> verify -> ledger，后面贴完整复盘。',
        '',
        '#AI #软件工程',
      ].join('\n'),
      xArticle: {
        title: 'AI 性能优化，先别谈建议',
        body: [
          '这篇文章记录一次 AI Agent 跑性能优化时踩到的测量问题。',
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
        alt: 'AI 性能优化测量链路图',
        prompt: `${template.image.prompt}\nUse natural Chinese technical wording, readable at mobile size, no brand logos.`,
      },
      threadFallback: [
        '最近用 AI Agent 做前端性能优化，第一件事先把 baseline 口径固定住。',
        '我按 baseline -> change -> verify -> ledger 看：同一个 harness 复测后指标没变，就不要声明收益。',
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
    assert.equal(brief.algorithmResearchPath, '.agents/skills/x-growth-publishing/references/x-recommendation-system.md');
    assert.match(markdown, /Use recommendation research/);
    assert.match(markdown, /Use installed community skills/);
    assert.match(markdown, /humanizer-zh/);
    assert.match(markdown, /marketing-psychology/);
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
    await writeFile(join(opportunityDir, '_capture-template.md'), [
      '# X Engagement Capture Template',
      'This file should be ignored by the planner.',
      'AI Agent baseline harness',
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

    assert.equal(opportunityTexts.length, 2);
    assert.ok(!opportunityTexts.some((item) => item.id === '_capture-template'));
    assert.equal(plan.status, 'ready_for_browser_confirmation');
    assert.equal(plan.selectedCount, 1);
    assert.ok(queue.items.some((item) => item.id === plan.opportunities[0].queueId));
    assert.equal(plan.opportunities[0].articleSlug, article.slug);
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

test('engagement capture template writes ignored local intake instructions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-engagement-capture-template-'));
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
    const searchPlan = buildEngagementSearchPlan({
      queue,
      now: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const template = buildEngagementCaptureTemplate(searchPlan, { maxTargets: 2 });
    const markdown = formatEngagementCaptureTemplateMarkdown(template);
    const outPath = join(outDir, 'engagement-opportunities', '_capture-template.md');
    await writeEngagementCaptureTemplate(template, outPath);
    const persisted = await readFile(outPath, 'utf8');
    const opportunities = await readEngagementOpportunityTexts(join(outDir, 'engagement-opportunities'));

    assert.equal(template.status, 'ready_for_capture');
    assert.equal(template.targetCount, 2);
    assert.match(markdown, /Keep \/ Skip Gate/);
    assert.match(markdown, /Save useful copied thread text to/);
    assert.match(markdown, /do not reply, like, repost/);
    assert.match(persisted, /X Engagement Capture Template/);
    assert.deepEqual(opportunities, []);
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
    assert.ok(brief.engagementSearch.searchCount <= 5);
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

test('daily execution brief keeps engagement search and reply limits aligned', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-brief-engagement-limit-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
      {
        title: 'Browser-Grade Tabs',
        excerpt: 'Tab system needs browser-grade ownership, runtime, and isolation boundaries.',
        slug: 'Workspace-v2-Tab-System-Browser-Grade-Tabs',
        lang: 'zh',
        tags: ['Frontend'],
        url: 'https://clean99.github.io/zh/browser-grade-tabs/',
      },
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
      limit: 9,
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
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');

    const brief = await buildDailyExecutionBrief({
      queue,
      ledger,
      opportunityTexts: Array.from({ length: 5 }, (_, index) => ({
        id: `performance-thread-${index + 1}`,
        text: [
          `https://x.com/example/status/${index + 1}`,
          '最近做前端性能优化，FMP、render、加载链路和指标口径全都在打架。',
          '如果只看一次首屏，很容易漏掉 tab 切回、后台任务抢主线程这些真实路径。',
        ].join('\n'),
      })),
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      publishMode: 'thread_fallback',
      engagementLimit: 3,
      env: {},
    });
    const markdown = formatDailyExecutionBriefMarkdown(brief);

    assert.equal(brief.engagementSearch.searchCount, 3);
    assert.equal(brief.engagementPlan.selectedCount, 3);
    assert.match(markdown, /Search queries: 3/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily execution brief surfaces browser blockers before ready publish slots', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-brief-browser-'));
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
    const skillDir = join(outDir, 'baoyu-post-to-x');
    const imageDir = join(outDir, 'images');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

    const brief = await buildDailyExecutionBrief({
      queue,
      ledger,
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      xProfileDir: '/tmp/x-profile',
      publishMode: 'thread_fallback',
      browserReadiness: {
        status: 'needs_chrome_extension_reconnect',
        publishMode: 'thread_fallback',
        profileDir: '/tmp/x-profile',
        blockers: [
          'Codex Chrome Extension native pipe is closed.',
          'Media upload is blocked in the current browser automation path.',
        ],
      },
      env: {},
    });
    const markdown = formatDailyExecutionBriefMarkdown(brief);

    assert.equal(brief.status, 'needs_chrome_extension_reconnect');
    assert.match(brief.browserReadinessCommand, /--publishMode thread_fallback/);
    assert.match(brief.browserReadinessCommand, /--xProfileDir '\/tmp\/x-profile'/);
    assert.equal(brief.dayReadiness.readySlots, 1);
    assert.equal(brief.manualPublishFallback.available, true);
    assert.equal(brief.actionItems[0].priority, 'P0');
    assert.ok(brief.actionItems.some((item) => item.action.includes('Fix browser readiness')));
    assert.ok(brief.actionItems.some((item) => item.action.includes('manual publish kit')));
    assert.ok(brief.actionItems.some((item) => item.priority === 'P2' && item.action.includes('remaining blocked publish slot')));
    assert.ok(brief.actionItems.some((item) => item.action.includes('prepare them only after browser readiness passes')));
    assert.match(markdown, /Browser Readiness/);
    assert.match(markdown, /Manual Publish Fallback/);
    assert.match(markdown, /Profile Conversion Handoff/);
    assert.match(markdown, /social:profile-package/);
    assert.match(markdown, /final profile save click/);
    assert.match(markdown, /social:manual-publish-kit/);
    assert.match(markdown, /social:post-publish-recovery/);
    assert.match(markdown, /browser-readiness -- --day 1 --slot 1 --publishMode thread_fallback --xProfileDir '\/tmp\/x-profile'/);
    assert.match(markdown, /Extension native pipe is closed|native pipe is closed/);
    assert.doesNotMatch(markdown, /P0: Prepare 1 ready/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily execution brief lists manual fallback commands for every ready slot', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-brief-manual-all-'));
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
        title: 'Vibe Coding VS Spec Driven Coding',
        excerpt: '没有 spec，模型会把未确认的假设写进代码里。',
        slug: 'Vibe-Coding-VS-Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/vibe-vs-spec/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
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
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await Promise.all(queue.items.map((item) => (
      writeFile(join(imageDir, `${item.id}.png`), 'fake image')
    )));

    const brief = await buildDailyExecutionBrief({
      queue,
      ledger,
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      publishMode: 'thread_fallback',
      browserReadiness: {
        status: 'needs_x_login',
        blockers: ['The Chrome profile used for publishing is not logged into X.'],
      },
      loginHandoff: {
        status: 'needs_x_login',
        blocker: 'The Chrome profile used for publishing is not logged into X.',
        publishingProfile: {
          profileDirectory: 'Profile 1',
          state: 'debuggable',
          currentUrl: 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost',
          loginRecoveryCommand: 'node tools/social-growth/cli.mjs login-recovery --day 1 --slot 1 --publish-mode thread_fallback --x-profile-directory Profile\\ 1',
        },
        alternateProfiles: [{
          profileDir: '/Users/test/Library/Application Support/Google/Chrome',
          profileDirectory: 'Profile 3',
          requiresChromeClose: true,
          loginRecoveryCommand: 'node tools/social-growth/cli.mjs login-recovery --day 1 --slot 1 --x-profile-dir /Users/test/Chrome --x-profile-directory Profile\\ 3',
        }],
        recoveryCheckCommand: 'node tools/social-growth/cli.mjs scheduled-run --day 1 --slot 1 --publish-mode thread_fallback --x-profile-directory Profile\\ 1',
      },
      env: {},
    });
    const markdown = formatDailyExecutionBriefMarkdown(brief);

    assert.equal(brief.manualPublishFallback.available, true);
    assert.equal(brief.loginHandoff.status, 'needs_x_login');
    assert.equal(brief.manualPublishFallback.items.length, brief.dayReadiness.readySlots);
    assert.ok(brief.manualPublishFallback.items.length > 1);
    assert.equal(brief.manualPublishFallback.batchUrlTemplatePath, 'data/social-growth/manual-publish-kits/day1-published-urls.json');
    assert.match(markdown, /Login Handoff/);
    assert.match(markdown, /Locked normal Chrome profiles: Profile 3/);
    assert.match(markdown, /scheduled-run --day 1 --slot 1/);
    assert.match(markdown, /manual-publish-kits\/day1-slot1-/);
    assert.match(markdown, /manual-publish-kits\/day1-slot2-/);
    assert.match(markdown, /manual-publish-kits\/day1-ready-slots\.md/);
    assert.match(markdown, /manual-publish-kits\/day1-published-urls\.json/);
    assert.match(markdown, /post-publish-recovery-batch/);
    assert.match(markdown, /post-publish-recovery/);
    assert.match(markdown, /fill the batch URL template/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('daily brief CLI reads stored browser probe before action order', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-daily-brief-cli-probe-'));
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
    const imageDir = join(outDir, 'images');
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const probePath = join(outDir, 'browser-probe.local.json');
    const profilePath = join(outDir, 'profile.txt');
    const briefPath = join(outDir, 'daily-brief.md');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeFile(probePath, `${JSON.stringify({
      expectedAccount: '@Clean993',
      chromeRunning: 'yes',
      loginState: 'logged_out',
      articleAvailable: 'no',
      mediaUpload: 'unknown',
      profileDirectory: 'Profile 1',
    }, null, 2)}\n`);
    await writeFile(profilePath, [
      'Clean99 | AI 工程化与前端性能',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
      'https://clean99.github.io',
      'Pinned',
      '30 Followers',
    ].join('\n'));

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'daily-brief',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--browser-probe', probePath,
      '--profile-text', profilePath,
      '--image-dir', imageDir,
      '--package-out', join(outDir, 'packages'),
      '--out', briefPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const markdown = await readFile(briefPath, 'utf8');

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(markdown, /Status: needs_x_login/);
    assert.match(markdown, /The Chrome profile used for publishing is not logged into X/);
    assert.match(markdown, /social:login-recovery/);
    assert.match(markdown, /--xProfileDirectory 'Profile 1'/);
    assert.match(markdown, /Manual Publish Fallback/);
    assert.match(markdown, /social:manual-publish-kit/);
    assert.match(markdown, /social:post-publish-recovery/);
    assert.match(markdown, /--publishMode thread_fallback/);
    assert.match(markdown, /<x-thread-url>/);
    assert.doesNotMatch(markdown, /<x-article-url>/);
    assert.doesNotMatch(markdown, /P0: Fix 1 blocked publish slot/);
    assert.doesNotMatch(markdown, /Status: ready_to_publish/);
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
    const xProfileDir = join(outDir, 'chrome-profile');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await mkdir(join(xProfileDir, 'Profile 1'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-article.ts'), '// test script');
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(xProfileDir, 'Local State'), `${JSON.stringify({
      profile: {
        last_used: 'Profile 1',
        profiles_order: ['Profile 1'],
        info_cache: {
          'Profile 1': {
            name: 'Clean993',
            user_name: 'clean993@example.com',
          },
        },
      },
    })}\n`);
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
      postTextDir: join(outDir, 'post-texts'),
      profileAuditPath: join(outDir, 'profile-audit.md'),
      profileUpdatePath: join(outDir, 'profile-update.md'),
      automationReportPath: join(outDir, 'automation-run.md'),
      imageBriefDir: join(outDir, 'image-briefs'),
      imageBacklogPath: join(outDir, 'image-backlog.md'),
      imageDir: join(outDir, 'images'),
      xPublishPrepPath: join(outDir, 'x-publish-prep.md'),
      publishConfirmationPath: join(outDir, 'publish-confirmation.md'),
      browserReadinessPath: join(outDir, 'browser-readiness.md'),
      browserProbePath: join(outDir, 'browser-probe.local.json'),
      profileDiagnosticsPath: join(outDir, 'x-profile-diagnostics.md'),
      loginHandoffPath: join(outDir, 'login-handoff.md'),
      engagementOpportunityDir: join(outDir, 'engagement-opportunities'),
      engagementPlanPath: join(outDir, 'engagement-plan.md'),
      engagementSearchPath: join(outDir, 'engagement-search.md'),
      xSkillDir: skillDir,
      xProfileDir,
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
    const browserReadiness = await readFile(join(outDir, 'browser-readiness.md'), 'utf8');
    const profileDiagnostics = await readFile(join(outDir, 'x-profile-diagnostics.md'), 'utf8');
    const loginHandoff = await readFile(join(outDir, 'login-handoff.md'), 'utf8');
    const imageBacklog = await readFile(join(outDir, 'image-backlog.md'), 'utf8');
    const engagementSearch = await readFile(join(outDir, 'engagement-search.md'), 'utf8');
    const engagementCaptureTemplate = await readFile(join(outDir, 'engagement-opportunities/_capture-template.md'), 'utf8');
    const engagementPlan = await readFile(join(outDir, 'engagement-plan.md'), 'utf8');
    const manualPublishKits = await readFile(join(outDir, 'manual-publish-kits/day1-ready-slots.md'), 'utf8');

    assert.equal(result.status, 'blocked_preflight');
    assert.match(result.blockers.join('\n'), /Image file is missing/);
    assert.ok(!result.blockers.join('\n').includes('pin a post'));
    assert.equal(result.profileConversion.status, 'needs_work');
    assert.match(result.profileConversion.issues.join('\n'), /pin a post/);
    assert.ok(result.paths.imageBrief.endsWith('.md'));
    assert.equal(result.paths.imageBacklog, join(outDir, 'image-backlog.md'));
    assert.equal(result.imageBacklog.status, 'needs_images');
    assert.equal(result.imageBacklog.missingImages, 3);
    assert.equal(result.paths.dailyBrief, join(outDir, 'daily-brief.md'));
    assert.equal(result.paths.xPublishPrep, join(outDir, 'x-publish-prep.md'));
    assert.equal(result.paths.publishConfirmation, join(outDir, 'publish-confirmation.md'));
    assert.equal(result.paths.browserReadiness, join(outDir, 'browser-readiness.md'));
    assert.equal(result.paths.profileDiagnostics, join(outDir, 'x-profile-diagnostics.md'));
    assert.equal(result.paths.loginHandoff, join(outDir, 'login-handoff.md'));
    assert.equal(result.paths.engagementSearch, join(outDir, 'engagement-search.md'));
    assert.equal(result.paths.engagementCaptureTemplate, join(outDir, 'engagement-opportunities/_capture-template.md'));
    assert.equal(result.paths.engagementPlan, join(outDir, 'engagement-plan.md'));
    assert.equal(result.paths.manualPublishKitIndex, join(outDir, 'manual-publish-kits/day1-ready-slots.md'));
    assert.equal(result.engagement.searchStatus, 'ready_for_read_only_search');
    assert.equal(result.profileDiagnostics.status, 'generated');
    assert.equal(result.profileDiagnostics.profiles, 1);
    assert.equal(result.loginHandoff.status, 'not_needed');
    assert.equal(result.engagement.captureTemplateStatus, 'ready_for_capture');
    assert.equal(result.engagement.captureTargets, result.engagement.searchQueries);
    assert.equal(result.engagement.status, 'needs_opportunity_capture');
    assert.equal(result.manualPublishKits.status, 'no_ready_slots');
    assert.equal(result.manualPublishKits.readyKits, 0);
    assert.match(report, /No public X action was performed/);
    assert.match(report, /Daily brief/);
    assert.match(dailyBrief, /Daily X Growth Brief/);
    assert.match(report, /X publish prep/);
    assert.match(report, /Browser readiness/);
    assert.match(report, /X profile diagnostics/);
    assert.match(report, /X login handoff/);
    assert.match(report, /Image backlog/);
    assert.match(imageBacklog, /X Image Backlog/);
    assert.match(imageBacklog, /social:register-image/);
    assert.match(dailyBrief, /Blocked Slot Fixes/);
    assert.match(dailyBrief, /social:image-brief/);
    assert.match(dailyBrief, /social:register-image/);
    assert.match(report, /Engagement plan/);
    assert.match(report, /Engagement capture template/);
    assert.match(report, /Manual publish kits/);
    assert.match(report, /Profile update package/);
    assert.match(report, /Profile Conversion/);
    assert.match(status, /Profile Conversion/);
    assert.match(preflight, /Status: blocked/);
    assert.match(profileAudit, /Status: needs_work/);
    assert.match(profileUpdate, /final profile save click/);
    assert.match(xPrep, /X Browser Handoff/);
    assert.match(confirmation, /X Publish Confirmation Packet/);
    assert.match(confirmation, /X Article To Review/);
    assert.match(confirmation, /Image-backed Short Post To Review/);
    assert.match(browserReadiness, /X Browser Readiness/);
    assert.match(browserReadiness, /blocked_local_prep/);
    assert.match(profileDiagnostics, /X Profile Diagnostics/);
    assert.match(profileDiagnostics, /--xProfileDirectory 'Profile 1'/);
    assert.match(loginHandoff, /X Login Handoff/);
    assert.match(loginHandoff, /login-recovery/);
    assert.match(engagementSearch, /X Engagement Search Plan/);
    assert.match(engagementCaptureTemplate, /X Engagement Capture Template/);
    assert.match(engagementCaptureTemplate, /Keep \/ Skip Gate/);
    assert.match(engagementPlan, /needs_opportunity_capture/);
    assert.match(manualPublishKits, /Manual X Publish Kits/);
    assert.match(manualPublishKits, /No ready manual publish kits/);
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
      experimentPlanPath: join(outDir, 'experiment-plan.md'),
      scheduledReportPath: join(outDir, 'scheduled-run.md'),
      imageBriefDir: join(outDir, 'image-briefs'),
      imageBacklogPath: join(outDir, 'image-backlog.md'),
      imageDir,
      xPublishPrepPath: join(outDir, 'x-publish-prep.md'),
      publishConfirmationPath: join(outDir, 'publish-confirmation.md'),
      browserReadinessPath: join(outDir, 'browser-readiness.md'),
      browserProbePath: join(outDir, 'browser-probe.local.json'),
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
    const imageBacklog = await readFile(join(outDir, 'image-backlog.md'), 'utf8');
    const browserReadiness = await readFile(join(outDir, 'browser-readiness.md'), 'utf8');
    const engagementCaptureTemplate = await readFile(join(outDir, 'engagement-opportunities/_capture-template.md'), 'utf8');
    const experimentPlan = await readFile(join(outDir, 'experiment-plan.md'), 'utf8');
    const manualPublishKits = await readFile(join(outDir, 'manual-publish-kits/day1-ready-slots.md'), 'utf8');

    assert.equal(result.status, 'ready_for_browser_confirmation');
    assert.equal(result.automation.status, 'ready_for_browser_confirmation');
    assert.equal(result.metrics.status, 'needs_published_posts');
    assert.equal(result.automation.profileConversion.status, 'pass');
    assert.equal(result.automation.publishConfirmation.status, 'ready_for_confirmation');
    assert.equal(result.automation.browserReadiness.status, 'needs_browser_probe');
    assert.equal(result.automation.experimentPlan.status, 'ready');
    assert.equal(result.automation.engagement.searchStatus, 'ready_for_read_only_search');
    assert.equal(result.automation.engagement.captureTemplateStatus, 'ready_for_capture');
    assert.equal(result.automation.engagement.captureTargets, result.automation.engagement.searchQueries);
    assert.equal(result.automation.engagement.status, 'needs_opportunity_capture');
    assert.equal(result.automation.manualPublishKits.status, 'ready_for_manual_confirmation');
    assert.equal(result.automation.manualPublishKits.readyKits, 1);
    assert.equal(result.selected.id, expectedQueue.items[0].id);
    assert.match(scheduledReport, /Scheduled X Growth Run/);
    assert.match(scheduledReport, /Daily brief/);
    assert.match(scheduledReport, /Image backlog/);
    assert.match(scheduledReport, /Engagement search/);
    assert.match(scheduledReport, /Engagement capture template/);
    assert.match(scheduledReport, /Engagement plan/);
    assert.match(scheduledReport, /Manual publish kits ready: 1\/3/);
    assert.match(scheduledReport, /Publish confirmation/);
    assert.match(scheduledReport, /Browser readiness/);
    assert.match(scheduledReport, /Content review: pass/);
    assert.match(scheduledReport, /Profile Conversion/);
    assert.match(scheduledReport, /Funnel report/);
    assert.match(scheduledReport, /Experiment plan/);
    assert.match(scheduledReport, /safe for recurring execution/);
    assert.match(metricsReport, /No browser publish/);
    assert.match(funnelReport, /X Growth Funnel/);
    assert.match(imageBacklog, /Images missing: 2/);
    assert.match(browserReadiness, /X Browser Readiness/);
    assert.match(engagementCaptureTemplate, /X Engagement Capture Template/);
    assert.match(engagementCaptureTemplate, /do not reply, like, repost/);
    assert.match(manualPublishKits, /Manual X Publish Kits/);
    assert.match(manualPublishKits, /Ready slots: 1\/3/);
    assert.match(manualPublishKits, /post-publish-recovery/);
    assert.match(experimentPlan, /X Growth Experiment Plan/);
    assert.match(experimentPlan, new RegExp(`### exp-1: ${expectedQueue.items[0].id}`));
    assert.match(experimentPlan, /Selected aligned: yes/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('scheduled growth loop reads browser probe file into the run status', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-scheduled-browser-'));
  try {
    const articles = [
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
    const browserProbePath = join(outDir, 'browser-probe.local.json');
    await writeBrowserProbe({
      observedAccount: '@Clean993',
      chromeRunning: 'yes',
      extensionInstalled: 'yes',
      nativeHost: 'yes',
      extensionPipe: 'closed',
      articleAvailable: 'no',
      mediaUpload: 'blocked',
      profileDirectory: 'Profile 1',
      currentUrl: 'https://x.com/compose/post',
      generatedAt: '2026-05-18T00:00:00.000Z',
    }, browserProbePath);

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
      experimentPlanPath: join(outDir, 'experiment-plan.md'),
      scheduledReportPath: join(outDir, 'scheduled-run.md'),
      imageBriefDir: join(outDir, 'image-briefs'),
      imageBacklogPath: join(outDir, 'image-backlog.md'),
      imageDir,
      xPublishPrepPath: join(outDir, 'x-publish-prep.md'),
      publishConfirmationPath: join(outDir, 'publish-confirmation.md'),
      browserReadinessPath: join(outDir, 'browser-readiness.md'),
      browserProbePath,
      engagementOpportunityDir: join(outDir, 'engagement-opportunities'),
      engagementPlanPath: join(outDir, 'engagement-plan.md'),
      engagementSearchPath: join(outDir, 'engagement-search.md'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      publishMode: 'thread_fallback',
      queueOptions: {
        limit: 1,
        lang: 'zh',
        campaign: 'test',
      },
      packageLimit: 1,
      env: {},
    });
    const scheduledReport = await readFile(join(outDir, 'scheduled-run.md'), 'utf8');
    const readinessReport = await readFile(join(outDir, 'browser-readiness.md'), 'utf8');
    const xPrepReport = await readFile(join(outDir, 'x-publish-prep.md'), 'utf8');
    const persistedProbe = await readBrowserProbe(browserProbePath);

    assert.equal(result.status, 'needs_media_upload_permission');
    assert.equal(result.automation.status, 'needs_media_upload_permission');
    assert.equal(result.automation.browserReadiness.status, 'needs_media_upload_permission');
    assert.doesNotMatch(result.automation.blockers.join('\n'), /native pipe/);
    assert.match(result.automation.blockers.join('\n'), /Media upload/);
    assert.match(scheduledReport, /Status: needs_media_upload_permission/);
    assert.doesNotMatch(scheduledReport, /Confirm opening a fresh Chrome window/);
    assert.match(readinessReport, /Extension pipe: closed/);
    assert.match(readinessReport, /Media upload is blocked/);
    assert.match(readinessReport, /Chrome profile directory: Profile 1/);
    assert.match(readinessReport, /Current URL: https:\/\/x\.com\/compose\/post/);
    assert.match(xPrepReport, /--profile-directory 'Profile 1'/);
    assert.equal(result.paths.browserProbe, browserProbePath);
    assert.equal(persistedProbe.extensionPipe, 'closed');
    assert.equal(persistedProbe.mediaUpload, 'blocked');
    assert.equal(persistedProbe.profileDirectory, 'Profile 1');
    assert.equal(persistedProbe.currentUrl, 'https://x.com/compose/post');
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

test('image backlog lists missing weekly slot images without browser actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-image-backlog-'));
  try {
    const articles = [
      {
        title: '全自动 AI 性能优化：Harness、Goal-Driven Loop 与 Skill 设计',
        excerpt: '这篇文章讨论的是让每一轮修改都能被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Software Engineering', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
      {
        title: 'Vibe Coding VS Spec-Driven Coding',
        excerpt: '复杂改动需要先固定意图、边界和验收标准。',
        slug: 'Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/spec/',
      },
    ];
    const queue = buildPublishQueue(articles, {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 3,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

    const backlog = await buildImageBacklog({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      sourcePlaceholder: '/tmp/generated.png',
    });
    const markdown = formatImageBacklogMarkdown(backlog);
    const writtenPath = await writeImageBacklog(backlog, join(outDir, 'image-backlog.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(backlog.status, 'needs_images');
    assert.equal(backlog.totals.totalSlots, 3);
    assert.equal(backlog.totals.readyImages, 1);
    assert.equal(backlog.totals.missingImages, 2);
    assert.equal(backlog.entries.length, 2);
    assert.match(markdown, /X Image Backlog/);
    assert.match(markdown, /social:image-brief -- --id/);
    assert.match(markdown, /social:register-image -- --id/);
    assert.match(markdown, /--source '\/tmp\/generated.png'/);
    assert.match(persisted, /Do not upload media or publish on X/);
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
      profileDir: '/tmp/x-profile',
      profileDirectory: 'Profile 1',
    });
    const markdown = formatXPublishPrepMarkdown(prep);
    const writtenPath = await writeXPublishPrep(prep, join(outDir, 'x-publish-prep.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(prep.status, 'ready');
    assert.equal(prep.blockers.length, 0);
    assert.match(prep.commands.prepareArticle, /x-article\.ts/);
    assert.match(prep.commands.prepareArticle, /--cover/);
    assert.match(prep.commands.prepareArticle, /--profile '\/tmp\/x-profile'/);
    assert.match(prep.commands.prepareArticle, /--profile-directory 'Profile 1'/);
    assert.match(prep.commands.probeBrowser, /x-browser-cdp\.mjs'/);
    assert.match(prep.commands.probeBrowser, /--probe --json/);
    assert.match(prep.commands.probeBrowser, /--profile '\/tmp\/x-profile'/);
    assert.match(prep.commands.probeBrowser, /--profile-directory 'Profile 1'/);
    assert.match(prep.commands.recordBrowserProbe, /--probe-out 'data\/social-growth\/browser-probe\.local\.json'/);
    assert.match(prep.commands.recordBrowserProbe, /--account '@Clean993'/);
    assert.match(prep.commands.prepareShortPost, /x-browser-cdp\.mjs/);
    assert.match(prep.commands.prepareShortPost, /--image/);
    assert.match(prep.commands.prepareShortPost, /--profile '\/tmp\/x-profile'/);
    assert.match(prep.commands.prepareShortPost, /--profile-directory 'Profile 1'/);
    assert.match(markdown, /X Browser Handoff/);
    assert.match(markdown, /Probe Browser Without Public Actions/);
    assert.match(markdown, /Chrome profile: `\/tmp\/x-profile`/);
    assert.match(markdown, /Chrome profile directory: `Profile 1`/);
    assert.match(markdown, /Stop before the final public post click/);
    assert.match(persisted, /ARTICLE_URL='https:\/\/x\.com\/Clean993\/articles\/123'/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('x publish prep can fall back to an image-backed thread when X Article is unavailable', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-x-thread-prep-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
      publishMode: 'thread',
      profileDir: '/tmp/x-profile',
    });
    const markdown = formatXPublishPrepMarkdown(prep);

    assert.equal(prep.status, 'ready');
    assert.equal(prep.publishMode, 'thread_fallback');
    assert.equal(prep.blockers.length, 0);
    assert.match(prep.commands.prepareArticle, /X Article is unavailable/);
    assert.match(prep.commands.probeBrowser, /x-browser-cdp\.mjs'/);
    assert.match(prep.commands.probeBrowser, /--probe --json/);
    assert.match(prep.commands.recordBrowserProbe, /--probe-out 'data\/social-growth\/browser-probe\.local\.json'/);
    assert.match(prep.commands.prepareShortPost, /x-browser-cdp\.mjs/);
    assert.match(prep.commands.prepareShortPost, /--image/);
    assert.match(prep.commands.prepareShortPost, /--profile '\/tmp\/x-profile'/);
    assert.match(prep.commands.prepareShortPost, /工作台一上 Tab/);
    assert.match(markdown, /Publish mode: thread_fallback/);
    assert.match(markdown, /Thread Replies After First Post/);
    assert.doesNotMatch(markdown, /ARTICLE_URL=/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('x publish prep blocks when no bun runtime is available', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-x-prep-runtime-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
      publishMode: 'x_article',
      runtimeResolver: async () => ({
        command: null,
        status: 'missing',
        blocker: 'Bun runtime is unavailable: install bun or provide --bunCommand with an executable command before preparing Chrome.',
      }),
    });
    const markdown = formatXPublishPrepMarkdown(prep);

    assert.equal(prep.status, 'blocked');
    assert.equal(prep.skill.runtimeStatus, 'missing');
    assert.ok(prep.blockers.some((item) => item.includes('Bun runtime is unavailable')));
    assert.match(markdown, /X Article runtime: not required|X Article runtime: unavailable/);
    assert.match(markdown, /X Article runtime status: missing/);
    assert.match(markdown, /Install bun or npx/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('project x browser cdp handoff exposes a non-publishing help command', () => {
  const result = spawnSync(process.execPath, ['tools/social-growth/x-browser-cdp.mjs', '--help'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Prepare an X post in Chrome through CDP/);
  assert.match(result.stdout, /--probe/);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--probe-out/);
  assert.match(result.stdout, /--read-url/);
  assert.match(result.stdout, /--text-out/);
  assert.match(result.stdout, /--account/);
  assert.match(result.stdout, /--profile-directory/);
  assert.match(result.stdout, /stops before final publish/);
});

test('x profile diagnostics lists Chrome profiles without public actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-x-profile-diagnostics-'));
  try {
    const profileDir = join(outDir, 'chrome-profile');
    await mkdir(join(profileDir, 'Default'), { recursive: true });
    await mkdir(join(profileDir, 'Profile 1'), { recursive: true });
    await writeFile(join(profileDir, 'Local State'), `${JSON.stringify({
      profile: {
        last_used: 'Profile 1',
        profiles_order: ['Default', 'Profile 1'],
        info_cache: {
          Default: {
            name: 'Your Chrome',
            user_name: 'feng.xu@example.com',
          },
          'Profile 1': {
            name: 'felix',
            user_name: 'felix@example.com',
          },
        },
      },
    }, null, 2)}\n`);
    await writeFile(join(profileDir, 'Default', 'Preferences'), `${JSON.stringify({
      account_info: [{ email: 'feng.xu@example.com' }],
    })}\n`);
    await writeFile(join(profileDir, 'Profile 1', 'Preferences'), `${JSON.stringify({
      account_info: [{ email: 'felix@example.com' }],
    })}\n`);
    const normalChromeDir = join(outDir, 'normal-chrome');
    await mkdir(join(normalChromeDir, 'Profile 3'), { recursive: true });
    await writeFile(join(normalChromeDir, 'Local State'), `${JSON.stringify({
      profile: {
        last_used: 'Profile 3',
        profiles_order: ['Profile 3'],
        info_cache: {
          'Profile 3': {
            name: 'Daily Chrome',
            user_name: 'clean993@example.com',
          },
        },
      },
    }, null, 2)}\n`);
    await writeFile(join(normalChromeDir, 'Profile 3', 'Preferences'), `${JSON.stringify({
      account_info: [{ email: 'clean993@example.com' }],
    })}\n`);
    await writeFile(join(normalChromeDir, 'SingletonLock'), 'locked');

    const diagnostics = await buildXProfileDiagnostics({
      profileDir,
      extraProfileDirs: [normalChromeDir],
      generatedAt: '2026-05-18T00:00:00.000Z',
    });
    const markdown = formatXProfileDiagnosticsMarkdown(diagnostics);
    const writtenPath = await writeXProfileDiagnostics(diagnostics, join(outDir, 'diagnostics.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(diagnostics.publicActions.typedText, false);
    assert.equal(diagnostics.publicActions.uploadedMedia, false);
    assert.equal(diagnostics.publicActions.clickedSubmit, false);
    assert.deepEqual(diagnostics.profiles.map((profile) => profile.id), ['Default', 'Profile 1']);
    assert.equal(diagnostics.profiles[1].isLastUsed, true);
    assert.equal(diagnostics.profiles[1].accountHint, 'f***@example.com');
    assert.equal(diagnostics.alternateProfileDirs.length, 1);
    assert.equal(diagnostics.alternateProfileDirs[0].profiles[0].id, 'Profile 3');
    assert.equal(diagnostics.alternateProfileDirs[0].profileDirState.status, 'locked_without_debug');
    assert.match(markdown, /--xProfileDirectory 'Profile 1'/);
    assert.match(markdown, /Alternate Chrome Profile Dirs/);
    assert.match(markdown, /Profile dir state: locked_without_debug/);
    assert.match(markdown, /--xProfileDir .*normal-chrome.* --xProfileDirectory 'Profile 3'/);
    assert.match(markdown, /close normal Chrome first/);
    assert.match(markdown, /Read-only diagnostics only/);
    assert.match(persisted, /X Profile Diagnostics/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('x profile diagnostics does not treat generic compose URL titles as logged in', () => {
  assert.equal(inferXPageStateForDiagnostics({
    title: 'x.com/compose/post',
    url: 'https://x.com/compose/post',
  }), 'unknown');
  assert.equal(inferXPageStateForDiagnostics({
    title: 'Home / X',
    url: 'https://x.com/compose/post',
  }), 'compose_maybe_logged_in');
  assert.equal(inferXPageStateForDiagnostics({
    title: 'X. It’s what’s happening / X',
    url: 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost',
  }), 'logged_out');
});

test('login handoff centralizes recovery commands without public actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-login-handoff-'));
  try {
    const handoff = buildLoginHandoff({
      generatedAt: '2026-05-18T00:00:00.000Z',
      day: 2,
      slot: 1,
      publishMode: 'thread_fallback',
      nodeCommand: '/path/to/node',
      browserReadiness: {
        status: 'needs_x_login',
        blockers: ['The Chrome profile used for publishing is not logged into X.'],
        currentUrl: 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost',
        profileDir: '',
        profileDirectory: 'Profile 1',
        selected: {
          id: 'queue-id',
          articleSlug: 'article-slug',
          imagePath: 'output/imagegen/queue-id.png',
        },
      },
      profileDiagnostics: {
        profileDirState: { status: 'debuggable' },
        alternateProfileDirs: [{
          profileDir: '/Users/test/Library/Application Support/Google/Chrome',
          profileDirState: { status: 'locked_without_debug' },
          profiles: [{
            id: 'Profile 3',
            name: 'Daily Chrome',
            accountHint: 'c***@example.com',
            isLastUsed: true,
          }],
        }],
      },
    });
    const markdown = formatLoginHandoffMarkdown(handoff);
    const outPath = await writeLoginHandoff(handoff, join(outDir, 'login-handoff.md'));
    const persisted = await readFile(outPath, 'utf8');

    assert.equal(handoff.status, 'needs_x_login');
    assert.equal(handoff.alternateProfiles[0].requiresChromeClose, true);
    assert.match(markdown, /close normal Chrome/);
    assert.match(markdown, /login-recovery/);
    assert.match(markdown, /scheduled-run/);
    assert.match(markdown, /must not publish/);
    assert.match(persisted, /X Login Handoff/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('browser readiness surfaces missing bun runtime as an actionable blocker', async () => {
  const readiness = buildBrowserReadiness({
    preflight: {
      generatedAt: '2026-05-18T00:00:00.000Z',
      status: 'ready',
      selected: {
        id: 'queue-id',
        articleSlug: 'article-slug',
      },
      image: {
        outputPath: 'output/imagegen/queue-id.png',
        ready: true,
      },
    },
    xPrep: {
      status: 'blocked',
      publishMode: 'thread_fallback',
      blockers: [
        'Bun runtime is unavailable: install bun or provide --bunCommand with an executable command before preparing Chrome.',
      ],
      skill: {},
    },
    expectedAccount: '@Clean993',
    observedAccount: '@Clean993',
    chromeRunning: 'yes',
    extensionInstalled: 'yes',
    nativeHost: 'yes',
    extensionPipe: 'open',
    articleAvailable: 'no',
    mediaUpload: 'ready',
  });
  const markdown = formatBrowserReadinessMarkdown(readiness);

  assert.equal(readiness.status, 'blocked_local_prep');
  assert.ok(readiness.blockers.some((item) => item.includes('Bun runtime is unavailable')));
  assert.ok(readiness.nextActions.some((item) => item.action.includes('Install bun')));
  assert.match(markdown, /X publish prep blocker: Bun runtime is unavailable/);
});

test('browser readiness ignores closed extension pipe when baoyu handoff is ready', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-browser-readiness-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
    const xPrep = await buildXPublishPrep(preflight, {
      skillDir,
      bunCommand: 'bun',
      publishMode: 'thread_fallback',
      profileDir: '/tmp/x-profile',
    });
    const readiness = buildBrowserReadiness({
      preflight,
      xPrep,
      expectedAccount: '@Clean993',
      observedAccount: '@Clean993',
      chromeRunning: 'yes',
      extensionInstalled: 'yes',
      nativeHost: 'yes',
      extensionPipe: 'closed',
      articleAvailable: 'no',
      mediaUpload: 'blocked',
      profileDir: '/tmp/x-profile',
    });
    const markdown = formatBrowserReadinessMarkdown(readiness);
    const writtenPath = await writeBrowserReadiness(readiness, join(outDir, 'browser-readiness.md'));
    const persisted = await readFile(writtenPath, 'utf8');

    assert.equal(readiness.status, 'needs_media_upload_permission');
    assert.ok(!readiness.blockers.some((item) => item.includes('native pipe')));
    assert.ok(readiness.blockers.some((item) => item.includes('Media upload')));
    assert.doesNotMatch(markdown, /Confirm opening a new Chrome window/);
    assert.match(markdown, /Media upload is blocked/);
    assert.match(persisted, /Readiness only/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('browser readiness requires extension pipe when no baoyu handoff is available', () => {
  const readiness = buildBrowserReadiness({
    preflight: {
      generatedAt: '2026-05-18T00:00:00.000Z',
      status: 'ready',
      selected: {
        id: 'queue-id',
        articleSlug: 'article-slug',
      },
      image: {
        outputPath: 'output/imagegen/queue-id.png',
        ready: true,
      },
    },
    xPrep: {
      status: 'blocked',
      publishMode: 'thread_fallback',
      blockers: [],
      skill: {
        name: 'baoyu-post-to-x',
      },
    },
    expectedAccount: '@Clean993',
    observedAccount: '@Clean993',
    chromeRunning: 'yes',
    extensionInstalled: 'yes',
    nativeHost: 'yes',
    extensionPipe: 'closed',
    articleAvailable: 'no',
    mediaUpload: 'unknown',
  });

  assert.equal(readiness.status, 'blocked_local_prep');
  assert.ok(readiness.blockers.some((item) => item.includes('X publish prep is not ready')));
  assert.ok(readiness.blockers.some((item) => item.includes('native pipe')));
});

test('browser readiness asks for thread fallback when X Article editor is unavailable', async () => {
  const preflight = {
    generatedAt: '2026-05-18T00:00:00.000Z',
    status: 'ready',
    blockers: [],
    selected: {
      id: 'Agent-Skills__zh__strong-thesis',
      articleSlug: 'Agent-Skills',
    },
    image: {
      outputPath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
      ready: true,
    },
  };
  const xPrep = {
    status: 'ready',
    publishMode: 'x_article',
    blockers: [],
    selected: preflight.selected,
    files: {
      image: preflight.image.outputPath,
    },
  };
  const readiness = buildBrowserReadiness({
    preflight,
    xPrep,
    expectedAccount: '@Clean993',
    observedAccount: '@Clean993',
    chromeRunning: 'yes',
    extensionInstalled: 'yes',
    nativeHost: 'yes',
    extensionPipe: 'yes',
    loginState: 'logged_in',
    articleAvailable: 'no',
    mediaUpload: 'yes',
  });
  const markdown = formatBrowserReadinessMarkdown(readiness);

  assert.equal(readiness.status, 'needs_thread_fallback');
  assert.ok(readiness.blockers.some((item) => item.includes('X Article editor is unavailable')));
  assert.match(markdown, /--publishMode thread_fallback/);
  assert.match(markdown, /Status: needs_thread_fallback/);
});

test('browser readiness blocks a mismatched X compose draft', () => {
  const firstPost = [
    'Agent Skill 设计，先别急着看一个总分。',
    '',
    '没有契约的 Skill 只是长提示词，越堆越难复用。',
  ].join('\n');
  const readiness = buildBrowserReadiness({
    preflight: {
      generatedAt: '2026-05-18T00:00:00.000Z',
      status: 'ready',
      selected: {
        id: 'Agent-Skills__zh__strong-thesis',
        articleSlug: 'Agent-Skills',
      },
      image: {
        outputPath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
        ready: true,
      },
      browser: {
        handoff: {
          threadFallback: [firstPost],
          shortPost: firstPost,
        },
      },
    },
    xPrep: {
      status: 'ready',
      publishMode: 'thread_fallback',
      selected: {
        id: 'Agent-Skills__zh__strong-thesis',
        articleSlug: 'Agent-Skills',
      },
      thread: {
        firstPost,
        replies: [],
      },
      files: {
        image: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
      },
      skill: {
        browserHandoff: 'cdp',
      },
    },
    expectedAccount: '@Clean993',
    observedAccount: '@Clean993',
    chromeRunning: 'yes',
    extensionInstalled: 'yes',
    nativeHost: 'yes',
    extensionPipe: 'yes',
    loginState: 'logged_in',
    articleAvailable: 'no',
    mediaUpload: 'yes',
    composeDraftText: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
  });
  const markdown = formatBrowserReadinessMarkdown(readiness);

  assert.equal(readiness.status, 'needs_compose_draft_resolution');
  assert.equal(readiness.composeDraft.status, 'different');
  assert.ok(readiness.blockers.some((item) => item.includes('different draft')));
  assert.ok(readiness.nextActions.some((item) => item.action.includes('Resolve the existing X compose draft')));
  assert.match(markdown, /Compose Draft/);
  assert.match(markdown, /Status: different/);
});

test('browser readiness accepts an X compose draft that matches the selected first post', () => {
  const firstPost = [
    'Agent Skill 设计，先别急着看一个总分。',
    '',
    '没有契约的 Skill 只是长提示词，越堆越难复用。',
  ].join('\n');
  const readiness = buildBrowserReadiness({
    preflight: {
      generatedAt: '2026-05-18T00:00:00.000Z',
      status: 'ready',
      selected: {
        id: 'Agent-Skills__zh__strong-thesis',
        articleSlug: 'Agent-Skills',
      },
      image: {
        outputPath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
        ready: true,
      },
      browser: {
        handoff: {
          threadFallback: [firstPost],
          shortPost: firstPost,
        },
      },
    },
    xPrep: {
      status: 'ready',
      publishMode: 'thread_fallback',
      selected: {
        id: 'Agent-Skills__zh__strong-thesis',
        articleSlug: 'Agent-Skills',
      },
      thread: {
        firstPost,
        replies: [],
      },
      files: {
        image: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
      },
      skill: {
        browserHandoff: 'cdp',
      },
    },
    expectedAccount: '@Clean993',
    observedAccount: '@Clean993',
    chromeRunning: 'yes',
    extensionInstalled: 'yes',
    nativeHost: 'yes',
    extensionPipe: 'yes',
    loginState: 'logged_in',
    articleAvailable: 'no',
    mediaUpload: 'yes',
    composeDraftText: `${firstPost}\n\n#AI`,
  });

  assert.equal(readiness.status, 'ready_for_browser_confirmation');
  assert.equal(readiness.composeDraft.status, 'matches_selected');
  assert.deepEqual(readiness.blockers, []);
});

test('compose draft resolution maps an existing draft to a queue item', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-compose-resolution-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
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
      limit: 2,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure__zh__strong-thesis.png'), 'fake image');
    const draftText = [
      'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
      '',
      '先按 path -> metric -> scheduler -> gate 看一遍：场景、指标、动作、证据哪一项缺了，结论都不稳。',
    ].join('\n');
    const readiness = buildBrowserReadiness({
      preflight: {
        generatedAt: '2026-05-18T00:00:00.000Z',
        status: 'ready',
        selected: {
          id: queue.items.find((item) => item.id.startsWith('Agent-Skills'))?.id,
          articleSlug: 'Agent-Skills',
        },
        image: {
          outputPath: 'output/imagegen/Agent-Skills__zh__strong-thesis.png',
          ready: true,
        },
        browser: {
          handoff: {
            threadFallback: ['Agent Skill 设计，先别急着看一个总分。'],
          },
        },
      },
      xPrep: {
        status: 'ready',
        publishMode: 'thread_fallback',
        thread: {
          firstPost: 'Agent Skill 设计，先别急着看一个总分。',
          replies: [],
        },
        skill: {
          browserHandoff: 'cdp',
        },
      },
      expectedAccount: '@Clean993',
      observedAccount: '@Clean993',
      chromeRunning: 'yes',
      extensionInstalled: 'yes',
      nativeHost: 'yes',
      extensionPipe: 'yes',
      loginState: 'logged_in',
      articleAvailable: 'no',
      mediaUpload: 'yes',
      composeDraftText: draftText,
    });
    const resolution = buildComposeDraftResolution({
      queue,
      browserProbe: {
        composeDraftText: draftText,
      },
      browserReadiness: readiness,
      day: 2,
      slot: 1,
      publishMode: 'thread_fallback',
      imageDir,
      generatedAt: '2026-05-18T00:00:00.000Z',
    });
    const markdown = formatComposeDraftResolutionMarkdown(resolution);
    const written = await writeComposeDraftResolution(resolution, join(outDir, 'compose-draft-resolution.md'));
    const persisted = await readFile(written, 'utf8');
    const stashPath = await writeComposeDraftStash(resolution, {
      outDir: join(outDir, 'compose-drafts'),
    });
    const stashed = await readFile(stashPath, 'utf8');

    assert.equal(resolution.status, 'needs_resolution');
    assert.ok(resolution.match.item.id.startsWith('Workspace-v2-Tab-System-Performance'));
    assert.equal(resolution.match.image.ready, false);
    assert.ok(resolution.match.image.alternateReadyPath.endsWith('__zh__strong-thesis.png'));
    assert.equal(resolution.match.draftMatchesFirstPost, false);
    assert.match(resolution.commands.afterPublishingExistingDraft, /post-publish-recovery/);
    assert.match(resolution.commands.imageBriefForExistingDraft, /image-brief --id/);
    assert.match(resolution.commands.stashCurrentDraft, /compose-draft-stash/);
    assert.match(markdown, /Likely Queue Match/);
    assert.match(markdown, /Workspace-v2-Tab-System-Performance/);
    assert.match(markdown, /Local Draft Backup/);
    assert.match(markdown, /Existing Draft Publishability/);
    assert.match(markdown, /Image ready for matched item: no/);
    assert.match(markdown, /Image ready: no/);
    assert.match(markdown, /Alternate ready same-article image/);
    assert.match(markdown, /Publishing it as-is would violate the image-first package strategy/);
    assert.match(markdown, /do not treat this existing draft as a healthy growth slot/);
    assert.match(persisted, /X Compose Draft Resolution/);
    assert.match(persisted, /Do not overwrite it with the selected package/);
    assert.match(stashed, /X Compose Draft Local Stash/);
    assert.match(stashed, /Workspace v2 Tab System 性能优化/);
    assert.match(stashed, /Recovery Command If This Draft Later Goes Public/);
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
    assert.match(markdown, /social:post-publish-recovery/);
    assert.match(markdown, /social:mark-published/);
    assert.match(persisted, /This file is not permission to perform public X actions/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('publish confirmation uses thread fallback when X Article is unavailable', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-thread-confirmation-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
      publishMode: 'thread_fallback',
    });
    const packet = buildPublishConfirmation({
      queue,
      preflight,
      xPublishPrep: prep,
    });
    const markdown = formatPublishConfirmationMarkdown(packet);

    assert.equal(packet.status, 'ready_for_confirmation');
    assert.equal(packet.publishMode, 'thread_fallback');
    assert.doesNotMatch(packet.content.imagePost, /<x-article-url>/);
    assert.match(packet.content.imagePost, /工作台一上 Tab/);
    assert.match(packet.commands.recordPublished, /<x-thread-url>/);
    assert.match(packet.commands.recordPublished, /--reply-out data\/social-growth\/thread-reply-handoff\.md/);
    assert.match(packet.commands.recoverPublished, /social:post-publish-recovery/);
    assert.match(packet.commands.recoverPublished, /<x-thread-url>/);
    assert.match(packet.commands.recoverPublished, /--reply-out data\/social-growth\/thread-reply-handoff\.md/);
    assert.equal(packet.commands.prepareThreadReplies.length, 2);
    assert.match(packet.commands.prepareThreadReplies[0].url, /https:\/\/x\.com\/intent\/tweet\?in_reply_to=THREAD_STATUS_ID&text=/);
    assert.match(decodeURIComponent(packet.commands.prepareThreadReplies[1].url), /完整过程/);
    assert.equal(packet.commands.prepareFollowUpReplies.length, 2);
    assert.match(markdown, /X Article Status/);
    assert.match(markdown, /Image-backed Thread First Post To Review/);
    assert.match(markdown, /Prepare remaining thread posts after the first post is public/);
    assert.match(markdown, /Intent reference: https:\/\/docs\.x\.com\/x-for-websites\/web-intents\/overview/);
    assert.match(markdown, /Replace THREAD_STATUS_ID with the numeric status id from <x-thread-url>/);
    assert.doesNotMatch(markdown, /replace `<x-article-url>`/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('manual publish kit condenses copy, recovery, and metrics targets without public actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-manual-kit-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
      publishMode: 'thread_fallback',
    });
    const confirmation = buildPublishConfirmation({
      queue,
      preflight,
      xPublishPrep: prep,
    });
    const kit = buildManualPublishKit({
      confirmation,
      profileTextPath: join(outDir, 'profile.local.txt'),
      postTextDir: join(outDir, 'post-texts'),
    });
    const markdown = formatManualPublishKitMarkdown(kit);

    assert.equal(kit.status, 'ready_for_manual_confirmation');
    assert.equal(kit.remainingThreadPosts.length, 2);
    assert.equal(kit.image.absolutePath, imagePath);
    assert.match(kit.recoveryCommand, /social:post-publish-recovery/);
    assert.match(markdown, /Manual X Publish Kit/);
    assert.match(markdown, /Open X in a Chrome profile already logged in as `@Clean993`/);
    assert.match(markdown, /Stop before the final public publish click/);
    assert.match(markdown, /Image: `/);
    assert.match(markdown, /Absolute image path: `/);
    assert.match(markdown, /attach the absolute image path above/);
    assert.match(markdown, /Thread Post 2/);
    assert.match(markdown, /profile\.local\.txt/);
    assert.match(markdown, /post-texts/);
    assert.match(markdown, /Publishing, uploading media, replying/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('manual publish kits CLI writes all ready fallback kits and an index', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-manual-kits-'));
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
        title: 'Vibe Coding VS Spec-Driven Coding',
        excerpt: '复杂改动需要先固定意图、边界和验收标准。',
        slug: 'Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/spec-driven-coding/',
      },
      {
        title: '全自动 AI 性能优化',
        excerpt: '每一轮修改都应该被同一个 harness 复验。',
        slug: 'Automated-AI-Performance-Optimization',
        lang: 'zh',
        tags: ['AI', 'Web Performance'],
        url: 'https://clean99.github.io/zh/automated-ai-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 9,
    });
    const ledger = createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    });
    const plannedSlots = buildWeeklyExecutionPlan({
      queue,
      ledger,
      now: '2026-05-18T00:00:00.000Z',
    }).days[0].publishSlots;
    const imageDir = join(outDir, 'images');
    const skillDir = join(outDir, 'baoyu-post-to-x');
    const kitDir = join(outDir, 'manual-publish-kits');
    const indexPath = join(kitDir, 'index.md');
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    await mkdir(imageDir, { recursive: true });
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await writeFile(join(imageDir, `${plannedSlots[0].item.id}.png`), 'fake image');
    await writeFile(join(imageDir, `${plannedSlots[1].item.id}.png`), 'fake image');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, ledger);

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'manual-publish-kits',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--image-dir', imageDir,
      '--package-out', join(outDir, 'packages'),
      '--skill-dir', skillDir,
      '--bun-command', 'bun',
      '--publishMode', 'thread_fallback',
      '--day', '1',
      '--out-dir', kitDir,
      '--out', indexPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Wrote 2 manual X publish kit\(s\)/);
    const firstKitPath = join(kitDir, `day1-slot1-${plannedSlots[0].item.id}.md`);
    const secondKitPath = join(kitDir, `day1-slot2-${plannedSlots[1].item.id}.md`);
    const indexMarkdown = await readFile(indexPath, 'utf8');
    const urlTemplate = JSON.parse(await readFile(join(kitDir, 'day1-published-urls.json'), 'utf8'));
    const firstKit = await readFile(firstKitPath, 'utf8');
    const secondKit = await readFile(secondKitPath, 'utf8');

    assert.match(indexMarkdown, /Manual X Publish Kits/);
    assert.match(indexMarkdown, /Ready slots: 2\/3/);
    assert.match(indexMarkdown, /Batch Recovery/);
    assert.match(indexMarkdown, /post-publish-recovery-batch/);
    assert.equal(urlTemplate.status, 'ready_for_url_capture');
    assert.equal(urlTemplate.items.length, 2);
    assert.equal(urlTemplate.items[0].id, plannedSlots[0].item.id);
    assert.equal(urlTemplate.items[0].url, '');
    assert.ok(indexMarkdown.includes(firstKitPath));
    assert.ok(indexMarkdown.includes(secondKitPath));
    assert.match(indexMarkdown, /post-publish-recovery/);
    assert.match(indexMarkdown, /Publishing, uploading media, replying/);
    assert.match(firstKit, /Manual X Publish Kit/);
    assert.match(firstKit, /Absolute image path: `/);
    assert.match(secondKit, /Manual X Publish Kit/);
    assert.match(secondKit, /Thread Post 2/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('manual publish URL template maps ready kits to fillable published URL records', () => {
  const template = buildManualPublishUrlTemplate({
    generatedAt: '2026-05-19T00:00:00.000Z',
    day: 2,
    date: '2026-05-19',
    kits: [
      { slot: 1, id: 'Agent-Skills__zh__strong-thesis' },
      { slot: 2, id: 'Spec-Driven-Coding__zh__case-story' },
    ],
  });

  assert.equal(template.status, 'ready_for_url_capture');
  assert.equal(template.day, 2);
  assert.deepEqual(template.items, [
    {
      slot: 1,
      id: 'Agent-Skills__zh__strong-thesis',
      url: '',
      articleUrl: '',
      publishedAt: '',
    },
    {
      slot: 2,
      id: 'Spec-Driven-Coding__zh__case-story',
      url: '',
      articleUrl: '',
      publishedAt: '',
    },
  ]);
  assert.match(template.boundary, /performs no public X actions/);
});

test('thread reply handoff materializes reply intent URLs from a published thread URL', () => {
  const queue = buildPublishQueue([
    {
      title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
      excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
      slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
      lang: 'zh',
      tags: ['Frontend', 'Web Performance'],
      url: 'https://clean99.github.io/zh/workspace-tab-performance/',
    },
  ], {
    campaign: 'test',
    createdAt: '2026-05-18T00:00:00.000Z',
    limit: 1,
  });
  const publishedQueue = markQueueItemPublished(queue, {
    id: queue.items[0].id,
    xPostUrl: 'https://x.com/Clean993/status/1234567890123456789?s=20',
    publishedAt: '2026-05-18T01:00:00.000Z',
  });

  const handoff = buildThreadReplyHandoff({
    queue: publishedQueue,
    id: queue.items[0].id,
    threadUrl: 'https://x.com/Clean993/status/1234567890123456789?s=20',
    generatedAt: '2026-05-18T01:00:00.000Z',
  });
  const markdown = formatThreadReplyHandoffMarkdown(handoff);

  assert.equal(handoff.status, 'ready_for_confirmation');
  assert.equal(handoff.statusId, '1234567890123456789');
  assert.equal(handoff.threadReplies.length, 2);
  assert.match(handoff.threadReplies[0].url, /in_reply_to=1234567890123456789/);
  assert.doesNotMatch(handoff.threadReplies[0].url, /THREAD_STATUS_ID/);
  assert.match(markdown, /X Thread Reply Handoff/);
  assert.match(markdown, /Status id: 1234567890123456789/);
  assert.match(markdown, /stop before the final public Reply click/);
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
  queue.items[0] = {
    ...queue.items[0],
    xArticle: {
      ...queue.items[0].xArticle,
      body: [
        '本文从第一性原理出发，拆解 Skill 的本质、设计原则和工程实践。',
        '',
        '## 关键结论',
        '',
        '- Skill 的价值不是多一段提示词。',
        '',
        '## 为什么值得读原文',
        '',
        '原文围绕《Agent Skills 探索实录》展开，有完整背景、判断过程和可复用步骤。短帖只能给出框架，原文适合用来核对细节、边界和实际例子。',
        '',
        `博客原文：${queue.items[0].targetUrl}`,
      ].join('\n'),
    },
    followUpReplies: [
      '如果你要把这个方法搬到自己的项目，先问三个问题：你现在是不是还在把一堆提示词塞进上下文？有没有证据？下一步能不能按 context -> contract -> execution -> eval 跑？',
    ],
  };
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

test('CLI resolves --day today from the ledger start date in project timezone', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-day-today-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'day-readiness',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--day', 'today',
      '--now', '2026-05-19T03:00:00.000Z',
      '--format', 'json',
      '--ensure-package', 'false',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);

    assert.equal(payload.day, 2);
    assert.equal(payload.date, '2026-05-19');
    assert.equal(payload.cumulativeFollowerTarget, 286);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('day readiness carries thread fallback and profile args into slot commands', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-day-readiness-thread-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const skillDir = join(outDir, 'baoyu-post-to-x');
    const imageDir = join(outDir, 'images');
    await mkdir(join(skillDir, 'scripts'), { recursive: true });
    await writeFile(join(skillDir, 'scripts/x-browser.ts'), '// test script');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

    const readiness = await buildDayReadiness({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      day: 1,
      now: '2026-05-18T00:00:00.000Z',
      imageDir,
      packageOutDir: join(outDir, 'packages'),
      xSkillDir: skillDir,
      xBunCommand: 'bun',
      xProfileDir: '/tmp/x-profile',
      publishMode: 'thread_fallback',
    });
    const markdown = formatDayReadinessMarkdown(readiness);

    assert.equal(readiness.slots[0].publishMode, 'thread_fallback');
    assert.match(readiness.slots[0].commands.xPrep, /--publishMode thread_fallback --xProfileDir '\/tmp\/x-profile'/);
    assert.match(markdown, /Publish mode: thread_fallback/);
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
  assert.match(profilePackage.proposed.bio, /问题、指标、验证、失败轮次/);
  assert.ok(profilePackage.proposed.bio.length <= 160);
  assert.match(profilePackage.proposed.pinnedPost, /这里不做技术新闻搬运/);
  assert.match(profilePackage.proposed.pinnedPost, /看起来很对但没证据/);
  assert.doesNotMatch(profilePackage.proposed.pinnedPost, /真实遇到的判断题|少看口号/);
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
    assert.match(markdown, /cli\.mjs image-brief/);
    assert.match(markdown, /cli\.mjs x-prep/);
    assert.match(markdown, /cli\.mjs profile-audit/);
    assert.match(markdown, /cli\.mjs profile-package/);
    assert.doesNotMatch(markdown, /npm run/);
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
    assert.match(markdown, /cli\.mjs x-prep/);
    assert.match(markdown, /cli\.mjs profile-package/);
    assert.doesNotMatch(markdown, /npm run/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('growth status surfaces blocking browser readiness before publish prep', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-browser-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

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
      publishMode: 'thread_fallback',
      browserReadiness: {
        status: 'needs_chrome_extension_reconnect',
        blockers: [
          'Chrome extension native pipe is closed.',
          'Media upload is blocked in the current browser automation path.',
        ],
      },
      env: {},
    });
    const markdown = formatGrowthStatusMarkdown(status);

    assert.equal(status.status, 'needs_chrome_extension_reconnect');
    assert.equal(status.manualPublishFallback.available, true);
    assert.ok(status.nextActions.some((item) => item.action.includes('Fix browser readiness')));
    assert.ok(status.nextActions.some((item) => item.action.includes('manual publish kit')));
    assert.ok(status.nextActions.some((item) => item.action.includes('post-publish-recovery-batch')));
    assert.ok(!status.nextActions.some((item) => item.priority === 'P0' && item.action.includes('thread first post')));
    assert.ok(!status.nextActions.some((item) => item.priority === 'P0' && item.action.includes('Publish one confirmed')));
    assert.ok(status.nextActions.some((item) => item.priority === 'P1' && item.reason.includes('After the current blocker is cleared')));
    assert.match(markdown, /Browser Readiness/);
    assert.match(markdown, /Manual Publish Fallback/);
    assert.match(markdown, /manual-publish-kits\/day1-ready-slots\.md/);
    assert.match(markdown, /manual-publish-kits\/day1-published-urls\.json/);
    assert.match(markdown, /cli\.mjs manual-publish-kits --day 1 --publishMode thread_fallback/);
    assert.match(markdown, /cli\.mjs post-publish-recovery-batch --input data\/social-growth\/manual-publish-kits\/day1-published-urls\.json/);
    assert.match(markdown, /manual-publish-kit/);
    assert.match(markdown, /post-publish-recovery/);
    assert.match(markdown, /Chrome extension native pipe is closed/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('status CLI reads stored browser probe before reporting readiness', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-cli-probe-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const probePath = join(outDir, 'browser-probe.local.json');
    const profilePath = join(outDir, 'profile.txt');
    const statusPath = join(outDir, 'status.md');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeFile(probePath, `${JSON.stringify({
      expectedAccount: '@Clean993',
      chromeRunning: 'yes',
      loginState: 'logged_out',
      articleAvailable: 'no',
      mediaUpload: 'unknown',
      profileDirectory: 'Profile 1',
      currentUrl: 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost',
    }, null, 2)}\n`);
    await writeFile(profilePath, [
      'Clean99 | AI 工程化与前端性能',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
      'https://clean99.github.io',
      'Pinned',
      '30 Followers',
    ].join('\n'));

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'status',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--browser-probe', probePath,
      '--profile-text', profilePath,
      '--image-dir', imageDir,
      '--package-out', join(outDir, 'packages'),
      '--publishMode', 'thread_fallback',
      '--out', statusPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const markdown = await readFile(statusPath, 'utf8');

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(markdown, /Status: needs_x_login/);
    assert.match(markdown, /X Login Recovery/);
    assert.match(markdown, /Manual Publish Fallback/);
    assert.match(markdown, /cli\.mjs login-recovery --day 1 --slot 1 --publishMode thread_fallback --xProfileDirectory 'Profile 1'/);
    assert.match(markdown, /cli\.mjs manual-publish-kits --day 1 --publishMode thread_fallback/);
    assert.match(markdown, /manual-publish-kits\/day1-ready-slots\.md/);
    assert.match(markdown, /cli\.mjs manual-publish-kit --day 1 --slot 1 --publishMode thread_fallback/);
    assert.match(markdown, /cli\.mjs post-publish-recovery --queue data\/social-growth\/queue\.json/);
    assert.match(markdown, /x-browser-cdp\.mjs --probe --json --probe-out data\/social-growth\/browser-probe\.local\.json --account '@Clean993' --profile-directory 'Profile 1'/);
    assert.match(markdown, /cli\.mjs browser-readiness --day 1 --slot 1 --publishMode thread_fallback --xProfileDirectory 'Profile 1'/);
    assert.match(markdown, /The Chrome profile used for publishing is not logged into X/);
    assert.match(markdown, /Current URL: https:\/\/x\.com\/i\/flow\/login\?redirect_after_login=%2Fcompose%2Fpost/);
    assert.doesNotMatch(markdown, /Status: ready_for_browser_confirmation/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('status and daily brief CLIs block stored mismatched compose drafts', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-compose-draft-cli-'));
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
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const probePath = join(outDir, 'browser-probe.local.json');
    const profilePath = join(outDir, 'profile.txt');
    const statusPath = join(outDir, 'status.md');
    const briefPath = join(outDir, 'daily-brief.md');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeFile(probePath, `${JSON.stringify({
      expectedAccount: '@Clean993',
      observedAccount: '@Clean993',
      chromeRunning: 'yes',
      extensionInstalled: 'yes',
      nativeHost: 'yes',
      extensionPipe: 'yes',
      loginState: 'logged_in',
      articleAvailable: 'no',
      mediaUpload: 'ready',
      composeDraftText: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
    }, null, 2)}\n`);
    await writeFile(profilePath, [
      'Clean99 | AI 工程化与前端性能',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
      'https://clean99.github.io',
      'Pinned',
      '30 Followers',
    ].join('\n'));

    const commonArgs = [
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--browser-probe', probePath,
      '--profile-text', profilePath,
      '--image-dir', imageDir,
      '--package-out', join(outDir, 'packages'),
      '--publishMode', 'thread_fallback',
    ];
    const statusResult = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'status',
      ...commonArgs,
      '--out', statusPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const briefResult = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'daily-brief',
      ...commonArgs,
      '--out', briefPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const statusMarkdown = await readFile(statusPath, 'utf8');
    const briefMarkdown = await readFile(briefPath, 'utf8');
    const persistedProbe = await readBrowserProbe(probePath);

    assert.equal(statusResult.status, 0, statusResult.stderr || statusResult.stdout);
    assert.equal(briefResult.status, 0, briefResult.stderr || briefResult.stdout);
    assert.equal(persistedProbe.composeDraftText, 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路');
    assert.match(statusMarkdown, /Status: needs_compose_draft_resolution/);
    assert.match(statusMarkdown, /X compose already contains a different draft/);
    assert.match(statusMarkdown, /compose-draft-resolution/);
    assert.match(statusMarkdown, /compose-draft-stash/);
    assert.match(briefMarkdown, /Status: needs_compose_draft_resolution/);
    assert.match(briefMarkdown, /Resolve the existing X compose draft/);
    assert.match(briefMarkdown, /social:compose-draft-resolution/);
    assert.match(briefMarkdown, /social:compose-draft-stash/);
    assert.doesNotMatch(statusMarkdown, /Manual Publish Fallback/);
    assert.doesNotMatch(briefMarkdown, /Manual Publish Fallback/);
    assert.doesNotMatch(statusMarkdown, /Status: ready_for_browser_confirmation/);
    assert.doesNotMatch(briefMarkdown, /Status: ready_to_publish/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('login recovery command refreshes readiness files without public actions', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-login-recovery-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const probePath = join(outDir, 'browser-probe.local.json');
    const profilePath = join(outDir, 'profile.txt');
    const statusPath = join(outDir, 'status.md');
    const browserReadinessPath = join(outDir, 'browser-readiness.md');
    const xPrepPath = join(outDir, 'x-publish-prep.md');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await writeFile(probePath, `${JSON.stringify({
      expectedAccount: '@Clean993',
      chromeRunning: 'yes',
      loginState: 'logged_out',
      articleAvailable: 'no',
      mediaUpload: 'unknown',
      profileDirectory: 'Profile 1',
      currentUrl: 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost',
    }, null, 2)}\n`);
    await writeFile(profilePath, [
      'Clean99 | AI 工程化与前端性能',
      '@Clean993',
      '写 AI 工程化、前端性能、React 和测试。把真实工程问题压成可复用框架。',
      'https://clean99.github.io',
      'Pinned',
      '30 Followers',
    ].join('\n'));

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'login-recovery',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--browser-probe', probePath,
      '--profile-text', profilePath,
      '--image-dir', imageDir,
      '--package-out', join(outDir, 'packages'),
      '--publishMode', 'thread_fallback',
      '--skip-probe', 'true',
      '--status-out', statusPath,
      '--browser-readiness-out', browserReadinessPath,
      '--x-prep-out', xPrepPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const output = JSON.parse(result.stdout);
    const statusMarkdown = await readFile(statusPath, 'utf8');
    const readinessMarkdown = await readFile(browserReadinessPath, 'utf8');
    const xPrepMarkdown = await readFile(xPrepPath, 'utf8');
    const persistedProbe = await readBrowserProbe(probePath);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(output.status, 'needs_x_login');
    assert.equal(output.publicActions.typedText, false);
    assert.equal(output.publicActions.uploadedMedia, false);
    assert.equal(output.publicActions.clickedSubmit, false);
    assert.match(statusMarkdown, /Status: needs_x_login/);
    assert.match(statusMarkdown, /--xProfileDirectory 'Profile 1'/);
    assert.match(readinessMarkdown, /The Chrome profile used for publishing is not logged into X/);
    assert.match(readinessMarkdown, /Chrome profile directory: Profile 1/);
    assert.match(readinessMarkdown, /Current URL: https:\/\/x\.com\/i\/flow\/login\?redirect_after_login=%2Fcompose%2Fpost/);
    assert.match(xPrepMarkdown, /Probe Browser Without Public Actions/);
    assert.match(xPrepMarkdown, /--profile-directory 'Profile 1'/);
    assert.equal(persistedProbe.profileDirectory, 'Profile 1');
    assert.equal(persistedProbe.currentUrl, 'https://x.com/i/flow/login?redirect_after_login=%2Fcompose%2Fpost');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('growth status treats blocked local X prep as a blocker', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-local-prep-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const imageDir = join(outDir, 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, `${queue.items[0].id}.png`), 'fake image');

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
      publishMode: 'thread_fallback',
      browserReadiness: {
        status: 'blocked_local_prep',
        blockers: [
          'X publish prep is not ready.',
          'X publish prep blocker: Bun runtime is unavailable.',
        ],
      },
      env: {},
    });

    assert.equal(status.status, 'blocked_local_prep');
    assert.ok(status.nextActions.some((item) => item.action.includes('Fix browser readiness')));
    assert.ok(!status.nextActions.some((item) => item.priority === 'P0' && item.action.includes('thread first post')));
    assert.ok(status.nextActions.some((item) => item.priority === 'P1' && item.reason.includes('After the current blocker is cleared')));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('growth status reflects thread fallback publishing mode', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-status-thread-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Workspace v2 Tab System 性能优化：让热切换、冷启动和后台任务各走各的路',
        excerpt: '性能问题不再是某个页面慢，而是 first load、hot switch 和 background pressure 三条用户路径分别要守住。',
        slug: 'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
        lang: 'zh',
        tags: ['Frontend', 'Web Performance'],
        url: 'https://clean99.github.io/zh/workspace-tab-performance/',
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
      publishMode: 'thread',
      xProfileDir: '/tmp/x-profile',
      env: {},
    });
    const markdown = formatGrowthStatusMarkdown(status);

    assert.equal(status.publishMode, 'thread_fallback');
    assert.ok(status.nextActions.some((item) => item.action.includes('thread first post')));
    assert.match(markdown, /Publish mode: thread_fallback/);
    assert.match(markdown, /cli\.mjs x-prep --day 1 --slot 1 --publishMode thread_fallback --xProfileDir '\/tmp\/x-profile'/);
    assert.match(markdown, /<x-thread-url>/);
    assert.match(markdown, /--reply-out data\/social-growth\/thread-reply-handoff\.md/);
    assert.doesNotMatch(markdown, /--article-url <x-article-url>/);
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

test('ingests the newest Codex-generated PNG into the expected image path', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-imagegen-ingest-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '技术博客 SEO 检查表',
        excerpt: '只补标签不改信息结构，搜索引擎仍然不知道该把页面分发给谁。',
        slug: 'Tech-Blog-SEO-Checklist',
        lang: 'zh',
        tags: ['SEO', 'Software Engineering'],
        url: 'https://clean99.github.io/zh/seo-checklist/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 1,
    });
    const generatedDir = join(outDir, 'generated_images');
    const nestedDir = join(generatedDir, 'run-1');
    await mkdir(nestedDir, { recursive: true });
    const oldImage = join(generatedDir, 'old.png');
    const newestImage = join(nestedDir, 'newest.png');
    await writeFile(oldImage, 'old image');
    await writeFile(newestImage, 'new image');
    await utimes(oldImage, new Date('2026-05-18T00:00:00.000Z'), new Date('2026-05-18T00:00:00.000Z'));
    await utimes(newestImage, new Date('2026-05-18T01:00:00.000Z'), new Date('2026-05-18T01:00:00.000Z'));

    const ingested = await ingestLatestGeneratedImage({
      queue,
      ledger: createLedger({
        startDate: '2026-05-18',
        baselineFollowers: 30,
        followersIn7Days: 1000,
      }),
      sourceDir: generatedDir,
      id: queue.items[0].id,
      imageDir: join(outDir, 'images'),
      now: '2026-05-18T00:00:00.000Z',
    });

    assert.equal(ingested.sourceImage, newestImage);
    assert.equal(ingested.candidateCount, 2);
    assert.equal(await readFile(ingested.outputPath, 'utf8'), 'new image');
    await assert.rejects(
      () => ingestLatestGeneratedImage({
        queue,
        ledger: createLedger({
          startDate: '2026-05-18',
          baselineFollowers: 30,
          followersIn7Days: 1000,
        }),
        sourceDir: generatedDir,
        id: queue.items[0].id,
        imageDir: join(outDir, 'images-2'),
        since: '2026-05-18T02:00:00.000Z',
      }),
      /No generated PNG found/,
    );
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

test('quality gate rejects negative-parallelism Chinese X templates', () => {
  const queue = buildPublishQueue([
    {
      title: '有用的系统',
      excerpt: '一个有用的系统，核心是保持数据模型足够小，同时让反馈诚实。',
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
      '这个系统真正值钱的不是多一个功能，而是验证闭环。',
      '',
      '图里是判断框架，长文放在 X Article。',
      '',
      '#AI',
    ].join('\n'),
  };

  const validation = validateQueue(queue);

  assert.equal(validation.status, 'fail');
  assert.ok(validation.items[0].errors.some((error) => error.includes('low-value meta copy')));
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

test('mark-published CLI refreshes metrics template without losing captured fields', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-mark-published-'));
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
    const metricsPath = join(outDir, 'posts.local.json');
    const replyOutPath = join(outDir, 'thread-reply-handoff.md');
    await writeJson(join(outDir, 'queue.json'), publishedQueue);
    await refreshMetricsTemplateFromQueue({
      queue: publishedQueue,
      metricsPath,
      date: '2026-05-18',
    });
    const existingMetrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    existingMetrics.posts[0].metrics.views = '1200';
    await writeJson(metricsPath, existingMetrics);

    const result = spawnSync(process.execPath, [
      join(process.cwd(), 'tools/social-growth/cli.mjs'),
      'mark-published',
      '--queue',
      join(outDir, 'queue.json'),
      '--metrics',
      metricsPath,
      '--metrics-date',
      '2026-05-19',
      '--reply-out',
      replyOutPath,
      '--id',
      queue.items[0].id,
      '--url',
      'https://x.com/Clean993/status/1234567890123456789',
      '--published-at',
      '2026-05-19T01:00:00.000Z',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Refreshed metrics template for 2 published posts/);
    const updatedQueue = JSON.parse(await readFile(join(outDir, 'queue.json'), 'utf8'));
    const updatedMetrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    const replyHandoff = await readFile(replyOutPath, 'utf8');

    assert.equal(updatedQueue.items[0].status, 'published');
    assert.equal(updatedMetrics.date, '2026-05-18');
    assert.equal(updatedMetrics.posts.length, 2);
    assert.equal(updatedMetrics.posts.find((post) => post.id === queue.items[1].id).metrics.views, '1200');
    assert.equal(updatedMetrics.posts.find((post) => post.id === queue.items[0].id).url, 'https://x.com/Clean993/status/1234567890123456789');
    assert.match(replyHandoff, /X Thread Reply Handoff/);
    assert.match(replyHandoff, /in_reply_to=1234567890123456789/);
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

test('browser metrics capture can run read-only metrics cycle without opening Chrome', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-browser-metrics-'));
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
    await writeFile(profileTextPath, 'Clean993\n32 Followers\n');
    await writeFile(join(postTextDir, `${queue.items[0].id}.txt`), 'Views\n450\nLikes\n8\nReplies\n1\nReposts\n1\nBookmarks\n2\nNew follows\n2\n');

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'browser-metrics-capture',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--metrics', metricsPath,
      '--profile-text', profileTextPath,
      '--post-text-dir', postTextDir,
      '--cycle-out', join(outDir, 'metrics-cycle.md'),
      '--growth-report-out', join(outDir, 'growth-report.md'),
      '--recommendations-out', join(outDir, 'recommendations.md'),
      '--funnel-out', join(outDir, 'funnel.md'),
      '--skip-browser', 'true',
      '--now', '2026-05-19T00:00:00.000Z',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.stdout);
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));

    assert.equal(payload.status, 'snapshotted');
    assert.equal(payload.capture.skipped, true);
    assert.equal(payload.publicActions.typedText, false);
    assert.equal(payload.publicActions.uploadedMedia, false);
    assert.equal(payload.publicActions.clickedSubmit, false);
    assert.equal(payload.metrics.followers, '32');
    assert.equal(payload.metrics.capturedPostTexts, 1);
    assert.equal(ledger.snapshots[1].followers, 32);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish recovery marks a manually published X URL and runs local metrics cycle', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-post-publish-recovery-'));
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
    const queuePath = join(outDir, 'queue.json');
    const ledgerPath = join(outDir, 'ledger.json');
    const metricsPath = join(outDir, 'posts.local.json');
    const profileTextPath = join(outDir, 'profile.local.txt');
    const postTextDir = join(outDir, 'post-texts');
    const replyOutPath = join(outDir, 'thread-reply-handoff.md');
    await writeJson(queuePath, queue);
    await writeJson(ledgerPath, createLedger({
      startDate: '2026-05-18',
      baselineFollowers: 30,
      followersIn7Days: 1000,
    }));
    await mkdir(postTextDir);
    await writeFile(profileTextPath, 'Clean993\n33 Followers\n');
    await writeFile(join(postTextDir, `${queue.items[0].id}.txt`), 'Views\n900\nLikes\n9\nReplies\n2\nReposts\n1\nBookmarks\n4\nNew follows\n3\n');

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'post-publish-recovery',
      '--queue', queuePath,
      '--ledger', ledgerPath,
      '--metrics', metricsPath,
      '--profile-text', profileTextPath,
      '--post-text-dir', postTextDir,
      '--cycle-out', join(outDir, 'metrics-cycle.md'),
      '--growth-report-out', join(outDir, 'growth-report.md'),
      '--recommendations-out', join(outDir, 'recommendations.md'),
      '--funnel-out', join(outDir, 'funnel.md'),
      '--reply-out', replyOutPath,
      '--day', '1',
      '--slot', '1',
      '--url', 'https://twitter.com/Clean993/status/1234567890123456789?s=20',
      '--now', '2026-05-19T00:00:00.000Z',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    const updatedQueue = JSON.parse(await readFile(queuePath, 'utf8'));
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    const replyHandoff = await readFile(replyOutPath, 'utf8');

    assert.equal(payload.status, 'snapshotted');
    assert.equal(payload.selected.source, 'day_slot');
    assert.equal(payload.xPostUrl, 'https://x.com/Clean993/status/1234567890123456789');
    assert.equal(payload.publicActions.typedText, false);
    assert.equal(payload.publicActions.uploadedMedia, false);
    assert.equal(payload.publicActions.clickedSubmit, false);
    assert.equal(payload.metricsCycle.capture.skipped, true);
    assert.equal(updatedQueue.items[0].status, 'published');
    assert.equal(updatedQueue.items[0].xPostUrl, 'https://x.com/Clean993/status/1234567890123456789');
    assert.equal(metrics.followers, '33');
    assert.equal(metrics.posts[0].metrics.views, '900');
    assert.equal(metrics.posts[0].metrics.follows, '3');
    assert.equal(ledger.snapshots[1].followers, 33);
    assert.match(replyHandoff, /in_reply_to=1234567890123456789/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish recovery batch marks filled URLs and skips blank slots', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-post-publish-recovery-batch-'));
  try {
    const queue = buildPublishQueue([
      {
        title: 'Agent Skills 探索实录',
        excerpt: '拆解 Skill 的本质、设计原则和工程实践。',
        slug: 'Agent-Skills',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/agent-skills/',
      },
      {
        title: 'Spec Driven Coding',
        excerpt: '复杂改动需要先固定意图、边界和验收标准。',
        slug: 'Spec-Driven-Coding',
        lang: 'zh',
        tags: ['AI'],
        url: 'https://clean99.github.io/zh/spec-driven-coding/',
      },
    ], {
      campaign: 'test',
      createdAt: '2026-05-18T00:00:00.000Z',
      limit: 2,
    });
    const queuePath = join(outDir, 'queue.json');
    const metricsPath = join(outDir, 'posts.local.json');
    const replyOutDir = join(outDir, 'thread-replies');
    const inputPath = join(outDir, 'published-urls.json');
    const template = {
      version: 1,
      items: [
        {
          slot: 1,
          id: queue.items[0].id,
          url: 'https://twitter.com/Clean993/status/1111111111111111111?s=20',
          articleUrl: 'https://x.com/Clean993/articles/agent-skills',
          publishedAt: '2026-05-19T01:00:00.000Z',
        },
        {
          slot: 2,
          id: queue.items[1].id,
          url: 'https://mobile.x.com/Clean993/status/2222222222222222222',
          publishedAt: '2026-05-19T02:00:00.000Z',
        },
        {
          slot: 3,
          id: queue.items[2].id,
          url: '',
        },
      ],
    };
    await writeJson(queuePath, queue);
    await writeJson(inputPath, template);

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'post-publish-recovery-batch',
      '--input', inputPath,
      '--queue', queuePath,
      '--metrics', metricsPath,
      '--metrics-date', '2026-05-19',
      '--reply-out-dir', replyOutDir,
      '--metrics-cycle', 'false',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    const updatedQueue = JSON.parse(await readFile(queuePath, 'utf8'));
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8'));
    const firstReplyHandoff = await readFile(join(replyOutDir, `${queue.items[0].id}.md`), 'utf8');
    const secondReplyHandoff = await readFile(join(replyOutDir, `${queue.items[1].id}.md`), 'utf8');

    assert.equal(payload.status, 'published');
    assert.equal(payload.recovered, 2);
    assert.equal(payload.pending, 1);
    assert.equal(payload.publicActions.typedText, false);
    assert.equal(updatedQueue.items[0].status, 'published');
    assert.equal(updatedQueue.items[0].xPostUrl, 'https://x.com/Clean993/status/1111111111111111111');
    assert.equal(updatedQueue.items[0].xArticleUrl, 'https://x.com/Clean993/articles/agent-skills');
    assert.equal(updatedQueue.items[1].xPostUrl, 'https://x.com/Clean993/status/2222222222222222222');
    assert.equal(updatedQueue.items[2].status, 'draft');
    assert.equal(metrics.posts.length, 2);
    assert.equal(metrics.posts[0].url, 'https://x.com/Clean993/status/1111111111111111111');
    assert.match(firstReplyHandoff, /in_reply_to=1111111111111111111/);
    assert.match(secondReplyHandoff, /in_reply_to=2222222222222222222/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish recovery batch rejects invalid URLs before mutating queue', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-post-publish-recovery-batch-invalid-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '有用的系统',
        excerpt: '一个有用的系统，核心是保持数据模型足够小。',
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
    const queuePath = join(outDir, 'queue.json');
    const inputPath = join(outDir, 'published-urls.json');
    await writeJson(queuePath, queue);
    await writeJson(inputPath, {
      version: 1,
      items: [
        {
          slot: 1,
          id: queue.items[0].id,
          url: 'https://example.com/Clean993/status/123',
        },
      ],
    });

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'post-publish-recovery-batch',
      '--input', inputPath,
      '--queue', queuePath,
      '--metrics-cycle', 'false',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const unchangedQueue = JSON.parse(await readFile(queuePath, 'utf8'));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid X status URL host/);
    assert.equal(unchangedQueue.items[0].status, 'draft');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('post-publish recovery rejects non-X status URLs before mutating queue', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'social-growth-post-publish-recovery-invalid-'));
  try {
    const queue = buildPublishQueue([
      {
        title: '有用的系统',
        excerpt: '一个有用的系统，核心是保持数据模型足够小。',
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
    const queuePath = join(outDir, 'queue.json');
    await writeJson(queuePath, queue);

    const result = spawnSync(process.execPath, [
      'tools/social-growth/cli.mjs',
      'post-publish-recovery',
      '--queue', queuePath,
      '--metrics-cycle', 'false',
      '--id', queue.items[0].id,
      '--url', 'https://example.com/Clean993/status/123',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const unchangedQueue = JSON.parse(await readFile(queuePath, 'utf8'));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid X status URL host/);
    assert.equal(unchangedQueue.items[0].status, 'draft');
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

  assert.match(xArticle.body, /## 可复用框架/);
  assert.match(xArticle.body, /## 证据/);
  assert.ok(!xArticle.body.startsWith('# 全自动 AI 性能优化'));
  assert.doesNotMatch(xArticle.body, /为什么值得读原文|原文围绕|短帖只能|本文从/);
  assert.ok(xArticle.body.indexOf('## 可复用框架') < xArticle.body.indexOf('博客原文：'));
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
