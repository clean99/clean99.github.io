import {
  interactionTotal,
  postScore,
  summarizeGrowthLedger,
} from './metrics.mjs';
import { buildGrowthFunnel } from './funnel.mjs';

export function buildGrowthRecommendations(ledger) {
  const summary = summarizeGrowthLedger(ledger);
  const funnel = buildGrowthFunnel(ledger);
  const posts = summary.posts || [];
  const variantPerformance = aggregatePostPerformance(posts, 'variant');
  const articlePerformance = aggregatePostPerformance(posts, 'articleSlug');
  const algorithmLens = buildAlgorithmLens({ summary, funnel });
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
    algorithmLens,
    variantPerformance,
    articlePerformance,
    recommendations,
  };
}

export function buildAlgorithmLens({ summary, funnel }) {
  const paceBehind = Number(summary?.actualDailyPace || 0) < Number(summary?.requiredDailyPace || 0);
  const status = funnel?.status || 'unknown';
  const base = lensForFunnelStatus(status);
  const sourceConcepts = [
    'candidate sourcing',
    'multi-action prediction',
    'author diversity',
    'negative feedback filters',
  ];

  return {
    stage: base.stage,
    status,
    sourceConcepts,
    diagnosis: base.diagnosis,
    metricToMove: base.metricToMove,
    contentRule: base.contentRule,
    avoid: base.avoid,
    pace: paceBehind ? 'behind_target' : 'on_or_above_target',
    nextActions: [
      ...base.nextActions,
      ...(paceBehind ? [{
        priority: 'P0',
        action: 'Keep the first measurable post moving through browser confirmation before polishing later slots.',
        reason: `Follower pace is ${round(summary?.actualDailyPace)} per day versus ${round(summary?.requiredDailyPace)} required.`,
      }] : []),
    ],
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
  const lens = result.algorithmLens;
  const variantLines = result.variantPerformance.length
    ? result.variantPerformance
      .map((item) => `- ${item.key}: score ${item.score}, follows ${item.follows}, posts ${item.posts}, interaction rate ${formatPercent(item.interactionRate)}`)
      .join('\n')
    : '- No variant data yet.';
  const recommendationLines = result.recommendations
    .map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`)
    .join('\n');
  const lensActions = lens.nextActions
    .map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`)
    .join('\n');

  return `# Growth Recommendations

## Algorithm Lens

- Stage: ${lens.stage}
- Funnel status: ${lens.status}
- Source concepts: ${lens.sourceConcepts.join(', ')}
- Diagnosis: ${lens.diagnosis}
- Metric to move: ${lens.metricToMove}
- Content rule: ${lens.contentRule}
- Avoid: ${lens.avoid}
- Pace: ${lens.pace}

Algorithm actions:

${lensActions}

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

function lensForFunnelStatus(status) {
  const lens = {
    needs_published_posts: {
      stage: 'candidate_entry',
      diagnosis: 'There is no public post in the local ledger, so no recommender-facing signal exists yet.',
      metricToMove: 'published_posts',
      contentRule: 'Ship one image-backed X Article package before optimizing templates.',
      avoid: 'Do not spend the current slot on more meta-planning while the ledger has no post.',
      nextActions: [{
        priority: 'P0',
        action: 'Publish one confirmed X Article + image post and mark the public URLs.',
        reason: 'Candidate sourcing and ranking cannot start until there is a public artifact.',
      }],
    },
    needs_view_data: {
      stage: 'measurement_hydration',
      diagnosis: 'Published posts exist, but the local system lacks view counts.',
      metricToMove: 'views',
      contentRule: 'Capture visible analytics before judging copy, image, or topic fit.',
      avoid: 'Do not rewrite winners or losers from incomplete metrics.',
      nextActions: [{
        priority: 'P0',
        action: 'Copy visible post analytics and rerun the metrics cycle.',
        reason: 'Without view counts, reach and conversion rates are unknowable.',
      }],
    },
    needs_interaction: {
      stage: 'multi_action_prediction',
      diagnosis: 'Posts are entering feeds but are not earning meaningful actions.',
      metricToMove: 'interaction_per_view',
      contentRule: 'Rewrite first-screen claim, mechanism, and image promise so the post earns replies, bookmarks, reposts, or clicks.',
      avoid: 'Do not increase volume with the same weak hook.',
      nextActions: [{
        priority: 'P0',
        action: 'Regenerate the next copy override with a sharper claim and more concrete diagram promise.',
        reason: 'The ranking problem is interaction probability, not posting frequency.',
      }],
    },
    needs_profile_clicks: {
      stage: 'profile_handoff',
      diagnosis: 'Posts earn interactions but do not make readers inspect the account.',
      metricToMove: 'profile_click_per_interaction',
      contentRule: 'Make the X Article and follow-up replies signal a repeatable account promise.',
      avoid: 'Do not hide the account theme behind generic blog promotion.',
      nextActions: [{
        priority: 'P0',
        action: 'Add a reason to follow inside the X Article and update the pinned-post handoff.',
        reason: 'Interactions without profile clicks do not move the follower goal.',
      }],
    },
    needs_follow_conversion: {
      stage: 'follow_conversion',
      diagnosis: 'Readers inspect the profile or post but do not follow.',
      metricToMove: 'follow_per_profile_click',
      contentRule: 'Align bio, pinned post, and repeated topics around one clear technical promise.',
      avoid: 'Do not scale more impressions before fixing the conversion surface.',
      nextActions: [{
        priority: 'P0',
        action: 'Prepare the profile promise and pinned post update before the next distribution push.',
        reason: 'Profile interest is leaking before it becomes follows.',
      }],
    },
    converting: {
      stage: 'winner_scaling',
      diagnosis: 'The funnel has recorded follows; optimize around the strongest topic and variant.',
      metricToMove: 'follow_per_view',
      contentRule: 'Reuse the winning mechanism, not the same surface wording.',
      avoid: 'Do not duplicate the winning post or flood the feed from one author.',
      nextActions: [{
        priority: 'P1',
        action: 'Create the next package from the strongest follow-per-view article angle.',
        reason: 'Scaling should preserve author diversity and avoid duplicate-template filters.',
      }],
    },
  };

  return lens[status] || {
    stage: 'unknown',
    diagnosis: 'The current ledger state does not map to a known local funnel stage.',
    metricToMove: 'unknown',
    contentRule: 'Inspect the ledger and metrics files before changing content.',
    avoid: 'Do not infer optimization direction from missing data.',
    nextActions: [{
      priority: 'P0',
      action: 'Inspect the metrics ledger and rerun the funnel report.',
      reason: 'Recommendation guidance needs a known funnel state.',
    }],
  };
}
