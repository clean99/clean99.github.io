#!/usr/bin/env node
import { loadArticles } from './articles.mjs';
import { buildDistributionCandidates } from './copy.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildPublishQueue,
  findQueueItem,
  markQueueItemPublished,
  prepareBrowserHandoff,
  readJson,
  writePublishPackage,
  writeJson,
} from './queue.mjs';
import {
  createLedger,
  formatMarkdownReport,
  publishedPostsFromQueue,
  updateLedgerSnapshot,
} from './ledger.mjs';

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));
const DEFAULT_LANG = 'zh';

if (command === 'articles') {
  const articles = await loadArticles();
  const limit = Number(args.limit || 10);
  console.log(JSON.stringify(articles.slice(0, limit), null, 2));
} else if (command === 'draft') {
  const articles = await loadArticles();
  const article = selectArticle(articles, args);
  const candidates = buildDistributionCandidates(article, {
    campaign: args.campaign,
  });
  console.log(JSON.stringify(candidates, null, 2));
} else if (command === 'report') {
  const ledgerPath = args.ledger || 'data/social-growth/example-ledger.json';
  const ledger = await readJson(ledgerPath);
  if (args.format === 'markdown') {
    console.log(formatMarkdownReport(ledger));
  } else {
    console.log(JSON.stringify(summarizeGrowthLedger(ledger), null, 2));
  }
} else if (command === 'plan') {
  const articles = await loadArticles();
  const limit = Number(args.limit || 5);
  const lang = args.lang || DEFAULT_LANG;
  const plan = articles
    .filter((article) => !lang || article.lang === lang)
    .slice(0, limit)
    .flatMap((article) =>
      buildDistributionCandidates(article, { campaign: args.campaign }).map((candidate) => ({
        articleSlug: candidate.articleSlug,
        lang: candidate.lang,
        variant: candidate.variant,
        targetUrl: candidate.targetUrl,
        posts: candidate.posts,
        nextAction: 'queue_for_browser_publish',
        requiresBrowserConfirmation: candidate.requiresBrowserConfirmation,
      })),
    );
  console.log(JSON.stringify(plan, null, 2));
} else if (command === 'queue') {
  const articles = await loadArticles();
  const queue = buildPublishQueue(articles, args);
  if (args.out) {
    await writeJson(args.out, queue);
    console.log(`Wrote ${queue.items.length} queue items to ${args.out}`);
  } else {
    console.log(JSON.stringify(queue, null, 2));
  }
} else if (command === 'handoff') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const item = findQueueItem(queue, args.id || queue.items[0]?.id);
  console.log(JSON.stringify(prepareBrowserHandoff(item), null, 2));
} else if (command === 'package') {
  const queue = await readJson(args.queue || 'data/social-growth/queue.json');
  const item = findQueueItem(queue, args.id || queue.items[0]?.id);
  const written = await writePublishPackage(item, {
    outDir: args.out || 'data/social-growth/packages',
  });
  console.log(JSON.stringify(written, null, 2));
} else if (command === 'mark-published') {
  const queuePath = args.queue || 'data/social-growth/queue.json';
  const queue = await readJson(queuePath);
  const updated = markQueueItemPublished(queue, {
    id: requiredArg(args, 'id'),
    xPostUrl: requiredArg(args, 'url'),
    publishedAt: args.publishedAt,
  });
  await writeJson(queuePath, updated);
  console.log(`Marked ${args.id} as published in ${queuePath}`);
} else if (command === 'init-ledger') {
  const ledger = createLedger({
    startDate: args.start,
    endDate: args.end,
    baselineFollowers: requiredArg(args, 'followers'),
    followersIn7Days: args.target || 1000,
  });
  await writeJson(args.out || 'data/social-growth/ledger.json', ledger);
  console.log(JSON.stringify(summarizeGrowthLedger(ledger), null, 2));
} else if (command === 'snapshot') {
  const ledgerPath = args.ledger || 'data/social-growth/ledger.json';
  const queue = args.queue ? await readJson(args.queue) : null;
  const updated = await updateLedgerSnapshot({
    ledgerPath,
    postsFile: args.postsFile,
    snapshot: {
      date: requiredArg(args, 'date'),
      followers: requiredArg(args, 'followers'),
      posts: queue ? publishedPostsFromQueue(queue) : [],
    },
  });
  console.log(JSON.stringify(summarizeGrowthLedger(updated), null, 2));
} else {
  printHelp();
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith('--')) continue;

    const key = toCamelKey(token.slice(2));
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function toCamelKey(key) {
  return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function selectArticle(articles, options) {
  const preferredLang = options.lang || DEFAULT_LANG;

  if (options.slug) {
    const matches = articles.filter((item) => item.slug === options.slug || item.i18nKey === options.slug);
    const article = matches.find((item) => item.lang === preferredLang) || matches[0];
    if (!article) {
      throw new Error(`No article found for slug: ${options.slug}`);
    }
    return article;
  }

  const article = articles.find((item) => item.lang === preferredLang) || articles[0];
  if (!article) {
    throw new Error('No articles found in source/_posts');
  }
  return article;
}

function printHelp() {
  console.log(`Usage:
  npm run social:articles -- --limit 5
  npm run social:draft -- --slug Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops
  npm run social:plan -- --limit 3
  npm run social:queue -- --limit 3 --out data/social-growth/queue.json
  npm run social:handoff -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:package -- --queue data/social-growth/queue.json --id <queue-id>
  npm run social:init-ledger -- --followers 1234 --out data/social-growth/ledger.json
  npm run social:snapshot -- --ledger data/social-growth/ledger.json --date 2026-05-19 --followers 1300 --posts-file data/social-growth/posts.local.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json
  npm run social:report -- --ledger data/social-growth/example-ledger.json --format markdown
`);
}

function requiredArg(options, key) {
  if (options[key] === undefined || options[key] === null || options[key] === '') {
    throw new Error(`Missing required argument: --${key}`);
  }
  return options[key];
}
