import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { summarizeGrowthLedger } from './metrics.mjs';
import { buildWeeklyExecutionPlan } from './schedule.mjs';
import { validateQueue } from './validation.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/goal-audit.md';

export function buildGoalAudit({
  articles = [],
  queue = null,
  ledger = null,
  metrics = null,
  recommendationDocText = '',
  statusText = '',
  publicActionChecklistText = '',
  browserReadinessText = '',
  manualPublishUrls = null,
  generatedAt = new Date(),
} = {}) {
  const now = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const validation = queue ? validateQueue(queue) : null;
  const summary = ledger ? summarizeGrowthLedger(ledger) : null;
  const weeklyPlan = queue && ledger ? buildWeeklyExecutionPlan({ queue, ledger, now }) : null;
  const metricsPosts = metrics?.posts || [];
  const queueItems = queue?.items || [];
  const publishedQueueItems = queueItems.filter((item) => item.status === 'published');
  const manualUrlItems = manualPublishUrls?.items || [];
  const filledManualUrls = manualUrlItems.filter((item) => item.url);
  const targetFollowers = Number(ledger?.target?.followersIn7Days || summary?.targetFollowers || 0);
  const followerDelta = Number(summary?.followerDelta || 0);

  const requirements = [
    requirement({
      id: 'x_recommendation_research',
      title: 'X recommendation logic is documented',
      ok: hasRecommendationResearch(recommendationDocText),
      evidence: [
        evidenceLine('document', '.agents/skills/x-growth-publishing/references/x-recommendation-system.md'),
        evidenceLine('source coverage', textIncludesAll(recommendationDocText, ['X Help', 'xai-org/x-algorithm', 'twitter/the-algorithm']) ? 'primary sources present' : 'primary sources incomplete'),
        evidenceLine('operating model', recommendationDocText.includes('Mapping To Clean993 Metrics') ? 'Clean993 metric mapping present' : 'Clean993 metric mapping missing'),
      ],
      gap: 'Update the X recommendation notes with primary sources and a Clean993 metrics mapping.',
    }),
    requirement({
      id: 'article_extraction',
      title: 'Blog articles can be extracted as growth inputs',
      ok: articles.length > 0 && articles.some((article) => article.lang === 'zh'),
      evidence: [
        evidenceLine('articles loaded', articles.length),
        evidenceLine('Chinese articles loaded', articles.filter((article) => article.lang === 'zh').length),
      ],
      gap: 'Load tracked Chinese blog posts from source/_posts before building the X queue.',
    }),
    requirement({
      id: 'candidate_generation',
      title: 'Chinese X candidates are generated and quality-gated',
      ok: validation?.status === 'pass' && queueItems.some((item) => item.channel === 'x' && item.lang === 'zh'),
      evidence: [
        evidenceLine('queue items', queueItems.length),
        evidenceLine('Chinese X items', queueItems.filter((item) => item.channel === 'x' && item.lang === 'zh').length),
        evidenceLine('quality gate', validation ? `${validation.passed}/${validation.passed + validation.failed} passed` : 'missing queue validation'),
      ],
      gap: 'Regenerate the queue and fix validation failures before publishing.',
    }),
    requirement({
      id: 'metrics_tracking',
      title: 'Metrics and follower snapshots are recorded',
      ok: Boolean(ledger?.snapshots?.length) && Boolean(metrics) && metrics.followers !== undefined,
      evidence: [
        evidenceLine('ledger snapshots', ledger?.snapshots?.length || 0),
        evidenceLine('metrics follower field', metrics?.followers === undefined ? 'missing' : metrics.followers),
        evidenceLine('metrics posts', metricsPosts.length),
      ],
      gap: 'Initialize ledger and keep posts.local.json refreshed from copied X profile/post text.',
    }),
    requirement({
      id: 'weekly_target_tracking',
      title: 'One-week follower target is tracked',
      ok: Boolean(ledger?.target?.baselineFollowers) && targetFollowers > 0 && Boolean(weeklyPlan),
      evidence: [
        evidenceLine('baseline followers', ledger?.target?.baselineFollowers ?? 'missing'),
        evidenceLine('target followers in 7 days', targetFollowers || 'missing'),
        evidenceLine('required daily pace', round(summary?.requiredDailyPace)),
        evidenceLine('planned posts', weeklyPlan?.candidates?.plannedPosts ?? 'missing'),
      ],
      gap: 'Create or repair the weekly ledger target and execution plan.',
    }),
    requirement({
      id: 'safe_automation_skeleton',
      title: 'Safe local automation skeleton exists',
      ok: textIncludesAll(statusText, ['Status:', 'Public X actions still require action-time confirmation'])
        && hasSafeAutomationChecklist(publicActionChecklistText),
      evidence: [
        evidenceLine('status report', statusText.includes('# X Growth Status') ? 'present' : 'missing'),
        evidenceLine('public action ids', publicActionChecklistText.includes('Action id:') ? 'present' : 'not pending'),
        evidenceLine('manual URL template', manualPublishUrls?.status || 'missing'),
      ],
      gap: 'Run the scheduled safe loop to regenerate status, confirmation, manual kits, and the public action checklist.',
    }),
    requirement({
      id: 'browser_confirmation_boundary',
      title: 'Browser publishing and interaction boundary is enforced',
      ok: hasConfirmationBoundary(publicActionChecklistText)
        && browserReadinessText.includes('Status:'),
      evidence: [
        evidenceLine('browser readiness', firstMatchingLine(browserReadinessText, 'Status:') || 'missing'),
        evidenceLine('pending public actions', countMatches(publicActionChecklistText, 'needs_action_time_confirmation')),
        evidenceLine('prohibited automation section', publicActionChecklistText.includes('## Prohibited Automation') ? 'present' : 'missing'),
      ],
      gap: 'Keep every public publish, upload, reply, like, repost, follow, profile edit, and pin behind action-time confirmation.',
    }),
    requirement({
      id: 'public_distribution_feedback',
      title: 'Public X distribution feedback has started',
      ok: publishedQueueItems.length > 0 && (metricsPosts.length > 0 || filledManualUrls.length > 0),
      evidence: [
        evidenceLine('published queue items', publishedQueueItems.length),
        evidenceLine('metrics posts', metricsPosts.length),
        evidenceLine('filled manual publish URLs', filledManualUrls.length),
      ],
      gap: 'Publish at least one confirmed image-backed thread/post, record its public URL, then run post-publish recovery and metrics capture.',
    }),
    requirement({
      id: 'follower_growth_goal',
      title: 'Clean993 gains 1000 followers in the target week',
      ok: targetFollowers > 0 && followerDelta >= targetFollowers,
      evidence: [
        evidenceLine('baseline followers', summary?.baselineFollowers ?? ledger?.target?.baselineFollowers ?? 'missing'),
        evidenceLine('latest followers', summary?.latestFollowers ?? 'missing'),
        evidenceLine('follower delta', followerDelta),
        evidenceLine('target delta', targetFollowers || 'missing'),
      ],
      gap: 'Follower target is not achieved yet. Continue publishing confirmed high-quality posts and capturing metrics.',
    }),
  ];

  return {
    version: 1,
    generatedAt: now.toISOString(),
    status: auditStatus(requirements),
    completion: {
      achieved: requirements.every((item) => item.status === 'proved'),
      followerDelta,
      targetFollowers,
      publishedPosts: publishedQueueItems.length || metricsPosts.length,
      filledManualPublishUrls: filledManualUrls.length,
    },
    requirements,
    nextActions: nextActions(requirements, publicActionChecklistText),
  };
}

