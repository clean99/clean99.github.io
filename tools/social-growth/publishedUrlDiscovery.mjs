import { readFile } from 'node:fs/promises';

const DEFAULT_MATCH_THRESHOLD = 0.62;

export async function discoverPublishedUrlsFromStatuses({
  template,
  statuses = [],
  now = new Date(),
  threshold = DEFAULT_MATCH_THRESHOLD,
} = {}) {
  const pendingItems = (template.items || []).filter((item) => item.id && !String(item.url || '').trim());
  const usedStatusUrls = new Set();
  const matches = [];
  const unmatched = [];

  for (const item of pendingItems) {
    const expectedText = await readExpectedPostText(item);
    const match = findBestStatusMatch(expectedText, statuses, {
      usedStatusUrls,
      threshold,
    });

    if (!match) {
      unmatched.push({
        slot: item.slot,
        id: item.id,
        reason: expectedText ? 'no_status_match' : 'missing_expected_post_text',
      });
      continue;
    }

    usedStatusUrls.add(match.status.url);
    matches.push({
      slot: item.slot,
      id: item.id,
      url: match.status.url,
      score: match.score,
      source: match.source,
      publishedAt: item.publishedAt || toIsoString(now),
    });
  }

  const updatedItems = (template.items || []).map((item) => {
    const match = matches.find((entry) => entry.id === item.id);
    if (!match) return item;
    return {
      ...item,
      url: match.url,
      publishedAt: match.publishedAt,
      discoveredBy: 'timeline_match',
      discoveryScore: Number(match.score.toFixed(3)),
    };
  });

  return {
    status: matches.length ? 'updated' : 'no_matches',
    matched: matches.length,
    pending: unmatched.length,
    matches,
    unmatched,
    template: {
      ...template,
      status: updatedItems.some((item) => item.url) ? 'ready_for_recovery' : template.status,
      items: updatedItems,
    },
    publicActions: {
      typedText: false,
      uploadedMedia: false,
      clickedSubmit: false,
    },
  };
}

export function matchPublishedStatus(expectedText, statusText) {
  const expected = normalizeForMatch(expectedText);
  const observed = normalizeForMatch(statusText);
  if (!expected || !observed) return { score: 0, source: 'empty' };
  if (observed.includes(expected)) return { score: 1, source: 'full_text' };

  const snippet = expected.slice(0, Math.min(expected.length, 180));
  if (snippet.length >= 40 && observed.includes(snippet)) {
    return { score: 0.95, source: 'leading_snippet' };
  }

  const grams = jaccardScore(characterGrams(expected), characterGrams(observed));
  return {
    score: grams,
    source: 'character_grams',
  };
}

export function extractFirstPostFromManualKit(markdown) {
  const match = String(markdown || '').match(/## First Post\s+```(?:text)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : '';
}

export function normalizeForMatch(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function readExpectedPostText(item = {}) {
  if (item.expectedText) return String(item.expectedText).trim();
  if (!item.kit) return '';
  try {
    return extractFirstPostFromManualKit(await readFile(item.kit, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

function findBestStatusMatch(expectedText, statuses, { usedStatusUrls, threshold }) {
  if (!expectedText) return null;
  let best = null;

  for (const status of statuses || []) {
    if (!status?.url || usedStatusUrls.has(status.url)) continue;
    const candidate = matchPublishedStatus(expectedText, status.text || '');
    if (!best || candidate.score > best.score) {
      best = {
        status,
        score: candidate.score,
        source: candidate.source,
      };
    }
  }

  if (!best || best.score < Number(threshold || DEFAULT_MATCH_THRESHOLD)) return null;
  return best;
}

function characterGrams(value, size = 3) {
  const compact = String(value || '').replace(/\s+/g, '');
  if (!compact) return new Set();
  if (compact.length <= size) return new Set([compact]);
  const grams = new Set();
  for (let index = 0; index <= compact.length - size; index += 1) {
    grams.add(compact.slice(index, index + size));
  }
  return grams;
}

function jaccardScore(left, right) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const value of left) {
    if (right.has(value)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
