#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { loadArticles } from './articles.mjs';
import { runSafeAutomationCycle } from './automation.mjs';
import { parseXPostMetrics, parseXProfileMetrics, updateMetricsTemplateFromText } from './capture.mjs';
import { buildDistributionCandidates } from './copy.mjs';
import {
  applyCopyOverrideToQueue,
  buildCopyOverrideTemplate,
  selectCopyTarget,
  writeCopyOverrideReport,
  writeCopyOverrideTemplate,
} from './copyOverride.mjs';
import { runDailyGrowthPlan } from './daily.mjs';
import {
  buildDailyExecutionBrief,
  formatDailyExecutionBriefMarkdown,
  writeDailyExecutionBrief,
} from './dailyBrief.mjs';
import {
  buildBrowserReadiness,
  formatBrowserReadinessMarkdown,
  hasBrowserProbeValues,
  mergeBrowserProbe,
  readBrowserProbe,
  writeBrowserProbe,
  writeBrowserReadiness,
} from './browserReadiness.mjs';
import {
  buildComposeDraftResolution,
  formatComposeDraftResolutionMarkdown,
  writeComposeDraftStash,
  writeComposeDraftResolution,
} from './composeDraftResolution.mjs';
import {
  buildDayReadiness,
  formatDayReadinessMarkdown,
  writeDayReadiness,
} from './dayReadiness.mjs';
import {
  buildEngagementPlan,
  buildEngagementSearchPlan,
  formatEngagementPlanMarkdown,
  formatEngagementSearchPlanMarkdown,
  readEngagementOpportunityTexts,
  writeEngagementPlan,
  writeEngagementSearchPlan,
} from './engagement.mjs';
import {
  buildGrowthExperimentPlan,
  formatGrowthExperimentPlanMarkdown,
  writeGrowthExperimentPlan,
} from './experimentPlan.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildPublishPreflight,
  formatPublishPreflightMarkdown,
  registerPublishImage,
  writePublishPreflight,
} from './preflight.mjs';
import {
  buildProfileAudit,
  buildProfileUpdatePackage,
  formatProfileAuditMarkdown,
  formatProfileUpdatePackageMarkdown,
  readOptionalText,
  writeProfileAudit,
  writeProfileUpdatePackage,
} from './profile.mjs';
import {
  buildImageBrief,
  imageBriefPath,
  writeImageBrief,
} from './imageBrief.mjs';
import {
  buildImageBacklog,
  formatImageBacklogMarkdown,
  writeImageBacklog,
} from './imageBacklog.mjs';
import { runXGrowthDryRun } from './flowDryRun.mjs';
import { buildGrowthRecommendations, formatRecommendationsMarkdown } from './recommendations.mjs';
import { buildGrowthFunnel, formatGrowthFunnelMarkdown } from './funnel.mjs';
import {
  buildWeeklyExecutionPlan,
  formatWeeklyExecutionPlanMarkdown,
  writeWeeklyExecutionPlan,
} from './schedule.mjs';
import { runScheduledGrowthLoop } from './scheduledRun.mjs';
import {
  buildGrowthStatus,
  formatGrowthStatusMarkdown,
  writeGrowthStatus,
} from './status.mjs';
import {
  buildXPublishPrep,
  formatXPublishPrepMarkdown,
  writeXPublishPrep,
} from './xPrep.mjs';
import {
  buildThreadReplyHandoff,
  buildPublishConfirmation,
  formatPublishConfirmationMarkdown,
  writeThreadReplyHandoff,
  writePublishConfirmation,
} from './publishConfirmation.mjs';
import {
  buildManualPublishKit,
  formatManualPublishKitMarkdown,
  writeManualPublishKit,
} from './manualPublishKit.mjs';
import {
  buildXTechnicalSharingBrief,
  writeXTechnicalSharingBrief,
} from './xTechBrief.mjs';
import { formatValidationMarkdown, validateQueue } from './validation.mjs';
import {
  buildPublishQueue,
  findQueueItem,
  markQueueItemPublished,
  prepareBrowserHandoff,
  readJson,
  writePublishPackage,
  writeJson,
} from './queue.mjs';
import {
  createMetricsTemplateFromQueue,
  createLedger,
  formatMarkdownReport,
  publishedPostsFromQueue,
  updateLedgerSnapshot,
} from './ledger.mjs';
import {
  refreshMetricsTemplateFromQueue,
  runPostPublishMetricsCycle,
} from './metricsCycle.mjs';
import {
  buildXProfileDiagnostics,
  formatXProfileDiagnosticsMarkdown,
  writeXProfileDiagnostics,
} from './xProfileDiagnostics.mjs';

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));
const DEFAULT_LANG = 'zh';
await normalizeScheduleArgs(args);

