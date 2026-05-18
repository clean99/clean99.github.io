import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCompactNumber } from './metrics.mjs';
import { readJson, writeJson } from './queue.mjs';

const METRIC_LABELS = {
  views: ['views', 'impressions', '浏览', '浏览量', '展示'],
  likes: ['likes', 'like', '赞', '喜欢'],
  replies: ['replies', 'reply', '回复', '评论'],
  reposts: ['reposts', 'repost', 'retweets', 'retweet', '转发', '转帖'],
  quotes: ['quotes', 'quote', '引用'],
  bookmarks: ['bookmarks', 'bookmark', '书签', '收藏'],
  profileClicks: ['profile clicks', 'profile visits', '主页点击', '资料点击', '个人资料点击'],
  follows: ['new follows', 'follows from this post', 'follows', '新增关注', '关注增长'],
};

const FOLLOWER_LABELS = ['followers', '关注者', '粉丝'];
const VALUE_RE = /([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:K|M|B|万|亿))?)(?![A-Za-z])/i;

export function parseXProfileMetrics(text) {
  return {
    followers: extractFollowerCount(text),
  };
}

export function parseXPostMetrics(text) {
  return Object.fromEntries(
    Object.entries(METRIC_LABELS).map(([field, labels]) => [field, extractMetricByLabels(text, labels)]),
  );
}

export function applyCapturedMetrics(template, { profileText, postTextsById = {} } = {}) {
  const next = structuredClone(template);
  const profile = profileText ? parseXProfileMetrics(profileText) : {};

  if (profile.followers !== undefined) {
    next.followers = String(profile.followers);
  }

  next.posts = (next.posts || []).map((post) => {
    const postText = postTextsById[post.id];
    if (!postText) return post;

    const parsedMetrics = parseXPostMetrics(postText);
    return {
      ...post,
      metrics: {
        ...(post.metrics || {}),
        ...compactDefinedMetrics(parsedMetrics),
      },
    };
  });

  return next;
}

export async function updateMetricsTemplateFromText({
  metricsPath,
  outPath = metricsPath,
  profileTextPath,
  postTextDir,
}) {
  const template = await readJson(metricsPath);
  const profileText = profileTextPath ? await readFile(profileTextPath, 'utf8') : '';
  const postTextsById = postTextDir ? await readPostTexts(postTextDir) : {};
  const updated = applyCapturedMetrics(template, {
    profileText,
    postTextsById,
  });

  await writeJson(outPath, updated);
  return {
    outPath,
    followers: updated.followers,
    postMetricsUpdated: Object.keys(postTextsById).length,
  };
}

export function extractFollowerCount(text) {
  const lines = visibleLines(text);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!containsAnyLabel(line, FOLLOWER_LABELS) || /following/i.test(line)) continue;

    const sameLine = parseFirstValue(line);
    if (sameLine !== undefined) return sameLine;

    const previousLine = lines[index - 1] || '';
    const nextLine = lines[index + 1] || '';
    if (isValueOnly(nextLine)) return parseFirstValue(nextLine);
    if (isValueOnly(previousLine)) return parseFirstValue(previousLine);
  }

  return undefined;
}

export function extractMetricByLabels(text, labels) {
  const lines = visibleLines(text);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!containsAnyLabel(line, labels)) continue;

    const sameLine = parseFirstValue(line);
    if (sameLine !== undefined) return sameLine;

    const previousLine = lines[index - 1] || '';
    const nextLine = lines[index + 1] || '';
    if (isValueOnly(nextLine)) return parseFirstValue(nextLine);
    if (isValueOnly(previousLine)) return parseFirstValue(previousLine);
  }

  return undefined;
}

async function readPostTexts(postTextDir) {
  const files = (await readOptionalDir(postTextDir)).filter((file) => file.endsWith('.txt'));
  const entries = await Promise.all(files.map(async (file) => {
    const id = file.replace(/\.txt$/, '');
    const text = await readFile(join(postTextDir, file), 'utf8');
    return [id, text];
  }));

  return Object.fromEntries(entries);
}

async function readOptionalDir(dirPath) {
  try {
    return await readdir(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function compactDefinedMetrics(metrics) {
  return Object.fromEntries(
    Object.entries(metrics)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

function visibleLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function containsAnyLabel(line, labels) {
  const normalized = line.toLowerCase();
  return labels.some((label) => normalized.includes(label.toLowerCase()));
}

function isValueOnly(line) {
  return new RegExp(`^${VALUE_RE.source}$`, 'i').test(line.trim());
}

function parseFirstValue(line) {
  const match = line.match(VALUE_RE);
  if (!match) return undefined;
  return parseCompactNumber(match[1]);
}
