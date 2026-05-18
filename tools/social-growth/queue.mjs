import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildDistributionCandidates } from './copy.mjs';
import { formatQueueItemValidation } from './validation.mjs';

export function buildPublishQueue(articles, options = {}) {
  const createdAt = options.createdAt || new Date().toISOString();
  const limit = Number(options.limit || 5);
  const lang = options.lang || 'zh';
  const candidates = articles
    .filter((article) => !lang || article.lang === lang)
    .slice(0, limit)
    .flatMap((article) => buildDistributionCandidates(article, {
      campaign: options.campaign,
    }));

  return {
    version: 1,
    createdAt,
    status: 'draft',
    items: candidates.map((candidate, index) => queueItemFromCandidate(candidate, {
      createdAt,
      index,
    })),
  };
}

export function queueItemFromCandidate(candidate, { createdAt, index = 0 } = {}) {
  return {
    id: stableQueueId(candidate, index),
    createdAt: createdAt || new Date().toISOString(),
    status: 'draft',
    articleSlug: candidate.articleSlug,
    lang: candidate.lang,
    variant: candidate.variant,
    channel: candidate.channel,
    targetUrl: candidate.targetUrl,
    shortPost: candidate.shortPost,
    xArticle: candidate.xArticle,
    media: candidate.media,
    threadFallback: candidate.threadFallback,
    followUpReplies: candidate.followUpReplies,
    posts: candidate.posts,
    linkPostIndex: candidate.linkPostIndex,
    requiresBrowserConfirmation: candidate.requiresBrowserConfirmation,
  };
}

export function stableQueueId(candidate, index = 0) {
  return [
    candidate.articleSlug,
    candidate.lang,
    candidate.variant,
    String(index).padStart(2, '0'),
  ].join('__');
}

export function composePublishPosts(item) {
  return item.posts.map((post, index) => {
    if (item.linkPostIndex === null || item.linkPostIndex === undefined) return post;
    if (index !== item.linkPostIndex) return post;
    return `${post}\n${item.targetUrl}`.trim();
  });
}

export function prepareBrowserHandoff(item) {
  return {
    id: item.id,
    channel: item.channel,
    status: item.status,
    requiresBrowserConfirmation: true,
    accountAction: 'public_x_post',
    publishOrder: ['generate_image', 'publish_x_article_or_thread', 'publish_short_post_with_image_and_article_link'],
    image: item.media,
    xArticle: item.xArticle,
    threadFallback: item.threadFallback,
    followUpReplies: item.followUpReplies || [],
    shortPost: item.shortPost || composePublishPosts(item)[0],
    posts: composePublishPosts(item),
    stopBeforeFinalClick: true,
  };
}

export function buildPublishPackage(item) {
  const handoff = prepareBrowserHandoff(item);
  return {
    id: item.id,
    files: {
      'image-prompt.txt': formatImagePrompt(handoff.image),
      'x-article.md': formatXArticle(handoff.xArticle),
      'thread-fallback.md': formatThreadFallback(handoff.threadFallback),
      'follow-up-replies.md': formatFollowUpReplies(handoff.followUpReplies),
      'short-post.txt': handoff.shortPost,
      'browser-handoff.json': JSON.stringify(handoff, null, 2),
      'quality-gate.md': formatQueueItemValidation(item),
      'publish-checklist.md': formatPublishChecklist(item),
    },
  };
}

export async function writePublishPackage(item, { outDir = 'data/social-growth/packages' } = {}) {
  const safeId = safePathSegment(item.id);
  const packageDir = join(outDir, safeId);
  const publishPackage = buildPublishPackage(item);

  await mkdir(packageDir, { recursive: true });
  await Promise.all(Object.entries(publishPackage.files).map(([fileName, content]) => (
    writeFile(join(packageDir, fileName), trailingNewline(content))
  )));

  return {
    id: item.id,
    packageDir,
    files: Object.keys(publishPackage.files).map((fileName) => join(packageDir, fileName)),
  };
}

