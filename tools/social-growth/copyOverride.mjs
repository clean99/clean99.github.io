import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildWeeklyExecutionPlan } from './schedule.mjs';
import { findQueueItem, writeJson } from './queue.mjs';
import { validateQueue, validateQueueItem } from './validation.mjs';

export function buildCopyOverrideTemplate(item, {
  source = 'external-writing-skill',
  contentStatus = 'ready_for_validation',
} = {}) {
  if (!item?.id) {
    throw new Error('Copy template requires a queue item');
  }

  return {
    version: 1,
    id: item.id,
    articleSlug: item.articleSlug,
    variant: item.variant,
    source,
    contentStatus,
    shortPost: item.shortPost || '',
    xArticle: {
      title: item.xArticle?.title || '',
      body: item.xArticle?.body || '',
    },
    image: {
      alt: item.media?.alt || '',
      prompt: item.media?.prompt || '',
    },
    threadFallback: item.threadFallback || [],
    followUpReplies: item.followUpReplies || [],
    notes: '',
  };
}

export function selectCopyTarget(queue, ledger, {
  id,
  day = 1,
  slot = 1,
  now = new Date(),
} = {}) {
  if (id) return findQueueItem(queue, id);
  const plan = buildWeeklyExecutionPlan({ queue, ledger, now });
  const planDay = plan.days[Number(day) - 1];
  const publishSlot = planDay?.publishSlots?.[Number(slot) - 1];
  if (!publishSlot?.item) {
    throw new Error(`No publish slot found for day ${day}, slot ${slot}`);
  }
  return publishSlot.item;
}

export function applyCopyOverrideToQueue(queue, override, {
  id,
  now = new Date(),
  allowPublished = false,
} = {}) {
  const targetId = id || override?.id;
  if (!targetId) {
    throw new Error('Copy override requires an id');
  }
  const existing = findQueueItem(queue, targetId);
  if (existing.status === 'published' && !allowPublished) {
    throw new Error(`Refusing to change published queue item without allowPublished: ${targetId}`);
  }

  const updatedItem = applyCopyOverride(existing, override, {
    now,
  });
  const updatedQueue = {
    ...queue,
    items: queue.items.map((item) => (item.id === targetId ? updatedItem : item)),
  };
  const itemValidation = validateQueueItem(updatedItem);
  const queueValidation = validateQueue(updatedQueue);
  const validation = queueValidation.items.find((item) => item.id === targetId) || itemValidation;

  return {
    queue: updatedQueue,
    item: updatedItem,
    validation,
    itemValidation,
    queueValidation,
  };
}

export function applyCopyOverride(item, override = {}, {
  now = new Date(),
} = {}) {
  const shortPost = cleanText(override.shortPost ?? item.shortPost);
  const xArticleOverride = override.xArticle || {};
  const imageOverride = override.image || override.media || {};
  const media = {
    ...(item.media || {}),
    ...pickDefined({
      alt: cleanText(imageOverride.alt ?? override.imageAlt),
      prompt: cleanText(imageOverride.prompt ?? override.imagePrompt),
    }),
  };
  const xArticle = {
    ...(item.xArticle || {}),
    ...pickDefined({
      title: cleanText(xArticleOverride.title),
      body: cleanText(xArticleOverride.body),
    }),
  };

  return {
    ...item,
    status: item.status === 'published' ? item.status : 'draft',
    shortPost,
    posts: [shortPost],
    xArticle,
    media,
    threadFallback: Array.isArray(override.threadFallback)
      ? override.threadFallback.map(cleanText)
      : item.threadFallback,
    followUpReplies: Array.isArray(override.followUpReplies)
      ? override.followUpReplies.map(cleanText)
      : item.followUpReplies,
    requiresBrowserConfirmation: true,
    contentStatus: override.contentStatus || 'ready_for_validation',
    copySource: override.source || 'external-writing-skill',
    copyUpdatedAt: toIsoString(now),
  };
}

export function formatCopyOverrideReport(result) {
  const validation = result.validation;
  const errors = validation.errors.length
    ? validation.errors.map((error) => `- ERROR: ${error}`).join('\n')
    : '- None.';
  const warnings = validation.warnings.length
    ? validation.warnings.map((warning) => `- WARN: ${warning}`).join('\n')
    : '- None.';

  return `# X Copy Override

Generated at: ${result.generatedAt}
Status: ${validation.status}
Queue status: ${result.queueValidation?.status || 'unknown'}

## Target

- Queue id: ${result.item.id}
- Article slug: ${result.item.articleSlug}
- Variant: ${result.item.variant}
- Content status: ${result.item.contentStatus}
- Copy source: ${result.item.copySource}

## Quality Gate

Errors:

${errors}

Warnings:

${warnings}

## Boundary

This only updates local queue copy. It does not open Chrome, upload media, publish, reply, like, repost, follow, edit profile, or pin content.
`;
}

export async function writeCopyOverrideTemplate(template, filePath) {
  await writeJson(filePath, template);
  return filePath;
}

export async function writeCopyOverrideReport(result, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatCopyOverrideReport(result).trimEnd()}\n`);
  return filePath;
}

function pickDefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function cleanText(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim();
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
