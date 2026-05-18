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

const DEFAULT_FRAME = {
  topic: '工程判断',
  falseFrame: '把经验写成零散建议',
  betterFrame: '把判断标准、失败边界和复用步骤说清楚',
  mechanism: 'problem -> criteria -> action -> evidence',
  imageTitle: '可复用的工程判断框架',
  diagramText: 'problem -> criteria -> action -> evidence',
  coreClaim: '真正有用的技术文章应该留下可复用判断，而不是只记录一次经验。',
  failureMode: '如果没有判断标准，读者只会得到一组无法迁移的经验碎片。',
  readerPayoff: '带走一个可以复用到自己项目里的判断框架',
  frameworkSteps: [
    '先说清楚真正的问题是什么。',
    '把判断标准压成少数几个可验证条件。',
    '给出能复用的执行顺序。',
    '记录哪些做法看起来对、实际会失败。',
    '最后再把完整原文作为归档。',
  ],
};

const ARTICLE_FRAMES = [
  {
    pattern: /SEO|搜索|crawler|sitemap|博客全面改造/i,
    frame: {
      topic: '技术博客 SEO',
      falseFrame: '照着清单补 meta 标签',
      betterFrame: '理解搜索引擎如何读取、归类和信任页面',
      mechanism: 'crawl -> understand -> trust -> distribute',
      imageTitle: '技术博客 SEO 闭环',
      diagramText: 'crawl -> understand -> trust -> distribute',
      coreClaim: 'SEO 不是标签清单，而是让搜索引擎稳定理解你的页面价值。',
      failureMode: '只补标签不改信息结构，搜索引擎仍然不知道该把页面分发给谁。',
      readerPayoff: '从第一性原理理解博客 SEO 改造',
      frameworkSteps: [
        '保证页面能被稳定抓取。',
        '让标题、摘要和结构表达同一个主题。',
        '用链接和 sitemap 帮搜索引擎发现内容。',
        '用结构化数据降低理解成本。',
        '持续观察索引和点击反馈。',
      ],
    },
  },
  {
    pattern: /vibe|spec|OpenSpec|spec-driven|coding/i,
    frame: {
      topic: 'AI Coding 工作流',
      falseFrame: '让模型凭感觉一路补代码',
      betterFrame: '先把意图、边界和验收标准固定下来',
      mechanism: 'idea -> spec -> implementation -> verification',
      imageTitle: 'Spec-Driven AI Coding',
      diagramText: 'idea -> spec -> implementation -> verification',
      coreClaim: 'Vibe Coding 适合探索，Spec-Driven Coding 才适合把复杂改动落地。',
      failureMode: '没有 spec，模型会把未确认的假设写进代码里。',
      readerPayoff: '知道什么时候该探索，什么时候必须上规格和验收',
      frameworkSteps: [
        '先判断任务是探索还是交付。',
        '把用户目标写成明确规格。',
        '列出边界、非目标和验收标准。',
        '再让模型实现。',
        '最后用测试和 review 关掉假设。',
      ],
    },
  },
  {
    pattern: /React Performance|React 性能|render|memo|rerender/i,
    frame: {
      topic: 'React 性能优化',
      falseFrame: '看到慢就先 memo 或拆组件',
      betterFrame: '先定位 render、网络和交互成本真正落在哪一层',
      mechanism: 'measure -> isolate -> optimize -> verify',
      imageTitle: 'React 性能诊断闭环',
      diagramText: 'measure -> isolate -> optimize -> verify',
      coreClaim: 'React 性能优化的关键不是 API 技巧，而是先证明瓶颈在哪里。',
      failureMode: '没有 profile 的 memo 很容易把复杂度加进去，却没有真实收益。',
      readerPayoff: '把 React 性能问题拆成可验证的诊断路径',
      frameworkSteps: [
        '先用 profile 找出真正的慢点。',
        '区分 render、network、bundle 和 interaction 成本。',
        '只针对一个瓶颈做修改。',
        '用同一场景复测。',
        '没有复测收益就不要保留复杂优化。',
      ],
    },
  },
  {
    pattern: /Server Component|RSC|React Server Component|服务器组件/i,
    frame: {
      topic: 'React Server Component',
      falseFrame: '把它当成另一种 SSR 写法',
      betterFrame: '理解 server/client 边界如何改变数据流和打包模型',
      mechanism: 'server tree -> client boundary -> payload -> hydration',
      imageTitle: 'React Server Component 边界',
      diagramText: 'server tree -> client boundary -> payload -> hydration',
      coreClaim: 'RSC 的核心不是“服务端渲染更多东西”，而是重新划分组件、数据和 bundle 的边界。',
      failureMode: '如果不理解边界，RSC 很容易被用成更复杂的 SSR。',
      readerPayoff: '看清 RSC 为什么会改变 React 应用结构',
      frameworkSteps: [
        '先分清哪些组件只能在 server 侧运行。',
        '识别 client boundary 带来的交互和 bundle 成本。',
        '理解 payload 如何把 server tree 交给客户端。',
        '避免把 client-only 状态误塞进 server 组件。',
        '用数据流而不是渲染口号理解 RSC。',
      ],
    },
  },
  {
    pattern: /Error Boundary|错误边界|容错/i,
    frame: {
      topic: 'React 容错',
      falseFrame: '写一个 fallback UI 就结束',
      betterFrame: '把崩溃隔离、错误上报和恢复路径都设计进去',
      mechanism: 'isolate -> report -> recover',
      imageTitle: 'React 容错边界',
      diagramText: 'isolate -> report -> recover',
      coreClaim: 'Error Boundary 的重点不是兜底 UI，而是控制失败范围并保留恢复路径。',
      failureMode: '只显示 fallback 会隐藏真正的故障，也无法帮助用户继续操作。',
      readerPayoff: '把 React 崩溃从整页事故变成局部可恢复问题',
      frameworkSteps: [
        '按业务风险划分错误边界。',
        '给用户一个可理解的 fallback。',
        '把错误上下文上报出去。',
        '设计重试、刷新或降级路径。',
        '避免用边界吞掉应该修复的问题。',
      ],
    },
  },
  {
    pattern: /testing|测试|TDD|coverage|用例/i,
    frame: {
      topic: '前端测试',
      falseFrame: '追求覆盖率或者盯着实现细节测',
      betterFrame: '用行为用例保护重构空间',
      mechanism: 'behavior -> signal -> regression',
      imageTitle: '前端测试信心闭环',
      diagramText: 'behavior -> signal -> regression',
      coreClaim: '好的前端测试不奖励覆盖率，而是给重构留下信心。',
      failureMode: '测试实现细节会制造假阴性，覆盖率也可能给出假安全感。',
      readerPayoff: '写出更少但更有信心的测试',
      frameworkSteps: [
        '先写用户能观察到的行为。',
        '避免断言内部状态和实现细节。',
        '隔离每个测试用例。',
        '只在关键路径上追求回归保护。',
        '把失败测试当成需求反馈。',
      ],
    },
  },
  {
    pattern: /性能|FMP|performance|harness|ledger|优化/i,
    frame: {
      topic: 'AI 性能优化',
      falseFrame: '让模型多给几条优化建议',
      betterFrame: '让每一轮修改都能被同一个 harness 复验',
      mechanism: 'baseline -> change -> verify -> ledger',
      imageTitle: '可度量的 AI 工程闭环',
      diagramText: 'baseline -> change -> verify -> ledger',
      coreClaim: '没有可重复测量，AI 优化就是在讲故事。',
      failureMode: '测量口径错了，任何性能收益都不能算数。',
      readerPayoff: '判断 AI 优化到底有没有胡说',
      frameworkSteps: [
        '定义一个用户可感知指标。',
        '为这个指标搭一个可重复 harness。',
        '每轮只攻击一个瓶颈。',
        '修改后和同一 baseline 做严格对比。',
        '没有可比数据，就不要声明收益。',
      ],
    },
  },
  {
    pattern: /skill|agent skills?|prompt|函数式蓝图/i,
    frame: {
      topic: 'Agent Skill 设计',
      falseFrame: '把一堆提示词塞进上下文',
      betterFrame: '把能力做成有输入、输出和验收标准的工具单元',
      mechanism: 'context -> contract -> execution -> eval',
      imageTitle: 'Agent Skill 能力单元',
      diagramText: 'context -> contract -> execution -> eval',
      coreClaim: 'Skill 的价值不是多一段提示词，而是把可复用能力变成稳定契约。',
      failureMode: '没有契约的 Skill 只是长提示词，越堆越难复用。',
      readerPayoff: '把零散 AI 经验沉淀成可执行能力',
      frameworkSteps: [
        '先定义 Skill 要接收什么上下文。',
        '写清楚它必须产出什么结果。',
        '把执行步骤限制在少数明确动作里。',
        '用 eval 或 checklist 检查结果。',
        '把失败案例回流进 Skill。',
      ],
    },
  },
];

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
      followUpReplies: buildFollowUpReplies(article, variant),
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
    return strongThesis(article);
  }

  return clamp(`A technical post is useful only when it leaves a reusable frame.\n\nReusable frame: ${takeaway}`, 220);
}

