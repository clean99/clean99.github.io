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

export async function runDailyGrowthPlan({
  articles,
  now = new Date(),
  queuePath = 'data/social-growth/queue.json',
  packageOutDir = 'data/social-growth/packages',
  reportPath = 'data/social-growth/daily-run.md',
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
  const packages = [];

  await writeJson(queuePath, queue);

  for (const item of draftItems(queue).slice(0, Number(packageLimit || 3))) {
    packages.push(await writePublishPackage(item, { outDir: packageOutDir }));
  }

  const ledger = await readOptionalJson(ledgerPath);
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
  });

  await writeText(reportPath, report);

  return {
    generatedAt,
    queuePath,
    reportPath,
    queuedItems: queue.items.length,
    packages,
    metricsPath,
    metricPosts: metricsTemplate.posts.length,
    ledgerSummary: ledger ? summarizeGrowthLedger(ledger) : null,
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
- Published posts waiting for metrics: ${metricsTemplate.posts.length}

## Packages

${packageLines}

## Next Browser Actions

1. Generate the image from \`${firstPackage}/image-prompt.txt\`.
2. Prepare the X Article from \`${firstPackage}/x-article.md\`.
3. Stop before the final public publish click and confirm account/content.
4. After the X Article or thread is public, create the short post from \`${firstPackage}/short-post.txt\`, attach the image, and link to the X Article URL.
5. Stop before the final short-post publish click and confirm account/content.
6. Record the public URL with \`npm run social:mark-published\`.

## Metrics Capture

Fill \`${metricsPath}\` from X after confirmed posts are public.

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

export function draftItems(queue) {
  return (queue.items || []).filter((item) => item.status === 'draft');
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
