import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { applyCapturedMetrics } from './capture.mjs';
import {
  appendSnapshot,
  createMetricsTemplateFromQueue,
  formatMarkdownReport,
  METRIC_FIELDS,
} from './ledger.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import { formatRecommendationsMarkdown } from './recommendations.mjs';
import { formatGrowthFunnelMarkdown } from './funnel.mjs';
import { readJson, writeJson } from './queue.mjs';

const DEFAULT_QUEUE_PATH = 'data/social-growth/queue.json';
const DEFAULT_LEDGER_PATH = 'data/social-growth/ledger.json';
const DEFAULT_METRICS_PATH = 'data/social-growth/posts.local.json';
const DEFAULT_PROFILE_TEXT_PATH = 'data/social-growth/profile.local.txt';
const DEFAULT_POST_TEXT_DIR = 'data/social-growth/post-texts';
const DEFAULT_CYCLE_REPORT_PATH = 'data/social-growth/metrics-cycle.md';
const DEFAULT_GROWTH_REPORT_PATH = 'data/social-growth/growth-report.md';
const DEFAULT_RECOMMENDATIONS_PATH = 'data/social-growth/recommendations.md';
const DEFAULT_FUNNEL_PATH = 'data/social-growth/funnel.md';

export async function runPostPublishMetricsCycle({
  queuePath = DEFAULT_QUEUE_PATH,
  ledgerPath = DEFAULT_LEDGER_PATH,
  metricsPath = DEFAULT_METRICS_PATH,
  profileTextPath = DEFAULT_PROFILE_TEXT_PATH,
  postTextDir = DEFAULT_POST_TEXT_DIR,
  cycleReportPath = DEFAULT_CYCLE_REPORT_PATH,
  growthReportPath = DEFAULT_GROWTH_REPORT_PATH,
  recommendationsPath = DEFAULT_RECOMMENDATIONS_PATH,
  funnelPath = DEFAULT_FUNNEL_PATH,
  now = new Date(),
  snapshot = true,
} = {}) {
  const generatedAt = toIsoString(now);
  const queue = await readJson(queuePath);
  const ledger = await readJson(ledgerPath);
  const template = createMetricsTemplateFromQueue(queue, {
    date: generatedAt.slice(0, 10),
  });
  const existingMetrics = await readOptionalJson(metricsPath);
  const mergedMetrics = mergeMetricsTemplate(existingMetrics, template);
  const profileText = await readOptionalText(profileTextPath);
  const postTextsById = await readPostTexts(postTextDir);
  const metrics = applyCapturedMetrics(mergedMetrics, {
    profileText,
    postTextsById,
  });
  const readiness = buildMetricsReadiness(metrics);
  const shouldSnapshot = Boolean(snapshot && readiness.followersReady && metrics.posts.length);
  const nextLedger = shouldSnapshot
    ? appendSnapshot(ledger, {
      date: metrics.date,
      followers: metrics.followers,
      posts: metrics.posts,
    })
    : ledger;
  const status = determineStatus({
    metrics,
    readiness,
    snapshotted: shouldSnapshot,
  });
  const result = {
    generatedAt,
    status,
    queuePath,
    ledgerPath,
    metricsPath,
    profileTextPath,
    postTextDir,
    cycleReportPath,
    growthReportPath,
    recommendationsPath,
    funnelPath,
    publishedPosts: metrics.posts.length,
    capturedPostTexts: Object.keys(postTextsById).length,
    followers: metrics.followers,
    readiness,
    summary: summarizeGrowthLedger(nextLedger),
    boundary: 'Read-only metrics parsing only. No browser publish, upload, reply, like, repost, follow, profile edit, or pin action was performed.',
  };

  await writeJson(metricsPath, metrics);
  if (shouldSnapshot) {
    await writeJson(ledgerPath, nextLedger);
  }
  await writeText(cycleReportPath, formatMetricsCycleMarkdown(result));
  await writeText(growthReportPath, formatMarkdownReport(nextLedger));
  await writeText(recommendationsPath, formatRecommendationsMarkdown(nextLedger));
  await writeText(funnelPath, formatGrowthFunnelMarkdown(nextLedger));

  return result;
}

export async function refreshMetricsTemplateFromQueue({
  queue,
  metricsPath = DEFAULT_METRICS_PATH,
  date,
  followers = '',
} = {}) {
  const template = createMetricsTemplateFromQueue(queue, {
    date,
    followers,
  });
  const existingMetrics = await readOptionalJson(metricsPath);
  const mergedMetrics = mergeMetricsTemplate(existingMetrics, template);
  await writeJson(metricsPath, mergedMetrics);

  return {
    metricsPath,
    publishedPosts: mergedMetrics.posts.length,
  };
}

