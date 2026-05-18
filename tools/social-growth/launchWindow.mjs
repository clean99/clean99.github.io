import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { findQueueItem } from './queue.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/launch-window.md';
const DEFAULT_QUEUE_PATH = 'data/social-growth/queue.json';
const DEFAULT_LEDGER_PATH = 'data/social-growth/ledger.json';
const DEFAULT_METRICS_PATH = 'data/social-growth/posts.local.json';
const DEFAULT_PROFILE_TEXT_PATH = 'data/social-growth/profile.local.txt';
const DEFAULT_POST_TEXT_DIR = 'data/social-growth/post-texts';
const DEFAULT_REPLY_OUT_PATH = 'data/social-growth/thread-reply-handoff.md';
const DEFAULT_CYCLE_OUT_PATH = 'data/social-growth/metrics-cycle.md';
const DEFAULT_GROWTH_REPORT_PATH = 'data/social-growth/growth-report.md';
const DEFAULT_RECOMMENDATIONS_PATH = 'data/social-growth/recommendations.md';
const DEFAULT_FUNNEL_PATH = 'data/social-growth/funnel.md';
const THREAD_URL_PLACEHOLDER = '<x-thread-url>';

const CHECKPOINTS = [
  {
    label: '+15m',
    minutes: 15,
    purpose: 'Confirm the post is visible, record the URL, complete the remaining thread replies, and capture the first impression signal.',
    decision: 'If the thread URL is missing, do not optimize copy yet; first run post-publish recovery so metrics have an anchor.',
  },
  {
    label: '+60m',
    minutes: 60,
    purpose: 'Hydrate early X signals: views, replies, reposts, bookmarks, profile visits, and follower count.',
    decision: 'If there are replies or profile visits, prepare only substantive replies; no generic engagement bait.',
  },
  {
    label: '+180m',
    minutes: 180,
    purpose: 'Decide whether the package has traction worth follow-up, or whether the next slot should carry the learning.',
    decision: 'If views exist but interaction is weak, capture the visible text and let recommendations adjust the next package.',
  },
  {
    label: '+24h',
    minutes: 1440,
    purpose: 'Write the durable snapshot that feeds variant, topic, and follower-conversion recommendations.',
    decision: 'Use this checkpoint for queue optimization, not for rewriting already published content.',
  },
];

export function buildLaunchWindowPlan({
  queue,
  id,
  xPostUrl = '',
  publishedAt = '',
  generatedAt = new Date(),
  queuePath = DEFAULT_QUEUE_PATH,
  ledgerPath = DEFAULT_LEDGER_PATH,
  metricsPath = DEFAULT_METRICS_PATH,
  profileTextPath = DEFAULT_PROFILE_TEXT_PATH,
  postTextDir = DEFAULT_POST_TEXT_DIR,
  replyOutPath = DEFAULT_REPLY_OUT_PATH,
  cycleOutPath = DEFAULT_CYCLE_OUT_PATH,
  growthReportPath = DEFAULT_GROWTH_REPORT_PATH,
  recommendationsPath = DEFAULT_RECOMMENDATIONS_PATH,
  funnelPath = DEFAULT_FUNNEL_PATH,
  account = '@Clean993',
  xProfileDir = '',
  xProfileDirectory = '',
} = {}) {
  if (!queue) throw new Error('queue is required');
  const item = findQueueItem(queue, id || firstQueueId(queue));
  const resolvedPostUrl = xPostUrl || item.xPostUrl || '';
  const resolvedPublishedAt = publishedAt || item.publishedAt || '';
  const commands = buildCommands({
    item,
    queuePath,
    ledgerPath,
    metricsPath,
    profileTextPath,
    postTextDir,
    replyOutPath,
    cycleOutPath,
    growthReportPath,
    recommendationsPath,
    funnelPath,
    account,
    xProfileDir,
    xProfileDirectory,
  });
  const checkpoints = CHECKPOINTS.map((checkpoint) => ({
    ...checkpoint,
    dueAt: resolvedPublishedAt ? addMinutesIso(resolvedPublishedAt, checkpoint.minutes) : '',
    commands: checkpointCommands(checkpoint, commands, Boolean(resolvedPostUrl)),
  }));

  return {
    generatedAt: toIsoString(generatedAt),
    status: resolvedPostUrl ? 'ready_for_early_tracking' : 'needs_public_url',
    selected: {
      id: item.id,
      articleSlug: item.articleSlug,
      variant: item.variant,
      status: item.status,
      xPostUrl: resolvedPostUrl,
      publishedAt: resolvedPublishedAt,
      followUpReplies: (item.followUpReplies || []).length,
      threadPosts: (item.threadFallback || []).length,
    },
    commands,
    checkpoints,
    boundary: 'Launch-window planning only. Reading metrics is allowed; publishing, media upload, replies, likes, reposts, follows, profile edits, and pin actions still require action-time confirmation in Chrome.',
  };
}

