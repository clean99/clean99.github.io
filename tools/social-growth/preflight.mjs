import { access, copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, join } from 'node:path';
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
  preferReadyImage = false,
} = {}) {
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const selected = id
    ? findQueueItem(queue, id)
    : await selectSlotItem(plan, { day, slot, imageDir, preferReadyImage });
  const validation = validateQueueItem(selected);
  const queueValidation = validateQueue(queue);
  const queueValidationItem = queueValidation.items.find((item) => item.id === selected.id);
  const packageDir = packageDirForItem(selected, packageOutDir);

  if (ensurePackage) {
    await writePublishPackage(selected, { outDir: packageOutDir });
  }

  const image = await resolveImagePath(imageDir, selected.id);
  const imagePath = image.path;
  const imageReady = image.ready;
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
      preferredGenerator: 'imagegen built-in tool',
      promptFile: join(packageDir, 'image-prompt.txt'),
      outputPath: imagePath,
      ready: imageReady,
      hasOpenAiKey,
      keyRequired: false,
      cliFallbackKeyRequired: !imageReady,
      builtInInstructions: builtInImagegenInstructions({
        promptFile: join(packageDir, 'image-prompt.txt'),
        outputPath: canonicalImagePath(imageDir, selected.id),
      }),
      command: imageCommand({
        promptFile: join(packageDir, 'image-prompt.txt'),
        outputPath: canonicalImagePath(imageDir, selected.id),
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
- Preferred generator: ${preflight.image.preferredGenerator}
- Prompt file: \`${preflight.image.promptFile}\`
- Output path: \`${preflight.image.outputPath}\`
- Image ready: ${preflight.image.ready}
- OPENAI_API_KEY present: ${preflight.image.hasOpenAiKey}
- OPENAI_API_KEY required for preferred path: ${preflight.image.keyRequired}
- OPENAI_API_KEY required for CLI fallback: ${preflight.image.cliFallbackKeyRequired}

Preferred built-in imagegen path:

\`\`\`text
${preflight.image.builtInInstructions}
\`\`\`

CLI fallback only when explicitly requested:

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
    : await selectSlotItem(plan, { day, slot, imageDir, preferReadyImage: false });
  const outputPath = join(imageDir, `${safePathSegment(selected.id)}.png`);

  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(sourceImage, outputPath);

  return {
    id: selected.id,
    sourceImage,
    outputPath,
  };
}

export async function ingestLatestGeneratedImage({
  queue,
  ledger,
  id,
  day = 1,
  slot = 1,
  now = new Date(),
  imageDir = DEFAULT_IMAGE_DIR,
  sourceDir,
  codexHome = process.env.CODEX_HOME || join(homedir(), '.codex'),
  since,
} = {}) {
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const selected = id
    ? findQueueItem(queue, id)
    : await selectSlotItem(plan, { day, slot, imageDir, preferReadyImage: false });
  const sourceDirs = sourceDir ? [sourceDir] : defaultGeneratedImageDirs(codexHome);
  const candidates = await latestGeneratedImageCandidates(sourceDirs, { since });
  const sourceImage = candidates[0]?.path;
  if (!sourceImage) {
    throw new Error(`No generated PNG found under: ${sourceDirs.join(', ')}`);
  }

  const registered = await registerPublishImage({
    queue,
    ledger,
    sourceImage,
    id: selected.id,
    now,
    imageDir,
  });

  return {
    ...registered,
    sourceDir: candidates[0].root,
    candidateCount: candidates.length,
    sourceMtime: candidates[0].mtime.toISOString(),
  };
}

export async function writePublishPreflight(preflight, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublishPreflightMarkdown(preflight).trimEnd()}\n`);
  return filePath;
}

async function selectSlotItem(plan, { day, slot, imageDir, preferReadyImage }) {
  const planDay = plan.days[Number(day) - 1];
  const publishSlot = planDay?.publishSlots?.[Number(slot) - 1];
  if (!publishSlot?.item) {
    throw new Error(`No publish slot found for day ${day}, slot ${slot}`);
  }
  if (preferReadyImage) {
    const readyItem = await firstReadyItemFrom(plan, {
      day: Number(day),
      slot: Number(slot),
      imageDir,
    });
    if (readyItem) return readyItem;
  }
  return publishSlot.item;
}

async function firstReadyItemFrom(plan, { day, slot, imageDir }) {
  for (const planDay of plan.days.slice(Math.max(0, day - 1))) {
    const startSlot = planDay.day === day ? Math.max(0, slot - 1) : 0;
    for (const publishSlot of planDay.publishSlots.slice(startSlot)) {
      const image = await resolveImagePath(imageDir, publishSlot.item.id);
      if (image.ready) return publishSlot.item;
    }
  }
  return null;
}

async function resolveImagePath(imageDir, id) {
  const canonical = canonicalImagePath(imageDir, id);
  if (await fileExists(canonical)) {
    return { path: canonical, ready: true };
  }
  const legacy = await findLegacyImagePath(imageDir, id);
  if (legacy) return { path: legacy, ready: true };
  return { path: canonical, ready: false };
}

async function findLegacyImagePath(imageDir, id) {
  try {
    const prefix = `${safePathSegment(id)}__`;
    const files = (await readdir(imageDir))
      .filter((file) => file.startsWith(prefix) && file.endsWith('.png'))
      .sort();
    return files.length ? join(imageDir, files[0]) : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function latestGeneratedImageCandidates(sourceDirs, { since } = {}) {
  const threshold = since ? new Date(since).getTime() : 0;
  if (Number.isNaN(threshold)) {
    throw new Error(`Invalid --since datetime: ${since}`);
  }
  const candidates = [];
  for (const sourceDir of sourceDirs) {
    const root = sourceDir;
    const files = await collectImageFiles(sourceDir, { root, depth: 0 }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const file of files) {
      if (file.mtime.getTime() >= threshold) candidates.push(file);
    }
  }
  return candidates.sort((left, right) => right.mtime.getTime() - left.mtime.getTime());
}

async function collectImageFiles(dir, { root, depth }) {
  if (depth > 4) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(fullPath, { root, depth: depth + 1 }));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.png') {
      const info = await stat(fullPath);
      files.push({ path: fullPath, root, mtime: info.mtime });
    }
  }
  return files;
}

function defaultGeneratedImageDirs(codexHome) {
  return [
    join(codexHome, 'generated_images'),
    join(codexHome, 'generated-images'),
  ];
}

function canonicalImagePath(imageDir, id) {
  return join(imageDir, `${safePathSegment(id)}.png`);
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

function builtInImagegenInstructions({ promptFile, outputPath }) {
  return [
    `Use the built-in imagegen skill with the prompt file: ${promptFile}`,
    'Generate one 1536x1024 landscape editorial infographic with image 2 / gpt-image-2 quality.',
    `After reviewing the output, copy or register the final PNG into: ${outputPath}`,
    'Then rerun publish preflight before opening Chrome.',
  ].join('\n');
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