export function mergeMetricsTemplate(existingMetrics, nextTemplate) {
  if (!existingMetrics) return nextTemplate;

  const existingById = new Map((existingMetrics.posts || []).map((post) => [post.id, post]));
  return {
    ...nextTemplate,
    date: existingMetrics.date || nextTemplate.date,
    followers: existingMetrics.followers || nextTemplate.followers,
    posts: nextTemplate.posts.map((post) => {
      const existing = existingById.get(post.id);
      if (!existing) return post;
      return {
        ...post,
        ...existing,
        metrics: {
          ...(post.metrics || {}),
          ...(existing.metrics || {}),
        },
      };
    }),
  };
}

export function buildMetricsReadiness(metrics = {}) {
  const posts = metrics.posts || [];
  const missingByPost = posts.map((post) => ({
    id: post.id,
    missing: METRIC_FIELDS.filter((field) => isBlank(post.metrics?.[field])),
  }));
  const postsWithAnyMetrics = posts
    .filter((post) => METRIC_FIELDS.some((field) => !isBlank(post.metrics?.[field])))
    .length;
  const postsWithViews = posts
    .filter((post) => !isBlank(post.metrics?.views))
    .length;

  return {
    followersReady: !isBlank(metrics.followers),
    totalPosts: posts.length,
    postsWithAnyMetrics,
    postsWithViews,
    completePosts: missingByPost.filter((post) => post.missing.length === 0).length,
    missingByPost,
  };
}

export function formatMetricsCycleMarkdown(result) {
  const missingLines = result.readiness.missingByPost.length
    ? result.readiness.missingByPost.map((post) => {
      const missing = post.missing.length ? post.missing.join(', ') : 'none';
      return `- ${post.id}: ${missing}`;
    }).join('\n')
    : '- No published posts in the metrics template.';
  const statusHint = statusHintFor(result.status);

  return `# Post-Publish Metrics Cycle

Generated at: ${result.generatedAt}
Status: ${result.status}

## Inputs

- Queue: \`${result.queuePath}\`
- Ledger: \`${result.ledgerPath}\`
- Metrics file: \`${result.metricsPath}\`
- Profile text: \`${result.profileTextPath}\`
- Post text dir: \`${result.postTextDir}\`

## Capture Summary

- Published posts in template: ${result.publishedPosts}
- Captured post text files: ${result.capturedPostTexts}
- Followers: ${result.followers || 'missing'}
- Posts with any metrics: ${result.readiness.postsWithAnyMetrics}/${result.readiness.totalPosts}
- Posts with views: ${result.readiness.postsWithViews}/${result.readiness.totalPosts}
- Fully complete posts: ${result.readiness.completePosts}/${result.readiness.totalPosts}

Missing fields by post:

${missingLines}

## Outputs

- Cycle report: \`${result.cycleReportPath}\`
- Growth report: \`${result.growthReportPath}\`
- Recommendations: \`${result.recommendationsPath}\`
- Funnel report: \`${result.funnelPath}\`

## Next Action

${statusHint}

## Boundary

${result.boundary}
`;
}

async function readOptionalJson(filePath) {
  if (!(await fileExists(filePath))) return null;
  return readJson(filePath);
}

async function readOptionalText(filePath) {
  if (!(await fileExists(filePath))) return '';
  return readFile(filePath, 'utf8');
}

async function readPostTexts(postTextDir) {
  if (!(await fileExists(postTextDir))) return {};
  const files = (await readdir(postTextDir)).filter((file) => file.endsWith('.txt'));
  const entries = await Promise.all(files.map(async (file) => {
    const id = file.replace(/\.txt$/, '');
    return [id, await readFile(join(postTextDir, file), 'utf8')];
  }));
  return Object.fromEntries(entries);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${String(content).trimEnd()}\n`);
}

function determineStatus({ metrics, readiness, snapshotted }) {
  if (!metrics.posts?.length) return 'needs_published_posts';
  if (!readiness.followersReady) return 'needs_profile_capture';
  if (!readiness.postsWithAnyMetrics) return 'needs_post_metrics_capture';
  return snapshotted ? 'snapshotted' : 'captured';
}

function statusHintFor(status) {
  if (status === 'needs_published_posts') {
    return 'Publish and record at least one confirmed X post URL before running metrics capture.';
  }
  if (status === 'needs_profile_capture') {
    return 'Copy visible @Clean993 profile text into `data/social-growth/profile.local.txt`, then rerun this command.';
  }
  if (status === 'needs_post_metrics_capture') {
    return 'Copy visible metrics text for each published post into `data/social-growth/post-texts/<queue-id>.txt`, then rerun this command.';
  }
  if (status === 'snapshotted') {
    return 'Review the growth report and recommendations, then update the next publish package before opening Chrome again.';
  }
  return 'Metrics were captured without writing a ledger snapshot. Rerun with snapshot enabled when ready.';
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