export function mergePublishQueues(existingQueue, nextQueue) {
  const existingById = new Map((existingQueue?.items || []).map((item) => [item.id, item]));
  const nextIds = new Set((nextQueue?.items || []).map((item) => item.id));
  const mergedItems = (nextQueue?.items || []).map((item) => mergeQueueItem(existingById.get(item.id), item));
  const orphanPublishedItems = (existingQueue?.items || [])
    .filter((item) => !nextIds.has(item.id))
    .filter((item) => item.status === 'published' || item.xPostUrl || item.xArticleUrl);

  return {
    ...nextQueue,
    items: [
      ...mergedItems,
      ...orphanPublishedItems,
    ],
  };
}

export function mergeQueueItem(existingItem, nextItem) {
  if (!existingItem) return nextItem;
  const hasPublicationState = existingItem.status === 'published'
    || existingItem.xPostUrl
    || existingItem.xArticleUrl
    || existingItem.publishedAt;
  if (!hasPublicationState) return nextItem;

  return {
    ...nextItem,
    status: existingItem.status,
    publishedAt: existingItem.publishedAt,
    xPostUrl: existingItem.xPostUrl,
    xArticleUrl: existingItem.xArticleUrl,
  };
}

export function formatImagePrompt(image = {}) {
  return [
    `Model: ${image.model || 'gpt-image-2'}`,
    `Size: ${image.size || '1536x1024'}`,
    `Quality: ${image.quality || 'medium'}`,
    `Alt: ${image.alt || ''}`,
    '',
    image.prompt || '',
  ].join('\n').trim();
}

export function formatXArticle(xArticle = {}) {
  return [
    `Title: ${xArticle.title || ''}`,
    '',
    'Body:',
    '',
    xArticle.body || '',
  ].join('\n').trim();
}

export function formatThreadFallback(posts = []) {
  return posts
    .map((post, index) => [`## Post ${index + 1}`, '', post].join('\n'))
    .join('\n\n')
    .trim();
}

export function formatFollowUpReplies(replies = []) {
  return replies
    .map((reply, index) => [`## Reply ${index + 1}`, '', reply].join('\n'))
    .join('\n\n')
    .trim();
}

export function formatPublishChecklist(item) {
  return [
    `# Publish Package: ${item.id}`,
    '',
    `- Variant: ${item.variant}`,
    `- Article slug: ${item.articleSlug}`,
    `- Target blog URL: ${item.targetUrl}`,
    '',
    '## Order',
    '',
    '1. Generate the image from `image-prompt.txt` with built-in imagegen, then register the final PNG into the expected output path.',
    '2. Create the X Article from `x-article.md`.',
    '3. Stop before the final X Article publish click and confirm the account/content.',
    '4. Publish the X Article only after confirmation.',
    '5. Create the short X post from `short-post.txt`, attach the image, and link to the X Article URL.',
    '6. Stop before the final short-post publish click and confirm the account/content.',
    '7. Prepare substantive follow-up replies from `follow-up-replies.md` only after the short post is public.',
    '8. Stop before each public reply click and confirm the account/content.',
    '9. Record the public URL with `social:mark-published`.',
    '',
    '## Boundary',
    '',
    'Public posting, image upload, replies, likes, reposts, follows, and edits require action-time confirmation.',
  ].join('\n');
}

export function markQueueItemPublished(queue, {
  id,
  xPostUrl,
  xArticleUrl,
  publishedAt = new Date().toISOString(),
}) {
  return {
    ...queue,
    items: queue.items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        status: 'published',
        publishedAt,
        xPostUrl,
        xArticleUrl,
      };
    }),
  };
}

export function findQueueItem(queue, id) {
  const item = queue.items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`Queue item not found: ${id}`);
  }
  return item;
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}

function trailingNewline(value) {
  return `${String(value).trimEnd()}\n`;
}
