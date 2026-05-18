import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { runSafeAutomationCycle } from './automation.mjs';
import { runPostPublishMetricsCycle } from './metricsCycle.mjs';
import { readJson } from './queue.mjs';
import {
  buildGrowthExperimentPlan,
  writeGrowthExperimentPlan,
} from './experimentPlan.mjs';

const DEFAULT_QUEUE_PATH = 'data/social-growth/queue.json';
const DEFAULT_PACKAGE_DIR = 'data/social-growth/packages';
const DEFAULT_DAILY_REPORT_PATH = 'data/social-growth/daily-run.md';
const DEFAULT_DAILY_BRIEF_PATH = 'data/social-growth/daily-brief.md';
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
const DEFAULT_FUNNEL_PATH = 'data/social-growth/funnel.md';
const DEFAULT_EXPERIMENT_PLAN_PATH = 'data/social-growth/experiment-plan.md';
const DEFAULT_SCHEDULED_REPORT_PATH = 'data/social-growth/scheduled-run.md';
const DEFAULT_IMAGE_BRIEF_DIR = 'data/social-growth/image-briefs';
const DEFAULT_IMAGE_BACKLOG_PATH = 'data/social-growth/image-backlog.md';
const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_X_PUBLISH_PREP_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_PUBLISH_CONFIRMATION_PATH = 'data/social-growth/publish-confirmation.md';
const DEFAULT_LAUNCH_WINDOW_PATH = 'data/social-growth/launch-window.md';
const DEFAULT_BROWSER_READINESS_PATH = 'data/social-growth/browser-readiness.md';
const DEFAULT_BROWSER_PROBE_PATH = 'data/social-growth/browser-probe.local.json';
const DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR = 'data/social-growth/engagement-opportunities';
const DEFAULT_ENGAGEMENT_PLAN_PATH = 'data/social-growth/engagement-plan.md';
const DEFAULT_ENGAGEMENT_SEARCH_PATH = 'data/social-growth/engagement-search.md';

