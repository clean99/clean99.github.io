import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { findQueueItem } from './queue.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/publish-confirmation.md';
const ARTICLE_URL_PLACEHOLDER = '<x-article-url>';
const THREAD_URL_PLACEHOLDER = '<x-thread-url>';
const THREAD_STATUS_ID_PLACEHOLDER = 'THREAD_STATUS_ID';
const X_WEB_INTENT_REFERENCE = 'https://docs.x.com/x-for-websites/web-intents/overview';
const X_ARTICLE_META_PATTERNS = [
  /本文从/u,
  /本文记录/u,
  /本文围绕/u,
  /原文围绕/u,
  /为什么值得读原文/u,
  /短帖只能/u,
  /原文适合/u,
  /读者应该带走的是/u,
];
const REPLY_META_PATTERNS = [
  /有没有证据/u,
  /你现在是不是/u,
  /下一步能不能/u,
];

export function buildPublishConfirmation({
  queue,
  preflight,
  xPublishPrep,
  generatedAt = preflight?.generatedAt || new Date().toISOString(),
} = {}) {
  if (!preflight?.selected?.id) {
    throw new Error('preflight with a selected item is required');
  }
  const item = findQueueItem(queue, preflight.selected.id);
  const blockers = dedupe([
    ...(preflight.blockers || []),
    ...(xPublishPrep?.blockers || []),
  ]);
  const contentReview = reviewContent(item);
  const publishMode = xPublishPrep?.publishMode || 'x_article';

  return {
    generatedAt: toIsoString(generatedAt),
    status: confirmationStatus({ blockers, contentReview }),
    blockers,
    contentReview,
    publishMode,
    selected: {
      id: item.id,
      articleSlug: item.articleSlug,
      variant: item.variant,
      packageDir: preflight.selected.packageDir,
      imagePath: preflight.image?.outputPath || preflight.selected.imagePath,
      imageReady: Boolean(preflight.image?.ready),
      targetUrl: item.targetUrl,
    },
    content: {
      xArticle: item.xArticle || {},
      imagePost: publishMode === 'thread_fallback'
        ? (item.threadFallback?.[0] || item.shortPost || '')
        : imagePostWithArticlePlaceholder(item.shortPost || '', ARTICLE_URL_PLACEHOLDER),
      followUpReplies: item.followUpReplies || [],
      threadFallback: item.threadFallback || [],
    },
    commands: {
      prepareArticle: xPublishPrep?.commands?.prepareArticle || '',
      prepareShortPost: xPublishPrep?.commands?.prepareShortPost || '',
      prepareThreadReplies: publishMode === 'thread_fallback'
        ? threadReplyIntents(item.threadFallback || [])
        : [],
      prepareFollowUpReplies: followUpReplyIntents(item.followUpReplies || []),
      recordPublished: publishMode === 'thread_fallback'
        ? `npm run social:mark-published -- --queue data/social-growth/queue.json --id ${item.id} --url ${THREAD_URL_PLACEHOLDER} --reply-out data/social-growth/thread-reply-handoff.md`
        : (preflight.browser?.recordCommand || `npm run social:mark-published -- --queue data/social-growth/queue.json --id ${item.id} --url <x-post-url> --article-url <x-article-url>`),
    },
    stopBefore: [
      publishMode === 'thread_fallback' ? null : 'final X Article publish click',
      'media upload or cover upload confirmation',
      publishMode === 'thread_fallback' ? 'final image-backed thread first-post publish click' : 'final image-backed short-post publish click',
      'each public follow-up Reply click',
      'any like, repost, quote, follow, profile edit, or pinned-post action',
    ].filter(Boolean),
  };
}

