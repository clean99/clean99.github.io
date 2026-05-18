import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildPublishPreflight } from './preflight.mjs';
import { buildWeeklyExecutionPlan } from './schedule.mjs';
import { buildXPublishPrep } from './xPrep.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/day-readiness.md';

export async function buildDayReadiness({
  queue,
  ledger,
  day = 1,
  now = new Date(),
  imageDir = 'output/imagegen',
  packageOutDir = 'data/social-growth/packages',
  ensurePackage = true,
  xSkillDir,
  xBunCommand,
  xProfileDir,
  xProfileDirectory,
  publishMode,
  env = process.env,
} = {}) {
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const planDay = plan.days[Number(day) - 1];
  if (!planDay) {
    throw new Error(`No weekly plan day found for day ${day}`);
  }

  const slots = [];
  for (let index = 0; index < planDay.publishSlots.length; index += 1) {
    const slotNumber = index + 1;
    const publishSlot = planDay.publishSlots[index];
    const preflight = await buildPublishPreflight({
      queue,
      ledger,
      day,
      slot: slotNumber,
      now,
      imageDir,
      packageOutDir,
      env,
      ensurePackage,
    });
    const xPrep = await buildXPublishPrep(preflight, {
      skillDir: xSkillDir,
      bunCommand: xBunCommand,
      profileDir: xProfileDir,
      profileDirectory: xProfileDirectory,
      publishMode,
    });

    slots.push({
      slot: slotNumber,
      time: publishSlot.time,
      id: preflight.selected.id,
      articleSlug: preflight.selected.articleSlug,
      variant: preflight.selected.variant,
      packageDir: preflight.selected.packageDir,
      imagePath: preflight.image.outputPath,
      imageReady: preflight.image.ready,
      preflightStatus: preflight.status,
      xPrepStatus: xPrep.status,
      publishMode: xPrep.publishMode,
      blockers: dedupe([
        ...preflight.blockers,
        ...xPrep.blockers,
      ]),
      commands: {
        imageBrief: `npm run social:image-brief -- --day ${Number(day)} --slot ${slotNumber}`,
        preflight: `npm run social:preflight -- --day ${Number(day)} --slot ${slotNumber} --out ${slotArtifactPath('publish-preflight', day, slotNumber)}`,
        xPrep: `npm run social:x-prep -- --day ${Number(day)} --slot ${slotNumber}${publishArgs(xPrep.publishMode, xProfileDir, xProfileDirectory)} --out ${slotArtifactPath('x-publish-prep', day, slotNumber)}`,
      },
    });
  }

  const readySlots = slots.filter((slot) => slot.preflightStatus === 'ready' && slot.xPrepStatus === 'ready').length;

  return {
    generatedAt: toIsoString(now),
    status: readySlots === slots.length ? 'ready' : 'needs_images',
    day: Number(day),
    date: planDay.date,
    timezone: plan.timezone,
    cumulativeFollowerTarget: planDay.cumulativeFollowerTarget,
    readySlots,
    totalSlots: slots.length,
    slots,
  };
}

export function formatDayReadinessMarkdown(readiness) {
  const slotSections = readiness.slots.map(formatSlot).join('\n\n');

  return `# X Day Readiness

Generated at: ${readiness.generatedAt}
Status: ${readiness.status}
Day: ${readiness.day}
Date: ${readiness.date}
Timezone: ${readiness.timezone}
Cumulative follower target: +${readiness.cumulativeFollowerTarget}
Ready slots: ${readiness.readySlots}/${readiness.totalSlots}

## Slots

${slotSections}

## Boundary

- This report prepares local artifacts only.
- Opening Chrome, uploading media, publishing, replying, liking, reposting, following, or editing still requires action-time confirmation.
`;
}

export async function writeDayReadiness(readiness, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatDayReadinessMarkdown(readiness).trimEnd()}\n`);
  return filePath;
}

function formatSlot(slot) {
  const blockers = slot.blockers.length
    ? slot.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers.';

  return `### Slot ${slot.slot}: ${slot.time}

- Queue id: ${slot.id}
- Article slug: ${slot.articleSlug}
- Variant: ${slot.variant}
- Package: \`${slot.packageDir}\`
- Image: \`${slot.imagePath}\`
- Image ready: ${slot.imageReady}
- Preflight: ${slot.preflightStatus}
- X prep: ${slot.xPrepStatus}
- Publish mode: ${slot.publishMode}

Blockers:

${blockers}

Commands:

\`\`\`bash
${slot.commands.imageBrief}
${slot.commands.preflight}
${slot.commands.xPrep}
\`\`\``;
}

function slotArtifactPath(prefix, day, slot) {
  return join('data/social-growth/slot-readiness', `day-${Number(day)}-slot-${Number(slot)}-${prefix}.md`);
}

function dedupe(items) {
  return [...new Set(items)];
}

function publishArgs(publishMode, profileDir, profileDirectory) {
  const args = [];
  if (publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  if (profileDir) args.push(`--xProfileDir ${shellQuote(profileDir)}`);
  if (profileDirectory) args.push(`--xProfileDirectory ${shellQuote(profileDirectory)}`);
  return args.length ? ` ${args.join(' ')}` : '';
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