if (command === 'articles') {
  const articles = await loadCliArticles(args);
  const limit = Number(args.limit || 10);
  console.log(JSON.stringify(articles.slice(0, limit), null, 2));
} else if (command === 'draft') {
  const articles = await loadCliArticles(args);
  const article = selectArticle(articles, args);
  const candidates = buildDistributionCandidates(article, {
    campaign: args.campaign,
  });
  console.log(JSON.stringify(candidates, null, 2));
} else if (command === 'report') {
  const ledgerPath = args.ledger || 'data/social-growth/example-ledger.json';
  const ledger = await readJson(ledgerPath);
  if (args.format === 'markdown') {
    console.log(formatMarkdownReport(ledger));
  } else {
    console.log(JSON.stringify(summarizeGrowthLedger(ledger), null, 2));
  }
} else if (command === 'recommend') {
  const ledgerPath = args.ledger || 'data/social-growth/ledger.json';
  const ledger = await readJson(ledgerPath);
  if (args.format === 'markdown') {
    console.log(formatRecommendationsMarkdown(ledger));
  } else {
    console.log(JSON.stringify(buildGrowthRecommendations(ledger), null, 2));
  }
} else if (command === 'funnel') {
  const ledgerPath = args.ledger || 'data/social-growth/ledger.json';
  const ledger = await readJson(ledgerPath);
  if (args.format === 'markdown') {
    console.log(formatGrowthFunnelMarkdown(ledger));
  } else {
    console.log(JSON.stringify(buildGrowthFunnel(ledger), null, 2));
  }
} else if (command === 'experiments') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const plan = buildGrowthExperimentPlan({
    queue,
    ledger,
    now: args.now ? new Date(args.now) : new Date(),
    limit: args.limit || 3,
    selectedId: args.selectedId || args.id,
  });
  if (args.out) {
    await writeGrowthExperimentPlan(plan, args.out);
    console.log(`Wrote X growth experiment plan to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatGrowthExperimentPlanMarkdown(plan));
  }
} else if (command === 'profile-audit') {
  const queue = args.queue === 'false' ? null : await readJson(args.queue || 'data/social-growth/queue.json');
  const profileText = await readOptionalText(args.profileText || 'data/social-growth/profile.local.txt');
  const audit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt: args.now ? new Date(args.now) : new Date(),
  });
  if (args.out) {
    await writeProfileAudit(audit, args.out);
    console.log(`Wrote X profile conversion audit to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(formatProfileAuditMarkdown(audit));
  }
} else if (command === 'profile-package') {
  const queue = args.queue === 'false' ? null : await readJson(args.queue || 'data/social-growth/queue.json');
  const profileText = await readOptionalText(args.profileText || 'data/social-growth/profile.local.txt');
  const audit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt: args.now ? new Date(args.now) : new Date(),
  });
  const profilePackage = buildProfileUpdatePackage(audit, {
    generatedAt: audit.generatedAt,
  });
  if (args.out) {
    await writeProfileUpdatePackage(profilePackage, args.out);
    console.log(`Wrote X profile update package to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(profilePackage, null, 2));
  } else {
    console.log(formatProfileUpdatePackageMarkdown(profilePackage));
  }
} else if (command === 'validate') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const validation = validateQueue(queue);
  if (args.format === 'markdown') {
    console.log(formatValidationMarkdown(validation));
  } else {
    console.log(JSON.stringify(validation, null, 2));
  }
} else if (command === 'plan') {
  const articles = await loadCliArticles(args);
  const limit = Number(args.limit || 5);
  const lang = args.lang || DEFAULT_LANG;
  const plan = articles
    .filter((article) => !lang || article.lang === lang)
    .slice(0, limit)
    .flatMap((article) =>
      buildDistributionCandidates(article, { campaign: args.campaign }).map((candidate) => ({
        articleSlug: candidate.articleSlug,
        lang: candidate.lang,
        variant: candidate.variant,
        targetUrl: candidate.targetUrl,
        posts: candidate.posts,
        nextAction: 'queue_for_browser_publish',
        requiresBrowserConfirmation: candidate.requiresBrowserConfirmation,
      })),
    );
  console.log(JSON.stringify(plan, null, 2));
} else if (command === 'queue') {
  const articles = await loadCliArticles(args);
  const queue = buildPublishQueue(articles, args);
  if (args.out) {
    await writeJson(args.out, queue);
    console.log(`Wrote ${queue.items.length} queue items to ${args.out}`);
  } else {
    console.log(JSON.stringify(queue, null, 2));
  }
} else if (command === 'handoff') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const item = findQueueItem(queue, args.id || queue.items[0]?.id);
  console.log(JSON.stringify(prepareBrowserHandoff(item), null, 2));
} else if (command === 'package') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const item = findQueueItem(queue, args.id || queue.items[0]?.id);
  const written = await writePublishPackage(item, {
    outDir: args.out || 'data/social-growth/packages',
  });
  console.log(JSON.stringify(written, null, 2));
} else if (command === 'daily') {
  const articles = await loadCliArticles(args);
  const result = await runDailyGrowthPlan({
    articles,
    queuePath: args.queue || 'data/social-growth/queue.json',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    reportPath: args.report || 'data/social-growth/daily-run.md',
    weeklyPlanPath: args.weeklyPlan || 'data/social-growth/weekly-plan.md',
    ledgerPath: args.ledger || 'data/social-growth/ledger.json',
    metricsPath: args.metrics || 'data/social-growth/posts.local.json',
    packageLimit: args.packageLimit || 3,
    weeklyDays: args.days || 7,
    weeklyPostsPerDay: args.postsPerDay || 3,
    now: args.now ? new Date(args.now) : new Date(),
    queueOptions: {
      limit: args.limit || 5,
      lang: args.lang || DEFAULT_LANG,
      campaign: args.campaign,
    },
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'automation') {
  const articles = await loadCliArticles(args);
  const result = await runSafeAutomationCycle({
    articles,
    now: args.now ? new Date(args.now) : new Date(),
    day: args.day || 1,
    slot: args.slot || 1,
    queuePath: args.queue || 'data/social-growth/queue.json',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    dailyReportPath: args.report || 'data/social-growth/daily-run.md',
    dailyBriefPath: args.dailyBriefOut || 'data/social-growth/daily-brief.md',
    weeklyPlanPath: args.weeklyPlan || 'data/social-growth/weekly-plan.md',
    ledgerPath: args.ledger || 'data/social-growth/ledger.json',
    metricsPath: args.metrics || 'data/social-growth/posts.local.json',
    statusPath: args.statusOut || 'data/social-growth/status.md',
    preflightPath: args.preflightOut || 'data/social-growth/publish-preflight.md',
    profileTextPath: args.profileText || 'data/social-growth/profile.local.txt',
    profileAuditPath: args.profileAuditOut || 'data/social-growth/profile-audit.md',
    profileUpdatePath: args.profileUpdateOut || 'data/social-growth/profile-update.md',
    automationReportPath: args.out || 'data/social-growth/automation-run.md',
    imageBriefDir: args.imageBriefDir || 'data/social-growth/image-briefs',
    imageBacklogPath: args.imageBacklogOut || 'data/social-growth/image-backlog.md',
    imageDir: args.imageDir || 'output/imagegen',
    xPublishPrepPath: args.xPrepOut || 'data/social-growth/x-publish-prep.md',
    publishConfirmationPath: args.confirmationOut || 'data/social-growth/publish-confirmation.md',
    browserReadinessPath: args.browserReadinessOut || 'data/social-growth/browser-readiness.md',
    browserProbePath: args.browserProbe || args.browserProbeOut || 'data/social-growth/browser-probe.local.json',
    engagementOpportunityDir: args.engagementOpportunities || 'data/social-growth/engagement-opportunities',
    engagementPlanPath: args.engagementOut || 'data/social-growth/engagement-plan.md',
    engagementSearchPath: args.engagementSearchOut || 'data/social-growth/engagement-search.md',
    engagementLimit: args.engagementLimit || 5,
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
    xProfileDir: args.xProfileDir || args.profileDir,
    xProfileDirectory: args.xProfileDirectory || args.profileDirectory,
    publishMode: args.publishMode || args.articleMode,
    browserProbe: browserProbeFromArgs(args),
    preferReadyImage: args.preferReadyImage === 'true',
    packageLimit: args.packageLimit || 3,
    weeklyDays: args.days || 7,
    weeklyPostsPerDay: args.postsPerDay || 3,
    queueOptions: {
      limit: args.limit || 5,
      lang: args.lang || DEFAULT_LANG,
      campaign: args.campaign,
    },
  });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    status: result.status,
    selected: result.selected,
    blockers: result.blockers,
    profileConversion: result.profileConversion,
    browserReadiness: result.browserReadiness,
    engagement: result.engagement,
    paths: result.paths,
  }, null, 2));
} else if (command === 'scheduled-run') {
  const articles = await loadCliArticles(args);
  const result = await runScheduledGrowthLoop({
    articles,
    now: args.now ? new Date(args.now) : new Date(),
    day: args.day || 1,
    slot: args.slot || 1,
    queuePath: args.queue || 'data/social-growth/queue.json',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    dailyReportPath: args.report || 'data/social-growth/daily-run.md',
    dailyBriefPath: args.dailyBriefOut || 'data/social-growth/daily-brief.md',
    weeklyPlanPath: args.weeklyPlan || 'data/social-growth/weekly-plan.md',
    ledgerPath: args.ledger || 'data/social-growth/ledger.json',
    metricsPath: args.metrics || 'data/social-growth/posts.local.json',
    statusPath: args.statusOut || 'data/social-growth/status.md',
    preflightPath: args.preflightOut || 'data/social-growth/publish-preflight.md',
    profileTextPath: args.profileText || 'data/social-growth/profile.local.txt',
    postTextDir: args.postTextDir || 'data/social-growth/post-texts',
    profileAuditPath: args.profileAuditOut || 'data/social-growth/profile-audit.md',
    profileUpdatePath: args.profileUpdateOut || 'data/social-growth/profile-update.md',
    automationReportPath: args.automationOut || 'data/social-growth/automation-run.md',
    metricsCyclePath: args.metricsCycleOut || 'data/social-growth/metrics-cycle.md',
    growthReportPath: args.growthReport || 'data/social-growth/growth-report.md',
    recommendationsPath: args.recommendations || 'data/social-growth/recommendations.md',
    funnelPath: args.funnelOut || 'data/social-growth/funnel.md',
    experimentPlanPath: args.experimentOut || 'data/social-growth/experiment-plan.md',
    scheduledReportPath: args.out || 'data/social-growth/scheduled-run.md',
    imageBriefDir: args.imageBriefDir || 'data/social-growth/image-briefs',
    imageBacklogPath: args.imageBacklogOut || 'data/social-growth/image-backlog.md',
    imageDir: args.imageDir || 'output/imagegen',
    xPublishPrepPath: args.xPrepOut || 'data/social-growth/x-publish-prep.md',
    publishConfirmationPath: args.confirmationOut || 'data/social-growth/publish-confirmation.md',
    browserReadinessPath: args.browserReadinessOut || 'data/social-growth/browser-readiness.md',
    browserProbePath: args.browserProbe || args.browserProbeOut || 'data/social-growth/browser-probe.local.json',
    engagementOpportunityDir: args.engagementOpportunities || 'data/social-growth/engagement-opportunities',
    engagementPlanPath: args.engagementOut || 'data/social-growth/engagement-plan.md',
    engagementSearchPath: args.engagementSearchOut || 'data/social-growth/engagement-search.md',
    engagementLimit: args.engagementLimit || 5,
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
    xProfileDir: args.xProfileDir || args.profileDir,
    xProfileDirectory: args.xProfileDirectory || args.profileDirectory,
    publishMode: args.publishMode || args.articleMode,
    browserProbe: browserProbeFromArgs(args),
    preferReadyImage: args.preferReadyImage !== 'false',
    packageLimit: args.packageLimit || 3,
    weeklyDays: args.days || 7,
    weeklyPostsPerDay: args.postsPerDay || 3,
    queueOptions: {
      limit: args.limit || 5,
      lang: args.lang || DEFAULT_LANG,
      campaign: args.campaign,
    },
  });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    status: result.status,
    selected: result.selected,
    automation: result.automation,
    metrics: result.metrics,
    paths: result.paths,
  }, null, 2));
} else if (command === 'day-readiness') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const readiness = await buildDayReadiness({
    queue,
    ledger,
    day: args.day || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
    xProfileDir: args.xProfileDir || args.profileDir,
    xProfileDirectory: args.xProfileDirectory || args.profileDirectory,
    publishMode: args.publishMode || args.articleMode,
  });
  if (args.out) {
    await writeDayReadiness(readiness, args.out);
    console.log(`Wrote X day readiness to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(readiness, null, 2));
  } else {
    console.log(formatDayReadinessMarkdown(readiness));
  }
} else if (command === 'daily-brief') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const metrics = await readOptionalJson(args.metrics || 'data/social-growth/posts.local.json');
  const profileText = await readOptionalText(args.profileText || 'data/social-growth/profile.local.txt');
  const opportunityTexts = await readEngagementOpportunityTexts(args.opportunities || 'data/social-growth/engagement-opportunities');
  const publishMode = args.publishMode || args.articleMode;
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage !== 'false',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir || args.xSkillDir,
    bunCommand: args.bunCommand || args.xBunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
  });
  const probePath = args.browserProbe || args.probeOut || 'data/social-growth/browser-probe.local.json';
  const storedProbe = await readBrowserProbe(probePath);
  const inputProbe = browserProbeFromArgs(args);
  const effectiveProbe = mergeBrowserProbe(storedProbe, inputProbe);
  if (hasBrowserProbeValues(inputProbe)) effectiveProbe.generatedAt = preflight.generatedAt;
  if (args.writeProbe !== 'false' && hasBrowserProbeValues(effectiveProbe)) {
    await writeBrowserProbe(effectiveProbe, probePath);
  }
  const browserReadiness = buildBrowserReadiness({
    preflight,
    xPrep: prep,
    ...effectiveProbe,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
    generatedAt: preflight.generatedAt,
  });
  const brief = await buildDailyExecutionBrief({
    queue,
    ledger,
    metrics,
    profileText,
    opportunityTexts,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
    xProfileDir: args.xProfileDir || args.profileDir,
    xProfileDirectory: args.xProfileDirectory || args.profileDirectory,
    publishMode,
    browserReadiness,
    engagementLimit: args.engagementLimit || args.limit || 5,
    env: process.env,
  });
  if (args.out) {
    await writeDailyExecutionBrief(brief, args.out);
    console.log(`Wrote daily X growth brief to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(brief, null, 2));
  } else {
    console.log(formatDailyExecutionBriefMarkdown(brief));
  }
} else if (command === 'engagement-plan') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const opportunities = await readEngagementOpportunityTexts(args.opportunities || 'data/social-growth/engagement-opportunities');
  const plan = buildEngagementPlan({
    queue,
    opportunityTexts: opportunities,
    now: args.now ? new Date(args.now) : new Date(),
    limit: args.limit || 5,
  });
  if (args.out) {
    await writeEngagementPlan(plan, args.out);
    console.log(`Wrote X engagement plan to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatEngagementPlanMarkdown(plan));
  }
} else if (command === 'engagement-search') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const plan = buildEngagementSearchPlan({
    queue,
    now: args.now ? new Date(args.now) : new Date(),
    limit: args.limit || 8,
    daysBack: args.daysBack || 7,
  });
  if (args.out) {
    await writeEngagementSearchPlan(plan, args.out);
    console.log(`Wrote X engagement search plan to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatEngagementSearchPlanMarkdown(plan));
  }
} else if (command === 'copy-template') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const item = selectCopyTarget(queue, ledger, {
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
  });
  const template = buildCopyOverrideTemplate(item, {
    source: args.source || 'external-writing-skill',
    contentStatus: args.contentStatus || 'ready_for_validation',
  });
  const outPath = args.out || `data/social-growth/copy-overrides/${safePathSegment(item.id)}.json`;
  await writeCopyOverrideTemplate(template, outPath);
  console.log(JSON.stringify({
    id: item.id,
    outPath,
    nextCommand: `npm run social:apply-copy -- --input ${outPath}`,
  }, null, 2));
} else if (command === 'x-tech-brief') {
  const articles = await loadCliArticles(args);
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const brief = await buildXTechnicalSharingBrief({
    articles,
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    briefPath: args.out,
    templatePath: args.templateOut,
    skillPath: args.skillPath || '.agents/skills/x-technical-sharing/SKILL.md',
  });
  const written = await writeXTechnicalSharingBrief(brief);
  console.log(JSON.stringify({
    id: brief.selected.id,
    article: brief.article?.absolutePath || null,
    briefPath: written.briefPath,
    templatePath: written.templatePath,
    nextCommand: `npm run social:apply-copy -- --input ${written.templatePath}`,
  }, null, 2));
} else if (command === 'apply-copy') {
  const queuePath = args.queue || 'data/social-growth/queue.json';
  const queue = await readJson(queuePath);
  const override = await readJson(requiredArg(args, 'input'));
  const result = applyCopyOverrideToQueue(queue, override, {
    id: args.id,
    now: args.now ? new Date(args.now) : new Date(),
    allowPublished: args.allowPublished === 'true',
  });
  const outPath = args.out || queuePath;
  const reportPath = args.report || 'data/social-growth/copy-override.md';
  const report = {
    ...result,
    generatedAt: (args.now ? new Date(args.now) : new Date()).toISOString(),
  };
  await writeJson(outPath, result.queue);
  await writeCopyOverrideReport(report, reportPath);
  console.log(JSON.stringify({
    id: result.item.id,
    queue: outPath,
    report: reportPath,
    status: result.validation.status,
    queueStatus: result.queueValidation.status,
    errors: result.validation.errors,
    warnings: result.validation.warnings,
  }, null, 2));
} else if (command === 'flow-dry-run') {
  const outPath = args.out || 'data/social-growth/dry-run/flow-dry-run.md';
  const dryRunDir = args.dryRunDir || dirnameFromPath(outPath);
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const result = await runXGrowthDryRun({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    dryRunDir,
    outPath,
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || `${dryRunDir}/packages`,
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
    contentStatus: args.contentStatus || 'paused_for_copy_refinement',
    simulatedFollowers: args.followers,
  });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    status: result.status,
    contentStatus: result.contentStatus,
    selected: result.selected,
    preflight: result.preflight,
    xPrep: result.xPrep,
    paths: result.paths,
  }, null, 2));
} else if (command === 'week') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const plan = buildWeeklyExecutionPlan({
    queue,
    ledger,
    now: args.now ? new Date(args.now) : new Date(),
    days: args.days || 7,
    postsPerDay: args.postsPerDay || 3,
    timezone: args.timezone || 'Asia/Singapore',
  });
  if (args.out) {
    await writeWeeklyExecutionPlan(plan, args.out);
    console.log(`Wrote weekly execution plan to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatWeeklyExecutionPlanMarkdown(plan));
  }
} else if (command === 'preflight') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage === 'true',
  });
  if (args.out) {
    await writePublishPreflight(preflight, args.out);
    console.log(`Wrote publish preflight to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(preflight, null, 2));
  } else {
    console.log(formatPublishPreflightMarkdown(preflight));
  }
} else if (command === 'status') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const profileText = await readOptionalText(args.profileText || 'data/social-growth/profile.local.txt');
  const publishMode = args.publishMode || args.articleMode;
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage === 'true',
    preferReadyImage: args.preferReadyImage === 'true',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
  });
  const probePath = args.browserProbe || args.probeOut || 'data/social-growth/browser-probe.local.json';
  const storedProbe = await readBrowserProbe(probePath);
  const inputProbe = browserProbeFromArgs(args);
  const effectiveProbe = mergeBrowserProbe(storedProbe, inputProbe);
  if (hasBrowserProbeValues(inputProbe)) effectiveProbe.generatedAt = preflight.generatedAt;
  if (args.writeProbe !== 'false' && hasBrowserProbeValues(effectiveProbe)) {
    await writeBrowserProbe(effectiveProbe, probePath);
  }
  const browserReadiness = buildBrowserReadiness({
    preflight,
    xPrep: prep,
    ...effectiveProbe,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
    generatedAt: preflight.generatedAt,
  });
  const status = await buildGrowthStatus({
    queue,
    ledger,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    profileText,
    publishMode,
    xProfileDir: args.xProfileDir || args.profileDir,
    xProfileDirectory: args.xProfileDirectory || args.profileDirectory,
    browserReadiness,
    ensurePackage: args.ensurePackage === 'true',
    preferReadyImage: args.preferReadyImage === 'true',
  });
  if (args.out) {
    await writeGrowthStatus(status, args.out);
    console.log(`Wrote X growth status to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(formatGrowthStatusMarkdown(status));
  }
} else if (command === 'image-brief') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage === 'true',
  });
  const brief = await buildImageBrief(preflight, {
    sourcePlaceholder: args.source || '/absolute/path/to/generated.png',
  });
  const outPath = args.out || imageBriefPath(brief);
  await writeImageBrief(brief, outPath);
  console.log(JSON.stringify({
    id: brief.selected.id,
    status: brief.status,
    outPath,
    imagePath: brief.image.outputPath,
    imageReady: brief.image.ready,
    blockers: brief.blockers,
  }, null, 2));
} else if (command === 'image-backlog') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const backlog = await buildImageBacklog({
    queue,
    ledger,
    day: args.day,
    days: args.days || 7,
    postsPerDay: args.postsPerDay || 3,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    includeReady: args.includeReady === 'true',
    limit: args.limit,
    ensurePackage: args.ensurePackage !== 'false',
    sourcePlaceholder: args.source || '/absolute/path/to/generated.png',
  });
  if (args.out) {
    await writeImageBacklog(backlog, args.out);
    console.log(`Wrote X image backlog to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(backlog, null, 2));
  } else {
    console.log(formatImageBacklogMarkdown(backlog));
  }
} else if (command === 'login-recovery') {
  const result = await runLoginRecovery(args);
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'x-profile-diagnostics') {
  const diagnostics = await buildXProfileDiagnostics({
    profileDir: args.xProfileDir || args.profileDir,
    debugPort: args.debugPort,
    generatedAt: args.now ? new Date(args.now) : new Date(),
  });
  if (args.out) {
    await writeXProfileDiagnostics(diagnostics, args.out);
    console.log(`Wrote X profile diagnostics to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(diagnostics, null, 2));
  } else {
    console.log(formatXProfileDiagnosticsMarkdown(diagnostics));
  }
} else if (command === 'browser-metrics-capture') {
  const result = await runBrowserMetricsCapture(args);
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'post-publish-recovery') {
  const result = await runPostPublishRecovery(args);
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'x-prep') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage === 'true',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode: args.publishMode || args.articleMode,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
  });
  if (args.out) {
    await writeXPublishPrep(prep, args.out);
    console.log(`Wrote X publish prep to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(prep, null, 2));
  } else {
    console.log(formatXPublishPrepMarkdown(prep));
  }
} else if (command === 'browser-readiness') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage !== 'false',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode: args.publishMode || args.articleMode,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
  });
  const probePath = args.browserProbe || args.probeOut || 'data/social-growth/browser-probe.local.json';
  const storedProbe = await readBrowserProbe(probePath);
  const inputProbe = browserProbeFromArgs(args);
  const effectiveProbe = mergeBrowserProbe(storedProbe, inputProbe);
  if (hasBrowserProbeValues(inputProbe)) effectiveProbe.generatedAt = preflight.generatedAt;
  if (args.writeProbe !== 'false' && hasBrowserProbeValues(effectiveProbe)) {
    await writeBrowserProbe(effectiveProbe, probePath);
  }
  const readiness = buildBrowserReadiness({
    preflight,
    xPrep: prep,
    ...effectiveProbe,
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
    generatedAt: preflight.generatedAt,
  });
  if (args.out) {
    await writeBrowserReadiness(readiness, args.out);
    console.log(`Wrote X browser readiness to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(readiness, null, 2));
  } else {
    console.log(formatBrowserReadinessMarkdown(readiness));
  }
} else if (command === 'compose-draft-resolution') {
  const { resolution } = await buildComposeDraftResolutionFromCli(args);
  if (args.out) {
    await writeComposeDraftResolution(resolution, args.out);
    console.log(`Wrote X compose draft resolution to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(resolution, null, 2));
  } else {
    console.log(formatComposeDraftResolutionMarkdown(resolution));
  }
} else if (command === 'compose-draft-stash') {
  const { resolution } = await buildComposeDraftResolutionFromCli(args);
  const targetPath = await writeComposeDraftStash(resolution, {
    filePath: args.out || '',
    outDir: args.outDir || 'data/social-growth/compose-drafts',
  });
  console.log(`Wrote X compose draft local stash to ${targetPath}`);
} else if (command === 'confirmation') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage !== 'false',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode: args.publishMode || args.articleMode,
    profileDir: args.xProfileDir || args.profileDir,
  });
  const packet = buildPublishConfirmation({
    queue,
    preflight,
    xPublishPrep: prep,
    generatedAt: preflight.generatedAt,
  });
  if (args.out) {
    await writePublishConfirmation(packet, args.out);
    console.log(`Wrote X publish confirmation packet to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(packet, null, 2));
  } else {
    console.log(formatPublishConfirmationMarkdown(packet));
  }
} else if (command === 'manual-publish-kit') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    ensurePackage: args.ensurePackage !== 'false',
    preferReadyImage: args.preferReadyImage !== 'false',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand,
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
    publishMode: args.publishMode || args.articleMode || 'thread_fallback',
    profileDir: args.xProfileDir || args.profileDir,
    profileDirectory: args.xProfileDirectory || args.profileDirectory,
  });
  const confirmation = buildPublishConfirmation({
    queue,
    preflight,
    xPublishPrep: prep,
    generatedAt: preflight.generatedAt,
  });
  const kit = buildManualPublishKit({
    confirmation,
    account: args.account || '@Clean993',
    profileTextPath: args.profileText || 'data/social-growth/profile.local.txt',
    postTextDir: args.postTextDir || 'data/social-growth/post-texts',
  });
  if (args.out) {
    await writeManualPublishKit(kit, args.out);
    console.log(`Wrote manual X publish kit to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(kit, null, 2));
  } else {
    console.log(formatManualPublishKitMarkdown(kit));
  }
} else if (command === 'register-image') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(args.ledger || 'data/social-growth/ledger.json');
  const result = await registerPublishImage({
    queue,
    ledger,
    sourceImage: requiredArg(args, 'source'),
    id: args.id,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'metrics-template') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const template = createMetricsTemplateFromQueue(queue, {
    date: args.date,
    followers: args.followers || '',
  });
  const outPath = args.out || 'data/social-growth/posts.local.json';
  await writeJson(outPath, template);
  console.log(`Wrote metrics template for ${template.posts.length} published posts to ${outPath}`);
} else if (command === 'capture-metrics') {
  const result = await updateMetricsTemplateFromText({
    metricsPath: args.metrics || 'data/social-growth/posts.local.json',
    outPath: args.out || args.metrics || 'data/social-growth/posts.local.json',
    profileTextPath: args.profileText,
    postTextDir: args.postTextDir,
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === 'metrics-cycle') {
  const result = await runPostPublishMetricsCycle({
    queuePath: args.queue || 'data/social-growth/queue.json',
    ledgerPath: args.ledger || 'data/social-growth/ledger.json',
    metricsPath: args.metrics || 'data/social-growth/posts.local.json',
    profileTextPath: args.profileText || 'data/social-growth/profile.local.txt',
    postTextDir: args.postTextDir || 'data/social-growth/post-texts',
    cycleReportPath: args.out || 'data/social-growth/metrics-cycle.md',
    growthReportPath: args.growthReport || 'data/social-growth/growth-report.md',
    recommendationsPath: args.recommendations || 'data/social-growth/recommendations.md',
    funnelPath: args.funnelOut || 'data/social-growth/funnel.md',
    now: args.now ? new Date(args.now) : new Date(),
    snapshot: args.snapshot !== 'false',
  });
  console.log(JSON.stringify({
    generatedAt: result.generatedAt,
    status: result.status,
    followers: result.followers,
    publishedPosts: result.publishedPosts,
    capturedPostTexts: result.capturedPostTexts,
    outputs: {
      cycleReport: result.cycleReportPath,
      growthReport: result.growthReportPath,
      recommendations: result.recommendationsPath,
      funnel: result.funnelPath,
    },
  }, null, 2));
} else if (command === 'parse-x-text') {
  const text = await readText(requiredArg(args, 'input'));
  const parsed = args.kind === 'post' ? parseXPostMetrics(text) : parseXProfileMetrics(text);
  console.log(JSON.stringify(parsed, null, 2));
} else if (command === 'mark-published') {
  const queuePath = args.queue || 'data/social-growth/queue.json';
  const metricsPath = args.metrics === 'false' ? null : (args.metrics || 'data/social-growth/posts.local.json');
  const replyOutPath = args.replyOut === 'false' ? null : args.replyOut;
  const queue = await readJson(queuePath);
  const updated = markQueueItemPublished(queue, {
    id: requiredArg(args, 'id'),
    xPostUrl: requiredArg(args, 'url'),
    xArticleUrl: args.articleUrl,
    publishedAt: args.publishedAt,
  });
  await writeJson(queuePath, updated);
  console.log(`Marked ${args.id} as published in ${queuePath}`);
  if (metricsPath) {
    const metrics = await refreshMetricsTemplateFromQueue({
      queue: updated,
      metricsPath,
      date: args.metricsDate || args.date,
    });
    console.log(`Refreshed metrics template for ${metrics.publishedPosts} published posts in ${metrics.metricsPath}`);
  }
  if (replyOutPath) {
    const replyHandoff = buildThreadReplyHandoff({
      queue: updated,
      id: args.id,
      threadUrl: args.url,
      generatedAt: args.publishedAt,
    });
    await writeThreadReplyHandoff(replyHandoff, replyOutPath);
    console.log(`Wrote thread reply handoff to ${replyOutPath}`);
  }
} else if (command === 'init-ledger') {
  const ledger = createLedger({
    startDate: args.start,
    endDate: args.end,
    baselineFollowers: requiredArg(args, 'followers'),
    followersIn7Days: args.target || 1000,
  });
  await writeJson(args.out || 'data/social-growth/ledger.json', ledger);
  console.log(JSON.stringify(summarizeGrowthLedger(ledger), null, 2));
} else if (command === 'snapshot') {
  const ledgerPath = args.ledger || 'data/social-growth/ledger.json';
  const queue = args.queue ? await readJson(args.queue) : null;
  const updated = await updateLedgerSnapshot({
    ledgerPath,
    postsFile: args.postsFile,
    snapshot: {
      date: args.date,
      followers: args.followers,
      posts: queue ? publishedPostsFromQueue(queue) : [],
    },
  });
  console.log(JSON.stringify(summarizeGrowthLedger(updated), null, 2));
} else {
  printHelp();
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith('--')) continue;

    const key = toCamelKey(token.slice(2));
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

async function normalizeScheduleArgs(options) {
  if (!isAutoDayToken(options.day)) return;
  const ledger = await readJson(options.ledger || 'data/social-growth/ledger.json');
  options.day = dayFromLedger(ledger, {
    now: options.now ? new Date(options.now) : new Date(),
    timezone: options.timezone || 'Asia/Singapore',
  });
}

function isAutoDayToken(value) {
  return ['today', 'current', 'auto'].includes(String(value || '').toLowerCase());
}

function dayFromLedger(ledger, { now = new Date(), timezone = 'Asia/Singapore' } = {}) {
  const startDate = ledger?.target?.startDate || ledger?.snapshots?.[0]?.date;
  if (!startDate) {
    throw new Error('Cannot resolve --day today because ledger has no target.startDate or first snapshot date');
  }
  const today = dateInTimezone(now, timezone);
  const offset = daysBetweenDateOnly(startDate, today);
  return Math.max(1, offset + 1);
}

function dateInTimezone(value, timezone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function daysBetweenDateOnly(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error(`Invalid date while resolving --day today: ${startDate}, ${endDate}`);
  }
  return Math.floor((end - start) / 86400000);
}

function toCamelKey(key) {
  return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function browserProbeFromArgs(options = {}) {
  const probe = {};
  if (options.account !== undefined) probe.expectedAccount = options.account;
  if (options.observedAccount !== undefined) probe.observedAccount = options.observedAccount;
  if (options.chromeRunning !== undefined) probe.chromeRunning = options.chromeRunning;
  if (options.extensionInstalled !== undefined) probe.extensionInstalled = options.extensionInstalled;
  if (options.nativeHost !== undefined) probe.nativeHost = options.nativeHost;
  if (options.extensionPipe !== undefined) probe.extensionPipe = options.extensionPipe;
  if (options.loginState !== undefined) probe.loginState = options.loginState;
  if (options.articleAvailable !== undefined) probe.articleAvailable = options.articleAvailable;
  if (options.mediaUpload !== undefined) probe.mediaUpload = options.mediaUpload;
  if (options.composeDraftText !== undefined) probe.composeDraftText = options.composeDraftText;
  if (options.xProfileDirectory !== undefined) probe.profileDirectory = options.xProfileDirectory;
  if (options.profileDirectory !== undefined) probe.profileDirectory = options.profileDirectory;
  return probe;
}

async function runLoginRecovery(options = {}) {
  const queue = await readJson(options.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(options.ledger || 'data/social-growth/ledger.json');
  const profileText = await readOptionalText(options.profileText || 'data/social-growth/profile.local.txt');
  const day = options.day || 1;
  const slot = options.slot || 1;
  const publishMode = options.publishMode || options.articleMode || 'thread_fallback';
  const probePath = options.browserProbe || options.probeOut || 'data/social-growth/browser-probe.local.json';
  const account = options.account || '@Clean993';
  const profileDir = options.xProfileDir || options.profileDir;
  const profileDirectory = options.xProfileDirectory || options.profileDirectory;
  let probeRun = {
    skipped: options.skipProbe === 'true',
    status: 'skipped',
    stdout: '',
    stderr: '',
  };

  if (options.skipProbe !== 'true') {
    probeRun = runXBrowserProbe({
      probePath,
      account,
      profileDir,
      profileDirectory,
      timeoutMs: options.timeoutMs || 30000,
    });
    if (probeRun.exitCode !== 0 && options.continueOnProbeError !== 'true') {
      throw new Error(`X browser probe failed: ${probeRun.stderr || probeRun.stdout || `exit ${probeRun.exitCode}`}`);
    }
  }

  const commonPreflight = {
    queue,
    ledger,
    id: options.id,
    day,
    slot,
    now: options.now ? new Date(options.now) : new Date(),
    imageDir: options.imageDir || 'output/imagegen',
    packageOutDir: options.packageOut || 'data/social-growth/packages',
    ensurePackage: options.ensurePackage !== 'false',
    preferReadyImage: options.preferReadyImage !== 'false',
  };
  const preflight = await buildPublishPreflight(commonPreflight);
  const prep = await buildXPublishPrep(preflight, {
    skillDir: options.skillDir,
    bunCommand: options.bunCommand,
    articleUrlPlaceholder: options.articleUrl || '<x-article-url>',
    publishMode,
    profileDir,
    profileDirectory,
  });
  const xPrepPath = options.xPrepOut || 'data/social-growth/x-publish-prep.md';
  await writeXPublishPrep(prep, xPrepPath);

  const storedProbe = await readBrowserProbe(probePath);
  const inputProbe = browserProbeFromArgs(options);
  const effectiveProbe = mergeBrowserProbe(storedProbe, inputProbe);
  if (hasBrowserProbeValues(inputProbe)) effectiveProbe.generatedAt = preflight.generatedAt;
  if (options.writeProbe !== 'false' && hasBrowserProbeValues(effectiveProbe)) {
    await writeBrowserProbe(effectiveProbe, probePath);
  }
  const readiness = buildBrowserReadiness({
    preflight,
    xPrep: prep,
    ...effectiveProbe,
    profileDir,
    profileDirectory,
    generatedAt: preflight.generatedAt,
  });
  const browserReadinessPath = options.browserReadinessOut || 'data/social-growth/browser-readiness.md';
  await writeBrowserReadiness(readiness, browserReadinessPath);

  const status = await buildGrowthStatus({
    queue,
    ledger,
    day,
    slot,
    now: options.now ? new Date(options.now) : new Date(),
    imageDir: commonPreflight.imageDir,
    packageOutDir: commonPreflight.packageOutDir,
    profileText,
    publishMode,
    xProfileDir: profileDir,
    xProfileDirectory: profileDirectory,
    browserReadiness: readiness,
    ensurePackage: options.ensurePackage === 'true',
    preferReadyImage: options.preferReadyImage === 'true',
  });
  const statusPath = options.statusOut || 'data/social-growth/status.md';
  await writeGrowthStatus(status, statusPath);

  return {
    status: status.status,
    publicActions: {
      typedText: false,
      uploadedMedia: false,
      clickedSubmit: false,
    },
    probe: {
      skipped: probeRun.skipped,
      exitCode: probeRun.exitCode ?? 0,
      status: probeRun.status,
    },
    browserReadiness: {
      status: readiness.status,
      blockers: readiness.blockers,
    },
    paths: {
      browserProbe: probePath,
      browserReadiness: browserReadinessPath,
      status: statusPath,
      xPublishPrep: xPrepPath,
    },
    next: status.nextActions[0] || null,
  };
}

function runXBrowserProbe({
  probePath,
  account,
  profileDir,
  profileDirectory,
  timeoutMs,
}) {
  const probeArgs = [
    'tools/social-growth/x-browser-cdp.mjs',
    '--probe',
    '--json',
    '--probe-out',
    probePath,
    '--account',
    account,
    '--timeout-ms',
    String(timeoutMs),
  ];
  if (profileDir) probeArgs.push('--profile', profileDir);
  if (profileDirectory) probeArgs.push('--profile-directory', profileDirectory);
  const result = spawnSync(process.execPath, probeArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch {
    parsed = null;
  }
  return {
    skipped: false,
    exitCode: result.status ?? 1,
    status: parsed?.status || 'unknown',
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function runBrowserMetricsCapture(options = {}) {
  const queuePath = options.queue || 'data/social-growth/queue.json';
  const ledgerPath = options.ledger || 'data/social-growth/ledger.json';
  const metricsPath = options.metrics || options.metricsPath || 'data/social-growth/posts.local.json';
  const profileTextPath = options.profileText || 'data/social-growth/profile.local.txt';
  const postTextDir = options.postTextDir || 'data/social-growth/post-texts';
  const account = options.account || '@Clean993';
  const profileDir = options.xProfileDir || options.profileDir;
  const profileDirectory = options.xProfileDirectory || options.profileDirectory;
  const skipBrowser = booleanOption(options.skipBrowser);
  const continueOnCaptureError = booleanOption(options.continueOnCaptureError);
  const queue = await readJson(queuePath);
  const publishedPosts = (queue.items || [])
    .filter((item) => item.status === 'published' && item.xPostUrl)
    .map((item) => ({
      id: item.id,
      url: item.xPostUrl,
    }));
  const captureRuns = [];

  if (!skipBrowser) {
    captureRuns.push(runXBrowserRead({
      url: `https://x.com/${String(account).replace(/^@/, '')}`,
      textOut: profileTextPath,
      profileDir,
      profileDirectory,
      timeoutMs: options.timeoutMs || 30000,
      label: 'profile',
    }));
    for (const post of publishedPosts) {
      captureRuns.push(runXBrowserRead({
        url: post.url,
        textOut: `${postTextDir}/${post.id}.txt`,
        profileDir,
        profileDirectory,
        timeoutMs: options.timeoutMs || 30000,
        label: post.id,
      }));
    }
    const failed = captureRuns.filter((run) => run.exitCode !== 0);
    if (failed.length && !continueOnCaptureError) {
      throw new Error(`Browser metrics capture failed: ${failed.map((run) => `${run.label}: ${run.stderr || run.stdout || run.exitCode}`).join('; ')}`);
    }
  }

  const metricsCycle = await runPostPublishMetricsCycle({
    queuePath,
    ledgerPath,
    metricsPath,
    profileTextPath,
    postTextDir,
    cycleReportPath: options.cycleOut || 'data/social-growth/metrics-cycle.md',
    growthReportPath: options.growthReportOut || 'data/social-growth/growth-report.md',
    recommendationsPath: options.recommendationsOut || 'data/social-growth/recommendations.md',
    funnelPath: options.funnelOut || 'data/social-growth/funnel.md',
    snapshot: options.snapshot !== 'false',
    now: options.now ? new Date(options.now) : new Date(),
  });

  return {
    status: metricsCycle.status,
    publicActions: {
      typedText: false,
      uploadedMedia: false,
      clickedSubmit: false,
    },
    capture: {
      skipped: skipBrowser,
      profileUrl: `https://x.com/${String(account).replace(/^@/, '')}`,
      profileTextPath,
      publishedPosts: publishedPosts.length,
      postTextDir,
      runs: captureRuns.map((run) => ({
        label: run.label,
        exitCode: run.exitCode,
        status: run.status,
        textOut: run.textOut,
      })),
    },
    metrics: {
      followers: metricsCycle.followers || '',
      publishedPosts: metricsCycle.publishedPosts,
      capturedPostTexts: metricsCycle.capturedPostTexts,
      readiness: metricsCycle.readiness,
    },
    paths: {
      metrics: metricsPath,
      cycleReport: metricsCycle.cycleReportPath,
      growthReport: metricsCycle.growthReportPath,
      recommendations: metricsCycle.recommendationsPath,
      funnel: metricsCycle.funnelPath,
    },
  };
}

