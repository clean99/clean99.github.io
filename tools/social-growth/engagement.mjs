import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

const DEFAULT_OPPORTUNITY_DIR = 'data/social-growth/engagement-opportunities';
const DEFAULT_ENGAGEMENT_PLAN_PATH = 'data/social-growth/engagement-plan.md';
const DEFAULT_ENGAGEMENT_SEARCH_PATH = 'data/social-growth/engagement-search.md';
const DEFAULT_CAPTURE_TEMPLATE_PATH = `${DEFAULT_OPPORTUNITY_DIR}/_capture-template.md`;
const REPLY_MAX_CHARS = 260;
const DEFAULT_SEARCH_LIMIT = 8;
const LOW_VALUE_PATTERNS = [
  /求关注/u,
  /关注我/u,
  /关注一下/u,
  /点个关注/u,
  /点赞.*(抽奖|领取|福利|送)/u,
  /转发.*(抽奖|领取|福利|送)/u,
  /抽奖/u,
  /福利/u,
  /私信/u,
  /\bDM\b/i,
  /giveaway/i,
  /airdrop/i,
];
const TECH_TOPIC_RULES = [
  {
    label: 'AI 工程化',
    patterns: [/AI/i, /agent/i, /LLM/i, /模型/u, /Skill/i, /harness/i, /baseline/i, /ledger/i, /工程化/u],
    keywords: ['AI', 'Agent', '模型', 'Skill', 'harness', 'baseline', 'ledger', '验证', '工程化'],
  },
  {
    label: '前端性能',
    patterns: [/性能/u, /performance/i, /FMP/i, /waterfall/i, /render/i, /加载/u, /优化/u],
    keywords: ['性能', 'performance', 'FMP', 'waterfall', 'render', '加载', '优化', '指标'],
  },
  {
    label: 'React',
    patterns: [/React/i, /RSC/i, /Server Component/i, /Error Boundary/i, /组件/u, /渲染/u],
    keywords: ['React', 'RSC', 'Server Component', 'Error Boundary', '组件', '渲染', '边界'],
  },
  {
    label: '测试与验证',
    patterns: [/测试/u, /TDD/i, /coverage/i, /用例/u, /验证/u, /回归/u],
    keywords: ['测试', 'TDD', 'coverage', '用例', '验证', '回归', '行为'],
  },
  {
    label: '技术博客 SEO',
    patterns: [/SEO/i, /搜索/u, /sitemap/i, /crawler/i, /索引/u, /结构化/u],
    keywords: ['SEO', '搜索', 'sitemap', 'crawler', '索引', '结构化', '分发'],
  },
  {
    label: 'Spec-Driven Coding',
    patterns: [/Spec/i, /OpenSpec/i, /vibe/i, /需求/u, /验收/u, /边界/u],
    keywords: ['Spec', 'OpenSpec', 'vibe', '需求', '验收', '边界', '假设'],
  },
];

export async function readEngagementOpportunityTexts(dir = DEFAULT_OPPORTUNITY_DIR) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((file) => !file.startsWith('_'))
    .filter((file) => ['.txt', '.md'].includes(extname(file).toLowerCase()))
    .sort();

  const opportunities = await Promise.all(files.map(async (file) => {
    const sourcePath = join(dir, file);
    return {
      id: basename(file, extname(file)),
      sourcePath,
      text: await readFile(sourcePath, 'utf8'),
    };
  }));

  return opportunities.filter((item) => item.text.trim());
}

export function buildEngagementPlan({
  queue,
  opportunityTexts = [],
  now = new Date(),
  limit = 5,
} = {}) {
  const generatedAt = toIsoString(now);
  const items = (queue?.items || []).filter((item) => item.status !== 'published');
  const analyzed = opportunityTexts.map((input) => buildEngagementCandidate(input, items));
  const ready = analyzed
    .filter((candidate) => candidate.status === 'ready_for_confirmation')
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Number(limit || 5));
  const skipped = analyzed.filter((candidate) => candidate.status !== 'ready_for_confirmation');

  return {
    version: 1,
    generatedAt,
    status: planStatus({ ready, opportunityTexts, items }),
    opportunityCount: opportunityTexts.length,
    queueCandidates: items.length,
    selectedCount: ready.length,
    opportunities: ready,
    skipped,
    captureDirectory: DEFAULT_OPPORTUNITY_DIR,
    boundary: 'Local planning only. Do not reply, like, repost, follow, or quote without action-time confirmation in Chrome.',
  };
}

