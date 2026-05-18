import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runSafeAutomationCycle } from './automation.mjs';
import { runPostPublishMetricsCycle } from './metricsCycle.mjs';

const DEFAULT_QUEUE_PATH = 'data/social-growth/queue.json';
const DEFAULT_PACKAGE_DIR = 'data/social-growth/packages';
const DEFAULT_DAILY_REPORT_PATH = 'data/social-growth/daily-run.md';
const DEFAULT_WEEKLY_PLAN_PATH = 'data/social-growth/weekly-plan.md';
const DEFAULT_LEDGER_PATH = 'data/social-growth/ledger.json';
const DEFAULT_METRICS_PATH = 'data/social-growth/posts.local.json';
const DEFAULT_STATUS_PATH = 'data/social-growth/status.md';
const DEFAULT_PREFLIGHT_PATH = 'data/social-growth/publish-preflight.md';
const DEFAULT_PROFILE_TEXT_PATH = 'data/social-growth/profile.local.txt';
const DEFAULT_POST_TEXT_DIR = 'data/social-growth/post-texts';
const DEFAULT_PROFILE_AUDIT_PATH = 'data/social-growth/profile-audit.md';
const DEFAULT_PROFILE_UPDATE_PATH = 'data/social-growth/profile-update.md';
const DEFAULT_AUTOMATION_REPORT_PATH = 'data/social-growth/automation-run.md';
const DEFAULT_METRICS_CYCLE_PATH = 'data/social-growth/metrics-cycle.md';
const DEFAULT_GROWTH_REPORT_PATH = 'data/social-growth/growth-report.md';
const DEFAULT_RECOMMENDATIONS_PATH = 'data/social-growth/recommendations.md';
const DEFAULT_SCHEDULED_REPORT_PATH = 'data/social-growth/scheduled-run.md';
const DEFAULT_IMAGE_BRIEF_DIR = 'data/social-growth/image-briefs';
const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_X_PUBLISH_PREP_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR = 'data/social-growth/engagement-opportunities';
const DEFAULT_ENGAGEMENT_PLAN_PATH = 'data/social-growth/engagement-plan.md';

export async function runScheduledGrowthLoop({
  articles,
  now = new Date(),
  day = 1,
  slot = 1,
  queuePath = DEFAULT_QUEUE_PATH,
  packageOutDir = DEFAULT_PACKAGE_DIR,
  dailyReportPath = DEFAULT_DAILY_REPORT_PATH,
  weeklyPlanPath = DEFAULT_WEEKLY_PLAN_PATH,
  ledgerPath = DEFAULT_LEDGER_PATH,
  metricsPath = DEFAULT_METRICS_PATH,
  statusPath = DEFAULT_STATUS_PATH,
  preflightPath = DEFAULT_PREFLIGHT_PATH,
  profileTextPath = DEFAULT_PROFILE_TEXT_PATH,
  postTextDir = DEFAULT_POST_TEXT_DIR,
  profileAuditPath = DEFAULT_PROFILE_AUDIT_PATH,
  profileUpdatePath = DEFAULT_PROFILE_UPDATE_PATH,
  automationReportPath = DEFAULT_AUTOMATION_REPORT_PATH,
  metricsCyclePath = DEFAULT_METRICS_CYCLE_PATH,
  growthReportPath = DEFAULT_GROWTH_REPORT_PATH,
  recommendationsPath = DEFAULT_RECOMMENDATIONS_PATH,
  scheduledReportPath = DEFAULT_SCHEDULED_REPORT_PATH,
  imageBriefDir = DEFAULT_IMAGE_BRIEF_DIR,
  imageDir = DEFAULT_IMAGE_DIR,
  xPublishPrepPath = DEFAULT_X_PUBLISH_PREP_PATH,
  engagementOpportunityDir = DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR,
  engagementPlanPath = DEFAULT_ENGAGEMENT_PLAN_PATH,
  engagementLimit = 5,
  xSkillDir,
  xBunCommand,
  packageLimit = 3,
  weeklyDays = 7,
  weeklyPostsPerDay = 3,
  queueOptions = {},
  env = process.env,
} = {}) {
  const generatedAt = toIsoString(now);
  const automation = await runSafeAutomationCycle({
    articles,
    now,
    day,
    slot,
    queuePath,
    packageOutDir,
    dailyReportPath,
    weeklyPlanPath,
    ledgerPath,
    metricsPath,
    statusPath,
    preflightPath,
    profileTextPath,
    profileAuditPath,
    profileUpdatePath,
    automationReportPath,
    imageBriefDir,
    imageDir,
    xPublishPrepPath,
    engagementOpportunityDir,
    engagementPlanPath,
    engagementLimit,
    xSkillDir,
    xBunCommand,
    packageLimit,
    weeklyDays,
    weeklyPostsPerDay,
    queueOptions,
    env,
  });
  const metrics = await runPostPublishMetricsCycle({
    queuePath,
    ledgerPath,
    metricsPath,
    profileTextPath,
    postTextDir,
    cycleReportPath: metricsCyclePath,
    growthReportPath,
    recommendationsPath,
    now,
    snapshot: true,
  });
  const result = {
    generatedAt,
    status: scheduledStatus(automation.status, metrics.status),
    selected: automation.selected,
    automation: {
      status: automation.status,
      blockers: automation.blockers,
      engagement: automation.engagement,
    },
    metrics: {
      status: metrics.status,
      followers: metrics.followers,
      publishedPosts: metrics.publishedPosts,
      capturedPostTexts: metrics.capturedPostTexts,
    },
    paths: {
      ...automation.paths,
      metricsCycle: metricsCyclePath,
      growthReport: growthReportPath,
      recommendations: recommendationsPath,
      scheduledReport: scheduledReportPath,
    },
    boundary: [
      automation.boundary,
      metrics.boundary,
      'This scheduled loop is safe for recurring execution because it only reads local files, prepares local artifacts, parses copied visible text, and writes reports.',
    ].join(' '),
  };

  await writeScheduledRunReport(result, scheduledReportPath);
  return result;
}