async function runPostPublishRecovery(options = {}) {
  const queuePath = options.queue || 'data/social-growth/queue.json';
  const ledgerPath = options.ledger || 'data/social-growth/ledger.json';
  const metricsPath = options.metrics === 'false'
    ? null
    : (options.metrics || options.metricsPath || 'data/social-growth/posts.local.json');
  const replyOutPath = options.replyOut === 'false'
    ? null
    : (options.replyOut || 'data/social-growth/thread-reply-handoff.md');
  const xPostUrl = normalizeXStatusUrl(requiredArg(options, 'url'));
  const queue = await readJson(queuePath);
  const selected = await selectRecoveryQueueItem({
    queue,
    ledgerPath,
    id: options.id,
    day: options.day || 1,
    slot: options.slot || 1,
    now: options.now,
    imageDir: options.imageDir || 'output/imagegen',
    packageOutDir: options.packageOut || 'data/social-growth/packages',
  });
  const publishedAt = options.publishedAt || new Date().toISOString();
  const updatedQueue = markQueueItemPublished(queue, {
    id: selected.id,
    xPostUrl,
    xArticleUrl: options.articleUrl,
    publishedAt,
  });
  const metricsDate = options.metricsDate
    || options.date
    || (options.now ? new Date(options.now).toISOString().slice(0, 10) : undefined);

  await writeJson(queuePath, updatedQueue);

  const refreshedMetrics = metricsPath
    ? await refreshMetricsTemplateFromQueue({
      queue: updatedQueue,
      metricsPath,
      date: metricsDate,
    })
    : null;
  const replyHandoff = replyOutPath
    ? buildThreadReplyHandoff({
      queue: updatedQueue,
      id: selected.id,
      threadUrl: xPostUrl,
      generatedAt: publishedAt,
    })
    : null;
  if (replyHandoff) {
    await writeThreadReplyHandoff(replyHandoff, replyOutPath);
  }

  const metricsCycle = options.metricsCycle === 'false'
    ? null
    : await runBrowserMetricsCapture({
      ...options,
      queue: queuePath,
      ledger: ledgerPath,
      metrics: metricsPath || undefined,
      skipBrowser: options.skipBrowser === undefined ? true : options.skipBrowser,
      profileText: options.profileText || 'data/social-growth/profile.local.txt',
      postTextDir: options.postTextDir || 'data/social-growth/post-texts',
      cycleOut: options.cycleOut || 'data/social-growth/metrics-cycle.md',
      growthReportOut: options.growthReportOut || 'data/social-growth/growth-report.md',
      recommendationsOut: options.recommendationsOut || 'data/social-growth/recommendations.md',
      funnelOut: options.funnelOut || 'data/social-growth/funnel.md',
    });

  return {
    status: metricsCycle?.status || 'published',
    selected,
    xPostUrl,
    publishedAt,
    publicActions: {
      typedText: false,
      uploadedMedia: false,
      clickedSubmit: false,
    },
    queue: {
      path: queuePath,
      updated: true,
    },
    metricsTemplate: refreshedMetrics,
    replyHandoff: replyHandoff
      ? {
        path: replyOutPath,
        status: replyHandoff.status,
        statusId: replyHandoff.statusId,
      }
      : null,
    metricsCycle,
  };
}

