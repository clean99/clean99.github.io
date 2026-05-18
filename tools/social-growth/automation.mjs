import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { runDailyGrowthPlan } from './daily.mjs';
import {
  buildDailyExecutionBrief,
  writeDailyExecutionBrief,
} from './dailyBrief.mjs';
import {
  buildBrowserReadiness,
  hasBrowserProbeValues,
  mergeBrowserProbe,
  readBrowserProbe,
  writeBrowserProbe,
  writeBrowserReadiness,
} from './browserReadiness.mjs';
import {
  buildImageBrief,
  imageBriefPath,
  writeImageBrief,
} from './imageBrief.mjs';
import {
  buildImageBacklog,
  writeImageBacklog,
} from './imageBacklog.mjs';
import {
  buildEngagementCaptureTemplate,
  buildEngagementPlan,
  buildEngagementSearchPlan,
  readEngagementOpportunityTexts,
  writeEngagementCaptureTemplate,
  writeEngagementPlan,
  writeEngagementSearchPlan,
} from './engagement.mjs';
import { readJson } from './queue.mjs';
import {
  buildProfileAudit,
  buildProfileUpdatePackage,
  readOptionalText,
  writeProfileAudit,
  writeProfileUpdatePackage,
} from './profile.mjs';
import {
  buildGrowthStatus,
  writeGrowthStatus,
} from './status.mjs';
import {
  buildPublishPreflight,
  writePublishPreflight,
} from './preflight.mjs';
import {
  buildXPublishPrep,
  writeXPublishPrep,
} from './xPrep.mjs';
import {
  buildPublishConfirmation,
  writePublishConfirmation,
} from './publishConfirmation.mjs';
import {
  buildManualPublishKit,
  buildManualPublishKitIndex,
  buildManualPublishUrlTemplate,
  manualPublishKitIndexPath,
  manualPublishKitPath,
  manualPublishUrlTemplatePath,
  writeManualPublishKit,
  writeManualPublishKitIndex,
  writeManualPublishUrlTemplate,
} from './manualPublishKit.mjs';

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
const DEFAULT_IMAGE_BRIEF_DIR = 'data/social-growth/image-briefs';
const DEFAULT_IMAGE_BACKLOG_PATH = 'data/social-growth/image-backlog.md';
const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_X_PUBLISH_PREP_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_PUBLISH_CONFIRMATION_PATH = 'data/social-growth/publish-confirmation.md';
const DEFAULT_BROWSER_READINESS_PATH = 'data/social-growth/browser-readiness.md';
const DEFAULT_BROWSER_PROBE_PATH = 'data/social-growth/browser-probe.local.json';
const DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR = 'data/social-growth/engagement-opportunities';
const DEFAULT_ENGAGEMENT_PLAN_PATH = 'data/social-growth/engagement-plan.md';
const DEFAULT_ENGAGEMENT_SEARCH_PATH = 'data/social-growth/engagement-search.md';

