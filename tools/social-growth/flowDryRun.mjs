import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  appendSnapshot,
  createMetricsTemplateFromQueue,
  formatMarkdownReport,
} from './ledger.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildPublishPreflight,
  formatPublishPreflightMarkdown,
} from './preflight.mjs';
import { formatRecommendationsMarkdown } from './recommendations.mjs';
import {
  markQueueItemPublished,
  writeJson,
} from './queue.mjs';
import {
  buildXPublishPrep,
  formatXPublishPrepMarkdown,
} from './xPrep.mjs';

const DEFAULT_DRY_RUN_DIR = 'data/social-growth/dry-run';
const DEFAULT_IMAGE_DIR = 'output/imagegen';
const DEFAULT_CONTENT_STATUS = 'paused_for_copy_refinement';

export async function runXGrowthDryRun({
  queue,
  ledger,
  id,
  day = 1,
  slot = 1,
  now = new Date(),
  dryRunDir = DEFAULT_DRY_RUN_DIR,
  outPath = join(dryRunDir, 'flow-dry-run.md'),
  imageDir = DEFAULT_IMAGE_DIR,
  packageOutDir = join(dryRunDir, 'packages'),
  xSkillDir,
  xBunCommand,
  contentStatus = DEFAULT_CONTENT_STATUS,
  simulatedFollowers,
  simulatedMetrics,
} = {}) {
  if (!queue?.items?.length) {
    throw new Error('Dry run requires a non-empty queue');
  }
  if (!ledger?.target) {
    throw new Error('Dry run requires a growth ledger with a target');
  }

  const generatedAt = toIsoString(now);
  const date = generatedAt.slice(0, 10);
  const preflight = await buildPublishPreflight({
    queue,
    ledger,
    id,
    day,
    slot,
    now,
    imageDir,
    packageOutDir,
    ensurePackage: true,
  });
  const selected = preflight.selected;
  const dryUrls = dryRunUrls(selected.id);
  const dryQueue = markQueueItemPublished(clearPublicationState(queue), {
    id: selected.id,
    xPostUrl: dryUrls.xPostUrl,
    xArticleUrl: dryUrls.xArticleUrl,
    publishedAt: generatedAt,
  });
  const metricsTemplate = createMetricsTemplateFromQueue(dryQueue, {
    date,
    followers: String(resolveSimulatedFollowers(ledger, simulatedFollowers)),
  });
  const metrics = fillSimulatedMetrics(metricsTemplate, {
    selectedId: selected.id,
    metrics: simulatedMetrics,
  });
  const dryLedger = appendSnapshot(ledger, {
    date: metrics.date,
    followers: metrics.followers,
    posts: metrics.posts,
  });
  const xPrep = await buildXPublishPrep(preflight, {
    skillDir: xSkillDir,
    bunCommand: xBunCommand || 'npx -y bun',
    articleUrlPlaceholder: dryUrls.xArticleUrl,
  });
  const paths = pathsForDryRun(dryRunDir, outPath);
  const result = {
    generatedAt,
    status: 'dry_run_complete',
    contentStatus,
    selected: {
      id: selected.id,
      articleSlug: selected.articleSlug,
      variant: selected.variant,
      packageDir: selected.packageDir,
      imagePath: selected.imagePath,
    },
    simulatedPublication: {
      xPostUrl: dryUrls.xPostUrl,
      xArticleUrl: dryUrls.xArticleUrl,
      publishedAt: generatedAt,
    },
    preflight: {
      status: preflight.status,
      blockers: preflight.blockers,
      imageReady: preflight.image.ready,
    },
    xPrep: {
      status: xPrep.status,
      blockers: xPrep.blockers,
    },
    metrics: {
      followers: Number(metrics.followers),
      posts: metrics.posts.length,
      selectedPost: metrics.posts.find((post) => post.id === selected.id),
    },
    summary: summarizeGrowthLedger(dryLedger),
    paths,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await Promise.all([
    writeJson(paths.queue, dryQueue),
    writeJson(paths.metrics, metrics),
    writeJson(paths.ledger, dryLedger),
    writeText(paths.preflight, formatPublishPreflightMarkdown(preflight)),
    writeText(paths.xPrep, formatXPublishPrepMarkdown(xPrep)),
    writeText(paths.report, formatMarkdownReport(dryLedger)),
    writeText(paths.recommendations, formatRecommendationsMarkdown(dryLedger)),
  ]);
  await writeText(outPath, formatDryRunMarkdown(result));
  return result;
}

export function formatDryRunMarkdown(result) {
  const preflightBlockers = formatBlockers(result.preflight.blockers);
  const xPrepBlockers = formatBlockers(result.xPrep.blockers);
  const selectedMetrics = result.metrics.selectedPost?.metrics || {};

  return `# X Growth Flow Dry Run

Generated at: ${result.generatedAt}
Status: ${result.status}
Content status: ${result.contentStatus}

## Selected Package

- Queue id: ${result.selected.id}
- Article slug: ${result.selected.articleSlug}
- Variant: ${result.selected.variant}
- Package: \`${result.selected.packageDir}\`
- Image: \`${result.selected.imagePath}\`

## Simulated Publish

- X Article placeholder: ${result.simulatedPublication.xArticleUrl}
- X post placeholder: ${result.simulatedPublication.xPostUrl}
- Published at placeholder: ${result.simulatedPublication.publishedAt}

No browser was opened. No media was uploaded. No post, article, reply, like, repost, follow, profile edit, or pin action was performed.

## Local Gate Results

- Preflight: ${result.preflight.status}
- Image ready: ${result.preflight.imageReady}
- X prep: ${result.xPrep.status}

Preflight blockers:

${preflightBlockers}

X prep blockers:

${xPrepBlockers}

## Simulated Metrics

- Followers: ${result.metrics.followers}
- Dry-run posts in snapshot: ${result.metrics.posts}
- Views: ${selectedMetrics.views || 0}
- Likes: ${selectedMetrics.likes || 0}
- Replies: ${selectedMetrics.replies || 0}
- Reposts: ${selectedMetrics.reposts || 0}
- Bookmarks: ${selectedMetrics.bookmarks || 0}
- Follows attributed: ${selectedMetrics.follows || 0}

## Artifacts

- Dry queue: \`${result.paths.queue}\`
- Dry metrics: \`${result.paths.metrics}\`
- Dry ledger: \`${result.paths.ledger}\`
- Preflight copy: \`${result.paths.preflight}\`
- X prep copy: \`${result.paths.xPrep}\`
- Growth report: \`${result.paths.report}\`
- Recommendations: \`${result.paths.recommendations}\`

## Next Real Run

1. Keep real publishing paused until the writing skill replaces the current copy.
2. Re-run this command after copy generation to validate the operational path again.
3. Only after content and image pass review, use \`social:x-prep\` to prepare Chrome and stop before every public action.
`;
}

function clearPublicationState(queue) {
  return {
    ...queue,
    status: 'dry_run',
    items: queue.items.map((item) => {
      const {
        publishedAt,
        xPostUrl,
        xArticleUrl,
        ...rest
      } = item;
      return {
        ...rest,
        status: 'draft',
      };
    }),
  };
}

function fillSimulatedMetrics(template, { selectedId, metrics } = {}) {
  const selectedMetrics = {
    views: '1200',
    likes: '24',
    replies: '3',
    reposts: '2',
    quotes: '1',
    bookmarks: '5',
    profileClicks: '9',
    follows: '1',
    ...(metrics || {}),
  };

  return {
    ...template,
    posts: template.posts.map((post) => ({
      ...post,
      metrics: post.id === selectedId ? selectedMetrics : post.metrics,
    })),
  };
}

function resolveSimulatedFollowers(ledger, explicitFollowers) {
  if (explicitFollowers !== undefined && explicitFollowers !== null && explicitFollowers !== '') {
    return Number(explicitFollowers);
  }
  return summarizeGrowthLedger(ledger).latestFollowers + 1;
}

function dryRunUrls(id) {
  const safeId = safePathSegment(id);
  return {
    xPostUrl: `https://x.example.invalid/Clean993/status/dry-run-${safeId}`,
    xArticleUrl: `https://x.example.invalid/Clean993/articles/dry-run-${safeId}`,
  };
}

function pathsForDryRun(dryRunDir, outPath) {
  return {
    flow: outPath,
    queue: join(dryRunDir, 'queue.dry-run.json'),
    metrics: join(dryRunDir, 'posts.dry-run.json'),
    ledger: join(dryRunDir, 'ledger.dry-run.json'),
    preflight: join(dryRunDir, 'publish-preflight.dry-run.md'),
    xPrep: join(dryRunDir, 'x-publish-prep.dry-run.md'),
    report: join(dryRunDir, 'report.dry-run.md'),
    recommendations: join(dryRunDir, 'recommendations.dry-run.md'),
  };
}

function formatBlockers(blockers = []) {
  return blockers.length
    ? blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- None.';
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${String(content).trimEnd()}\n`);
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}
