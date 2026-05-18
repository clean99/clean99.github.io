import { addUtm } from './articles.mjs';

const DEFAULT_CAMPAIGN = 'blog-growth-2026w21';
const MAX_POST_CHARS = 260;
const CHINESE_HASHTAGS = new Map([
  ['AI', 'AI'],
  ['ChatGPT', 'ChatGPT'],
  ['Software Engineering', '软件工程'],
  ['Web Performance', '前端性能'],
  ['Frontend', '前端'],
  ['React', 'React'],
  ['testing', '软件测试'],
  ['tdd', 'TDD'],
  ['code generation', '代码生成'],
]);

export function buildDistributionCandidates(article, options = {}) {
  const campaign = options.campaign || DEFAULT_CAMPAIGN;
  const variants = ['strong-thesis', 'research-utility', 'case-story'];

  return variants.map((variant) => {
    const targetUrl = addUtm(article.url, {
      campaign,
      content: `${article.slug}-${variant}`,
    });

    return {
      articleSlug: article.slug,
      lang: article.lang,
      variant,
      channel: 'x',
      targetUrl,
      shortPost: buildShortPost(article, variant),
      xArticle: buildXArticle(article, targetUrl),
      media: buildImageBrief(article, variant),
      threadFallback: buildThreadFallback(article, targetUrl),
      posts: [buildShortPost(article, variant)],
      linkPostIndex: null,
      requiresBrowserConfirmation: true,
    };
  });
}

export function buildShortPost(article, variant) {
  const hook = shortPostHook(article, variant);
  const tags = selectHashtags(article.tags, article.lang);
  return clampPost(`${hook}${tags ? `\n\n${tags}` : ''}`);
}

export const buildSinglePost = buildShortPost;

export function shortPostHook(article, variant) {
  if (article.lang !== 'zh') {
    return variant === 'strong-thesis' ? sharpTake(article) : usefulLesson(article);
  }

  if (variant === 'research-utility') return researchUtility(article);
  if (variant === 'case-story') return caseStory(article);
  return strongThesis(article);
}

export function buildThread(article) {
  const takeaway = sentence(article.excerpt);
  const compactTitle = clamp(article.title, 100);
  const posts = article.lang === 'zh'
    ? [
      clampPost(`${compactTitle}\n\n${takeaway}`),
      clampPost('我会把这类工程文章压成三个问题：\n\n1. 真问题是什么？\n2. 哪个指标能证明它？\n3. 下一轮怎么验证？'),
      clampPost('原文：'),
    ]
    : [
      clampPost(`${compactTitle}\n\n${takeaway}`),
      clampPost('The useful frame:\n\n1. Start from the real problem.\n2. Make the signal measurable.\n3. Run one small loop at a time.'),
      clampPost('Full post:'),
    ];

  return posts;
}

export function sharpTake(article) {
  const takeaway = clamp(sentence(article.excerpt), 130);
  if (article.lang === 'zh') {
    return clamp(`别再让 AI 只“建议优化”了。\n\n真正有用的是让它跑一个可度量的工程闭环：baseline、修改、验证、复盘，一个都不能少。\n\n${takeaway}`, 220);
  }

  return clamp(`A technical post is useful only when it leaves a reusable frame.\n\nI wrote about: ${takeaway}`, 220);
}

export function researchUtility(article) {
  return clamp('我把 AI 性能优化拆成了一张可复用流程图。\n\n真正有价值的不是 prompt，而是让 Agent 每一轮都留下：baseline、修改、验证、失败记录。\n\n图里是完整结构。', 220);
}

export function strongThesis(article) {
  return clamp('AI 写优化建议很便宜。\n\n贵的是证明它没胡说。\n\n我把这个问题做成了一套 Agent 跑得动的闭环：baseline -> change -> verify -> ledger。\n\n没有 ledger，所谓优化只是故事。', 220);
}