export async function runSafeAutomationCycle({
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
  automationReportPath = DEFAULT_AUTOMATION_REPORT_PATH,
  imageBriefDir = DEFAULT_IMAGE_BRIEF_DIR,
  imageBacklogPath = DEFAULT_IMAGE_BACKLOG_PATH,
  imageDir = DEFAULT_IMAGE_DIR,
  xPublishPrepPath = DEFAULT_X_PUBLISH_PREP_PATH,
  publishConfirmationPath = DEFAULT_PUBLISH_CONFIRMATION_PATH,
  browserReadinessPath = DEFAULT_BROWSER_READINESS_PATH,
  browserProbePath = DEFAULT_BROWSER_PROBE_PATH,
  engagementOpportunityDir = DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR,
  engagementCaptureTemplatePath = join(engagementOpportunityDir, '_capture-template.md'),
  engagementPlanPath = DEFAULT_ENGAGEMENT_PLAN_PATH,
  engagementSearchPath = DEFAULT_ENGAGEMENT_SEARCH_PATH,
  manualPublishKitDir,
  manualPublishKitIndexOutPath,
  engagementLimit = 5,
  xSkillDir,
  xBunCommand,
  xProfileDir,
  xProfileDirectory,
  publishMode,
  browserProbe = {},
  preferReadyImage = false,
  packageLimit = 3,
  weeklyDays = 7,
  weeklyPostsPerDay = 3,
  queueOptions = {},
  env = process.env,
} = {}) {
  if (!Array.isArray(articles)) {
    throw new Error('articles array is required');
  }

  const generatedAt = toIsoString(now);
  const daily = await runDailyGrowthPlan({
    articles,
    now,
    queuePath,
    packageOutDir,
    reportPath: dailyReportPath,
    weeklyPlanPath,
    ledgerPath,
    metricsPath,
    packageLimit,
    weeklyDays,
    weeklyPostsPerDay,
    queueOptions: {
      limit: 5,
      lang: 'zh',
      ...queueOptions,
    },
  });
  const queue = await readJson(queuePath);
  const ledger = await readJson(ledgerPath);
  const profileText = await readOptionalText(profileTextPath);
  const profileAudit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt,
  });
  await writeProfileAudit(profileAudit, profileAuditPath);
  const profileUpdate = buildProfileUpdatePackage(profileAudit, { generatedAt });
  await writeProfileUpdatePackage(profileUpdate, profileUpdatePath);

  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    day,
    slot,
    now,
    imageDir,
    packageOutDir,
    env,
    ensurePackage: true,
    preferReadyImage,
  });
  await writePublishPreflight(preflight, preflightPath);

  let imageBrief = null;
  let imageBriefOutPath = null;
  if (preflight.selected?.id) {
    imageBrief = await buildImageBrief(preflight);
    imageBriefOutPath = imageBriefPath(imageBrief, imageBriefDir);
    await writeImageBrief(imageBrief, imageBriefOutPath);
  }
  const imageBacklog = await buildImageBacklog({
    queue,
    ledger,
    day,
    now,
    imageDir,
    packageOutDir,
    ensurePackage: true,
    sourcePlaceholder: '/absolute/path/to/generated.png',
    env,
  });
  await writeImageBacklog(imageBacklog, imageBacklogPath);

  const storedBrowserProbe = await readBrowserProbe(browserProbePath);
  const effectiveBrowserProbe = mergeBrowserProbe(storedBrowserProbe, browserProbe);
  if (hasBrowserProbeValues(browserProbe)) effectiveBrowserProbe.generatedAt = generatedAt;
  const effectiveProfileDirectory = xProfileDirectory || effectiveBrowserProbe.profileDirectory;

  const xPublishPrep = await buildXPublishPrep(preflight, {
    skillDir: xSkillDir,
    bunCommand: xBunCommand,
    profileDir: xProfileDir,
    profileDirectory: effectiveProfileDirectory,
    publishMode,
  });
  await writeXPublishPrep(xPublishPrep, xPublishPrepPath);
  if (hasBrowserProbeValues(browserProbe) || hasBrowserProbeValues(storedBrowserProbe)) {
    await writeBrowserProbe(effectiveBrowserProbe, browserProbePath);
  }
  const browserReadiness = buildBrowserReadiness({
    preflight,
    xPrep: xPublishPrep,
    expectedAccount: effectiveBrowserProbe.expectedAccount,
    observedAccount: effectiveBrowserProbe.observedAccount,
    chromeRunning: effectiveBrowserProbe.chromeRunning,
    extensionInstalled: effectiveBrowserProbe.extensionInstalled,
    nativeHost: effectiveBrowserProbe.nativeHost,
    extensionPipe: effectiveBrowserProbe.extensionPipe,
    loginState: effectiveBrowserProbe.loginState,
    articleAvailable: effectiveBrowserProbe.articleAvailable,
    mediaUpload: effectiveBrowserProbe.mediaUpload,
    profileDir: xProfileDir,
    profileDirectory: effectiveProfileDirectory,
    currentUrl: effectiveBrowserProbe.currentUrl,
    generatedAt,
  });
  await writeBrowserReadiness(browserReadiness, browserReadinessPath);
  const publishConfirmation = buildPublishConfirmation({
    queue,
    preflight,
    xPublishPrep,
    generatedAt,
  });
  await writePublishConfirmation(publishConfirmation, publishConfirmationPath);

  const engagementOpportunities = await readEngagementOpportunityTexts(engagementOpportunityDir);
  const engagementSearch = buildEngagementSearchPlan({
    queue,
    now,
    limit: engagementLimit,
  });
  await writeEngagementSearchPlan(engagementSearch, engagementSearchPath);
  const engagementCaptureTemplate = buildEngagementCaptureTemplate(engagementSearch, {
    maxTargets: engagementLimit,
  });
  await writeEngagementCaptureTemplate(engagementCaptureTemplate, engagementCaptureTemplatePath);
  const engagementPlan = buildEngagementPlan({
    queue,
    opportunityTexts: engagementOpportunities,
    now,
    limit: engagementLimit,
  });
  await writeEngagementPlan(engagementPlan, engagementPlanPath);

  const status = await buildGrowthStatus({
    queue,
    ledger,
    day,
    slot,
    now,
    imageDir,
    packageOutDir,
    profileText,
    publishMode,
    xProfileDir,
    xProfileDirectory,
    browserReadiness,
    env,
    ensurePackage: false,
    preferReadyImage,
  });
  await writeGrowthStatus(status, statusPath);
  const automationStatus = status.status === 'ready_for_browser_confirmation'
    && publishConfirmation.status === 'needs_copy_review'
    ? 'needs_copy_review'
    : primaryAutomationStatus(status.status, browserReadiness);

  const metrics = await readJson(metricsPath);
  const dailyBrief = await buildDailyExecutionBrief({
    queue,
    ledger,
    metrics,
    profileText,
    opportunityTexts: engagementOpportunities,
    day,
    slot,
    now,
    imageDir,
    packageOutDir,
    xSkillDir,
    xBunCommand,
    xProfileDir,
    xProfileDirectory,
    publishMode,
    browserReadiness,
    engagementLimit,
    env,
  });
  await writeDailyExecutionBrief(dailyBrief, dailyBriefPath);
  const manualPublishKits = await writeReadyManualPublishKits({
    queue,
    ledger,
    dayReadiness: dailyBrief.dayReadiness,
    now,
    imageDir,
    packageOutDir,
    xSkillDir,
    xBunCommand,
    xProfileDir,
    xProfileDirectory,
    publishMode,
    profileTextPath,
    postTextDir,
    outDir: manualPublishKitDir || join(dirname(dailyBriefPath), 'manual-publish-kits'),
    indexPath: manualPublishKitIndexOutPath,
    env,
  });

  const result = {
    generatedAt,
    status: automationStatus,
    daily,
    selected: preflight.selected,
    blockers: dedupe([
      ...preflight.blockers,
      ...xPublishPrep.blockers,
      ...browserActionBlockers(browserReadiness),
    ]),
    profileConversion: summarizeProfileConversion(profileAudit),
    publishConfirmation: summarizePublishConfirmation(publishConfirmation),
    browserReadiness: {
      status: browserReadiness.status,
      blockers: browserReadiness.blockers,
    },
    paths: {
      queue: queuePath,
      dailyReport: dailyReportPath,
      dailyBrief: dailyBriefPath,
      weeklyPlan: daily.weeklyPlanPath,
      metrics: metricsPath,
      status: statusPath,
      preflight: preflightPath,
      profileAudit: profileAuditPath,
      profileUpdate: profileUpdatePath,
      imageBrief: imageBriefOutPath,
      imageBacklog: imageBacklogPath,
      xPublishPrep: xPublishPrepPath,
      publishConfirmation: publishConfirmationPath,
      browserReadiness: browserReadinessPath,
      browserProbe: browserProbePath,
      engagementSearch: engagementSearchPath,
      engagementCaptureTemplate: engagementCaptureTemplatePath,
      engagementPlan: engagementPlanPath,
      manualPublishKitIndex: manualPublishKits.indexPath,
      manualPublishUrlTemplate: manualPublishKits.urlTemplatePath,
      automationReport: automationReportPath,
    },
    engagement: {
      status: engagementPlan.status,
      searchStatus: engagementSearch.status,
      captureTemplateStatus: engagementCaptureTemplate.status,
      captureTargets: engagementCaptureTemplate.targetCount,
      searchQueries: engagementSearch.searchCount,
      readyCandidates: engagementPlan.selectedCount,
      capturedOpportunities: engagementPlan.opportunityCount,
    },
    dailyBrief: {
      status: dailyBrief.status,
      readySlots: dailyBrief.dayReadiness.readySlots,
      totalSlots: dailyBrief.dayReadiness.totalSlots,
      actionItems: dailyBrief.actionItems.length,
    },
    imageBacklog: {
      status: imageBacklog.status,
      missingImages: imageBacklog.totals.missingImages,
      readyImages: imageBacklog.totals.readyImages,
      listedEntries: imageBacklog.totals.listedEntries,
    },
    manualPublishKits: {
      status: manualPublishKits.index.status,
      readyKits: manualPublishKits.entries.length,
      totalSlots: manualPublishKits.index.totalSlots,
      indexPath: manualPublishKits.indexPath,
      urlTemplatePath: manualPublishKits.urlTemplatePath,
    },
    boundary: 'No public X action was performed. Chrome publishing, media upload, profile edits, replies, likes, reposts, follows, and final publish clicks still require action-time confirmation.',
  };
  await writeAutomationReport(result, automationReportPath);

  return result;
}

