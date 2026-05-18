import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/compose-draft-resolution.md';
const DEFAULT_IMAGE_DIR = 'output/imagegen';

export function buildComposeDraftResolution({
  queue,
  browserProbe = {},
  browserReadiness = null,
  draftText = browserProbe.composeDraftText,
  day = 1,
  slot = 1,
  publishMode = browserReadiness?.publishMode || 'thread_fallback',
  imageDir = DEFAULT_IMAGE_DIR,
  generatedAt = new Date().toISOString(),
} = {}) {
  const text = String(draftText || '').trim();
  const items = queue?.items || [];
  const matches = matchQueueItems(items, text, { imageDir });
  const bestMatch = matches[0] || null;
  const selectedId = browserReadiness?.selected?.id || '';
  const status = text ? 'needs_resolution' : 'no_compose_draft';

  return {
    generatedAt: toIsoString(generatedAt),
    status,
    selected: {
      day: Number(day || 1),
      slot: Number(slot || 1),
      id: selectedId,
      articleSlug: browserReadiness?.selected?.articleSlug || '',
      expectedPreview: browserReadiness?.composeDraft?.expectedPreview || '',
    },
    draft: {
      text,
      preview: previewText(text),
      length: text.length,
    },
    match: bestMatch,
    matches,
    commands: {
      afterDiscard: browserReadinessCommand({ day, slot, publishMode }),
      afterPublishingExistingDraft: bestMatch
        ? postPublishRecoveryCommand(bestMatch.item.id, publishMode)
        : '',
      imageBriefForExistingDraft: bestMatch
        ? imageBriefCommand(bestMatch.item.id)
        : '',
      status: statusCommand({ day, slot, publishMode }),
    },
    boundary: 'This is a local resolution runbook only. Do not publish, discard drafts, upload media, reply, like, repost, follow, edit profile, pin content, or click final X buttons without action-time confirmation in Chrome.',
  };
}

export function formatComposeDraftResolutionMarkdown(resolution) {
  const match = resolution.match;
  const matchLines = match
    ? [
      `- Queue id: ${match.item.id}`,
      `- Queue status: ${match.item.status || 'unknown'}`,
      `- Article slug: ${match.item.articleSlug || 'unknown'}`,
      `- Variant: ${match.item.variant || 'unknown'}`,
      `- Confidence: ${match.confidence}`,
      `- Reason: ${match.reasons.join('; ')}`,
      `- Current draft matches quality-gated first post: ${yesNo(match.draftMatchesFirstPost)}`,
      `- Image ready for matched item: ${yesNo(match.image.ready)}`,
      `- Expected image: \`${match.image.path}\``,
      `- Alternate ready image for same article: ${match.image.alternateReadyPath ? `\`${match.image.alternateReadyPath}\`` : 'none'}`,
    ].join('\n')
    : '- No queue item confidently matched the current compose draft.';
  const recovery = resolution.commands.afterPublishingExistingDraft
    ? `After the existing draft is confirmed public, paste its public X URL here:\n\n\`\`\`bash\n${resolution.commands.afterPublishingExistingDraft}\n\`\`\``
    : 'No recovery command is suggested because the current compose draft did not match a queue item.';

  return `# X Compose Draft Resolution

Generated at: ${resolution.generatedAt}
Status: ${resolution.status}

## Current Draft

- Length: ${resolution.draft.length}
- Preview: ${resolution.draft.preview || 'none'}

\`\`\`text
${resolution.draft.text || 'No compose draft captured.'}
\`\`\`

## Selected Package Waiting Behind It

- Day: ${resolution.selected.day}
- Slot: ${resolution.selected.slot}
- Queue id: ${resolution.selected.id || 'unknown'}
- Article slug: ${resolution.selected.articleSlug || 'unknown'}
- Expected selected first post: ${resolution.selected.expectedPreview || 'unknown'}

## Likely Queue Match For Existing Draft

${matchLines}

## Safe Resolution Paths

1. If this existing draft should be published, review it in Chrome and stop before every public button until action-time confirmation. Do not overwrite it with the selected package.
2. If this existing draft should not be published, discard it in Chrome only after confirming that losing the draft is acceptable. Then rerun browser readiness.
3. If you are unsure, leave the compose tab untouched. The selected package must stay blocked until the existing draft is resolved.

## Existing Draft Publishability

${formatPublishability(match, resolution)}

${recovery}

After discarding or otherwise clearing the draft, refresh readiness:

\`\`\`bash
${resolution.commands.afterDiscard}
${resolution.commands.status}
\`\`\`

## Boundary

${resolution.boundary}
`;
}