export function researchUtility(article) {
  const frame = articleFrame(article);
  return clamp(`我把「${frame.topic}」拆成了一张可复用流程图。\n\n问题不是 ${frame.falseFrame}，而是 ${frame.betterFrame}。\n\n核心步骤：${compactSteps(frame.frameworkSteps, 3)}\n\n图里是完整结构。`, 220);
}

export function strongThesis(article) {
  const frame = articleFrame(article);
  return clamp(`很多人把「${frame.topic}」想错了。\n\n真正的问题不是 ${frame.falseFrame}，而是 ${frame.betterFrame}。\n\n我把它压成一个判断框架：${frame.mechanism}。`, 220);
}

export function caseStory(article) {
  const frame = articleFrame(article);
  return clamp(`我一开始以为「${frame.topic}」的问题是 ${frame.falseFrame}。\n\n后来发现真正的瓶颈是 ${frame.betterFrame}。\n\n这件事给我的教训：${frame.mechanism}。`, 220);
}

export function usefulLesson(article) {
  const title = clamp(article.title, 96);
  const takeaway = clamp(sentence(article.excerpt), 130);
  if (article.lang === 'zh') {
    const frame = articleFrame(article);
    return clamp(`我把这篇文章压成一个可复用结论：\n\n${frame.coreClaim}\n\n主题：${title}\n${takeaway}`, 220);
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
  const frame = articleFrame(article);

  return [
    `这篇文章讨论的不是“${frame.falseFrame}”，而是一个更实际的问题：${frame.betterFrame}。`,
    '',
    `我的核心判断：${frame.coreClaim}`,
    '',
    '## 关键结论',
    '',
    ...dedupePoints([
      sanitizeArticlePoint(takeaway),
      frame.failureMode,
      `读者应该带走的是：${frame.readerPayoff}。`,
      ...points,
    ])
      .filter((point) => point !== frame.coreClaim)
      .slice(0, 5)
      .map((point) => `- ${point}`),
    '',
    '## 可复用框架',
    '',
    ...frame.frameworkSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## 为什么值得读原文',
    '',
    `原文围绕《${article.title}》展开，有完整背景、判断过程和可复用步骤。短帖只能给出框架，原文适合用来核对细节、边界和实际例子。`,
    '',
    `博客原文：${targetUrl}`,
  ].join('\n');
}

export function articleTakeaway(article) {
  if (article.lang === 'zh') {
    return articleFrame(article).coreClaim;
  }

  return clamp(sentence(article.excerpt), 120);
}

export function buildThreadFallback(article, targetUrl) {
  const title = clamp(article.title, 96);
  if (article.lang === 'zh') {
    const frame = articleFrame(article);
    return [
      clampPost(`${title}\n\n很多人把「${frame.topic}」想错了。真正的问题不是 ${frame.falseFrame}，而是 ${frame.betterFrame}。`),
      clampPost(`可复用框架：\n\n${numberedSteps(frame.frameworkSteps, 5)}`),
      linkPost('完整过程和框架：', targetUrl),
    ];
  }

  return [
    clampPost(`${title}\n\nThe useful frame is measurement first, optimization second.`),
    clampPost('1. Pick a user-visible metric\n2. Build a harness\n3. Change one bottleneck per round\n4. Compare against the same baseline'),
    linkPost('Full post:', targetUrl),
  ];
}

export function buildFollowUpReplies(article, variant) {
  if (article.lang !== 'zh') {
    return [
      clampPost('The part I would not skip: keep the baseline stable. If the measurement changes between rounds, the optimization result is just noise.'),
      clampPost('A reusable checklist:\n\n1. One user-visible metric\n2. One repeatable harness\n3. One bottleneck per round\n4. One ledger entry with the failed attempts included'),
    ];
  }

  const frame = articleFrame(article);
  const variantReply = {
    'research-utility': `图里最重要的不是流程箭头，而是这条机制：${frame.mechanism}。它把「${frame.topic}」从经验变成了可复用步骤。`,
    'strong-thesis': `我判断「${frame.topic}」是否靠谱，只看一件事：有没有把“${frame.betterFrame}”落实成可检查的步骤。`,
    'case-story': `这个 case 的教训是：先别急着套方案。先识别是不是还停在“${frame.falseFrame}”，否则后面动作都会跑偏。`,
  }[variant] || `真正要复用的是 ${frame.mechanism} 这个框架，而不是某个固定说法。`;

  return [
    clampPost(variantReply),
    clampPost(`如果你要把这个方法搬到自己的项目，先问三个问题：\n\n1. 你现在是不是还在${frame.falseFrame}？\n2. ${frame.betterFrame} 有没有证据？\n3. 下一步能不能按 ${frame.mechanism} 跑？`),
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
  const frame = isChinese ? articleFrame(article) : null;
  const title = isChinese ? frame.imageTitle : 'Measurable AI Engineering Loop';
  const subtitle = isChinese ? frame.diagramText : 'baseline -> change -> verify -> ledger';
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
      ? `${article.title} 的配图：${frame.imageTitle}`
      : `Visual for ${article.title}: AI agent working inside a measured engineering loop`,
    prompt: [
      'Use case: infographic-diagram',
      'Asset type: X post image, 1536x1024 landscape',
      `Primary request: Create a polished editorial infographic for a technical Chinese audience about "${article.title}".`,
      `Core message: ${title}`,
      `Diagram text to include exactly: "${subtitle}"`,
      'First-screen payload: one large Chinese headline, one concrete proof/mechanism label, no body paragraphs.',
      'Composition: one clear loop diagram with four labeled stages, a small ledger/checklist panel, and a performance waterfall hint; generous whitespace; high contrast; readable at mobile size.',
      'Style: modern engineering publication, clean vector-like bitmap illustration, precise lines, restrained color palette, no mascots, no stock-photo people.',
      `Variant emphasis: ${variantMessage}`,
      'Constraints: no brand logos, no platform logos, no fake UI, no watermark, no tiny unreadable paragraphs.',
    ].join('\n'),
  };
}

export function articleFrame(article) {
  if (article.lang !== 'zh') return DEFAULT_FRAME;
  const haystack = [
    article.title,
    article.excerpt,
    ...(article.tags || []),
  ].join(' ');
  const match = ARTICLE_FRAMES.find((item) => item.pattern.test(haystack));
  return match ? match.frame : DEFAULT_FRAME;
}

export function extractKeyPoints(text, limit = 5) {
  const normalized = String(text || '')
    .split(/[。！？.!?]\s*/)
    .map((item) => sanitizeArticlePoint(item))
    .filter(Boolean)
    .filter((item) => item.length >= 18 && item.length <= 120)
    .filter((item) => !/[|]/.test(item))
    .filter((item) => !/^\d+(\.\d+)?s\s*\|/.test(item))
    .filter((item) => !/^\|/.test(item))
    .filter((item) => !/^TL;DR/i.test(item))
    .filter((item) => !isHeadingGluedPoint(item));

  return normalized.slice(0, limit);
}

export function sanitizeArticlePoint(point) {
  return String(point || '')
    .replace(/\s+/g, ' ')
    .replace(/^#+\s*/, '')
    .trim();
}

export function isHeadingGluedPoint(point) {
  return /^(真正的问题|先修 Harness，再谈优化|Goal-Driven Loop 怎么跑|成功落地时改了什么|模式[一二三四五六七八九十]|结论|为什么值得读原文)\s+\S/u
    .test(String(point || '').trim());
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

function compactSteps(steps, limit = 3) {
  return steps.slice(0, limit).map((step) => step.replace(/[。.]$/u, '')).join(' / ');
}

function numberedSteps(steps, limit = 5) {
  return steps.slice(0, limit).map((step, index) => `${index + 1}. ${step}`).join('\n');
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
