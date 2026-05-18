import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { articleFrame, extractKeyPoints } from './copy.mjs';
import {
  buildCopyOverrideTemplate,
  selectCopyTarget,
  writeCopyOverrideTemplate,
} from './copyOverride.mjs';
import { buildGrowthRecommendations } from './recommendations.mjs';

const DEFAULT_BRIEF_DIR = 'data/social-growth/x-tech-briefs';
const DEFAULT_TEMPLATE_DIR = 'data/social-growth/copy-overrides';
const DEFAULT_SKILL_PATH = '.agents/skills/x-technical-sharing/SKILL.md';

export async function buildXTechnicalSharingBrief({
  articles,
  queue,
  ledger,
  id,
  day = 1,
  slot = 1,
  now = new Date(),
  briefPath,
  templatePath,
  skillPath = DEFAULT_SKILL_PATH,
} = {}) {
  if (!Array.isArray(articles)) {
    throw new Error('articles array is required');
  }
  const selected = selectCopyTarget(queue, ledger, {
    id,
    day,
    slot,
    now,
  });
  const article = findSourceArticle(articles, selected);
  const template = buildCopyOverrideTemplate(selected, {
    source: 'x-technical-sharing',
    contentStatus: 'needs_x_technical_sharing',
  });
  const output = {
    briefPath: briefPath || join(DEFAULT_BRIEF_DIR, `${safePathSegment(selected.id)}.md`),
    templatePath: templatePath || join(DEFAULT_TEMPLATE_DIR, `${safePathSegment(selected.id)}.json`),
  };
  const brief = {
    generatedAt: toIsoString(now),
    skillPath,
    selected,
    article,
    frame: article ? articleFrame(article) : null,
    keyPoints: article ? briefKeyPoints(article.text, 6) : [],
    growthFeedback: buildGrowthFeedback(ledger, selected),
    template,
    output,
  };

  return brief;
}

export async function writeXTechnicalSharingBrief(brief) {
  await writeCopyOverrideTemplate(brief.template, brief.output.templatePath);
  await writeText(brief.output.briefPath, formatXTechnicalSharingBriefMarkdown(brief));
  return {
    briefPath: brief.output.briefPath,
    templatePath: brief.output.templatePath,
  };
}

export function formatXTechnicalSharingBriefMarkdown(brief) {
  const article = brief.article;
  const frame = brief.frame;
  const keyPoints = brief.keyPoints.length
    ? brief.keyPoints.map((point) => `- ${point}`).join('\n')
    : '- No article key points extracted. Read the source before writing.';
  const steps = frame?.frameworkSteps?.length
    ? frame.frameworkSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : '1. Read the source.\n2. Identify the observable problem.\n3. State the mechanism and evidence.';

  return `# X Technical Sharing Brief

Generated at: ${brief.generatedAt}

Use skill: \`${brief.skillPath}\`

## Target Queue Item

- Queue id: ${brief.selected.id}
- Article slug: ${brief.selected.articleSlug}
- Variant: ${brief.selected.variant}
- Template JSON: \`${brief.output.templatePath}\`
- Apply command: \`npm run social:apply-copy -- --input ${brief.output.templatePath}\`

## Source Article

- Title: ${article?.title || 'missing'}
- File: \`${article?.absolutePath || 'missing'}\`
- Language: ${article?.lang || 'missing'}
- Tags: ${(article?.tags || []).join(', ') || 'none'}
- URL: ${article?.url || 'missing'}
- Excerpt: ${article?.excerpt || 'missing'}

## Causality Chain

- Observable problem: ${frame?.failureMode || 'Fill from source material.'}
- Technical cause / wrong frame: ${frame?.falseFrame || 'Fill from source material.'}
- Better mechanism: ${frame?.betterFrame || 'Fill from source material.'}
- Reusable loop: ${frame?.mechanism || 'problem -> cause -> mechanism -> evidence'}
- Reader payoff: ${frame?.readerPayoff || 'A reusable engineering judgment.'}

Reusable framework:

${steps}

Extracted source points:

${keyPoints}

## Growth Feedback

${formatGrowthFeedbackMarkdown(brief.growthFeedback)}

## Current Generated Copy

Short post:

\`\`\`text
${brief.selected.shortPost || ''}
\`\`\`

X Article title:

\`\`\`text
${brief.selected.xArticle?.title || ''}
\`\`\`

X Article body:

\`\`\`markdown
${brief.selected.xArticle?.body || ''}
\`\`\`

Image prompt:

\`\`\`text
${brief.selected.media?.prompt || ''}
\`\`\`

## Rewrite Instructions

Use \`x-technical-sharing\` to replace only these JSON fields:

- \`shortPost\`
- \`xArticle.title\`
- \`xArticle.body\`
- \`image.alt\`
- \`image.prompt\`
- \`threadFallback\`
- \`followUpReplies\`

Keep the short post X-native: concrete Chinese claim, mechanism in the first two lines, no blog URL, image/X Article handoff, at most two hashtags.

Keep the X Article causal: observable problem, cause, mechanism, tradeoff, validation, and the blog link only at the end under \`博客原文：\`.

Use the growth feedback above as constraints, not decoration:

- if there is no post data yet, optimize for follow-worthy clarity and publish the first measurable artifact;
- if a variant or article has proven follows, profile clicks, bookmarks, replies, reposts, or quotes, reuse the mechanism without duplicating the surface wording;
- if engagement does not convert to follows, strengthen the profile promise and the X Article's reason to follow;
- avoid anything that creates negative feedback: engagement bait, mass replies, duplicate templates, or off-topic controversy.

After rewriting:

\`\`\`bash
npm run social:apply-copy -- --input ${brief.output.templatePath}
npm run social:validate -- --queue data/social-growth/queue.json --format markdown
npm run social:flow-dry-run -- --day 1 --slot 1 --out data/social-growth/dry-run/flow-dry-run.md
\`\`\`

Boundary: this brief is local-only. Do not open Chrome or perform public X actions from it.
`;
}