export function formatGoalAuditMarkdown(audit) {
  const requirements = audit.requirements.map((item, index) => {
    const evidence = item.evidence.map((line) => `  - ${line}`).join('\n');
    return `### ${index + 1}. ${item.title}

- Status: ${item.status}
- Requirement id: \`${item.id}\`

Evidence:

${evidence}

Gap:

${item.gap || 'No gap.'}`;
  }).join('\n\n');
  const next = audit.nextActions.length
    ? audit.nextActions.map((item) => `- ${item}`).join('\n')
    : '- No next actions.';

  return `# X Growth Goal Audit

Generated at: ${audit.generatedAt}
Status: ${audit.status}

## Goal Completion

- Achieved: ${audit.completion.achieved}
- Follower delta: ${audit.completion.followerDelta}
- Target delta: ${audit.completion.targetFollowers || 'unknown'}
- Published posts: ${audit.completion.publishedPosts}
- Filled manual publish URLs: ${audit.completion.filledManualPublishUrls}

## Requirements

${requirements}

## Next Actions

${next}
`;
}

export async function writeGoalAudit(audit, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatGoalAuditMarkdown(audit).trimEnd()}\n`);
  return filePath;
}

function requirement({ id, title, ok, evidence, gap }) {
  return {
    id,
    title,
    status: ok ? 'proved' : 'not_proven',
    evidence,
    gap: ok ? '' : gap,
  };
}

function auditStatus(requirements) {
  if (requirements.every((item) => item.status === 'proved')) return 'complete';
  if (requirements.some((item) => item.id === 'public_distribution_feedback' && item.status !== 'proved')) {
    return 'needs_confirmed_publication';
  }
  if (requirements.some((item) => item.id === 'follower_growth_goal' && item.status !== 'proved')) {
    return 'needs_growth';
  }
  return 'needs_system_work';
}

function nextActions(requirements, publicActionChecklistText) {
  const missing = new Set(requirements.filter((item) => item.status !== 'proved').map((item) => item.id));
  const actions = [];
  if (missing.has('public_distribution_feedback')) {
    const firstPublishId = firstActionId(publicActionChecklistText, 'publish:');
    actions.push(firstPublishId
      ? `Confirm and complete public action \`${firstPublishId}\`, then record the public X URL.`
      : 'Confirm and complete the first image-backed X post/thread, then record the public X URL.');
  }
  if (missing.has('follower_growth_goal')) {
    actions.push('Keep the daily loop running: publish confirmed posts, capture metrics, and scale the variants that move follows.');
  }
  if (missing.has('browser_confirmation_boundary')) {
    actions.push('Regenerate browser readiness and public action checklist before any public X action.');
  }
  if (missing.has('candidate_generation')) {
    actions.push('Regenerate and validate the X queue before attempting another publish slot.');
  }
  return actions;
}