export async function writeEngagementPlan(plan, filePath = DEFAULT_ENGAGEMENT_PLAN_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatEngagementPlanMarkdown(plan).trimEnd()}\n`);
  return filePath;
}

export function buildEngagementSearchPlan({
  queue,
  now = new Date(),
  limit = DEFAULT_SEARCH_LIMIT,
  daysBack = 7,
} = {}) {
  const generatedAt = toIsoString(now);
  const items = (queue?.items || []).filter((item) => item.status !== 'published');
  const topicScores = scoreQueueTopics(items)
    .slice(0, Math.max(1, Number(limit || DEFAULT_SEARCH_LIMIT)));
  const since = dateDaysBefore(now, Number(daysBack || 7));
  const searches = topicScores
    .flatMap((topic) => buildSearchesForTopic(topic, since))
    .slice(0, Number(limit || DEFAULT_SEARCH_LIMIT));

  return {
    version: 1,
    generatedAt,
    status: searches.length ? 'ready_for_read_only_search' : 'needs_queue',
    since,
    queueCandidates: items.length,
    searchCount: searches.length,
    searches,
    captureDirectory: DEFAULT_OPPORTUNITY_DIR,
    boundary: 'Read-only discovery only. Opening a search URL is allowed; replying, liking, reposting, following, quoting, or posting still requires action-time confirmation.',
  };
}

export async function writeEngagementSearchPlan(plan, filePath = DEFAULT_ENGAGEMENT_SEARCH_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatEngagementSearchPlanMarkdown(plan).trimEnd()}\n`);
  return filePath;
}

export function buildEngagementCaptureTemplate(plan, {
  maxTargets = 5,
} = {}) {
  const targets = (plan?.searches || [])
    .slice(0, Math.max(1, Number(maxTargets || 5)))
    .map((item) => ({
      topic: item.topic,
      query: item.query,
      url: item.url,
      captureHint: item.captureHint,
      queueIds: item.queueIds || [],
    }));

  return {
    version: 1,
    generatedAt: plan?.generatedAt || new Date().toISOString(),
    status: targets.length ? 'ready_for_capture' : 'needs_search_plan',
    targetCount: targets.length,
    targets,
    boundary: 'Capture template only. Copy visible thread text for local planning; do not reply, like, repost, quote, follow, DM, edit profile, pin, or post without action-time confirmation in Chrome.',
  };
}

export async function writeEngagementCaptureTemplate(template, filePath = DEFAULT_CAPTURE_TEMPLATE_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatEngagementCaptureTemplateMarkdown(template).trimEnd()}\n`);
  return filePath;
}

export function formatEngagementCaptureTemplateMarkdown(template) {
  const targets = template.targets.length
    ? template.targets.map(formatCaptureTarget).join('\n\n')
    : '- No capture targets. Generate an engagement search plan first.';

  return `# X Engagement Capture Template

Generated at: ${template.generatedAt}
Status: ${template.status}

## Purpose

Use this file while doing read-only X search. For every useful thread, create one copied-text file at the listed capture target. Files starting with \`_\` are ignored by the engagement planner so this template is never treated as a reply opportunity.

## Capture Targets

${targets}

## Keep / Skip Gate

Keep only threads where a reply can add at least one of:

- a mechanism the thread missed;
- a proof caveat or measurement caveat;
- a checklist that helps readers act;
- a concrete correction to a technical claim.

Skip:

- outrage, drama, giveaways, job posts, fundraising, and generic hot takes;
- threads where our reply would only say "agree";
- threads that require private information, credentials, or internal details;
- threads unrelated to the current queue topics.

## Boundary

${template.boundary}
`;
}