export function formatPublishConfirmationMarkdown(packet) {
  const blockers = packet.blockers.length
    ? packet.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers. This package is ready for account/content confirmation.';
  const stopPoints = packet.stopBefore.map((item) => `- ${item}`).join('\n');
  const reviewLines = formatContentReview(packet.contentReview);
  const replies = packet.content.followUpReplies.length
    ? packet.content.followUpReplies.map((reply, index) => `### Reply ${index + 1}\n\n${reply}`).join('\n\n')
    : '- No follow-up replies prepared.';
  const threadFallback = packet.content.threadFallback.length
    ? packet.content.threadFallback.map((post, index) => `### Thread Post ${index + 1}\n\n${post}`).join('\n\n')
    : '- No fallback thread prepared.';
  const threadReplyCommands = formatReplyIntentCommands(
    packet.commands.prepareThreadReplies || [],
    'No thread reply intent links generated.',
  );
  const followUpReplyCommands = formatReplyIntentCommands(
    packet.commands.prepareFollowUpReplies || [],
    'No follow-up reply intent links generated.',
  );

  return `# X Publish Confirmation Packet

Generated at: ${packet.generatedAt}
Status: ${packet.status}

## Selected Package

- Queue id: ${packet.selected.id}
- Article slug: ${packet.selected.articleSlug}
- Variant: ${packet.selected.variant}
- Package: \`${packet.selected.packageDir}\`
- Image: \`${packet.selected.imagePath}\`
- Image ready: ${packet.selected.imageReady}
- Publish mode: ${packet.publishMode}
- Blog URL: ${packet.selected.targetUrl}

## Local Blockers

${blockers}

## Content Review

- Status: ${packet.contentReview?.status || 'unknown'}
- Issues: ${packet.contentReview?.issues?.length ?? 'unknown'}

${reviewLines}

If this section has FIX items, update the copy with:

\`\`\`bash
npm run social:x-tech-brief -- --id ${packet.selected.id}
npm run social:apply-copy -- --input data/social-growth/copy-overrides/${packet.selected.id}.json
npm run social:confirmation -- --id ${packet.selected.id} --out data/social-growth/publish-confirmation.md
\`\`\`

## Approval Order

${formatApprovalOrder(packet)}

## Stop Points

${stopPoints}

${formatPrimaryArticleSection(packet)}

## Image-backed ${packet.publishMode === 'thread_fallback' ? 'Thread First Post' : 'Short Post'} To Review

\`\`\`text
${packet.content.imagePost}
\`\`\`

## Follow-up Replies To Review

${replies}

## Thread Fallback If X Article Is Unavailable

${threadFallback}

## Browser Prep Commands

Prepare X Article:

\`\`\`bash
${packet.commands.prepareArticle || '# No x-article command generated.'}
\`\`\`

Prepare ${packet.publishMode === 'thread_fallback' ? 'thread first post' : 'image-backed short post after replacing the article URL'}:

\`\`\`bash
${packet.commands.prepareShortPost || '# No short-post command generated.'}
\`\`\`

Prepare remaining thread posts after the first post is public:

Intent reference: ${X_WEB_INTENT_REFERENCE}

${threadReplyCommands}

Prepare optional follow-up replies after the thread is complete:

${followUpReplyCommands}

## After Confirmed Publication

Record the public URLs:

\`\`\`bash
${packet.commands.recordPublished}
\`\`\`

## Boundary

This file is not permission to perform public X actions. Publishing, uploading media, replying, liking, reposting, quoting, following, editing the profile, and pinning content still require action-time confirmation.
`;
}

function formatApprovalOrder(packet) {
  if (packet.publishMode === 'thread_fallback') {
    return `1. Confirm the Chrome account is \`@Clean993\`.
2. Review and prepare the image-backed thread first post below.
3. Stop before media upload confirmation and the final thread first-post publish click.
4. Only after the first post is public, prepare the remaining thread replies.
5. Stop before each public Reply click.
6. Record the public thread URL.`;
  }

  return `1. Confirm the Chrome account is \`@Clean993\`.
2. Review and prepare the X Article below.
3. Stop before the final X Article publish click.
4. After the X Article is public, replace \`${ARTICLE_URL_PLACEHOLDER}\` in the image post with the real X Article URL.
5. Review and prepare the image-backed short post below.
6. Stop before the final short-post publish click.
7. Only after the short post is public, review optional follow-up replies.
8. Stop before each public Reply click.`;
}

function formatPrimaryArticleSection(packet) {
  if (packet.publishMode === 'thread_fallback') {
    return `## X Article Status

X Article publishing is unavailable for this account/browser path. Use the thread fallback as the primary publishing path for this package.`;
  }

  return `## X Article To Review

Title:

\`\`\`text
${packet.content.xArticle.title || ''}
\`\`\`

Body:

\`\`\`markdown
${packet.content.xArticle.body || ''}
\`\`\``;
}

export async function writePublishConfirmation(packet, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublishConfirmationMarkdown(packet).trimEnd()}\n`);
  return filePath;
}

export function buildThreadReplyHandoff({
  queue,
  id,
  threadUrl,
  generatedAt = new Date().toISOString(),
} = {}) {
  const item = findQueueItem(queue, id);
  const resolvedThreadUrl = threadUrl || item.xPostUrl || '';
  const statusId = extractXStatusId(resolvedThreadUrl);
  const threadReplies = threadReplyIntents(item.threadFallback || [])
    .map((intent) => materializeReplyIntent(intent, statusId));
  const followUpReplies = followUpReplyIntents(item.followUpReplies || [])
    .map((intent) => materializeReplyIntent(intent, statusId));

  return {
    generatedAt: toIsoString(generatedAt),
    status: threadReplyHandoffStatus({ statusId, threadReplies, followUpReplies }),
    queueId: item.id,
    articleSlug: item.articleSlug,
    threadUrl: resolvedThreadUrl,
    statusId,
    threadReplies,
    followUpReplies,
    boundary: 'Reply handoff only. Opening intent URLs may prefill replies, but every public Reply click still requires action-time confirmation in Chrome.',
  };
}

export async function writeThreadReplyHandoff(handoff, filePath = 'data/social-growth/thread-reply-handoff.md') {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatThreadReplyHandoffMarkdown(handoff).trimEnd()}\n`);
  return filePath;
}

