#!/usr/bin/env node
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
import { runXGrowthDryRun } from './flowDryRun.mjs';
import { buildGrowthRecommendations, formatRecommendationsMarkdown } from './recommendations.mjs';
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
import { runPostPublishMetricsCycle } from './metricsCycle.mjs';

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));
const DEFAULT_LANG = 'zh';

if (command === 'articles') {
  const articles = await loadArticles();
  const limit = Number(args.limit || 10);
  console.log(JSON.stringify(articles.slice(0, limit), null, 2));
} else if (command === 'draft') {
  const articles = await loadArticles();
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
  const articles = await loadArticles();
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
  const articles = await loadArticles();
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
  const articles = await loadArticles();
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
  const articles = await loadArticles();
  const result = await runSafeAutomationCycle({
    articles,
    now: args.now ? new Date(args.now) : new Date(),
    day: args.day || 1,
    slot: args.slot || 1,
    queuePath: args.queue || 'data/social-growth/queue.json',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    dailyReportPath: args.report || 'data/social-growth/daily-run.md',
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
    imageDir: args.imageDir || 'output/imagegen',
    xPublishPrepPath: args.xPrepOut || 'data/social-growth/x-publish-prep.md',
    engagementOpportunityDir: args.engagementOpportunities || 'data/social-growth/engagement-opportunities',
    engagementPlanPath: args.engagementOut || 'data/social-growth/engagement-plan.md',
    engagementSearchPath: args.engagementSearchOut || 'data/social-growth/engagement-search.md',
    engagementLimit: args.engagementLimit || 5,
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
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
    engagement: result.engagement,
    paths: result.paths,
  }, null, 2));
} else if (command === 'scheduled-run') {
  const articles = await loadArticles();
  const result = await runScheduledGrowthLoop({
    articles,
    now: args.now ? new Date(args.now) : new Date(),
    day: args.day || 1,
    slot: args.slot || 1,
    queuePath: args.queue || 'data/social-growth/queue.json',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    dailyReportPath: args.report || 'data/social-growth/daily-run.md',
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
    scheduledReportPath: args.out || 'data/social-growth/scheduled-run.md',
    imageBriefDir: args.imageBriefDir || 'data/social-growth/image-briefs',
    imageDir: args.imageDir || 'output/imagegen',
    xPublishPrepPath: args.xPrepOut || 'data/social-growth/x-publish-prep.md',
    engagementOpportunityDir: args.engagementOpportunities || 'data/social-growth/engagement-opportunities',
    engagementPlanPath: args.engagementOut || 'data/social-growth/engagement-plan.md',
    engagementSearchPath: args.engagementSearchOut || 'data/social-growth/engagement-search.md',
    engagementLimit: args.engagementLimit || 5,
    xSkillDir: args.xSkillDir,
    xBunCommand: args.xBunCommand,
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
  });
  if (args.out) {
    await writeDayReadiness(readiness, args.out);
    console.log(`Wrote X day readiness to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(readiness, null, 2));
  } else {
    console.log(formatDayReadinessMarkdown(readiness));
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
  const articles = await loadArticles();
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
  const status = await buildGrowthStatus({
    queue,
    ledger,
    day: args.day || 1,
    slot: args.slot || 1,
    now: args.now ? new Date(args.now) : new Date(),
    imageDir: args.imageDir || 'output/imagegen',
    packageOutDir: args.packageOut || 'data/social-growth/packages',
    profileText,
    ensurePackage: args.ensurePackage === 'true',
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
  });
  const prep = await buildXPublishPrep(preflight, {
    skillDir: args.skillDir,
    bunCommand: args.bunCommand || 'npx -y bun',
    articleUrlPlaceholder: args.articleUrl || '<x-article-url>',
  });
  if (args.out) {
    await writeXPublishPrep(prep, args.out);
    console.log(`Wrote X publish prep to ${args.out}`);
  } else if (args.format === 'json') {
    console.log(JSON.stringify(prep, null, 2));
  } else {
    console.log(formatXPublishPrepMarkdown(prep));
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
    },
  }, null, 2));
} else if (command === 'parse-x-text') {
  const text = await readText(requiredArg(args, 'input'));
  const parsed = args.kind === 'post' ? parseXPostMetrics(text) : parseXProfileMetrics(text);
  console.log(JSON.stringify(parsed, null, 2));
} else if (command === 'mark-published') {
  const queuePath = args.queue || 'data/social-growth/queue.json';
  const queue = await readJson(queuePath);
  const updated = markQueueItemPublished(queue, {
    id: requiredArg(args, 'id'),
    xPostUrl: requiredArg(args, 'url'),
    xArticleUrl: args.articleUrl,
    publishedAt: args.publishedAt,
  });
  await writeJson(queuePath, updated);
  console.log(`Marked ${args.id} as published in ${queuePath}`);
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

function toCamelKey(key) {
  return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
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
  npm run social:draft -- --slug Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
  npm run social:plan -- --limit 3
  npm run social:queue -- --limit 3 --out data/social-growth/queue.json
  npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:package -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:daily -- --limit 5 --package-limit 3
  npm run social:automation -- --day 1 --slot 1
  npm run social:scheduled-run -- --day 1 --slot 1
  npm run social:day-readiness -- --day 1 --out data/social-growth/day-readiness.md
  npm run social:engagement-search -- --out data/social-growth/engagement-search.md
  npm run social:engagement -- --opportunities data/social-growth/engagement-opportunities --out data/social-growth/engagement-plan.md
  npm run social:copy-template -- --day 1 --slot 1
  npm run social:x-tech-brief -- --day 1 --slot 1
  npm run social:apply-copy -- --input data/social-growth/copy-overrides/<queue-id>.json
  npm run social:flow-dry-run -- --day 1 --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
  npm run social:week -- --queue data/social-growth/queue.json --ledger data/social-growth/ledger.json
  npm run social:status -- --day 1 --slot 1 --out data/social-growth/status.md
  npm run social:preflight -- --day 1 --slot 1 --out data/social-growth/publish-preflight.md
  npm run social:image-brief -- --day 1 --slot 1
  npm run social:x-prep -- --day 1 --slot 1 --out data/social-growth/x-publish-prep.md
  npm run social:register-image -- --day 1 --slot 1 --source /path/to/generated.png
  npm run social:metrics-template -- --queue data/social-growth/queue.json --out data/social-growth/posts.local.json
  npm run social:capture-metrics -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt
  npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
  npm run social:parse-x-text -- --kind profile --input data/social-growth/profile.local.txt
  npm run social:init-ledger -- --followers 1234 --out data/social-growth/ledger.json
  npm run social:snapshot -- --ledger data/social-growth/ledger.json --posts-file data/social-growth/posts.local.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json --format markdown
  npm run social:recommend -- --ledger data/social-growth/ledger.json --format markdown
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

async function readText(filePath) {
  const { readFile } = await import('node:fs/promises');
  return readFile(filePath, 'utf8');
}

function dirnameFromPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '.' : normalized.slice(0, index) || '/';
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}
