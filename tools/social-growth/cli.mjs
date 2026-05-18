#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { loadArticles } from './articles.mjs';
import { buildDistributionCandidates } from './copy.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));

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
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  console.log(JSON.stringify(summarizeGrowthLedger(ledger), null, 2));
} else if (command === 'plan') {
  const articles = await loadArticles();
  const limit = Number(args.limit || 5);
  const plan = articles.slice(0, limit).flatMap((article) =>
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
} else {
  printHelp();
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
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

function selectArticle(articles, options) {
  const preferredLang = options.lang || 'en';

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
  npm run social:report -- --ledger data/social-growth/example-ledger.json
`);
}