export function formatLaunchWindowPlanMarkdown(plan) {
  const checkpoints = plan.checkpoints.map(formatCheckpoint).join('\n\n');
  const missingUrl = plan.status === 'needs_public_url'
    ? `## Required Before Tracking

Record the confirmed public thread URL first:

\`\`\`bash
${plan.commands.recordPublished}
\`\`\`

`
    : '';

  return `# X Launch Window Plan

Generated at: ${plan.generatedAt}
Status: ${plan.status}

## Source

- Queue id: ${plan.selected.id}
- Article slug: ${plan.selected.articleSlug}
- Variant: ${plan.selected.variant}
- Queue status: ${plan.selected.status}
- X thread URL: ${plan.selected.xPostUrl || THREAD_URL_PLACEHOLDER}
- Published at: ${plan.selected.publishedAt || 'unknown'}
- Thread posts: ${plan.selected.threadPosts}
- Follow-up replies: ${plan.selected.followUpReplies}

${missingUrl}## Early Tracking Commands

Read-only browser capture:

\`\`\`bash
${plan.commands.browserMetricsCapture}
\`\`\`

Manual copied-text metrics fallback:

\`\`\`bash
${plan.commands.metricsCycle}
\`\`\`

Reply handoff after URL recovery:

\`\`\`bash
${plan.commands.replyHandoff}
\`\`\`

## Checkpoints

${checkpoints}

## Boundary

${plan.boundary}
`;
}

export async function writeLaunchWindowPlan(plan, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatLaunchWindowPlanMarkdown(plan).trimEnd()}\n`);
  return filePath;
}

function buildCommands({
  item,
  queuePath,
  ledgerPath,
  metricsPath,
  profileTextPath,
  postTextDir,
  replyOutPath,
  cycleOutPath,
  growthReportPath,
  recommendationsPath,
  funnelPath,
  account,
  xProfileDir,
  xProfileDirectory,
}) {
  const recordPublished = [
    'npm run social:post-publish-recovery --',
    `--queue ${shellQuote(queuePath)}`,
    `--ledger ${shellQuote(ledgerPath)}`,
    `--metrics ${shellQuote(metricsPath)}`,
    `--id ${shellQuote(item.id)}`,
    `--url ${THREAD_URL_PLACEHOLDER}`,
    `--reply-out ${shellQuote(replyOutPath)}`,
    '--skip-browser true',
  ].join(' ');
  const browserMetricsCapture = [
    'npm run social:browser-metrics-capture --',
    `--queue ${shellQuote(queuePath)}`,
    `--ledger ${shellQuote(ledgerPath)}`,
    `--metrics ${shellQuote(metricsPath)}`,
    `--profile-text ${shellQuote(profileTextPath)}`,
    `--post-text-dir ${shellQuote(postTextDir)}`,
    `--cycle-out ${shellQuote(cycleOutPath)}`,
    `--growth-report-out ${shellQuote(growthReportPath)}`,
    `--recommendations-out ${shellQuote(recommendationsPath)}`,
    `--funnel-out ${shellQuote(funnelPath)}`,
    `--account ${shellQuote(account)}`,
    '--continue-on-capture-error true',
    '--skip-browser false',
    xProfileDir ? `--x-profile-dir ${shellQuote(xProfileDir)}` : '',
    xProfileDirectory ? `--x-profile-directory ${shellQuote(xProfileDirectory)}` : '',
  ].filter(Boolean).join(' ');
  const metricsCycle = [
    'npm run social:metrics-cycle --',
    `--metrics ${shellQuote(metricsPath)}`,
    `--profile-text ${shellQuote(profileTextPath)}`,
    `--post-text-dir ${shellQuote(postTextDir)}`,
    `--out ${shellQuote(cycleOutPath)}`,
    `--growth-report-out ${shellQuote(growthReportPath)}`,
    `--recommendations-out ${shellQuote(recommendationsPath)}`,
    `--funnel-out ${shellQuote(funnelPath)}`,
  ].join(' ');
  const replyHandoff = `Open ${replyOutPath} after post-publish recovery. Stop before every public Reply click.`;

  return {
    recordPublished,
    browserMetricsCapture,
    metricsCycle,
    replyHandoff,
  };
}

function checkpointCommands(checkpoint, commands, hasPostUrl) {
  if (!hasPostUrl && checkpoint.minutes === 15) return [commands.recordPublished, commands.metricsCycle];
  if (checkpoint.minutes === 15) return [commands.browserMetricsCapture, commands.replyHandoff];
  if (checkpoint.minutes === 60) return [commands.browserMetricsCapture, commands.metricsCycle];
  if (checkpoint.minutes === 180) return [commands.browserMetricsCapture, commands.metricsCycle];
  return [commands.browserMetricsCapture, commands.metricsCycle];
}

function formatCheckpoint(checkpoint) {
  const due = checkpoint.dueAt ? ` (${checkpoint.dueAt})` : '';
  const commands = checkpoint.commands.map((command) => `\`\`\`bash\n${command}\n\`\`\``).join('\n\n');
  return `### ${checkpoint.label}${due}

- Purpose: ${checkpoint.purpose}
- Decision rule: ${checkpoint.decision}

${commands}`;
}

function firstQueueId(queue) {
  const item = queue.items?.[0];
  if (!item) throw new Error('queue has no items');
  return item.id;
}

function addMinutesIso(value, minutes) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '';
  return new Date(timestamp + Number(minutes) * 60000).toISOString();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
