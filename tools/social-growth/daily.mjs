import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createMetricsTemplateFromQueue, formatMarkdownReport, METRIC_FIELDS } from './ledger.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildPublishQueue,
  mergePublishQueues,
  readJson,
  writeJson,
  writePublishPackage,
} from './queue.mjs';
import { buildWeeklyExecutionPlan, writeWeeklyExecutionPlan } from './schedule.mjs';
import { formatValidationMarkdown, passingQueueItemIds, validateQueue } from './validation.mjs';

export async function runDailyGrowthPlan({
  articles,
  now = new Date(),
  queuePath = 'data/social-growth/queue.json',
  packageOutDir = 'data/social-growth/packages',
  reportPath = 'data/social-growth/daily-run.md',
  weeklyPlanPath = 'data/social-growth/weekly-plan.md',
  ledgerPath = 'data/social-growth/ledger.json',
  metricsPath = 'data/social-growth/posts.local.json',
  queueOptions = {},
  packageLimit = 3,
} = {}) {
  const generatedAt = toIsoString(now);
  const nextQueue = buildPublishQueue(articles, {
    ...queueOptions,
    createdAt: generatedAt,
  });
  const existingQueue = await readOptionalJson(queuePath);
  const queue = existingQueue ? mergePublishQueues(existingQueue, nextQueue) : nextQueue;
  const validation = validateQueue(queue);
  const packages = [];

  await writeJson(queuePath, queue);

  const packageItems = selectPackageItems(queue, {
    limit: Number(packageLimit || 3),
    allowedIds: passingQueueItemIds(validation),
  });

  for (const item of packageItems) {
    packages.push(await writePublishPackage(item, { outDir: packageOutDir }));
  }

  const ledger = await readOptionalJson(ledgerPath);
  const weeklyPlan = ledger ? buildWeeklyExecutionPlan({
    queue,
    ledger,
    now,
  }) : null;
  if (weeklyPlan) {
    await writeWeeklyExecutionPlan(weeklyPlan, weeklyPlanPath);
  }
  const metricsTemplate = createMetricsTemplateFromQueue(queue, {
    date: generatedAt.slice(0, 10),
  });
  await writeJson(metricsPath, metricsTemplate);

  const report = formatDailyRunReport({
    generatedAt,
    queue,
    queuePath,
    packages,
    packageOutDir,
    ledger,
    ledgerPath,
    metricsPath,
    metricsTemplate,
    packageItems,
    validation,
    weeklyPlan,
    weeklyPlanPath,
  });

  await writeText(reportPath, report);

  return {
    generatedAt,
    queuePath,
    reportPath,
    weeklyPlanPath: weeklyPlan ? weeklyPlanPath : null,
    queuedItems: queue.items.length,
    packages,
    metricsPath,
    metricPosts: metricsTemplate.posts.length,
    ledgerSummary: ledger ? summarizeGrowthLedger(ledger) : null,
    validationSummary: {
      status: validation.status,
      passed: validation.passed,
      failed: validation.failed,
      warnings: validation.warnings,
    },
    weeklyPlanSummary: weeklyPlan ? {
      plannedPosts: weeklyPlan.candidates.plannedPosts,
      missingSlots: weeklyPlan.candidates.missingSlots,
      remainingFollowers: weeklyPlan.target.remainingFollowers,
    } : null,
  };
}

export function formatDailyRunReport({
  generatedAt,
  queue,
  queuePath,
  packages,
  packageOutDir,
  ledger,
  ledgerPath,
  metricsPath,
  metricsTemplate,
  packageItems,
  validation,
  weeklyPlan,
  weeklyPlanPath,
}) {
  const packageLines = packages.length
    ? packages.map((item, index) => `${index + 1}. ${item.id}: ${item.packageDir}`).join('\n')
    : 'No packages exported.';
  const firstPackage = packages[0]?.packageDir || `${packageOutDir}/<queue-id>`;
  const ledgerSection = ledger
    ? formatMarkdownReport(ledger).trim()
    : `No ledger found at \`${ledgerPath}\`. Initialize it with \`npm run social:init-ledger\`.`;
  const metricFields = METRIC_FIELDS.map((field) => `\`${field}\``).join(', ');

  return `# Daily X Growth Run

Generated at: ${generatedAt}

## Output

- Queue: \`${queuePath}\`
- Queue items: ${queue.items.length}
- Publish packages directory: \`${packageOutDir}\`
- Metrics template: \`${metricsPath}\`
- Weekly execution plan: ${weeklyPlan ? `\`${weeklyPlanPath}\`` : 'not generated; ledger missing.'}
- Published posts waiting for metrics: ${metricsTemplate.posts.length}
- Package selection: article-diverse first, then fallback variants if needed.
- Quality gate: ${validation.passed}/${validation.total} passed, ${validation.warnings} warnings.

