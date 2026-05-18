import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { findQueueItem } from './queue.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/publish-confirmation.md';
const ARTICLE_URL_PLACEHOLDER = '<x-article-url>';

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

  return {
    generatedAt: toIsoString(generatedAt),
    status: blockers.length ? 'blocked' : 'ready_for_confirmation',
    blockers,
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
      imagePost: imagePostWithArticlePlaceholder(item.shortPost || '', ARTICLE_URL_PLACEHOLDER),
      followUpReplies: item.followUpReplies || [],
      threadFallback: item.threadFallback || [],
    },
    commands: {
      prepareArticle: xPublishPrep?.commands?.prepareArticle || '',
      prepareShortPost: xPublishPrep?.commands?.prepareShortPost || '',
      recordPublished: preflight.browser?.recordCommand || `npm run social:mark-published -- --queue data/social-growth/queue.json --id ${item.id} --url <x-post-url> --article-url <x-article-url>`,
    },
    stopBefore: [
      'final X Article publish click',
      'media upload or cover upload confirmation',
      'final image-backed short-post publish click',
      'each public follow-up Reply click',
      'any like, repost, quote, follow, profile edit, or pinned-post action',
    ],
  };
}

export function formatPublishConfirmationMarkdown(packet) {
  const blockers = packet.blockers.length
    ? packet.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers. This package is ready for account/content confirmation.';
  const stopPoints = packet.stopBefore.map((item) => `- ${item}`).join('\n');
  const replies = packet.content.followUpReplies.length
    ? packet.content.followUpReplies.map((reply, index) => `### Reply ${index + 1}\n\n${reply}`).join('\n\n')
    : '- No follow-up replies prepared.';
  const threadFallback = packet.content.threadFallback.length
    ? packet.content.threadFallback.map((post, index) => `### Thread Post ${index + 1}\n\n${post}`).join('\n\n')
    : '- No fallback thread prepared.';

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
- Blog URL: ${packet.selected.targetUrl}

## Local Blockers

${blockers}

## Approval Order

1. Confirm the Chrome account is \`@Clean993\`.
2. Review and prepare the X Article below.
3. Stop before the final X Article publish click.
4. After the X Article is public, replace \`${ARTICLE_URL_PLACEHOLDER}\` in the image post with the real X Article URL.
5. Review and prepare the image-backed short post below.
6. Stop before the final short-post publish click.
7. Only after the short post is public, review optional follow-up replies.
8. Stop before each public Reply click.

## Stop Points

${stopPoints}

## X Article To Review

Title:

\`\`\`text
${packet.content.xArticle.title || ''}
\`\`\`

Body:

\`\`\`markdown
${packet.content.xArticle.body || ''}
\`\`\`

## Image-backed Short Post To Review

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

Prepare image-backed short post after replacing the article URL:

\`\`\`bash
${packet.commands.prepareShortPost || '# No short-post command generated.'}
\`\`\`

## After Confirmed Publication

Record the public URLs:

\`\`\`bash
${packet.commands.recordPublished}
\`\`\`

## Boundary

This file is not permission to perform public X actions. Publishing, uploading media, replying, liking, reposting, quoting, following, editing the profile, and pinning content still require action-time confirmation.
`;
}

export async function writePublishConfirmation(packet, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublishConfirmationMarkdown(packet).trimEnd()}\n`);
  return filePath;
}

function imagePostWithArticlePlaceholder(shortPost, articleUrlPlaceholder) {
  return `${shortPost.trim()}\n\n${articleUrlPlaceholder}`.trim();
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