export async function writeComposeDraftResolution(resolution, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatComposeDraftResolutionMarkdown(resolution).trimEnd()}\n`);
  return filePath;
}

function formatPublishability(match, resolution) {
  if (!resolution.draft.text) return '- No compose draft is captured.';
  if (!match) {
    return [
      '- Do not publish this draft as part of the measured queue yet.',
      '- It does not map cleanly to a queue item, so metrics would be hard to attribute.',
    ].join('\n');
  }

  const lines = [];
  lines.push(`- Queue item status: ${match.item.status || 'unknown'}.`);
  lines.push(`- Draft matches queue first post: ${yesNo(match.draftMatchesFirstPost)}.`);
  lines.push(`- Image ready: ${yesNo(match.image.ready)}.`);
  lines.push(`- Expected image: \`${match.image.path}\`.`);
  if (match.image.alternateReadyPath) {
    lines.push(`- Alternate ready same-article image: \`${match.image.alternateReadyPath}\`.`);
  }
  if (!match.draftMatchesFirstPost) {
    lines.push('- The compose draft does not match the quality-gated short post/thread first post for the matched queue item.');
  }
  if (!match.image.ready) {
    lines.push('- The matched queue item does not have its expected image ready. Publishing it as-is would violate the image-first package strategy.');
    lines.push(`- Generate or register the matched image before using this draft as a measured growth post:`);
    lines.push('');
    lines.push('```bash');
    lines.push(resolution.commands.imageBriefForExistingDraft);
    lines.push('```');
  }
  if (match.image.alternateReadyPath) {
    lines.push('- The alternate image can help recover the article, but using it for this variant should be treated as an intentional override.');
  }
  if (match.draftMatchesFirstPost && match.image.ready) {
    lines.push('- The draft maps to a queue item and the expected image is ready. It can be reviewed as the current publish candidate after action-time confirmation.');
  } else {
    lines.push('- Recommendation: do not treat this existing draft as a healthy growth slot until the copy and image package are resolved.');
  }
  return lines.join('\n');
}

function matchQueueItems(items, draftText, { imageDir = DEFAULT_IMAGE_DIR } = {}) {
  const draft = normalize(draftText);
  if (!draft) return [];

  return items
    .map((item) => scoreQueueItem(item, draft, { items, imageDir }))
    .filter((match) => match.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence || left.item.id.localeCompare(right.item.id))
    .slice(0, 5);
}

function scoreQueueItem(item, draft, { items, imageDir }) {
  let confidence = 0;
  const reasons = [];
  const candidates = [
    ['X Article title', item.xArticle?.title, 110],
    ['short post', item.shortPost, 100],
    ['thread first post', item.threadFallback?.[0], 100],
    ['article slug', slugPhrase(item.articleSlug), 70],
    ['queue id slug', slugPhrase(item.id), 55],
  ];

  for (const [label, rawText, weight] of candidates) {
    const candidate = normalize(rawText);
    if (!candidate) continue;
    if (draft === candidate || draft.startsWith(`${candidate} `)) {
      confidence += weight;
      reasons.push(`${label} matches the draft start`);
    } else if (candidate.length >= 20 && draft.includes(candidate.slice(0, Math.min(candidate.length, 80)))) {
      confidence += Math.round(weight * 0.7);
      reasons.push(`${label} overlaps the draft`);
    }
  }

  const slugTokens = normalize(slugPhrase(item.articleSlug || item.id)).split(' ').filter(Boolean);
  const prefix = slugTokens.slice(0, Math.min(4, slugTokens.length)).join(' ');
  if (prefix && prefix.length >= 10 && draft.includes(prefix)) {
    confidence += 65;
    reasons.push(`draft contains slug prefix "${prefix}"`);
  }

  const shared = slugTokens.filter((token) => token.length > 2 && draft.includes(token));
  if (shared.length >= 3) {
    confidence += Math.min(45, shared.length * 7);
    reasons.push(`draft shares ${shared.length} slug token(s)`);
  }

  return {
    item,
    confidence: Math.min(100, confidence),
    reasons: reasons.length ? reasons : ['weak textual overlap'],
    draftMatchesFirstPost: draftMatchesAny(draft, [item.shortPost, item.threadFallback?.[0]]),
    image: resolveQueueImage({
      item,
      items,
      imageDir,
    }),
  };
}