## Packages

${packageLines}

Selected queue ids:

${packageItems.length ? packageItems.map((item) => `- ${item.id}`).join('\n') : '- none'}

## Quality Gate

${formatValidationMarkdown(validation)}

## Next Browser Actions

1. Generate the image from \`${firstPackage}/image-prompt.txt\`.
2. Prepare the X Article from \`${firstPackage}/x-article.md\`.
3. Stop before the final public publish click and confirm account/content.
4. After the X Article or thread is public, create the short post from \`${firstPackage}/short-post.txt\`, attach the image, and link to the X Article URL.
5. Stop before the final short-post publish click and confirm account/content.
6. Record the public URL with \`npm run social:mark-published\`.

## Weekly Execution Plan

${weeklyPlan ? formatWeeklySummary(weeklyPlan) : `No weekly plan generated because no ledger was found at \`${ledgerPath}\`.`}

## Metrics Capture

Fill \`${metricsPath}\` from X after confirmed posts are public.

If you captured visible X text locally, parse it into the template:

\`\`\`bash
npm run social:capture-metrics -- --metrics ${metricsPath} --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
\`\`\`

Required follower field:

- \`followers\`: current follower count for @Clean993.

Per-post fields:

${metricFields}

Then record the snapshot:

\`\`\`bash
npm run social:snapshot -- --ledger ${ledgerPath} --posts-file ${metricsPath}
\`\`\`

## Growth Status

${ledgerSection}
`;
}

function formatWeeklySummary(plan) {
  const warnings = plan.warnings.length
    ? plan.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- No schedule warnings.';
  return [
    `- Target remaining followers: ${plan.target.remainingFollowers}`,
    `- Planned publish slots: ${plan.candidates.plannedPosts}`,
    `- Unfilled slots: ${plan.candidates.missingSlots}`,
    `- Required daily pace: ${Math.round(plan.target.requiredDailyPace * 10) / 10}`,
    '',
    'Warnings:',
    '',
    warnings,
  ].join('\n');
}

export function draftItems(queue) {
  return (queue.items || []).filter((item) => item.status === 'draft');
}

export function selectPackageItems(queue, { limit = 3, allowedIds = null } = {}) {
  const maxItems = Number(limit || 3);
  const drafts = draftItems(queue);
  const publishedSlugs = new Set((queue.items || [])
    .filter((item) => item.status === 'published' || item.xPostUrl)
    .map((item) => item.articleSlug));
  const selected = [];
  const selectedIds = new Set();

  const eligibleDrafts = allowedIds
    ? drafts.filter((draft) => allowedIds.has(draft.id))
    : drafts;

  for (const item of onePerArticle(eligibleDrafts.filter((draft) => !publishedSlugs.has(draft.articleSlug)))) {
    selectItem(item);
  }

  if (selected.length < maxItems) {
    for (const item of onePerArticle(eligibleDrafts.filter((draft) => publishedSlugs.has(draft.articleSlug)))) {
      selectItem(item);
    }
  }

  if (selected.length < maxItems) {
    for (const item of eligibleDrafts) {
      selectItem(item);
    }
  }

  return selected;

  function selectItem(item) {
    if (!item || selectedIds.has(item.id) || selected.length >= maxItems) return;
    selected.push(item);
    selectedIds.add(item.id);
  }
}

export function onePerArticle(items) {
  const grouped = new Map();
  for (const item of items) {
    const group = grouped.get(item.articleSlug) || [];
    group.push(item);
    grouped.set(item.articleSlug, group);
  }

  return [...grouped.values()].map((group) => bestVariant(group));
}

export function bestVariant(items) {
  const priority = new Map([
    ['strong-thesis', 0],
    ['research-utility', 1],
    ['case-story', 2],
  ]);

  return [...items].sort((a, b) => (
    (priority.get(a.variant) ?? 99) - (priority.get(b.variant) ?? 99)
    || String(a.id).localeCompare(String(b.id))
  ))[0];
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${String(value).trimEnd()}\n`);
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