async function selectRecoveryQueueItem({
  queue,
  ledgerPath,
  id,
  day,
  slot,
  now,
  imageDir,
  packageOutDir,
} = {}) {
  if (id) {
    const item = findQueueItem(queue, id);
    return {
      id: item.id,
      source: 'id',
      articleSlug: item.articleSlug,
      variant: item.variant,
    };
  }

  const ledger = await readJson(ledgerPath);
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    day,
    slot,
    now: now ? new Date(now) : new Date(),
    imageDir,
    packageOutDir,
    ensurePackage: false,
    preferReadyImage: true,
  });
  if (!preflight.selected?.id) {
    throw new Error(`No queue item selected for day ${day}, slot ${slot}`);
  }
  return {
    id: preflight.selected.id,
    source: 'day_slot',
    day: Number(day),
    slot: Number(slot),
    articleSlug: preflight.selected.articleSlug,
    variant: preflight.selected.variant,
  };
}

function normalizeXStatusUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    throw new Error(`Invalid X status URL: ${rawUrl}`);
  }
  const host = parsed.hostname.replace(/^www\./, '').replace(/^mobile\./, '').toLowerCase();
  if (host !== 'x.com' && host !== 'twitter.com') {
    throw new Error(`Invalid X status URL host: ${parsed.hostname}`);
  }
  const parts = parsed.pathname.split('/').filter(Boolean);
  const statusIndex = parts.findIndex((part) => part.toLowerCase() === 'status' || part.toLowerCase() === 'statuses');
  const account = parts[statusIndex - 1];
  const statusId = parts[statusIndex + 1];
  if (statusIndex <= 0 || !account || !/^\d+$/.test(statusId || '')) {
    throw new Error(`Invalid X status URL path: ${parsed.pathname}`);
  }
  return `https://x.com/${account}/status/${statusId}`;
}

