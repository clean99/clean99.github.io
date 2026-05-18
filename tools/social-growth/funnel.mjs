import {
  interactionTotal,
  normalizePostMetrics,
  postScore,
  summarizeGrowthLedger,
} from './metrics.mjs';

export function buildGrowthFunnel(ledger) {
  const summary = summarizeGrowthLedger(ledger);
  const posts = (summary.posts || []).map(analyzePostFunnel);
  const totals = posts.reduce((acc, post) => ({
    views: acc.views + post.metrics.views,
    interactions: acc.interactions + post.interactions,
    profileClicks: acc.profileClicks + post.metrics.profileClicks,
    follows: acc.follows + post.metrics.follows,
    bookmarks: acc.bookmarks + post.metrics.bookmarks,
    replies: acc.replies + post.metrics.replies,
    reposts: acc.reposts + post.metrics.reposts,
    quotes: acc.quotes + post.metrics.quotes,
    likes: acc.likes + post.metrics.likes,
  }), emptyTotals());
  const rates = funnelRates(totals);
  const status = funnelStatus({ posts, totals });

  return {
    generatedFrom: summary,
    status,
    totals,
    rates,
    bottleneck: bottleneckFor(status),
    posts: posts.sort((a, b) => b.score - a.score || b.metrics.follows - a.metrics.follows),
    nextActions: nextActionsFor(status, totals),
  };
}

export function formatGrowthFunnelMarkdown(ledger) {
  const funnel = buildGrowthFunnel(ledger);
  const postLines = funnel.posts.length
    ? funnel.posts.slice(0, 10).map(formatPostLine).join('\n')
    : '- No posts recorded yet.';
  const actionLines = funnel.nextActions.map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`).join('\n');

  return `# X Growth Funnel

Status: ${funnel.status}
Bottleneck: ${funnel.bottleneck}

## Totals

- Views: ${funnel.totals.views}
- Interactions: ${funnel.totals.interactions}
- Profile clicks: ${funnel.totals.profileClicks}
- Follows: ${funnel.totals.follows}
- Replies: ${funnel.totals.replies}
- Reposts: ${funnel.totals.reposts}
- Quotes: ${funnel.totals.quotes}
- Bookmarks: ${funnel.totals.bookmarks}
- Likes: ${funnel.totals.likes}

## Rates

- Interaction / view: ${formatPercent(funnel.rates.interactionPerView)}
- Profile click / view: ${formatPercent(funnel.rates.profileClickPerView)}
- Profile click / interaction: ${formatPercent(funnel.rates.profileClickPerInteraction)}
- Follow / profile click: ${formatPercent(funnel.rates.followPerProfileClick)}
- Follow / view: ${formatPercent(funnel.rates.followPerView)}

## Posts

${postLines}

## Next Actions

${actionLines}
`;
}

function analyzePostFunnel(post) {
  const metrics = normalizePostMetrics(post.metrics || {});
  const interactions = interactionTotal(metrics);
  const rates = funnelRates({
    views: metrics.views,
    interactions,
    profileClicks: metrics.profileClicks,
    follows: metrics.follows,
  });

  return {
    id: post.id,
    articleSlug: post.articleSlug,
    variant: post.variant,
    url: post.url,
    metrics,
    interactions,
    score: postScore(metrics),
    rates,
    bottleneck: postBottleneck({ metrics, interactions }),
  };
}

function postBottleneck({ metrics, interactions }) {
  if (!metrics.views) return 'needs_view_data';
  if (!interactions) return 'hook_or_image_not_earning_interactions';
  if (metrics.follows) return 'converting';
  if (!metrics.profileClicks) return 'no_profile_click_handoff';
  return 'profile_clicks_not_converting';
}

function funnelStatus({ posts, totals }) {
  if (!posts.length) return 'needs_published_posts';
  if (!totals.views) return 'needs_view_data';
  if (!totals.interactions) return 'needs_interaction';
  if (totals.follows) return 'converting';
  if (!totals.profileClicks) return 'needs_profile_clicks';
  return 'needs_follow_conversion';
}

function bottleneckFor(status) {
  return {
    needs_published_posts: 'No confirmed X posts are recorded.',
    needs_view_data: 'Published posts do not have view metrics yet.',
    needs_interaction: 'Posts are getting views but no meaningful interactions.',
    needs_profile_clicks: 'Posts are not pushing readers to inspect the account.',
    needs_follow_conversion: 'Profile visits or post interest are not turning into follows.',
    converting: 'The funnel has follows; optimize around the strongest post and variant.',
  }[status] || 'Unknown funnel state.';
}

function nextActionsFor(status, totals) {
  const commonCapture = {
    priority: 'P1',
    action: 'Keep capturing views, profile clicks, follows, bookmarks, replies, reposts, and quotes after each confirmed post.',
    reason: 'The funnel only works when each stage has current data.',
  };

  if (status === 'needs_published_posts') {
    return [{
      priority: 'P0',
      action: 'Publish the first confirmed X Article + image-backed post and mark the URL.',
      reason: 'No funnel exists until at least one public post is recorded.',
    }];
  }
  if (status === 'needs_view_data') {
    return [{
      priority: 'P0',
      action: 'Copy visible analytics for each published post into the local post-text files and rerun metrics capture.',
      reason: 'Published posts exist, but view counts are missing.',
    }];
  }
  if (status === 'needs_interaction') {
    return [
      {
        priority: 'P0',
        action: 'Rewrite the first line and image promise before publishing similar posts again.',
        reason: `${totals.views} views produced zero recorded interactions.`,
      },
      commonCapture,
    ];
  }
  if (status === 'needs_profile_clicks') {
    return [
      {
        priority: 'P0',
        action: 'Make the X Article and short post give a clearer reason to inspect the profile.',
        reason: `${totals.interactions} interactions produced zero profile clicks.`,
      },
      commonCapture,
    ];
  }
  if (status === 'needs_follow_conversion') {
    return [
      {
        priority: 'P0',
        action: 'Strengthen the profile promise and pinned post before scaling more distribution.',
        reason: `${totals.profileClicks} profile clicks produced zero recorded follows.`,
      },
      commonCapture,
    ];
  }
  return [
    {
      priority: 'P1',
      action: 'Double down on the post/variant with the strongest follow-per-view or follow-per-profile-click signal.',
      reason: `${totals.follows} follows are recorded in the funnel.`,
    },
    commonCapture,
  ];
}

function funnelRates(totals) {
  return {
    interactionPerView: safeRate(totals.interactions, totals.views),
    profileClickPerView: safeRate(totals.profileClicks, totals.views),
    profileClickPerInteraction: safeRate(totals.profileClicks, totals.interactions),
    followPerProfileClick: safeRate(totals.follows, totals.profileClicks),
    followPerView: safeRate(totals.follows, totals.views),
  };
}

function emptyTotals() {
  return {
    views: 0,
    interactions: 0,
    profileClicks: 0,
    follows: 0,
    bookmarks: 0,
    replies: 0,
    reposts: 0,
    quotes: 0,
    likes: 0,
  };
}

function formatPostLine(post) {
  return `- ${post.id}: score ${post.score}, views ${post.metrics.views}, interactions ${post.interactions}, profile clicks ${post.metrics.profileClicks}, follows ${post.metrics.follows}, bottleneck ${post.bottleneck}`;
}

function safeRate(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}