export function formatAutomationReport(result) {
  const blockers = result.blockers.length
    ? result.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers.';
  const profileIssues = result.profileConversion?.issues?.length
    ? result.profileConversion.issues.map((issue) => `- ${issue}`).join('\n')
    : '- No profile conversion issues.';
  const confirmationIssues = result.publishConfirmation?.contentIssues?.length
    ? result.publishConfirmation.contentIssues.map((issue) => `- ${issue}`).join('\n')
    : '- No publish confirmation copy issues.';

  return `# X Growth Automation Run

Generated at: ${result.generatedAt}
Status: ${result.status}

## Selected Slot

- Queue id: ${result.selected?.id || 'none'}
- Article slug: ${result.selected?.articleSlug || 'none'}
- Variant: ${result.selected?.variant || 'none'}

## Outputs

- Queue: \`${result.paths.queue}\`
- Daily report: \`${result.paths.dailyReport}\`
- Daily brief: \`${result.paths.dailyBrief}\`
- Weekly plan: \`${result.paths.weeklyPlan || 'not generated'}\`
- Metrics template: \`${result.paths.metrics}\`
- Status: \`${result.paths.status}\`
- Preflight: \`${result.paths.preflight}\`
- Profile audit: \`${result.paths.profileAudit}\`
- Profile update package: \`${result.paths.profileUpdate}\`
- Image brief: \`${result.paths.imageBrief || 'not generated'}\`
- Image backlog: \`${result.paths.imageBacklog || 'not generated'}\`
- X publish prep: \`${result.paths.xPublishPrep}\`
- Publish confirmation: \`${result.paths.publishConfirmation}\`
- Browser readiness: \`${result.paths.browserReadiness}\`
- Browser probe state: \`${result.paths.browserProbe}\`
- Engagement search: \`${result.paths.engagementSearch}\`
- Engagement capture template: \`${result.paths.engagementCaptureTemplate}\`
- Engagement plan: \`${result.paths.engagementPlan}\`
- Manual publish kits: \`${result.paths.manualPublishKitIndex}\`
- Manual publish URL template: \`${result.paths.manualPublishUrlTemplate}\`

## Engagement

- Status: ${result.engagement.status}
- Search status: ${result.engagement.searchStatus}
- Capture template: ${result.engagement.captureTemplateStatus}
- Capture targets: ${result.engagement.captureTargets}
- Search queries: ${result.engagement.searchQueries}
- Captured opportunities: ${result.engagement.capturedOpportunities}
- Ready reply candidates: ${result.engagement.readyCandidates}

## Profile Conversion

- Status: ${result.profileConversion?.status || 'unknown'}
- Issues: ${result.profileConversion?.failedChecks ?? 'unknown'}

${profileIssues}

## Publish Confirmation

- Status: ${result.publishConfirmation?.status || 'unknown'}
- Content review: ${result.publishConfirmation?.contentReviewStatus || 'unknown'}
- Content issues: ${result.publishConfirmation?.contentIssues?.length ?? 'unknown'}
- Packet: \`${result.paths.publishConfirmation}\`

${confirmationIssues}

## Browser Readiness

- Status: ${result.browserReadiness?.status || 'unknown'}
- Blockers: ${result.browserReadiness?.blockers?.length ?? 'unknown'}
- Report: \`${result.paths.browserReadiness}\`

## Daily Brief

- Status: ${result.dailyBrief.status}
- Ready slots: ${result.dailyBrief.readySlots}/${result.dailyBrief.totalSlots}
- Action items: ${result.dailyBrief.actionItems}

## Image Backlog

- Status: ${result.imageBacklog?.status || 'unknown'}
- Images ready: ${result.imageBacklog?.readyImages ?? 'unknown'}
- Images missing: ${result.imageBacklog?.missingImages ?? 'unknown'}
- Entries listed: ${result.imageBacklog?.listedEntries ?? 'unknown'}

## Manual Publish Kits

- Status: ${result.manualPublishKits?.status || 'unknown'}
- Ready kits: ${result.manualPublishKits?.readyKits ?? 'unknown'}/${result.manualPublishKits?.totalSlots ?? 'unknown'}
- Index: \`${result.manualPublishKits?.indexPath || 'not generated'}\`
- URL template: \`${result.manualPublishKits?.urlTemplatePath || 'not generated'}\`

## Local Blockers

${blockers}

## Boundary

${result.boundary}
`;
}