function findSourceArticle(articles, selected) {
  return articles.find((article) => (
    article.slug === selected.articleSlug
    && article.lang === selected.lang
  )) || articles.find((article) => (
    article.i18nKey === selected.articleSlug
    || article.slug === selected.articleSlug
  )) || null;
}

function briefKeyPoints(text, limit) {
  return extractKeyPoints(text, limit * 2)
    .filter((point) => !/generated by/i.test(point))
    .filter((point) => !/gpt-image/i.test(point))
    .filter((point) => !/图[：:]/u.test(point))
    .slice(0, limit);
}

function buildGrowthFeedback(ledger, selected) {
  if (!ledger) {
    return {
      available: false,
      summary: null,
      variantPerformance: [],
      articlePerformance: [],
      selectedVariant: null,
      selectedArticle: null,
      recommendations: [{
        priority: 'P0',
        action: 'Initialize or restore the growth ledger before treating this as an optimization loop.',
        reason: 'Without a ledger, the writing skill cannot see target pace or prior winner signals.',
      }],
    };
  }

  const feedback = buildGrowthRecommendations(ledger);
  return {
    available: true,
    summary: feedback.summary,
    variantPerformance: feedback.variantPerformance.slice(0, 5),
    articlePerformance: feedback.articlePerformance.slice(0, 5),
    selectedVariant: findPerformance(feedback.variantPerformance, selected.variant),
    selectedArticle: findPerformance(feedback.articlePerformance, selected.articleSlug),
    recommendations: feedback.recommendations.slice(0, 5),
  };
}

function formatGrowthFeedbackMarkdown(feedback) {
  if (!feedback?.available) {
    return [
      '- Ledger: missing.',
      '',
      'Writing constraints:',
      '',
      ...formatRecommendationLines(feedback?.recommendations || []),
    ].join('\n');
  }

  const summary = feedback.summary || {};
  const variantLines = feedback.variantPerformance.length
    ? feedback.variantPerformance.map(formatPerformanceLine).join('\n')
    : '- No variant performance yet.';
  const articleLines = feedback.articlePerformance.length
    ? feedback.articlePerformance.map(formatPerformanceLine).join('\n')
    : '- No article performance yet.';
  const selectedVariant = feedback.selectedVariant
    ? formatPerformanceLine(feedback.selectedVariant)
    : '- Selected variant has no measured history yet.';
  const selectedArticle = feedback.selectedArticle
    ? formatPerformanceLine(feedback.selectedArticle)
    : '- Selected article/topic has no measured history yet.';

  return `Target pace:

- Baseline followers: ${summary.baselineFollowers ?? 'unknown'}
- Latest followers: ${summary.latestFollowers ?? 'unknown'}
- Follower delta: ${summary.followerDelta ?? 'unknown'} / ${summary.targetFollowers ?? 'unknown'}
- Required daily pace: ${round(summary.requiredDailyPace)}
- Actual daily pace: ${round(summary.actualDailyPace)}
- Recorded post metrics: ${(summary.posts || []).length}

Selected history:

${selectedVariant}
${selectedArticle}

Variant performance:

${variantLines}

Article/topic performance:

${articleLines}

Optimization constraints:

${formatRecommendationLines(feedback.recommendations).join('\n')}`;
}

function formatPerformanceLine(item) {
  return `- ${item.key}: score ${round(item.score)}, follows ${item.follows}, profile clicks ${item.profileClicks}, bookmarks ${item.bookmarks}, posts ${item.posts}, interaction rate ${formatPercent(item.interactionRate)}`;
}

function formatRecommendationLines(recommendations) {
  if (!recommendations?.length) {
    return ['- No recommendations yet. Publish, capture metrics, then rerun this brief.'];
  }
  return recommendations.map((item) => `- ${item.priority}: ${item.action} Reason: ${item.reason}`);
}

function findPerformance(items, key) {
  return (items || []).find((item) => item.key === key) || null;
}

function round(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'unknown';
  return String(Math.round(Number(value) * 10) / 10);
}

function formatPercent(value) {
  if (!value) return '0%';
  return `${Math.round(Number(value) * 10000) / 100}%`;
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${String(content).trimEnd()}\n`);
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