export function caseStory(article) {
  return clamp('我以为这篇是性能优化复盘。\n\n写完发现真正的问题更狠：AI 不是不能改代码，是我们经常没有证据判断它改得对不对。\n\n所以我把 measurement 和 ledger 做成了第一等公民。', 220);
}

export function usefulLesson(article) {
  const title = clamp(article.title, 96);
  const takeaway = clamp(sentence(article.excerpt), 130);
  if (article.lang === 'zh') {
    return clamp(`我把这篇文章压成一个可复用结论：\n\n没有可重复 measurement，AI 优化就是在讲故事。\n\n主题：${title}\n${takeaway}`, 220);
  }

  return clamp(`I compressed this post into one practical lesson: ${takeaway}\n\nTopic: ${title}`, 220);
}

export function selectHashtags(tags, lang = 'en') {
  const selected = tags
    .map((tag) => normalizeHashtag(tag, lang))
    .filter(Boolean)
    .slice(0, 2)
    .map((tag) => `#${tag}`);

  return selected.join(' ');
}

export function normalizeHashtag(tag, lang = 'en') {
  if (lang === 'zh') {
    const mapped = CHINESE_HASHTAGS.get(tag) || tag;
    const normalized = mapped.replace(/\s+/g, '');
    return /^[\p{Script=Han}A-Za-z0-9]{1,24}$/u.test(normalized) ? normalized : '';
  }

  if (!/^[A-Za-z][A-Za-z0-9 -]{1,24}$/.test(tag)) return '';
  return tag.replace(/\s+/g, '');
}

export function buildXArticle(article, targetUrl) {
  const title = article.lang === 'zh'
    ? article.title
    : `Reading note: ${article.title}`;
  const body = article.lang === 'zh'
    ? buildChineseXArticleBody(article, targetUrl)
    : buildEnglishXArticleBody(article, targetUrl);

  return {
    title: clamp(title, 120),
    body,
    blogUrl: targetUrl,
  };
}

export function buildChineseXArticleBody(article, targetUrl) {
  const takeaway = articleTakeaway(article);
  const points = extractKeyPoints(article.text, 5);

  return [
    '这篇文章不是想证明“AI 很聪明”，而是讨论一个更现实的问题：怎样让 AI Agent 做出来的优化可以被验证，而不是只停留在建议层面。',
    '',
    '我的核心判断：没有可重复 measurement，AI 优化就是在讲故事。',
    '',
    '## 关键结论',
    '',
    ...dedupePoints([
      clamp(takeaway, 120),
      '如果 measurement 是错的，任何性能收益都不能算数。',
      '每一轮优化都应该只有一个瓶颈、一个修改、一次可比验证。',
      'ledger 不是流水账，而是防止 AI 把猜测包装成进展的控制面。',
      ...points,
    ]).slice(0, 5).map((point) => `- ${point}`),
    '',
    '## 可复用框架',
    '',
    '1. 先定义一个用户可感知的指标。',
    '2. 为这个指标搭一个可重复 harness。',
    '3. 每轮只攻击一个瓶颈。',
    '4. 修改之后必须和同一 baseline 做严格对比。',
    '5. 没有可比数据，就不要声明收益。',
    '',
    '## 为什么值得读原文',
    '',
    '原文里有完整的 case、失败 round、ledger 规则和性能优化闭环。如果你也在用 AI 做工程提效，真正要关心的不是 prompt 多漂亮，而是系统有没有能力证明自己没有胡说。',
    '',
    `博客原文：${targetUrl}`,
  ].join('\n');
}

export function articleTakeaway(article) {
  if (article.lang === 'zh') {
    return '核心不是让 Agent 提建议，而是让它在可验证的闭环里跑完 baseline、修改、验证和记录。';
  }

  return clamp(sentence(article.excerpt), 120);
}

