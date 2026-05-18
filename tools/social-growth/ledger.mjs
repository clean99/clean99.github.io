import { readJson, writeJson } from './queue.mjs';
import { normalizePostMetrics, summarizeGrowthLedger } from './metrics.mjs';
import { formatRecommendationsMarkdown } from './recommendations.mjs';

export const METRIC_FIELDS = [
  'views',
  'likes',
  'replies',
  'reposts',
  'quotes',
  'bookmarks',
  'profileClicks',
  'follows',
];

export function createLedger({
  startDate,
  endDate,
  baselineFollowers,
  followersIn7Days = 1000,
} = {}) {
  const start = startDate || today();
  return {
    version: 1,
    target: {
      startDate: start,
      endDate: endDate || addDays(start, 7),
      followersIn7Days: Number(followersIn7Days),
      baselineFollowers: Number(baselineFollowers || 0),
    },
    snapshots: [
      {
        date: start,
        followers: Number(baselineFollowers || 0),
        posts: [],
      },
    ],
  };
}

export function appendSnapshot(ledger, snapshot) {
  if (!snapshot.date) {
    throw new Error('Snapshot requires a date');
  }

  const normalizedSnapshot = {
    date: snapshot.date,
    followers: Number(snapshot.followers || 0),
    posts: (snapshot.posts || []).map(normalizeSnapshotPost),
  };

  const snapshots = [
    ...(ledger.snapshots || []).filter((item) => item.date !== normalizedSnapshot.date),
    normalizedSnapshot,
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...ledger,
    snapshots,
  };
}

export function normalizeSnapshotPost(post) {
  return {
    id: post.id,
    articleSlug: post.articleSlug,
    variant: post.variant,
    url: post.url,
    xArticleUrl: post.xArticleUrl,
    metrics: normalizePostMetrics(post.metrics || {}),
  };
}

export function publishedPostsFromQueue(queue) {
  return queue.items
    .filter((item) => item.status === 'published' && item.xPostUrl)
    .map((item) => ({
      id: item.id,
      articleSlug: item.articleSlug,
      variant: item.variant,
      url: item.xPostUrl,
      xArticleUrl: item.xArticleUrl,
      metrics: {},
    }));
}

export function createMetricsTemplateFromQueue(queue, { date = today(), followers = '' } = {}) {
  return {
    version: 1,
    date,
    followers,
    posts: publishedPostsFromQueue(queue).map((post) => ({
      ...post,
      metrics: emptyMetrics(),
    })),
  };
}

export function formatMarkdownReport(ledger) {
  const summary = summarizeGrowthLedger(ledger);
  const progressPercent = Math.round(summary.progress * 1000) / 10;
  const interactionRate = Math.round(summary.interactionRate * 10000) / 100;

  const topPosts = summary.topPosts.length
    ? summary.topPosts
      .map((post, index) => `${index + 1}. ${post.id}: score ${post.score}, interactions ${post.interactions}`)
      .join('\n')
    : 'No posts recorded yet.';

  return `# Social Growth Report

Target window: ${ledger.target?.startDate || 'n/a'} -> ${ledger.target?.endDate || 'n/a'}

## Progress

- Baseline followers: ${summary.baselineFollowers}
- Latest followers: ${summary.latestFollowers}
- Follower delta: ${summary.followerDelta}
- 7-day target: ${summary.targetFollowers}
- Progress: ${progressPercent}%
- Required daily pace: ${Math.round(summary.requiredDailyPace * 10) / 10}
- Actual daily pace: ${Math.round(summary.actualDailyPace * 10) / 10}

## Interactions

- Total views: ${summary.totalViews}
- Total interactions: ${summary.totalInteractions}
- Interaction rate: ${interactionRate}%

## Top Posts

${topPosts}

${formatRecommendationsMarkdown(ledger).trim()}
`;
}

export async function updateLedgerSnapshot({ ledgerPath, snapshot, postsFile }) {
  const ledger = await readJson(ledgerPath);
  const postsInput = postsFile ? await readJson(postsFile) : null;
  const posts = postsInput ? postsFromInput(postsInput) : snapshot.posts;
  const inputSnapshot = postsInput && !Array.isArray(postsInput) ? postsInput : {};
  const nextSnapshot = {
    ...inputSnapshot,
    ...snapshot,
    date: snapshot.date || inputSnapshot.date,
    followers: snapshot.followers ?? inputSnapshot.followers,
    posts,
  };

  if (nextSnapshot.followers === undefined || nextSnapshot.followers === null || nextSnapshot.followers === '') {
    throw new Error('Snapshot requires followers');
  }

  const updated = appendSnapshot(ledger, {
    ...nextSnapshot,
  });
  await writeJson(ledgerPath, updated);
  return updated;
}

export function postsFromInput(input) {
  if (Array.isArray(input)) return input;
  return input.posts || [];
}

function emptyMetrics() {
  return Object.fromEntries(METRIC_FIELDS.map((field) => [field, '']));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date, days) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  const next = new Date(parsed + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}