function hasRecommendationResearch(text) {
  return textIncludesAll(text, [
    'X Help',
    'xai-org/x-algorithm',
    'twitter/the-algorithm',
    'Mapping To Clean993 Metrics',
    'Candidate entry',
  ]);
}

function hasConfirmationBoundary(text) {
  return textIncludesAll(text, ['Prohibited Automation', 'publish a post or X Article', 'upload media'])
    && (text.includes('needs_action_time_confirmation') || text.includes('Every public X action must stop'));
}

function hasSafeAutomationChecklist(text) {
  return text.includes('Prohibited Automation')
    && (text.includes('Action id:') || text.includes('Every public X action must stop'));
}

function textIncludesAll(text, needles) {
  return needles.every((needle) => String(text || '').includes(needle));
}

function evidenceLine(label, value) {
  return `${label}: ${value}`;
}

function firstMatchingLine(text, prefix) {
  return String(text || '').split('\n').find((line) => line.includes(prefix)) || '';
}

function countMatches(text, pattern) {
  return (String(text || '').match(new RegExp(escapeRegExp(pattern), 'g')) || []).length;
}

function firstActionId(text, prefix) {
  const matches = [...String(text || '').matchAll(/Action id: `([^`]+)`/g)];
  return matches.map((match) => match[1]).find((id) => id.startsWith(prefix)) || '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function round(value) {
  if (value === undefined || value === null || value === '') return 'unknown';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Math.round(number * 10) / 10;
}
