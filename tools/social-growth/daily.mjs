import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { formatMarkdownReport } from './ledger.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildPublishQueue,
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
  queueOptions = {},
  packageLimit = 3,
} = {}) {
  const generatedAt = toIsoString(now);
  const queue = buildPublishQueue(articles, {
    ...queueOptions,
    createdAt: generatedAt,
  });
  const packages = [];

  await writeJson(queuePath, queue);

  for (const item of draftItems(queue).slice(0, Number(packageLimit || 3))) {
    packages.push(await writePublishPackage(item, { outDir: packageOutDir }));
  }

  const ledger = await readOptionalJson(ledgerPath);
  const report = formatDailyRunReport({
    generatedAt,
    queue,
    queuePath,
    packages,
    packageOutDir,
    ledger,
    ledgerPath,
  });

  await writeText(reportPath, report);

  return {
    generatedAt,
    queuePath,
    reportPath,
    queuedItems: queue.items.length,
    packages,
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
}) {
  const packageLines = packages.length
    ? packages.map((item, index) => `${index + 1}. ${item.id}: ${item.packageDir}`).join('\n')
    : 'No packages exported.';
  const firstPackage = packages[0]?.packageDir || `${packageOutDir}/<queue-id>`;
  const ledgerSection = ledger
    ? formatMarkdownReport(ledger).trim()
    : `No ledger found at \`${ledgerPath}\`. Initialize it with \`npm run social:init-ledger\`.`;

  return `# Daily X Growth Run

Generated at: ${generatedAt}

## Output

- Queue: \`${queuePath}\`
- Queue items: ${queue.items.length}
- Publish packages directory: \`${packageOutDir}\`

## Packages

${packageLines}

## Next Browser Actions

1. Generate the image from \`${firstPackage}/image-prompt.txt\`.
2. Prepare the X Article from \`${firstPackage}/x-article.md\`.
3. Stop before the final public publish click and confirm account/content.
4. After the X Article or thread is public, create the short post from \`${firstPackage}/short-post.txt\`, attach the image, and link to the X Article URL.
5. Stop before the final short-post publish click and confirm account/content.
6. Record the public URL with \`npm run social:mark-published\`.

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
