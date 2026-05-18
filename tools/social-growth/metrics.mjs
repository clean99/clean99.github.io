const COMPACT_NUMBER_RE = /^([0-9]+(?:\.[0-9]+)?)\s*([KMB万亿])?$/i;

export function parseCompactNumber(input) {
  if (typeof input === 'number') return input;

  const normalized = String(input || '')
    .trim()
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  const match = normalized.match(COMPACT_NUMBER_RE);
  if (!match) {
    throw new Error(`Invalid compact number: ${input}`);
  }

  const value = Number(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  const multiplier = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    '万': 10_000,
    '亿': 100_000_000,
  }[suffix] || 1;

  return Math.round(value * multiplier);
}

export function normalizePostMetrics(metrics = {}) {
  return {
    replies: numberOrZero(metrics.replies),
    reposts: numberOrZero(metrics.reposts),
    quotes: numberOrZero(metrics.quotes),
    likes: numberOrZero(metrics.likes),
    bookmarks: numberOrZero(metrics.bookmarks),
    views: numberOrZero(metrics.views),
    profileClicks: numberOrZero(metrics.profileClicks),
    follows: numberOrZero(metrics.follows),
  };
}

export function interactionTotal(metrics = {}) {
  const normalized = normalizePostMetrics(metrics);
  return normalized.replies
    + normalized.reposts
    + normalized.quotes
    + normalized.likes
    + normalized.bookmarks;
}

export function interactionRate(metrics = {}) {
  const normalized = normalizePostMetrics(metrics);
  if (!normalized.views) return 0;
  return interactionTotal(normalized) / normalized.views;
}

export function summarizeGrowthLedger(ledger) {
  const snapshots = [...(ledger.snapshots || [])].sort((a, b) => a.date.localeCompare(b.date));
  const target = ledger.target || {};
  const baselineFollowers = numberOrZero(target.baselineFollowers ?? snapshots[0]?.followers);
  const latest = snapshots[snapshots.length - 1] || {};
  const latestFollowers = numberOrZero(latest.followers);
  const followerDelta = latestFollowers - baselineFollowers;
  const targetFollowers = numberOrZero(target.followersIn7Days || 1000);
  const daysElapsed = elapsedDays(target.startDate, latest.date);
  const requiredDailyPace = targetFollowers / 7;
  const actualDailyPace = daysElapsed ? followerDelta / daysElapsed : 0;
  const posts = latestPostsFromSnapshots(snapshots);
  const totalInteractions = posts.reduce((sum, post) => sum + interactionTotal(post.metrics), 0);
  const totalViews = posts.reduce((sum, post) => sum + numberOrZero(post.metrics?.views), 0);

  return {
    baselineFollowers,
    latestFollowers,
    followerDelta,
    targetFollowers,
    progress: targetFollowers ? followerDelta / targetFollowers : 0,
    daysElapsed,
    requiredDailyPace,
    actualDailyPace,
    totalInteractions,
    totalViews,
    interactionRate: totalViews ? totalInteractions / totalViews : 0,
    posts,
    topPosts: rankPosts(posts).slice(0, 5),
  };
}

export function latestPostsFromSnapshots(snapshots = []) {
  const latestById = new Map();

  for (const snapshot of [...snapshots].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const post of snapshot.posts || []) {
      if (!post.id) continue;
      latestById.set(post.id, {
        ...post,
        snapshotDate: snapshot.date,
      });
    }
  }

  return [...latestById.values()];
}

export function rankPosts(posts) {
  return [...posts]
    .map((post) => ({
      ...post,
      score: postScore(post.metrics),
      interactions: interactionTotal(post.metrics),
    }))
    .sort((a, b) => b.score - a.score);
}

export function postScore(metrics = {}) {
  const normalized = normalizePostMetrics(metrics);
  return normalized.follows * 25
    + normalized.reposts * 8
    + normalized.quotes * 8
    + normalized.replies * 6
    + normalized.bookmarks * 5
    + normalized.likes;
}

export function elapsedDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function numberOrZero(value) {
  if (value === undefined || value === null || value === '') return 0;
  return typeof value === 'number' ? value : parseCompactNumber(value);
}
