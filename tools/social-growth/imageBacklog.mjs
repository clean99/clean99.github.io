import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildPublishPreflight } from './preflight.mjs';
import { buildWeeklyExecutionPlan } from './schedule.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/image-backlog.md';
const DEFAULT_SOURCE_PLACEHOLDER = '/absolute/path/to/generated.png';

export async function buildImageBacklog({
  queue,
  ledger,
  day,
  days = 7,
  postsPerDay = 3,
  now = new Date(),
  imageDir = 'output/imagegen',
  packageOutDir = 'data/social-growth/packages',
  includeReady = false,
  limit,
  ensurePackage = true,
  sourcePlaceholder = DEFAULT_SOURCE_PLACEHOLDER,
  env = process.env,
} = {}) {
  const plan = buildWeeklyExecutionPlan({
    queue,
    ledger,
    now,
    days,
    postsPerDay,
  });
  const entries = [];
  let readyImages = 0;
  let missingImages = 0;
  let totalSlots = 0;

  for (const planDay of plan.days) {
    if (day && Number(planDay.day) !== Number(day)) continue;

    for (let index = 0; index < planDay.publishSlots.length; index += 1) {
      const publishSlot = planDay.publishSlots[index];
      totalSlots += 1;
      const preflight = await buildPublishPreflight({
        queue,
        ledger,
        id: publishSlot.item.id,
        now,
        imageDir,
        packageOutDir,
        ensurePackage,
        env,
      });
      const imageReady = preflight.image.ready;
      if (imageReady) readyImages += 1;
      else missingImages += 1;
      if (imageReady && !includeReady) continue;

      entries.push({
        day: planDay.day,
        date: planDay.date,
        slot: index + 1,
        time: publishSlot.time,
        id: preflight.selected.id,
        articleSlug: preflight.selected.articleSlug,
        variant: preflight.selected.variant,
        packageDir: preflight.selected.packageDir,
        promptFile: preflight.image.promptFile,
        imagePath: preflight.image.outputPath,
        imageReady,
        preflightStatus: preflight.status,
        blockers: preflight.blockers,
        commands: {
          imageBrief: `npm run social:image-brief -- --id ${preflight.selected.id}`,
          register: `npm run social:register-image -- --id ${preflight.selected.id} --source ${shellQuote(sourcePlaceholder)}`,
          preflight: `npm run social:preflight -- --id ${preflight.selected.id} --out data/social-growth/publish-preflight.md`,
        },
      });
    }
  }

  const visibleEntries = limit ? entries.slice(0, Number(limit)) : entries;

  return {
    generatedAt: toIsoString(now),
    status: missingImages ? 'needs_images' : 'ready',
    scope: {
      day: day ? Number(day) : null,
      days: Number(days),
      postsPerDay: Number(postsPerDay),
    },
    totals: {
      totalSlots,
      readyImages,
      missingImages,
      listedEntries: visibleEntries.length,
      totalEntries: entries.length,
    },
    entries: visibleEntries,
    boundary: 'Local image preparation only. Do not upload media or publish on X without action-time confirmation in Chrome.',
  };
}

export function formatImageBacklogMarkdown(backlog) {
  const entries = backlog.entries.length
    ? backlog.entries.map(formatEntry).join('\n\n')
    : '- No missing images in the selected scope.';
  const scope = backlog.scope.day
    ? `Day ${backlog.scope.day}`
    : `${backlog.scope.days} day(s), ${backlog.scope.postsPerDay} post(s)/day`;

  return `# X Image Backlog

Generated at: ${backlog.generatedAt}
Status: ${backlog.status}
Scope: ${scope}

## Coverage

- Total slots checked: ${backlog.totals.totalSlots}
- Images ready: ${backlog.totals.readyImages}
- Images missing: ${backlog.totals.missingImages}
- Entries listed: ${backlog.totals.listedEntries}/${backlog.totals.totalEntries}

## Missing Or Requested Images

${entries}

## Boundary

${backlog.boundary}
`;
}

export async function writeImageBacklog(backlog, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatImageBacklogMarkdown(backlog).trimEnd()}\n`);
  return filePath;
}

function formatEntry(entry) {
  const blockers = entry.blockers.length
    ? entry.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local image blockers.';

  return `### Day ${entry.day} Slot ${entry.slot}: ${entry.time}

- Queue id: ${entry.id}
- Article slug: ${entry.articleSlug}
- Variant: ${entry.variant}
- Package: \`${entry.packageDir}\`
- Prompt file: \`${entry.promptFile}\`
- Expected image: \`${entry.imagePath}\`
- Image ready: ${entry.imageReady}
- Preflight: ${entry.preflightStatus}

Blockers:

${blockers}

Commands:

\`\`\`bash
${entry.commands.imageBrief}
${entry.commands.register}
${entry.commands.preflight}
\`\`\``;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