function booleanOption(value) {
  return value === true || value === 'true';
}

function runXBrowserRead({
  url,
  textOut,
  profileDir,
  profileDirectory,
  timeoutMs,
  label,
}) {
  const readArgs = [
    'tools/social-growth/x-browser-cdp.mjs',
    '--read-url',
    url,
    '--text-out',
    textOut,
    '--json',
    '--timeout-ms',
    String(timeoutMs),
  ];
  if (profileDir) readArgs.push('--profile', profileDir);
  if (profileDirectory) readArgs.push('--profile-directory', profileDirectory);
  const result = spawnSync(process.execPath, readArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch {
    parsed = null;
  }
  return {
    label,
    url,
    textOut,
    exitCode: result.status ?? 1,
    status: parsed?.status || 'unknown',
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function loadCliArticles(options = {}) {
  return loadArticles({
    includeUntracked: options.includeUntracked === 'true',
  });
}

function selectArticle(articles, options) {
  const preferredLang = options.lang || DEFAULT_LANG;

  if (options.slug) {
    const matches = articles.filter((item) => item.slug === options.slug || item.i18nKey === options.slug);
    const article = matches.find((item) => item.lang === preferredLang) || matches[0];
    if (!article) {
      throw new Error(`No article found for slug: ${options.slug}`);
    }
    return article;
  }

  const article = articles.find((item) => item.lang === preferredLang) || articles[0];
  if (!article) {
    throw new Error('No articles found in source/_posts');
  }
  return article;
}

function printHelp() {
  console.log(`Usage:
  npm run social:articles -- --limit 5
  npm run social:articles -- --limit 5 --include-untracked true
  npm run social:draft -- --slug Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
  npm run social:plan -- --limit 3
  npm run social:queue -- --limit 3 --out data/social-growth/queue.json
  npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:package -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:daily -- --limit 5 --package-limit 3
  npm run social:automation -- --day today --slot 1
  npm run social:automation -- --day today --slot 1
  npm run social:scheduled-run -- --day today --slot 1
  npm run social:x-profile-diagnostics -- --out data/social-growth/x-profile-diagnostics.md
  npm run social:browser-readiness -- --day today --slot 1 --out data/social-growth/browser-readiness.md
  npm run social:compose-draft-resolution -- --day today --slot 1 --out data/social-growth/compose-draft-resolution.md
  npm run social:compose-draft-stash -- --day today --slot 1 --out-dir data/social-growth/compose-drafts
  npm run social:day-readiness -- --day 1 --out data/social-growth/day-readiness.md
  npm run social:daily-brief -- --day 1 --out data/social-growth/daily-brief.md
  npm run social:engagement-search -- --out data/social-growth/engagement-search.md
  npm run social:engagement -- --opportunities data/social-growth/engagement-opportunities --out data/social-growth/engagement-plan.md
  npm run social:copy-template -- --day today --slot 1
  npm run social:x-tech-brief -- --day today --slot 1
  npm run social:apply-copy -- --input data/social-growth/copy-overrides/<queue-id>.json
  npm run social:flow-dry-run -- --day today --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
  npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json
  npm run social:status -- --day today --slot 1 --out data/social-growth/status.md
  npm run social:preflight -- --day today --slot 1 --out data/social-growth/publish-preflight.md
  npm run social:image-brief -- --day today --slot 1
  npm run social:image-backlog -- --day 1 --out data/social-growth/image-backlog.md
  npm run social:x-prep -- --day today --slot 1 --out data/social-growth/x-publish-prep.md
  npm run social:confirmation -- --day today --slot 1 --out data/social-growth/publish-confirmation.md
  npm run social:manual-publish-kit -- --day today --slot 1 --out data/social-growth/manual-publish-kit.md
  npm run social:register-image -- --day today --slot 1 --source /path/to/generated.png
  npm run social:mark-published -- --queue data/social-growth/queue.json --metrics data/social-growth/posts.local.json --reply-out data/social-growth/thread-reply-handoff.md --id <queue-id> --url <x-post-url>
  npm run social:post-publish-recovery -- --day today --slot 1 --url <x-post-url>
  npm run social:metrics-template -- --queue data/social-growth/queue.json --out data/social-growth/posts.local.json
  npm run social:capture-metrics -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt
  npm run social:browser-metrics-capture -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --metrics data/social-growth/posts.local.json
  npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
  npm run social:parse-x-text -- --kind profile --input data/social-growth/profile.local.txt
  npm run social:init-ledger -- --followers 1234 --out data/social-growth/ledger.json
  npm run social:snapshot -- --ledger data/social-growth/ledger.json --posts-file data/social-growth/posts.local.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json --format markdown
  npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
  npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown
  npm run social:experiments -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json --out data/social-growth/experiment-plan.md
  npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md
  npm run social:profile-package -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-update.md
  npm run social:validate -- --queue data/social-growth/queue.json --format markdown
`);
}

function requiredArg(options, key) {
  if (options[key] === undefined || options[key] === null || options[key] === '') {
    throw new Error(`Missing required argument: --${key}`);
  }
  return options[key];
}

async function buildComposeDraftResolutionFromCli(options) {
  const queue = await readJson(options.queue || 'data/social-growth/queue.json');
  const ledger = await readJson(options.ledger || 'data/social-growth/ledger.json');
  const publishMode = options.publishMode || options.articleMode || 'thread_fallback';
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id: options.id,
    day: options.day || 1,
    slot: options.slot || 1,
    now: options.now ? new Date(options.now) : new Date(),
    imageDir: options.imageDir || 'output/imagegen',
    packageOutDir: options.packageOut || 'data/social-growth/packages',
    ensurePackage: options.ensurePackage !== 'false',
    preferReadyImage: options.preferReadyImage !== 'false',
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: options.skillDir,
    bunCommand: options.bunCommand,
    articleUrlPlaceholder: options.articleUrl || '<x-article-url>',
    publishMode,
    profileDir: options.xProfileDir || options.profileDir,
    profileDirectory: options.xProfileDirectory || options.profileDirectory,
  });
  const probePath = options.browserProbe || options.probeOut || 'data/social-growth/browser-probe.local.json';
  const storedProbe = await readBrowserProbe(probePath);
  const inputProbe = browserProbeFromArgs(options);
  const effectiveProbe = mergeBrowserProbe(storedProbe, inputProbe);
  const readiness = buildBrowserReadiness({
    preflight,
    xPrep: prep,
    ...effectiveProbe,
    profileDir: options.xProfileDir || options.profileDir,
    profileDirectory: options.xProfileDirectory || options.profileDirectory,
    generatedAt: preflight.generatedAt,
  });
  const resolution = buildComposeDraftResolution({
    queue,
    browserProbe: effectiveProbe,
    browserReadiness: readiness,
    day: options.day || 1,
    slot: options.slot || 1,
    publishMode,
    imageDir: options.imageDir || 'output/imagegen',
    generatedAt: preflight.generatedAt,
  });

  return {
    queue,
    ledger,
    preflight,
    prep,
    readiness,
    resolution,
  };
}

async function readText(filePath) {
  const { readFile } = await import('node:fs/promises');
  return readFile(filePath, 'utf8');
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function dirnameFromPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '.' : normalized.slice(0, index) || '/';
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}