export function formatEngagementSearchPlanMarkdown(plan) {
  const searches = plan.searches.length
    ? plan.searches.map(formatSearchItem).join('\n\n')
    : '- No search queries. Generate or restore the Chinese queue first.';

  return `# X Engagement Search Plan

Generated at: ${plan.generatedAt}
Status: ${plan.status}

## Scope

- Draft queue candidates: ${plan.queueCandidates}
- Search queries: ${plan.searchCount}
- Since: ${plan.since}

Use these searches to find relevant Chinese technical threads before building the reply plan.

## Queries

${searches}

## Capture

For each useful thread, copy visible thread text into:

\`\`\`text
${plan.captureDirectory}/<short-name>.txt
\`\`\`

Then run:

\`\`\`bash
npm run social:engagement -- --opportunities ${plan.captureDirectory} --out data/social-growth/engagement-plan.md
\`\`\`

Capture only threads where a reply can add a mechanism, proof caveat, checklist, or correction. Skip trends, outrage, giveaways, job posts, and generic engagement bait.

## Boundary

${plan.boundary}
`;
}

function formatCaptureTarget(item, index) {
  return `### ${index + 1}. ${item.topic}

- Search query: \`${item.query}\`
- Open read-only: ${item.url}
- Save useful copied thread text to: \`${item.captureHint}\`
- Queue anchors: ${item.queueIds.join(', ') || 'none'}

Suggested file shape:

\`\`\`text
URL: <public x status url>
Author: <handle or display name if visible>
Why relevant: <mechanism / proof caveat / checklist / correction>

<paste copied visible thread text here>
\`\`\``;
}

export function formatEngagementPlanMarkdown(plan) {
  const readyLines = plan.opportunities.length
    ? plan.opportunities.map(formatReadyOpportunity).join('\n\n')
    : '- No ready reply candidates.';
  const skippedLines = plan.skipped.length
    ? plan.skipped.slice(0, 10).map((item) => `- ${item.id}: ${item.reason || item.status}`).join('\n')
    : '- No skipped opportunities.';

  return `# X Engagement Plan

Generated at: ${plan.generatedAt}
Status: ${plan.status}

## Scope

- Captured opportunities: ${plan.opportunityCount}
- Draft queue candidates: ${plan.queueCandidates}
- Ready reply candidates: ${plan.selectedCount}

This plan is for selective technical replies only. It is not a mass interaction plan.

## Capture Input

Save copied visible X thread text as \`${plan.captureDirectory}/<short-name>.txt\`, then rerun:

\`\`\`bash
npm run social:engagement -- --opportunities ${plan.captureDirectory} --out data/social-growth/engagement-plan.md
\`\`\`

Good inputs are Chinese or bilingual technical threads where the account can add a mechanism, proof caveat, checklist, or concrete correction.

## Ready Reply Candidates

${readyLines}

## Skipped

${skippedLines}

## Boundary

${plan.boundary}
`;
}

function buildEngagementCandidate(input, queueItems) {
  const opportunity = parseOpportunity(input);
  const lowValueReason = lowValueReasonFor(opportunity.text);
  if (lowValueReason) {
    return {
      ...opportunity,
      status: 'skipped_low_value',
      reason: lowValueReason,
    };
  }
  if (!queueItems.length) {
    return {
      ...opportunity,
      status: 'skipped_no_queue',
      reason: 'No draft queue candidates are available to anchor a substantive technical reply.',
    };
  }

  const scored = queueItems
    .map((item) => scoreOpportunityForItem(opportunity, item))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score <= 0) {
    return {
      ...opportunity,
      status: 'skipped_no_topic_match',
      reason: 'Captured thread does not match the current Chinese technical content lanes.',
    };
  }

  const draftReply = buildDraftReply(best.item, {
    topic: best.topic,
    matchedKeywords: best.matchedKeywords,
  });
  const blockers = validateDraftReply(draftReply);

  return {
    ...opportunity,
    status: blockers.length ? 'blocked_reply_quality' : 'ready_for_confirmation',
    reason: blockers.join('; '),
    score: best.score,
    topic: best.topic,
    matchedKeywords: best.matchedKeywords,
    queueId: best.item.id,
    articleSlug: best.item.articleSlug,
    draftReply,
    browserAction: {
      action: 'prepare_reply',
      stopBefore: 'final public Reply click',
      requiresConfirmation: true,
    },
  };
}

