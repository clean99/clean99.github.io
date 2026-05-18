import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { articleFrame, extractKeyPoints } from './copy.mjs';
import {
  buildCopyOverrideTemplate,
  selectCopyTarget,
  writeCopyOverrideTemplate,
} from './copyOverride.mjs';

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
