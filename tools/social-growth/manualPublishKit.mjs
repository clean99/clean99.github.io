import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/manual-publish-kit.md';
const DEFAULT_BATCH_DIR = 'data/social-growth/manual-publish-kits';

export function buildManualPublishKit({
  confirmation,
  account = '@Clean993',
  profileTextPath = 'data/social-growth/profile.local.txt',
  postTextDir = 'data/social-growth/post-texts',
} = {}) {
  if (!confirmation?.selected?.id) {
    throw new Error('publish confirmation packet is required');
  }
  const blockers = [
    ...(confirmation.blockers || []),
    ...(!confirmation.selected.imageReady ? [`Image file is missing: ${confirmation.selected.imagePath}`] : []),
  ];
  const threadPosts = confirmation.content?.threadFallback || [];
  const firstPost = confirmation.publishMode === 'thread_fallback'
    ? (threadPosts[0] || confirmation.content?.imagePost || '')
    : (confirmation.content?.imagePost || '');
  const remainingThreadPosts = confirmation.publishMode === 'thread_fallback'
    ? threadPosts.slice(1)
    : [];
  const postTextPath = join(postTextDir, `${confirmation.selected.id}.txt`);

  return {
    generatedAt: confirmation.generatedAt,
    status: blockers.length ? 'blocked' : 'ready_for_manual_confirmation',
    blockers,
    account,
    selected: confirmation.selected,
    image: {
      path: confirmation.selected.imagePath || '',
      absolutePath: confirmation.selected.imagePath ? resolve(confirmation.selected.imagePath) : '',
    },
    publishMode: confirmation.publishMode,
    firstPost,
    remainingThreadPosts,
    followUpReplies: confirmation.content?.followUpReplies || [],
    recoveryCommand: confirmation.commands?.recoverPublished || confirmation.commands?.recordPublished || '',
    legacyRecordCommand: confirmation.commands?.recordPublished || '',
    metrics: {
      profileTextPath,
      postTextPath,
      metricsCycleCommand: `npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text ${profileTextPath} --post-text-dir ${postTextDir}`,
    },
    boundary: 'Manual publish kit only. Publishing, uploading media, replying, liking, reposting, following, editing the profile, and pinning content still require action-time confirmation in Chrome.',
  };
}

export function formatManualPublishKitMarkdown(kit) {
  const blockers = kit.blockers.length
    ? kit.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers. Use this only after confirming the Chrome account and content.';
  const remainingPosts = kit.remainingThreadPosts.length
    ? kit.remainingThreadPosts.map((post, index) => `### Thread Post ${index + 2}\n\n\`\`\`text\n${post}\n\`\`\``).join('\n\n')
    : '- No remaining thread posts.';
  const followUps = kit.followUpReplies.length
    ? kit.followUpReplies.map((reply, index) => `### Follow-up Reply ${index + 1}\n\n\`\`\`text\n${reply}\n\`\`\``).join('\n\n')
    : '- No optional follow-up replies.';

  return `# Manual X Publish Kit

Generated at: ${kit.generatedAt}
Status: ${kit.status}

## Account And Package

- Expected account: \`${kit.account}\`
- Queue id: ${kit.selected.id}
- Article slug: ${kit.selected.articleSlug}
- Variant: ${kit.selected.variant}
- Publish mode: ${kit.publishMode}
- Image: \`${kit.image.path}\`
- Absolute image path: \`${kit.image.absolutePath || 'missing'}\`
- Blog URL: ${kit.selected.targetUrl}

## Local Blockers

${blockers}

## Manual Publish Steps

1. Open X in a Chrome profile already logged in as \`${kit.account}\`.
2. Create a post manually.
3. Paste the first post below and attach the absolute image path above.
4. Stop before the final public publish click and confirm account/content.
5. After the first post is public, copy its public status URL.
6. Run the recovery command below.
7. Use the generated \`data/social-growth/thread-reply-handoff.md\` for remaining replies. Stop before each public Reply click.
8. Copy visible profile text into \`${kit.metrics.profileTextPath}\` and post metrics text into \`${kit.metrics.postTextPath}\`, then rerun the metrics cycle.

## First Post

\`\`\`text
${kit.firstPost}
\`\`\`

## Remaining Thread Posts

${remainingPosts}

## Optional Follow-up Replies

${followUps}

## After Publication

Preferred recovery command:

\`\`\`bash
${kit.recoveryCommand}
\`\`\`

Legacy record-only command:

\`\`\`bash
${kit.legacyRecordCommand}
\`\`\`

Metrics cycle after copied visible text:

\`\`\`bash
${kit.metrics.metricsCycleCommand}
\`\`\`

## Boundary

${kit.boundary}
`;
}