function draftMatchesAny(draft, candidates) {
  return candidates.some((candidate) => {
    const normalized = normalize(candidate);
    return normalized && (draft === normalized || draft.startsWith(`${normalized} `));
  });
}

function resolveQueueImage({ item, items, imageDir }) {
  const path = resolveImagePath(imageDir, item.id);
  const sameArticleIds = items
    .filter((candidate) => candidate.articleSlug === item.articleSlug)
    .map((candidate) => candidate.id);
  const alternateReadyPath = sameArticleIds
    .filter((id) => id !== item.id)
    .map((id) => resolveImagePath(imageDir, id))
    .find((candidate) => candidate.ready)?.path || '';

  return {
    path: path.path,
    ready: path.ready,
    alternateReadyPath,
  };
}

function resolveImagePath(imageDir, id) {
  const canonical = join(imageDir, `${safePathSegment(id)}.png`);
  if (existsSync(canonical)) return { path: canonical, ready: true };
  const legacy = findLegacyImagePath(imageDir, id);
  if (legacy) return { path: legacy, ready: true };
  return { path: canonical, ready: false };
}

function findLegacyImagePath(imageDir, id) {
  try {
    const prefix = `${safePathSegment(id)}__`;
    const file = readdirSync(imageDir)
      .filter((name) => name.startsWith(prefix) && name.endsWith('.png'))
      .sort()[0];
    return file ? join(imageDir, file) : '';
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function postPublishRecoveryCommand(id, publishMode) {
  const urlArg = publishMode === 'thread_fallback' ? "'<x-thread-url>'" : "'<x-post-url>'";
  const articleArg = publishMode === 'thread_fallback' ? '' : " --article-url '<x-article-url>'";
  return `${nodeCommand()} tools/social-growth/cli.mjs post-publish-recovery --queue data/social-growth/queue.json --id ${shellQuote(id)} --url ${urlArg}${articleArg} --reply-out data/social-growth/thread-reply-handoff.md`;
}

function imageBriefCommand(id) {
  return `${nodeCommand()} tools/social-growth/cli.mjs image-brief --id ${shellQuote(id)}`;
}

function browserReadinessCommand({ day, slot, publishMode }) {
  return `${nodeCommand()} tools/social-growth/cli.mjs browser-readiness --day ${Number(day || 1)} --slot ${Number(slot || 1)}${publishModeArg(publishMode)} --out data/social-growth/browser-readiness.md`;
}

function statusCommand({ day, slot, publishMode }) {
  return `${nodeCommand()} tools/social-growth/cli.mjs status --day ${Number(day || 1)} --slot ${Number(slot || 1)}${publishModeArg(publishMode)} --out data/social-growth/status.md`;
}

function publishModeArg(publishMode) {
  return publishMode === 'thread_fallback' ? ' --publishMode thread_fallback' : '';
}

function slugPhrase(value) {
  return String(value || '')
    .replace(/__.*$/, '')
    .replace(/[-_/]+/g, ' ');
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[#*_`"'“”‘’.,:;!?()[\]{}，。：；！？（）【】、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function previewText(value, limit = 120) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function nodeCommand() {
  return shellQuote(process.execPath);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