export async function runScheduledGrowthLoop({
  articles,
  now = new Date(),
  day = 1,
  slot = 1,
  queuePath = DEFAULT_QUEUE_PATH,
  packageOutDir = DEFAULT_PACKAGE_DIR,
  dailyReportPath = DEFAULT_DAILY_REPORT_PATH,
  dailyBriefPath = DEFAULT_DAILY_BRIEF_PATH,
  weeklyPlanPath = DEFAULT_WEEKLY_PLAN_PATH,
  ledgerPath = DEFAULT_LEDGER_PATH,
  metricsPath = DEFAULT_METRICS_PATH,
  statusPath = DEFAULT_STATUS_PATH,
  preflightPath = DEFAULT_PREFLIGHT_PATH,
  profileTextPath = DEFAULT_PROFILE_TEXT_PATH,
  postTextDir = DEFAULT_POST_TEXT_DIR,
  profileAuditPath = DEFAULT_PROFILE_AUDIT_PATH,
  profileUpdatePath = DEFAULT_PROFILE_UPDATE_PATH,
  publicActionChecklistPath = '',
  automationReportPath = DEFAULT_AUTOMATION_REPORT_PATH,
  metricsCyclePath = DEFAULT_METRICS_CYCLE_PATH,
  growthReportPath = DEFAULT_GROWTH_REPORT_PATH,
  recommendationsPath = DEFAULT_RECOMMENDATIONS_PATH,
  funnelPath = DEFAULT_FUNNEL_PATH,
  experimentPlanPath = DEFAULT_EXPERIMENT_PLAN_PATH,
  scheduledReportPath = DEFAULT_SCHEDULED_REPORT_PATH,
  imageBriefDir = DEFAULT_IMAGE_BRIEF_DIR,
  imageBacklogPath = DEFAULT_IMAGE_BACKLOG_PATH,
  imageDir = DEFAULT_IMAGE_DIR,
  xPublishPrepPath = DEFAULT_X_PUBLISH_PREP_PATH,
  publishConfirmationPath = DEFAULT_PUBLISH_CONFIRMATION_PATH,
  launchWindowPath = DEFAULT_LAUNCH_WINDOW_PATH,
  browserReadinessPath = DEFAULT_BROWSER_READINESS_PATH,
  browserProbePath = DEFAULT_BROWSER_PROBE_PATH,
  profileDiagnosticsPath = '',
  profileDiagnosticsIncludeSystemChrome = false,
  profileDiagnosticsExtraDirs = [],
  loginHandoffPath = '',
  engagementOpportunityDir = DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR,
  engagementCaptureTemplatePath = join(engagementOpportunityDir, '_capture-template.md'),
  engagementPlanPath = DEFAULT_ENGAGEMENT_PLAN_PATH,
  engagementSearchPath = DEFAULT_ENGAGEMENT_SEARCH_PATH,
  engagementLimit = 5,
  xSkillDir,
  xBunCommand,
  xProfileDir,
  xProfileDirectory,
  publishMode,
  browserProbe = {},
  preferReadyImage = true,
  packageLimit = 3,
  weeklyDays = 7,
  weeklyPostsPerDay = 3,
  queueOptions = {},
  env = process.env,
} = {}) {
  const generatedAt = toIsoString(now);
  const resolvedPublicActionChecklistPath = publicActionChecklistPath
    || join(dirname(automationReportPath), 'public-action-checklist.md');
  const automation = await runSafeAutomationCycle({
    articles,
    now,
    day,
    slot,
    queuePath,
    packageOutDir,
    dailyReportPath,
    dailyBriefPath,
    weeklyPlanPath,
    ledgerPath,
    metricsPath,
    statusPath,
    preflightPath,
    profileTextPath,
    postTextDir,
    profileAuditPath,
    profileUpdatePath,
    publicActionChecklistPath: resolvedPublicActionChecklistPath,
    automationReportPath,
    imageBriefDir,
    imageBacklogPath,
    imageDir,
    xPublishPrepPath,
    publishConfirmationPath,
    launchWindowPath,
    browserReadinessPath,
    browserProbePath,
    profileDiagnosticsPath,
    profileDiagnosticsIncludeSystemChrome,
    profileDiagnosticsExtraDirs,
    loginHandoffPath,
    engagementOpportunityDir,
    engagementCaptureTemplatePath,
    engagementPlanPath,
    engagementSearchPath,
    engagementLimit,
    xSkillDir,
    xBunCommand,
    xProfileDir,
    xProfileDirectory,
    publishMode,
    browserProbe,
    preferReadyImage,
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
    funnelPath,
    now,
    snapshot: true,
  });
  const queue = await readJson(queuePath);
  const ledger = await readJson(ledgerPath);
  const manualPublishUrls = await summarizeManualPublishUrls(automation.paths.manualPublishUrlTemplate);
  const experimentPlan = buildGrowthExperimentPlan({
    queue,
    ledger,
    now,
    selectedId: automation.selected?.id,
  });
  await writeGrowthExperimentPlan(experimentPlan, experimentPlanPath);
  const result = {
    generatedAt,
    status: scheduledStatus(automation.status, metrics.status, manualPublishUrls),
    selected: automation.selected,
    automation: {
      status: automation.status,
      blockers: automation.blockers,
      profileConversion: automation.profileConversion,
      publishConfirmation: automation.publishConfirmation,
      browserReadiness: automation.browserReadiness,
      profileDiagnostics: automation.profileDiagnostics,
      loginHandoff: automation.loginHandoff,
      launchWindow: automation.launchWindow,
      engagement: automation.engagement,
      manualPublishKits: automation.manualPublishKits,
      publicActionChecklist: automation.publicActionChecklist,
      manualPublishUrls,
      experimentPlan: {
        status: experimentPlan.status,
        experiments: experimentPlan.experiments.length,
        metricToMove: experimentPlan.algorithmLens.metricToMove,
      },
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
      funnel: funnelPath,
      experimentPlan: experimentPlanPath,
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
  const profileIssues = result.automation.profileConversion?.issues?.length
    ? result.automation.profileConversion.issues.map((issue) => `- ${issue}`).join('\n')
    : '- No profile conversion issues.';
  const confirmationIssues = result.automation.publishConfirmation?.contentIssues?.length
    ? result.automation.publishConfirmation.contentIssues.map((issue) => `- ${issue}`).join('\n')
    : '- No publish confirmation copy issues.';

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
- Daily brief: \`${result.paths.dailyBrief}\`
- Status dashboard: \`${result.paths.status}\`
- Preflight: \`${result.paths.preflight}\`
- Image backlog: \`${result.paths.imageBacklog || 'not generated'}\`
- X publish prep: \`${result.paths.xPublishPrep}\`
- Publish confirmation: \`${result.paths.publishConfirmation}\`
- Launch window: \`${result.paths.launchWindow || 'not generated'}\`
- Browser readiness: \`${result.paths.browserReadiness}\`
- Browser probe state: \`${result.paths.browserProbe}\`
- X profile diagnostics: \`${result.paths.profileDiagnostics || 'not generated'}\`
- X login handoff: \`${result.paths.loginHandoff || 'not generated'}\`
- Engagement search: \`${result.paths.engagementSearch}\`
- Engagement capture template: \`${result.paths.engagementCaptureTemplate}\`
- Engagement plan: \`${result.paths.engagementPlan}\`
- Manual publish kits: \`${result.paths.manualPublishKitIndex}\`
- Profile diagnostics recommendations: ${result.automation.profileDiagnostics?.recommendations ?? 'unknown'}
- Login handoff status: ${result.automation.loginHandoff?.status || 'unknown'}
- Launch window status: ${result.automation.launchWindow?.status || 'unknown'}
- Public action checklist: \`${result.paths.publicActionChecklist || 'not generated'}\`
- Engagement search status: ${result.automation.engagement?.searchStatus || 'unknown'}
- Engagement capture template status: ${result.automation.engagement?.captureTemplateStatus || 'unknown'}
- Engagement capture targets: ${result.automation.engagement?.captureTargets ?? 'unknown'}
- Engagement status: ${result.automation.engagement?.status || 'unknown'}
- Ready reply candidates: ${result.automation.engagement?.readyCandidates ?? 'unknown'}
- Manual publish kits ready: ${result.automation.manualPublishKits?.readyKits ?? 'unknown'}/${result.automation.manualPublishKits?.totalSlots ?? 'unknown'}
- Public actions pending confirmation: ${result.automation.publicActionChecklist?.actionCount ?? 'unknown'}
- Manual publish URLs filled: ${result.automation.manualPublishUrls?.filled ?? 'unknown'}/${result.automation.manualPublishUrls?.total ?? 'unknown'}

Blockers:

${blockers}

## Profile Conversion

- Status: ${result.automation.profileConversion?.status || 'unknown'}
- Issues: ${result.automation.profileConversion?.failedChecks ?? 'unknown'}

${profileIssues}

## Publish Confirmation

- Status: ${result.automation.publishConfirmation?.status || 'unknown'}
- Content review: ${result.automation.publishConfirmation?.contentReviewStatus || 'unknown'}
- Content issues: ${result.automation.publishConfirmation?.contentIssues?.length ?? 'unknown'}
- Packet: \`${result.paths.publishConfirmation}\`

${confirmationIssues}

## Browser Readiness

- Status: ${result.automation.browserReadiness?.status || 'unknown'}
- Blockers: ${result.automation.browserReadiness?.blockers?.length ?? 'unknown'}
- Report: \`${result.paths.browserReadiness}\`

## Human Gate

${humanGate(result)}

## Metrics

- Status: ${result.metrics.status}
- Followers: ${result.metrics.followers || 'missing'}
- Published posts: ${result.metrics.publishedPosts}
- Captured post texts: ${result.metrics.capturedPostTexts}
- Metrics cycle: \`${result.paths.metricsCycle}\`
- Growth report: \`${result.paths.growthReport}\`
- Recommendations: \`${result.paths.recommendations}\`
- Funnel report: \`${result.paths.funnel}\`
- Experiment plan: \`${result.paths.experimentPlan}\`

## Experiment Plan

- Status: ${result.automation.experimentPlan?.status || 'unknown'}
- Experiments: ${result.automation.experimentPlan?.experiments ?? 'unknown'}
- Metric to move: ${result.automation.experimentPlan?.metricToMove || 'unknown'}

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

function scheduledStatus(automationStatus, metricsStatus, manualPublishUrls = null) {
  if (manualPublishUrls?.filled > 0 && metricsStatus === 'needs_published_posts') {
    return 'needs_post_publish_recovery';
  }
  if (automationStatus === 'ready_for_browser_confirmation') {
    return 'ready_for_browser_confirmation';
  }
  if (automationStatus === 'needs_copy_review') {
    return automationStatus;
  }
  if (
    automationStatus?.startsWith('needs_chrome_')
    || automationStatus === 'needs_x_login'
    || automationStatus === 'needs_media_upload_permission'
    || automationStatus === 'needs_thread_fallback'
  ) {
    return automationStatus;
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
  if (result.automation.manualPublishUrls?.filled > 0 && result.metrics.status === 'needs_published_posts') {
    return `Run the local batch recovery command before doing more browser work: ${result.automation.manualPublishUrls.recoveryCommand}`;
  }
  if (result.automation.browserReadiness?.status === 'needs_chrome_extension_reconnect') {
    return 'Confirm opening a fresh Chrome window for the selected profile, then rerun browser readiness before preparing the thread.';
  }
  if (result.automation.browserReadiness?.status === 'needs_media_upload_permission') {
    return 'Fix the media upload path before opening the final thread handoff; the first post needs the generated image attached.';
  }
  if (result.automation.browserReadiness?.status === 'needs_x_login') {
    return `Read ${result.paths.loginHandoff || result.paths.profileDiagnostics || 'the X login handoff'} for the exact recovery command. If diagnostics says the normal Chrome profile dir is locked without CDP, close normal Chrome before rerunning login-recovery with the listed --xProfileDir/--xProfileDirectory pair; otherwise log into the publishing Chrome profile and rerun browser readiness.`;
  }
  if (result.automation.status === 'needs_copy_review') {
    return 'Run the X technical sharing brief and apply a copy override before opening Chrome for browser confirmation.';
  }
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

function humanGate(result) {
  const lines = [
    `- Publish confirmation packet: ${result.automation.publishConfirmation?.status || 'unknown'}`,
    `- Manual publish kits ready: ${result.automation.manualPublishKits?.readyKits ?? 'unknown'}/${result.automation.manualPublishKits?.totalSlots ?? 'unknown'}`,
    `- Manual publish URLs filled: ${result.automation.manualPublishUrls?.filled ?? 'unknown'}/${result.automation.manualPublishUrls?.total ?? 'unknown'}`,
    `- Metrics state: ${result.metrics.status}`,
    '- Public-action boundary: every publish, media upload, reply, like, repost, follow, profile edit, and pin still requires action-time confirmation in Chrome.',
  ];

  if (result.automation.manualPublishUrls?.filled > 0 && result.metrics.status === 'needs_published_posts') {
    lines.push(`- Current local action: run \`${result.automation.manualPublishUrls.recoveryCommand}\` before more browser work.`);
  } else if (result.automation.browserReadiness?.status === 'needs_x_login') {
    lines.push(`- Current human action: log into @Clean993 through \`${result.paths.loginHandoff || 'data/social-growth/login-handoff.md'}\`, then rerun the safe scheduled check.`);
  } else if (result.automation.browserReadiness?.status === 'needs_media_upload_permission') {
    lines.push(`- Current human action: fix media upload readiness in \`${result.paths.browserReadiness}\` before preparing the first image-backed post.`);
  } else if (result.automation.status === 'ready_for_browser_confirmation') {
    lines.push(`- Current human action: review \`${result.paths.publishConfirmation}\` and stop before the first public Chrome action.`);
  } else if (result.metrics.status === 'needs_published_posts') {
    lines.push('- Current human action: publish only after confirmation, then record the public X URL so metrics can start.');
  } else if (result.metrics.status === 'needs_post_metrics_capture') {
    lines.push('- Current human action: capture visible post metrics text for published URLs, then rerun the safe scheduled check.');
  } else if (result.metrics.status === 'snapshotted') {
    lines.push(`- Current human action: read \`${result.paths.recommendations}\` before selecting the next package.`);
  } else {
    lines.push('- Current human action: follow the next action below.');
  }

  return lines.join('\n');
}

async function summarizeManualPublishUrls(filePath) {
  const fallback = {
    status: 'missing',
    path: filePath || '',
    total: 0,
    filled: 0,
    pending: 0,
    filledItems: [],
    recoveryCommand: '',
  };
  if (!filePath) return fallback;

  let template;
  try {
    template = await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }

  const items = template.items || [];
  const filledItems = items.filter((item) => item.url);
  return {
    status: template.status || (filledItems.length ? 'ready_for_recovery' : 'ready_for_url_capture'),
    path: filePath,
    total: items.length,
    filled: filledItems.length,
    pending: items.length - filledItems.length,
    filledItems: filledItems.map((item) => ({
      slot: item.slot,
      id: item.id,
      url: item.url,
    })),
    recoveryCommand: `npm run social:post-publish-recovery-batch -- --input ${shellQuote(filePath)} --queue data/social-growth/queue.json --metrics data/social-growth/posts.local.json --reply-out-dir data/social-growth/thread-replies --launch-window-dir data/social-growth/launch-windows`,
  };
}

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