export function formatThreadReplyHandoffMarkdown(handoff) {
  const threadReplies = formatReplyIntentCommands(
    handoff.threadReplies || [],
    'No remaining thread posts.',
  );
  const followUpReplies = formatReplyIntentCommands(
    handoff.followUpReplies || [],
    'No optional follow-up replies.',
  );

  return `# X Thread Reply Handoff

Generated at: ${handoff.generatedAt}
Status: ${handoff.status}

## Source

- Queue id: ${handoff.queueId}
- Article slug: ${handoff.articleSlug}
- Thread URL: ${handoff.threadUrl || 'missing'}
- Status id: ${handoff.statusId || 'missing'}
- Intent reference: ${X_WEB_INTENT_REFERENCE}

## Remaining Thread Posts

${threadReplies}

## Optional Follow-up Replies

${followUpReplies}

## Boundary

${handoff.boundary}
`;
}

export function extractXStatusId(value) {
  const match = String(value || '').match(/\/status(?:es)?\/(\d+)/i);
  return match?.[1] || '';
}

function imagePostWithArticlePlaceholder(shortPost, articleUrlPlaceholder) {
  return `${shortPost.trim()}\n\n${articleUrlPlaceholder}`.trim();
}

function threadReplyIntents(posts = []) {
  return posts.slice(1).map((text, index) => replyIntent({
    label: `Thread post ${index + 2}`,
    text,
  }));
}

function followUpReplyIntents(replies = []) {
  return replies.map((text, index) => replyIntent({
    label: `Follow-up reply ${index + 1}`,
    text,
  }));
}

function replyIntent({ label, text }) {
  const encodedText = encodeURIComponent(text);
  return {
    label,
    text,
    url: `https://x.com/intent/tweet?in_reply_to=${THREAD_STATUS_ID_PLACEHOLDER}&text=${encodedText}`,
    note: `Replace ${THREAD_STATUS_ID_PLACEHOLDER} with the numeric status id from ${THREAD_URL_PLACEHOLDER}; stop before the final public Reply click.`,
  };
}

function materializeReplyIntent(intent, statusId) {
  if (!statusId) return intent;
  return {
    ...intent,
    url: intent.url.replace(THREAD_STATUS_ID_PLACEHOLDER, statusId),
    note: `Open this URL, confirm it is replying to ${statusId}, then stop before the final public Reply click.`,
  };
}

function threadReplyHandoffStatus({ statusId, threadReplies, followUpReplies }) {
  if (!statusId) return 'needs_status_id';
  if (!threadReplies.length && !followUpReplies.length) return 'no_replies';
  return 'ready_for_confirmation';
}

function formatReplyIntentCommands(items, emptyText) {
  if (!items.length) return `- ${emptyText}`;

  return items.map((item) => `### ${item.label}

- Open: ${item.url}
- Note: ${item.note}

Text:

\`\`\`text
${item.text}
\`\`\``).join('\n\n');
}

function reviewContent(item) {
  const issues = [];
  const body = String(item.xArticle?.body || '');
  const replies = item.followUpReplies || [];

  if (X_ARTICLE_META_PATTERNS.some((pattern) => pattern.test(body))) {
    issues.push('X Article still contains long-form article-summary framing; replace it with problem -> cause -> mechanism -> evidence.');
  }
  if (!/##\s*验证|##\s*证据|##\s*取舍/u.test(body)) {
    issues.push('X Article should include a verification, evidence, or tradeoff section before asking for the blog click.');
  }
  if (replies.some((reply) => REPLY_META_PATTERNS.some((pattern) => pattern.test(reply)))) {
    issues.push('Follow-up replies sound like generated checklist questions; rewrite them as concrete proof, caveat, or implementation detail.');
  }

  return {
    status: issues.length ? 'needs_copy_review' : 'pass',
    issues,
  };
}

function confirmationStatus({ blockers, contentReview }) {
  if (blockers.length) return 'blocked';
  if (contentReview.status !== 'pass') return 'needs_copy_review';
  return 'ready_for_confirmation';
}

function formatContentReview(review = {}) {
  const issues = review.issues || [];
  if (!issues.length) {
    return '- PASS: confirmation copy has no final-review issues.';
  }
  return issues.map((issue) => `- FIX: ${issue}`).join('\n');
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
