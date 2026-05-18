import {
  interactionTotal,
  postScore,
  summarizeGrowthLedger,
} from './metrics.mjs';

export function buildGrowthRecommendations(ledger) {
  const summary = summarizeGrowthLedger(ledger);
  const posts = summary.posts || [];
  const variantPerformance = aggregatePostPerformance(posts, 'variant');
  const articlePerformance = aggregatePostPerformance(posts, 'articleSlug');
  const recommendations = [];

  if (!posts.length) {
    recommendations.push({
      priority: 'P0',
      action: 'Publish the first confirmed X Article + image post, then record metrics.',
      reason: 'No post metrics are recorded, so there is no optimization signal yet.',
    });
  }

  if (summary.actualDailyPace < summary.requiredDailyPace) {
    recommendations.push({
      priority: 'P0',
      action: 'Keep the daily output at 2-4 confirmed high-quality posts and prioritize posts that can earn follows, reposts, bookmarks, or profile clicks.',
      reason: `Follower pace is ${round(summary.actualDailyPace)} per day versus ${round(summary.requiredDailyPace)} required.`,
    });
  } else {
    recommendations.push({
      priority: 'P1',
      action: 'Preserve the current posting cadence and keep testing variants without increasing volume blindly.',
      reason: `Follower pace is ${round(summary.actualDailyPace)} per day against ${round(summary.requiredDailyPace)} required.`,
    });
  }

  const bestVariant = variantPerformance[0];
  if (bestVariant) {
    recommendations.push({
      priority: 'P1',
      action: `Double down on \`${bestVariant.key}\` for the next daily package unless a newer post beats it on follows or bookmarks.`,
      reason: `Current score ${bestVariant.score}, follows ${bestVariant.follows}, interaction rate ${formatPercent(bestVariant.interactionRate)}.`,
    });
  }

  const topPost = summary.topPosts[0];
  if (topPost) {
    recommendations.push({
      priority: 'P1',
      action: `Repurpose the strongest post angle from \`${topPost.articleSlug || topPost.id}\` into one follow-up post or reply.`,
      reason: `Top post score ${topPost.score}, interactions ${topPost.interactions}, follows ${topPost.metrics?.follows || 0}.`,
    });
  }

  const highEngagementNoFollow = posts
    .map((post) => ({
      ...post,
      interactions: interactionTotal(post.metrics),
      follows: Number(post.metrics?.follows || 0),
    }))
    .find((post) => post.interactions >= 10 && post.follows === 0);
  if (highEngagementNoFollow) {
    recommendations.push({
      priority: 'P2',
      action: 'Tighten the profile promise and add a clearer reason to follow in future X Articles.',
      reason: `Post \`${highEngagementNoFollow.id}\` created interactions without recorded follows.`,
    });
  }

  return {
    summary,
    variantPerformance,
    articlePerformance,
    recommendations,
  };
}

export function aggregatePostPerformance(posts, keyField) {
  const groups = new Map();
  for (const post of posts) {
    const key = post[keyField] || 'unknown';
    const group = groups.get(key) || {
      key,
      posts: 0,
      score: 0,
      interactions: 0,
      views: 0,
      follows: 0,
      bookmarks: 0,
      profileClicks: 0,
    };
    group.posts += 1;
    group.score += postScore(post.metrics);
    group.interactions += interactionTotal(post.metrics);
    group.views += Number(post.metrics?.views || 0);
    group.follows += Number(post.metrics?.follows || 0);
    group.bookmarks += Number(post.metrics?.bookmarks || 0);
    group.profileClicks += Number(post.metrics?.profileClicks || 0);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      interactionRate: group.views ? group.interactions / group.views : 0,
      scorePerPost: group.posts ? group.score / group.posts : 0,
    }))
    .sort((a, b) => b.score - a.score || b.follows - a.follows || a.key.localeCompare(b.key));
}

export function formatRecommendationsMarkdown(ledger) {
  const result = buildGrowthRecommendations(ledger);
  const variantLines = result.variantPerformance.length
    ? result.variantPerformance
      .map((item) => `- ${item.key}: score ${item.score}, follows ${item.follows}, posts ${item.posts}, interaction rate ${formatPercent(item.interactionRate)}`)
      .join('\n')
    : '- No variant data yet.';
  const recommendationLines = result.recommendations
    .map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`)
    .join('\n');

  return `# Growth Recommendations

## Variant Performance

${variantLines}

## Next Actions

${recommendationLines}
`;
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}
