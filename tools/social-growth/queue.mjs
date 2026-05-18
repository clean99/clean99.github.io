import { readFile, writeFile } from 'node:fs/promises';
import { buildDistributionCandidates } from './copy.mjs';

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
    shortPost: item.shortPost || composePublishPosts(item)[0],
    posts: composePublishPosts(item),
    stopBeforeFinalClick: true,
  };
}

export function markQueueItemPublished(queue, { id, xPostUrl, publishedAt = new Date().toISOString() }) {
  return {
    ...queue,
    items: queue.items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        status: 'published',
        publishedAt,
        xPostUrl,
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
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
