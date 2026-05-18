import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runDailyGrowthPlan } from './daily.mjs';
import {
  buildDailyExecutionBrief,
  writeDailyExecutionBrief,
} from './dailyBrief.mjs';
import {
  buildImageBrief,
  imageBriefPath,
  writeImageBrief,
} from './imageBrief.mjs';
import {
  buildEngagementPlan,
  buildEngagementSearchPlan,
  readEngagementOpportunityTexts,
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
const DEFAULT_PROFILE_AUDIT_PATH = 'data/social-growth/profile-audit.md';
const DEFAULT_PROFILE_UPDATE_PATH = 'data/social-growth/profile-update.md';
const DEFAULT_AUTOMATION_REPORT_PATH = 'data/social-growth/automation-run.md';
const DEFAULT_IMAGE_BRIEF_DIR = 'data/social-growth/image-briefs';
const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_X_PUBLISH_PREP_PATH = 'data/social-growth/x-publish-prep.md';
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
  profileAuditPath = DEFAULT_PROFILE_AUDIT_PATH,
  profileUpdatePath = DEFAULT_PROFILE_UPDATE_PATH,
  automationReportPath = DEFAULT_AUTOMATION_REPORT_PATH,
  imageBriefDir = DEFAULT_IMAGE_BRIEF_DIR,
  imageDir = DEFAULT_IMAGE_DIR,
  xPublishPrepPath = DEFAULT_X_PUBLISH_PREP_PATH,
  engagementOpportunityDir = DEFAULT_ENGAGEMENT_OPPORTUNITY_DIR,
  engagementPlanPath = DEFAULT_ENGAGEMENT_PLAN_PATH,
  engagementSearchPath = DEFAULT_ENGAGEMENT_SEARCH_PATH,
  engagementLimit = 5,
  xSkillDir,
  xBunCommand,
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
  });
  await writePublishPreflight(preflight, preflightPath);

  let imageBrief = null;
  let imageBriefOutPath = null;
  if (preflight.selected?.id) {
    imageBrief = await buildImageBrief(preflight);
    imageBriefOutPath = imageBriefPath(imageBrief, imageBriefDir);
    await writeImageBrief(imageBrief, imageBriefOutPath);
  }
  const xPublishPrep = await buildXPublishPrep(preflight, {
    skillDir: xSkillDir,
    bunCommand: xBunCommand,
  });
  await writeXPublishPrep(xPublishPrep, xPublishPrepPath);

  const engagementOpportunities = await readEngagementOpportunityTexts(engagementOpportunityDir);
  const engagementSearch = buildEngagementSearchPlan({
    queue,
    now,
    limit: engagementLimit,
  });
  await writeEngagementSearchPlan(engagementSearch, engagementSearchPath);
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
    env,
    ensurePackage: false,
  });
  await writeGrowthStatus(status, statusPath);

  const metrics = await readJson(metricsPath);
  const dailyBrief = await buildDailyExecutionBrief({
    queue,
    ledger,
    metrics,
    profileText,
    opportunityTexts: engagementOpportunities,
    day,
    now,
    imageDir,
    packageOutDir,
    xSkillDir,
    xBunCommand,
    env,
  });
  await writeDailyExecutionBrief(dailyBrief, dailyBriefPath);

  const result = {
    generatedAt,
    status: status.status,
    daily,
    selected: preflight.selected,
    blockers: dedupe([
      ...preflight.blockers,
      ...xPublishPrep.blockers,
      ...profileAudit.checks
        .filter((check) => check.status !== 'pass')
        .map((check) => check.message),
    ]),
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
      xPublishPrep: xPublishPrepPath,
      engagementSearch: engagementSearchPath,
      engagementPlan: engagementPlanPath,
      automationReport: automationReportPath,
    },
    engagement: {
      status: engagementPlan.status,
      searchStatus: engagementSearch.status,
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
    boundary: 'No public X action was performed. Chrome publishing, media upload, profile edits, replies, likes, reposts, follows, and final publish clicks still require action-time confirmation.',
  };
  await writeAutomationReport(result, automationReportPath);

  return result;
}

export function formatAutomationReport(result) {
  const blockers = result.blockers.length
    ? result.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers.';

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
- X publish prep: \`${result.paths.xPublishPrep}\`
- Engagement search: \`${result.paths.engagementSearch}\`
- Engagement plan: \`${result.paths.engagementPlan}\`

## Engagement

- Status: ${result.engagement.status}
- Search status: ${result.engagement.searchStatus}
- Search queries: ${result.engagement.searchQueries}
- Captured opportunities: ${result.engagement.capturedOpportunities}
- Ready reply candidates: ${result.engagement.readyCandidates}

## Daily Brief

- Status: ${result.dailyBrief.status}
- Ready slots: ${result.dailyBrief.readySlots}/${result.dailyBrief.totalSlots}
- Action items: ${result.dailyBrief.actionItems}

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
