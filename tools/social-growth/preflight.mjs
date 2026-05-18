import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildWeeklyExecutionPlan, packageDirForItem } from './schedule.mjs';
import {
  findQueueItem,
  prepareBrowserHandoff,
  writePublishPackage,
} from './queue.mjs';
import { validateQueue, validateQueueItem } from './validation.mjs';

const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_PACKAGE_DIR = 'data/social-growth/packages';

export async function buildPublishPreflight({
  queue,
  ledger,
  id,
  day = 1,
  slot = 1,
  now = new Date(),
  imageDir = DEFAULT_IMAGE_DIR,
  packageOutDir = DEFAULT_PACKAGE_DIR,
  env = process.env,
  ensurePackage = true,
} = {}) {
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const selected = id
    ? findQueueItem(queue, id)
    : selectSlotItem(plan, { day, slot });
  const validation = validateQueueItem(selected);
  const queueValidation = validateQueue(queue);
  const queueValidationItem = queueValidation.items.find((item) => item.id === selected.id);
  const packageDir = packageDirForItem(selected, packageOutDir);

  if (ensurePackage) {
    await writePublishPackage(selected, { outDir: packageOutDir });
  }

  const imagePath = join(imageDir, `${safePathSegment(selected.id)}.png`);
  const imageReady = await fileExists(imagePath);
  const hasOpenAiKey = Boolean(env.OPENAI_API_KEY);
  const blockers = [];

  if (validation.status !== 'pass') {
    blockers.push('Selected item fails item-level quality validation.');
  }
  if (queueValidationItem?.status !== 'pass') {
    blockers.push('Selected item fails queue-level quality validation.');
  }
  if (!imageReady) {
    blockers.push(`Image file is missing: ${imagePath}`);
  }
  if (!imageReady && !hasOpenAiKey) {
    blockers.push('OPENAI_API_KEY is missing, so the local gpt-image-2 CLI cannot generate the image.');
  }

  return {
    generatedAt: toIsoString(now),
    status: blockers.length ? 'blocked' : 'ready',
    blockers,
    selected: {
      id: selected.id,
      articleSlug: selected.articleSlug,
      variant: selected.variant,
      packageDir,
      imagePath,
    },
    quality: {
      itemStatus: validation.status,
      itemErrors: validation.errors,
      queueStatus: queueValidationItem?.status || 'unknown',
      queueErrors: queueValidationItem?.errors || [],
    },
    image: {
      model: selected.media?.model || 'gpt-image-2',
      promptFile: join(packageDir, 'image-prompt.txt'),
      outputPath: imagePath,
      ready: imageReady,
      hasOpenAiKey,
      keyRequired: !imageReady,
      command: imageCommand({
        promptFile: join(packageDir, 'image-prompt.txt'),
        outputPath: imagePath,
      }),
    },
    browser: {
      handoff: prepareBrowserHandoff(selected),
      stopBefore: [
        'final X Article publish click',
        'final short-post publish click',
        'every public reply click',
        'every upload, like, repost, follow, or edit action',
      ],
      recordCommand: `npm run social:mark-published -- --queue data/social-growth/queue.json --id ${selected.id} --url <x-post-url> --article-url <x-article-url>`,
    },
  };
}

export function formatPublishPreflightMarkdown(preflight) {
  const blockers = preflight.blockers.length
    ? preflight.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No blockers. Prepare browser workflow and stop at confirmation points.';
  const stopPoints = preflight.browser.stopBefore.map((item) => `- ${item}`).join('\n');

  return `# X Publish Preflight

Generated at: ${preflight.generatedAt}
Status: ${preflight.status}

## Selected Package

- Queue id: ${preflight.selected.id}
- Article slug: ${preflight.selected.articleSlug}
- Variant: ${preflight.selected.variant}
- Package: \`${preflight.selected.packageDir}\`
- Image: \`${preflight.selected.imagePath}\`

## Blockers

${blockers}

## Image

- Model: ${preflight.image.model}
- Prompt file: \`${preflight.image.promptFile}\`
- Output path: \`${preflight.image.outputPath}\`
- Image ready: ${preflight.image.ready}
- OPENAI_API_KEY present: ${preflight.image.hasOpenAiKey}
- OPENAI_API_KEY required now: ${preflight.image.keyRequired}

\`\`\`bash
${preflight.image.command}
\`\`\`

## Browser Boundary

Stop before:

${stopPoints}

After confirmed publication, record URLs:

\`\`\`bash
${preflight.browser.recordCommand}
\`\`\`
`;
}

export async function registerPublishImage({
  queue,
  ledger,
  sourceImage,
  id,
  day = 1,
  slot = 1,
  now = new Date(),
  imageDir = DEFAULT_IMAGE_DIR,
} = {}) {
  if (!sourceImage) {
    throw new Error('sourceImage is required');
  }
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const selected = id
    ? findQueueItem(queue, id)
    : selectSlotItem(plan, { day, slot });
  const outputPath = join(imageDir, `${safePathSegment(selected.id)}.png`);

  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(sourceImage, outputPath);

  return {
    id: selected.id,
    sourceImage,
    outputPath,
  };
}

export async function writePublishPreflight(preflight, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublishPreflightMarkdown(preflight).trimEnd()}\n`);
  return filePath;
}

function selectSlotItem(plan, { day, slot }) {
  const planDay = plan.days[Number(day) - 1];
  const publishSlot = planDay?.publishSlots?.[Number(slot) - 1];
  if (!publishSlot?.item) {
    throw new Error(`No publish slot found for day ${day}, slot ${slot}`);
  }
  return publishSlot.item;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function imageCommand({ promptFile, outputPath }) {
  return [
    'python "$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py" generate',
    '--model gpt-image-2',
    `--prompt-file ${shellQuote(promptFile)}`,
    '--size 1536x1024',
    '--quality medium',
    `--out ${shellQuote(outputPath)}`,
  ].join(' \\\n  ');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}