function parseOpportunity(input) {
  const text = cleanText(input.text || '');
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const url = extractUrl(text);
  const title = lines.find((line) => !/^https?:\/\//i.test(line)) || input.id || 'untitled';

  return {
    id: input.id || safeId(title),
    sourcePath: input.sourcePath || '',
    title: clamp(title, 96),
    url,
    text,
    snippet: clamp(text.replace(/\n+/g, ' '), 180),
  };
}

function scoreOpportunityForItem(opportunity, item) {
  const itemText = [
    item.articleSlug,
    item.shortPost,
    item.xArticle?.title,
    item.xArticle?.body,
    item.media?.prompt,
  ].join('\n');
  const opportunityText = opportunity.text;
  const itemRules = TECH_TOPIC_RULES
    .map((rule) => ({
      rule,
      itemMatches: countPatternMatches(itemText, rule.patterns),
      opportunityMatches: countKeywordMatches(opportunityText, rule.keywords),
    }))
    .filter((entry) => entry.itemMatches > 0 && entry.opportunityMatches > 0)
    .sort((a, b) => (b.itemMatches + b.opportunityMatches) - (a.itemMatches + a.opportunityMatches));

  if (!itemRules.length) {
    return {
      item,
      score: 0,
      topic: 'unknown',
      matchedKeywords: [],
    };
  }

  const bestRule = itemRules[0];
  const matchedKeywords = matchedKeywordsIn(opportunityText, bestRule.rule.keywords);
  const score = bestRule.itemMatches * 2
    + bestRule.opportunityMatches * 3
    + Math.min(matchedKeywords.length, 5);

  return {
    item,
    score,
    topic: bestRule.rule.label,
    matchedKeywords,
  };
}

function buildDraftReply(item, { topic, matchedKeywords }) {
  const mechanism = extractMechanism(item);
  const payoff = extractPayoff(item);
  const keywordHint = matchedKeywords.length
    ? `这类讨论里我会特别盯住 ${matchedKeywords.slice(0, 3).join(' / ')}。`
    : '';
  const reply = [
    `我会把这个 ${topic} 问题先收敛到一个可验证链路：${mechanism}`,
    `如果只讨论技巧，结论很容易停在经验判断；更稳的是先固定口径，再看结果能不能复现。${keywordHint}`,
    payoff ? `可复用的部分是：${payoff}` : '',
  ].filter(Boolean).join('\n\n');

  return clamp(reply, REPLY_MAX_CHARS);
}

function extractMechanism(item) {
  const candidates = [
    item.shortPost,
    item.xArticle?.body,
    ...(item.threadFallback || []),
  ].join('\n').split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const line = candidates.find((candidate) => /->|闭环|验证|框架|机制|真正/u.test(candidate))
    || candidates[0]
    || '问题 -> 机制 -> 验证 -> 复盘';

  return clamp(cleanMarkdown(line), 72);
}

function extractPayoff(item) {
  const steps = String(item.xArticle?.body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .slice(0, 2)
    .map((line) => line.replace(/^\d+\.\s+/, ''));
  if (steps.length) return clamp(steps.join('；'), 72);

  const reply = (item.followUpReplies || []).find(Boolean);
  return reply ? clamp(cleanMarkdown(reply), 72) : '';
}

function validateDraftReply(reply) {
  const blockers = [];
  if (!reply.trim()) blockers.push('draft reply is empty');
  if (reply.length > REPLY_MAX_CHARS) blockers.push(`draft reply exceeds ${REPLY_MAX_CHARS} characters`);
  if (reply.length < 40) blockers.push('draft reply is too thin to be a substantive technical reply');
  if (/https?:\/\//i.test(reply)) blockers.push('draft reply must not include links');
  if (/#/u.test(reply)) blockers.push('draft reply should not include hashtags');
  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(reply))) {
    blockers.push('draft reply contains engagement or promotion bait');
  }
  return blockers;
}

function formatReadyOpportunity(item, index) {
  const urlLine = item.url ? `- URL: ${item.url}` : '- URL: not captured';
  return `### ${index + 1}. ${item.title}

- Source: \`${item.sourcePath || item.id}\`
${urlLine}
- Score: ${item.score}
- Topic: ${item.topic}
- Matched keywords: ${item.matchedKeywords.join(', ') || 'none'}
- Queue anchor: ${item.queueId}
- Browser stop point: ${item.browserAction.stopBefore}

Draft reply:

\`\`\`text
${item.draftReply}
\`\`\``;
}

function formatSearchItem(item, index) {
  return `### ${index + 1}. ${item.topic}

- Query: \`${item.query}\`
- Open: ${item.url}
- Why: ${item.reason}
- Queue anchors: ${item.queueIds.join(', ')}
- Capture target: \`${item.captureHint}\``;
}

function scoreQueueTopics(items) {
  const groups = new Map();
  for (const item of items) {
    const itemText = [
      item.articleSlug,
      item.shortPost,
      item.xArticle?.title,
      item.xArticle?.body,
      item.media?.prompt,
    ].join('\n');

    for (const rule of TECH_TOPIC_RULES) {
      const matches = countPatternMatches(itemText, rule.patterns);
      if (!matches) continue;

      const group = groups.get(rule.label) || {
        label: rule.label,
        keywords: rule.keywords,
        score: 0,
        queueIds: [],
      };
      group.score += matches;
      group.queueIds.push(item.id);
      groups.set(rule.label, group);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      queueIds: [...new Set(group.queueIds)].slice(0, 5),
    }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function buildSearchesForTopic(topic, since) {
  const keywordPairs = searchKeywordPairs(topic.keywords);
  return keywordPairs.map((keywords, index) => {
    const query = `${keywords.join(' ')} since:${since} lang:zh -filter:replies`;
    return {
      topic: topic.label,
      query,
      url: xSearchUrl(query),
      reason: `Find recent Chinese ${topic.label} threads that match current queue anchors.`,
      queueIds: topic.queueIds,
      captureHint: `${DEFAULT_OPPORTUNITY_DIR}/${topicSlug(topic.label)}-${index + 1}.txt`,
    };
  });
}

function searchKeywordPairs(keywords) {
  const cleaned = keywords.filter((keyword) => !/[A-Za-z]+-[A-Za-z]+/.test(keyword));
  if (cleaned.length <= 2) return [cleaned];
  return [
    cleaned.slice(0, 3),
    [cleaned[0], cleaned[3] || cleaned[1], cleaned[4] || cleaned[2]].filter(Boolean),
  ];
}

function xSearchUrl(query) {
  const params = new URLSearchParams({
    q: query,
    src: 'typed_query',
    f: 'live',
  });
  return `https://x.com/search?${params.toString()}`;
}

function planStatus({ ready, opportunityTexts, items }) {
  if (!items.length) return 'needs_queue';
  if (!opportunityTexts.length) return 'needs_opportunity_capture';
  if (!ready.length) return 'needs_better_opportunities';
  return 'ready_for_browser_confirmation';
}

function lowValueReasonFor(text) {
  if (LOW_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return 'Thread looks promotional or engagement-baiting; do not interact.';
  }
  if (text.trim().length < 40) {
    return 'Captured thread text is too short to justify a substantive reply.';
  }
  return '';
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function countKeywordMatches(text, keywords) {
  return matchedKeywordsIn(text, keywords).length;
}

function matchedKeywordsIn(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

function extractUrl(text) {
  return text.match(/https?:\/\/(?:x|twitter)\.com\/[^\s)]+/i)?.[0] || '';
}

function cleanText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function cleanMarkdown(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(value, max) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function safeId(value) {
  const cleaned = String(value || 'opportunity')
    .replace(/[^A-Za-z0-9._=-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'opportunity';
}

function topicSlug(label) {
  return {
    'AI 工程化': 'ai-engineering',
    前端性能: 'frontend-performance',
    React: 'react',
    测试与验证: 'testing-verification',
    '技术博客 SEO': 'technical-blog-seo',
    'Spec-Driven Coding': 'spec-driven-coding',
  }[label] || safeId(label);
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function dateDaysBefore(value, days) {
  const date = value instanceof Date ? value : new Date(value);
  const copy = new Date(date.getTime() - Math.max(0, days) * 86_400_000);
  return copy.toISOString().slice(0, 10);
}