export async function writeManualPublishKit(kit, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatManualPublishKitMarkdown(kit).trimEnd()}\n`);
  return filePath;
}

export function manualPublishKitPath({
  day,
  slot,
  id,
  outDir = DEFAULT_BATCH_DIR,
} = {}) {
  return join(outDir, `day${Number(day || 1)}-slot${Number(slot || 1)}-${safePathSegment(id || 'manual-publish-kit')}.md`);
}

export function manualPublishKitIndexPath({
  day,
  outDir = DEFAULT_BATCH_DIR,
} = {}) {
  return join(outDir, `day${Number(day || 1)}-ready-slots.md`);
}

export function manualPublishUrlTemplatePath({
  day,
  outDir = DEFAULT_BATCH_DIR,
} = {}) {
  return join(outDir, `day${Number(day || 1)}-published-urls.json`);
}

export function buildManualPublishUrlTemplate({
  generatedAt = new Date().toISOString(),
  day = 1,
  date = '',
  kits = [],
} = {}) {
  return {
    version: 1,
    generatedAt,
    status: kits.length ? 'ready_for_url_capture' : 'no_ready_slots',
    day: Number(day || 1),
    date,
    items: kits.map((entry) => ({
      slot: Number(entry.slot || 1),
      id: entry.id,
      url: '',
      articleUrl: '',
      publishedAt: '',
    })),
    boundary: 'Fill only after manual Chrome publication has been confirmed. This file is for local queue/metrics recovery and performs no public X actions.',
  };
}

export function buildManualPublishKitIndex({
  generatedAt = new Date().toISOString(),
  day = 1,
  date = '',
  readySlots = 0,
  totalSlots = 0,
  kits = [],
  urlTemplatePath = '',
  batchRecoveryCommand = '',
} = {}) {
  const recoveryCommand = batchRecoveryCommand || (
    urlTemplatePath
      ? `npm run social:post-publish-recovery-batch -- --input ${shellQuote(urlTemplatePath)} --queue data/social-growth/queue.json --metrics data/social-growth/posts.local.json --reply-out-dir data/social-growth/thread-replies --launch-window-dir data/social-growth/launch-windows`
      : ''
  );
  return {
    generatedAt,
    status: kits.length ? 'ready_for_manual_confirmation' : 'no_ready_slots',
    day: Number(day || 1),
    date,
    readySlots: numberOrDefault(readySlots, kits.length),
    totalSlots: numberOrDefault(totalSlots, kits.length),
    kits,
    batchRecovery: {
      urlTemplatePath,
      command: recoveryCommand,
    },
    boundary: 'Manual publish kits only. Publishing, uploading media, replying, liking, reposting, following, editing the profile, and pinning content still require action-time confirmation in Chrome.',
  };
}

export function formatManualPublishKitIndexMarkdown(index) {
  const kits = index.kits.length
    ? index.kits.map(formatManualKitEntry).join('\n\n')
    : '- No ready manual publish kits were generated.';
  const batchRecovery = formatBatchRecovery(index);

  return `# Manual X Publish Kits

Generated at: ${index.generatedAt}
Status: ${index.status}
Day: ${index.day}
Date: ${index.date || 'unknown'}
Ready slots: ${index.readySlots}/${index.totalSlots}

## Kits

${kits}

## Batch Recovery

${batchRecovery}

## Boundary

${index.boundary}
`;
}

export async function writeManualPublishUrlTemplate(template, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(template, null, 2)}\n`);
  return filePath;
}

export async function writeManualPublishKitIndex(index, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatManualPublishKitIndexMarkdown(index).trimEnd()}\n`);
  return filePath;
}

function formatManualKitEntry(entry) {
  return `### Slot ${entry.slot}: ${entry.id}

- Time: ${entry.time || 'unknown'}
- Status: ${entry.status}
- Kit: \`${entry.path}\`
- Absolute image path: \`${entry.imageAbsolutePath || 'missing'}\`

After confirmed publication:

\`\`\`bash
${entry.recoveryCommand}
\`\`\``;
}

function formatBatchRecovery(index) {
  if (!index.kits?.length) {
    return '- Not available because no ready kits were generated.';
  }
  return `1. After confirmed publication, fill \`url\` for each published item in \`${index.batchRecovery.urlTemplatePath}\`.
2. Leave unpublished items blank.
3. Run the batch recovery command:

\`\`\`bash
${index.batchRecovery.command}
\`\`\``;
}

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}

function numberOrDefault(value, fallback) {
  if (value === undefined || value === null || value === '') return Number(fallback || 0);
  return Number(value);
}