export async function writeAutomationReport(result, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatAutomationReport(result).trimEnd()}\n`);
  return filePath;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function dedupe(items) {
  return [...new Set(items)];
}

function summarizeProfileConversion(profileAudit) {
  const issues = (profileAudit?.checks || [])
    .filter((check) => check.status !== 'pass')
    .map((check) => check.message);

  return {
    status: profileAudit?.status || 'unknown',
    failedChecks: issues.length,
    issues,
  };
}

function summarizePublishConfirmation(publishConfirmation) {
  return {
    status: publishConfirmation?.status || 'unknown',
    contentReviewStatus: publishConfirmation?.contentReview?.status || 'unknown',
    contentIssues: publishConfirmation?.contentReview?.issues || [],
  };
}

function browserBlockingStatus(browserReadiness) {
  if (!browserReadiness?.blockers?.length) return null;
  if (browserReadiness.status === 'needs_browser_probe') return null;
  if (browserReadiness.status === 'ready_for_browser_confirmation') return null;
  return browserReadiness.status;
}

function primaryAutomationStatus(status, browserReadiness) {
  if (status && status !== 'ready_for_browser_confirmation') return status;
  return browserBlockingStatus(browserReadiness) || status;
}

function browserActionBlockers(browserReadiness) {
  return (browserReadiness?.blockers || []).filter((blocker) => (
    !blocker.includes('Local publish preflight')
    && !blocker.includes('X publish prep')
  ));
}

async function writeReadyManualPublishKits({
  queue,
  ledger,
  dayReadiness,
  now,
  imageDir,
  packageOutDir,
  xSkillDir,
  xBunCommand,
  xProfileDir,
  xProfileDirectory,
  publishMode,
  profileTextPath,
  postTextDir,
  outDir,
  indexPath,
  urlTemplatePath,
  env,
} = {}) {
  const entries = [];
  const readySlots = (dayReadiness?.slots || [])
    .filter((slot) => slot.preflightStatus === 'ready' && slot.xPrepStatus === 'ready');

  for (const slot of readySlots) {
    const preflight = await buildPublishPreflight({
      queue,
      ledger,
      id: slot.id,
      day: dayReadiness.day,
      slot: slot.slot,
      now,
      imageDir,
      packageOutDir,
      ensurePackage: true,
      env,
    });
    const xPublishPrep = await buildXPublishPrep(preflight, {
      skillDir: xSkillDir,
      bunCommand: xBunCommand,
      profileDir: xProfileDir,
      profileDirectory: xProfileDirectory,
      publishMode: slot.publishMode || publishMode,
    });
    const confirmation = buildPublishConfirmation({
      queue,
      preflight,
      xPublishPrep,
      generatedAt: preflight.generatedAt,
    });
    const kit = buildManualPublishKit({
      confirmation,
      profileTextPath,
      postTextDir,
    });
    const kitPath = manualPublishKitPath({
      day: dayReadiness.day,
      slot: slot.slot,
      id: slot.id,
      outDir,
    });
    await writeManualPublishKit(kit, kitPath);
    entries.push({
      slot: slot.slot,
      time: slot.time,
      id: slot.id,
      status: kit.status,
      path: kitPath,
      imageAbsolutePath: kit.image.absolutePath,
      recoveryCommand: kit.recoveryCommand,
    });
  }

  const index = buildManualPublishKitIndex({
    generatedAt: dayReadiness?.generatedAt || toIsoString(now),
    day: dayReadiness?.day || 1,
    date: dayReadiness?.date || '',
    readySlots: dayReadiness?.readySlots || 0,
    totalSlots: dayReadiness?.totalSlots || 0,
    kits: entries,
    urlTemplatePath: urlTemplatePath || manualPublishUrlTemplatePath({
      day: dayReadiness?.day || 1,
      outDir,
    }),
  });
  const resolvedUrlTemplatePath = index.batchRecovery.urlTemplatePath;
  const urlTemplate = buildManualPublishUrlTemplate({
    generatedAt: dayReadiness?.generatedAt || toIsoString(now),
    day: dayReadiness?.day || 1,
    date: dayReadiness?.date || '',
    kits: entries,
  });
  await writeManualPublishUrlTemplate(urlTemplate, resolvedUrlTemplatePath);
  const resolvedIndexPath = indexPath || manualPublishKitIndexPath({
    day: index.day,
    outDir,
  });
  await writeManualPublishKitIndex(index, resolvedIndexPath);

  return {
    index,
    indexPath: resolvedIndexPath,
    urlTemplatePath: resolvedUrlTemplatePath,
    entries,
  };
}