export function formatScheduledRunReport(result) {
  const blockers = result.automation.blockers.length
    ? result.automation.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers.';

  return `# Scheduled X Growth Run

Generated at: ${result.generatedAt}
Status: ${result.status}

## Selected Slot

- Queue id: ${result.selected?.id || 'none'}
- Article slug: ${result.selected?.articleSlug || 'none'}
- Variant: ${result.selected?.variant || 'none'}

## Automation

- Status: ${result.automation.status}
- Queue: \`${result.paths.queue}\`
- Status dashboard: \`${result.paths.status}\`
- Preflight: \`${result.paths.preflight}\`
- X publish prep: \`${result.paths.xPublishPrep}\`
- Engagement plan: \`${result.paths.engagementPlan}\`
- Engagement status: ${result.automation.engagement?.status || 'unknown'}
- Ready reply candidates: ${result.automation.engagement?.readyCandidates ?? 'unknown'}

Blockers:

${blockers}

## Metrics

- Status: ${result.metrics.status}
- Followers: ${result.metrics.followers || 'missing'}
- Published posts: ${result.metrics.publishedPosts}
- Captured post texts: ${result.metrics.capturedPostTexts}
- Metrics cycle: \`${result.paths.metricsCycle}\`
- Growth report: \`${result.paths.growthReport}\`
- Recommendations: \`${result.paths.recommendations}\`

## Next Action

${nextAction(result)}

## Boundary

${result.boundary}
`;
}

export async function writeScheduledRunReport(result, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatScheduledRunReport(result).trimEnd()}\n`);
  return filePath;
}

function scheduledStatus(automationStatus, metricsStatus) {
  if (automationStatus === 'ready_for_browser_confirmation') {
    return 'ready_for_browser_confirmation';
  }
  if (automationStatus?.startsWith('blocked')) {
    return automationStatus;
  }
  if (automationStatus === 'needs_candidates') {
    return automationStatus;
  }
  if (metricsStatus === 'snapshotted') {
    return 'metrics_snapshotted';
  }
  return metricsStatus || automationStatus || 'unknown';
}

function nextAction(result) {
  if (result.automation.status === 'ready_for_browser_confirmation') {
    return 'Review the prepared copy, image, and account in Chrome, then stop before every public action for confirmation.';
  }
  if (result.metrics.status === 'needs_published_posts') {
    return 'No confirmed X post URL is recorded yet. Finish copy/image review, publish only after confirmation, then mark the URL.';
  }
  if (result.metrics.status === 'needs_profile_capture') {
    return 'Copy visible @Clean993 profile text into the local profile text file, then rerun the scheduled loop.';
  }
  if (result.metrics.status === 'needs_post_metrics_capture') {
    return 'Copy visible metrics text for each published post into the local post-text directory, then rerun the scheduled loop.';
  }
  if (result.metrics.status === 'snapshotted') {
    return 'Read the recommendations and update the next publish package before the next browser-confirmed post.';
  }
  return 'Read the status dashboard and fix the highest-priority local blocker.';
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