export function buildThreadFallback(article, targetUrl) {
  const title = clamp(article.title, 96);
  if (article.lang === 'zh') {
    return [
      clampPost(`${title}\n\n很多人把 AI 编程想错了。真正的分界线不是模型多聪明，而是有没有 measurement 和 ledger。`),
      clampPost('可复用框架：\n\n1. 先定义用户可感知指标\n2. 搭可重复 harness\n3. 每轮只改一个瓶颈\n4. 和同一 baseline 对比\n5. 没有可比数据，不声明收益'),
      linkPost('完整过程和失败 round：', targetUrl),
    ];
  }

  return [
    clampPost(`${title}\n\nThe useful frame is measurement first, optimization second.`),
    clampPost('1. Pick a user-visible metric\n2. Build a harness\n3. Change one bottleneck per round\n4. Compare against the same baseline'),
    linkPost('Full post:', targetUrl),
  ];
}

export function buildEnglishXArticleBody(article, targetUrl) {
  const points = extractKeyPoints(article.text, 5);
  return [
    article.excerpt,
    '',
    'Useful frame:',
    '',
    '- Pick a user-visible metric.',
    '- Build a repeatable harness.',
    '- Change one bottleneck per round.',
    '- Compare against the same baseline.',
    '- No comparable measurement, no performance claim.',
    '',
    ...points.map((point) => `- ${point}`),
    '',
    `Full blog post: ${targetUrl}`,
  ].join('\n');
}

export function buildImageBrief(article, variant) {
  const isChinese = article.lang === 'zh';
  const title = isChinese ? '可度量的 AI 工程闭环' : 'Measurable AI Engineering Loop';
  const subtitle = isChinese ? 'baseline -> change -> verify -> ledger' : 'baseline -> change -> verify -> ledger';
  const variantMessage = {
    'research-utility': '像工具调研贴一样，让读者一眼看到步骤和收益',
    'strong-thesis': '像强判断观点贴一样，突出一句可争议但可证明的结论',
    'case-story': '像项目复盘贴一样，突出从误判到根因的转折',
  }[variant] || variant;
  return {
    model: 'gpt-image-2',
    size: '1536x1024',
    quality: 'medium',
    alt: isChinese
      ? `${article.title} 的配图：AI Agent 在可度量工程闭环中工作`
      : `Visual for ${article.title}: AI agent working inside a measured engineering loop`,
    prompt: [
      'Use case: infographic-diagram',
      'Asset type: X post image, 1536x1024 landscape',
      `Primary request: Create a polished editorial infographic for a technical Chinese audience about "${article.title}".`,
      `Core message: ${title}`,
      `Diagram text to include exactly: "${subtitle}"`,
      'Composition: one clear loop diagram with four labeled stages, a small ledger/checklist panel, and a performance waterfall hint; generous whitespace; high contrast; readable at mobile size.',
      'Style: modern engineering publication, clean vector-like bitmap illustration, precise lines, restrained color palette, no mascots, no stock-photo people.',
      `Variant emphasis: ${variantMessage}`,
      'Constraints: no brand logos, no platform logos, no fake UI, no watermark, no tiny unreadable paragraphs.',
    ].join('\n'),
  };
}

export function extractKeyPoints(text, limit = 5) {
  const normalized = String(text || '')
    .split(/[。！？.!?]\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18 && item.length <= 120)
    .filter((item) => !/[|]{2,}/.test(item))
    .filter((item) => !/^\d+(\.\d+)?s\s*\|/.test(item))
    .filter((item) => !/^\|/.test(item))
    .filter((item) => !/^TL;DR/i.test(item));

  return normalized.slice(0, limit);
}

export function dedupePoints(points) {
  const seen = new Set();
  const result = [];
  for (const point of points) {
    const normalized = String(point || '').replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function sentence(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'turning messy engineering experience into a reusable system';

  const match = normalized.match(/^(.{24,180}?[.!?。！？])(?:\s|$)/);
  return match ? match[1] : clamp(normalized, 180);
}

export function clampPost(text, max = MAX_POST_CHARS) {
  return clamp(text, max);
}

export function clamp(text, max) {
  const normalized = String(text || '').replace(/[ \t]+\n/g, '\n').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function linkPost(prefix, url) {
  return `${prefix}\n${url}`.trim();
}
