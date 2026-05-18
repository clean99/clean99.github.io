const SHORT_POST_MAX_CHARS = 260;
const REPLY_MAX_CHARS = 260;
const HASHTAG_MAX_COUNT = 2;
const FORBIDDEN_SHORT_POST_PATTERNS = [
  /https?:\/\//i,
  /clean99\.github\.io/i,
  /\bI wrote about\b/i,
  /^原文[:：]/u,
  /^博客[:：]/u,
];
const LOW_VALUE_ENGAGEMENT_PATTERNS = [
  /点赞/u,
  /转发/u,
  /评论区/u,
  /关注我/u,
  /怎么看/u,
  /(^|\s)RT($|\s)/i,
];
const CHINESE_MECHANISM_PATTERNS = [
  /不是.+而是/u,
  /真正/u,
  /问题/u,
  /核心/u,
  /指标/u,
  /流程/u,
  /步骤/u,
  /框架/u,
  /闭环/u,
  /证据/u,
  /baseline/i,
  /ledger/i,
  /harness/i,
];
const VARIANT_PATTERNS = {
  'strong-thesis': [/不是.+而是/u, /真正/u, /很多人/u, /没有/u, /别再/u, /贵的是/u, /便宜/u],
  'research-utility': [/我发现/u, /步骤/u, /流程/u, /结构/u, /图里/u, /拆成/u, /总结/u],
  'case-story': [/我以为/u, /后来/u, /发现/u, /教训/u, /case/i, /复盘/u],
};

export function validateQueue(queue) {
  const sourceItems = queue?.items || [];
  const items = sourceItems.map((item) => validateQueueItem(item));
  validateQueueWideRules(sourceItems, items);
  for (const item of items) {
    item.status = item.errors.length ? 'fail' : 'pass';
  }
  const passed = items.filter((item) => item.status === 'pass').length;
  const failed = items.length - passed;
  const warnings = items.reduce((total, item) => total + item.warnings.length, 0);

  return {
    status: failed === 0 ? 'pass' : 'fail',
    total: items.length,
    passed,
    failed,
    warnings,
    items,
  };
}

export function validateQueueItem(item = {}) {
  const errors = [];
  const warnings = [];

  validateShortPost(item, errors, warnings);
  validateXArticle(item, errors, warnings);
  validateImage(item, errors, warnings);
  validateThreadFallback(item, errors, warnings);
  validateFollowUps(item, errors, warnings);

  if (item.requiresBrowserConfirmation !== true) {
    errors.push('requiresBrowserConfirmation must be true for public X actions');
  }

  return {
    id: item.id || '',
    articleSlug: item.articleSlug || '',
    variant: item.variant || '',
    status: errors.length ? 'fail' : 'pass',
    errors,
    warnings,
  };
}

export function passingQueueItemIds(validation) {
  return new Set((validation?.items || [])
    .filter((item) => item.status === 'pass')
    .map((item) => item.id));
}

export function formatValidationMarkdown(validation) {
  const itemLines = (validation?.items || []).map((item) => {
    const marker = item.status === 'pass' ? 'PASS' : 'FAIL';
    const issueLines = [
      ...item.errors.map((issue) => `  - ERROR: ${issue}`),
      ...item.warnings.map((issue) => `  - WARN: ${issue}`),
    ];
    return [`- ${marker} ${item.id}`, ...issueLines].join('\n');
  });

  return [
    '# X Publishing Quality Gate',
    '',
    `Status: ${validation.status}`,
    `Items: ${validation.passed}/${validation.total} passed`,
    `Warnings: ${validation.warnings}`,
    '',
    '## Checks',
    '',
    '- Short post sells the idea without raw blog URLs.',
    '- First screen contains a Chinese claim plus a concrete mechanism.',
    '- Queue does not reuse the same short post across different articles.',
    '- X Article carries the blog link at the end.',
    '- Image prompt uses gpt-image-2 and is readable as an X image.',
    '- Follow-up replies add substance instead of engagement bait.',
    '',
    '## Items',
    '',
    itemLines.length ? itemLines.join('\n') : '- No queue items.',
  ].join('\n');
}

function validateQueueWideRules(queueItems, validationItems) {
  const validationById = new Map(validationItems.map((item) => [item.id, item]));
  const seenShortPosts = new Map();

  for (const item of queueItems) {
    const key = normalizeShortPostForDuplicateCheck(item.shortPost);
    if (!key) continue;

    const existing = seenShortPosts.get(key);
    if (existing && existing.articleSlug !== item.articleSlug) {
      const currentValidation = validationById.get(item.id);
      const existingValidation = validationById.get(existing.id);
      currentValidation?.errors.push(`shortPost duplicates ${existing.id} from another article`);
      existingValidation?.errors.push(`shortPost duplicates ${item.id} from another article`);
      continue;
    }
    seenShortPosts.set(key, item);
  }
}

export function formatQueueItemValidation(item) {
  return formatValidationMarkdown(validateQueue({ items: [item] }));
}

function validateShortPost(item, errors, warnings) {
  const shortPost = String(item.shortPost || '').trim();
  if (!shortPost) {
    errors.push('shortPost is required');
    return;
  }
  if (shortPost.length > SHORT_POST_MAX_CHARS) {
    errors.push(`shortPost exceeds ${SHORT_POST_MAX_CHARS} characters`);
  }
  if (FORBIDDEN_SHORT_POST_PATTERNS.some((pattern) => pattern.test(shortPost))) {
    errors.push('shortPost must not contain raw blog URLs or low-value meta copy');
  }
  if (item.lang === 'zh' && hanChars(shortPost) < 18) {
    errors.push('Chinese shortPost must be written for Chinese readers');
  }
  if (item.lang === 'zh' && !CHINESE_MECHANISM_PATTERNS.some((pattern) => pattern.test(shortPost))) {
    errors.push('Chinese shortPost needs a concrete mechanism in the first screen');
  }
  if (!variantMatches(item.variant, shortPost)) {
    warnings.push(`shortPost does not strongly match ${item.variant} structure`);
  }
  const hashtags = shortPost.match(/#[\p{Script=Han}A-Za-z0-9_]+/gu) || [];
  if (hashtags.length > HASHTAG_MAX_COUNT) {
    warnings.push(`shortPost has more than ${HASHTAG_MAX_COUNT} hashtags`);
  }
  if (/^这篇文章/u.test(firstLine(shortPost))) {
    warnings.push('first line should state a claim or pain, not describe the post itself');
  }
}

function validateXArticle(item, errors, warnings) {
  const xArticle = item.xArticle || {};
  const body = String(xArticle.body || '').trim();
  const targetUrl = String(item.targetUrl || xArticle.blogUrl || '').trim();
  if (!xArticle.title || !body) {
    errors.push('xArticle title and body are required');
    return;
  }
  if (targetUrl && !body.includes(targetUrl)) {
    errors.push('xArticle body must include the target blog URL');
  }
  if (targetUrl && !body.includes(`博客原文：${targetUrl}`) && item.lang === 'zh') {
    errors.push('Chinese X Article must put the blog link under 博客原文：');
  }
  if (targetUrl && body.indexOf(targetUrl) < Math.floor(body.length * 0.6)) {
    warnings.push('blog link should appear near the end of the X Article');
  }
  if (!/##\s*(关键结论|可复用框架)|Useful frame:/u.test(body)) {
    warnings.push('xArticle should include a reusable framework section');
  }
}

function validateImage(item, errors, warnings) {
  const media = item.media || {};
  const prompt = String(media.prompt || '');
  if (media.model !== 'gpt-image-2') {
    errors.push('media.model must be gpt-image-2');
  }
  if (media.size !== '1536x1024') {
    errors.push('media.size must be 1536x1024');
  }
  if (!prompt) {
    errors.push('media.prompt is required');
  }
  if (!/readable at mobile size/i.test(prompt)) {
    warnings.push('image prompt should require mobile readability');
  }
  if (!/no brand logos/i.test(prompt)) {
    warnings.push('image prompt should forbid brand/platform logos');
  }
}

function validateThreadFallback(item, errors, warnings) {
  const posts = item.threadFallback || [];
  if (!Array.isArray(posts) || posts.length < 3) {
    errors.push('threadFallback must contain at least three posts');
    return;
  }
  const targetUrl = String(item.targetUrl || '');
  if (targetUrl && !posts[posts.length - 1].includes(targetUrl)) {
    errors.push('threadFallback final post must include the target blog URL');
  }
  if (posts[0] && /https?:\/\//i.test(posts[0])) {
    warnings.push('threadFallback first post should not start with a raw URL');
  }
}

function validateFollowUps(item, errors, warnings) {
  const replies = item.followUpReplies || [];
  if (!Array.isArray(replies) || replies.length < 1) {
    errors.push('at least one follow-up reply is required');
    return;
  }
  replies.forEach((reply, index) => {
    const value = String(reply || '').trim();
    if (!value) {
      errors.push(`followUpReplies[${index}] is empty`);
    }
    if (value.length > REPLY_MAX_CHARS) {
      errors.push(`followUpReplies[${index}] exceeds ${REPLY_MAX_CHARS} characters`);
    }
    if (LOW_VALUE_ENGAGEMENT_PATTERNS.some((pattern) => pattern.test(value))) {
      errors.push(`followUpReplies[${index}] contains low-value engagement bait`);
    }
  });
  if (replies.length > 3) {
    warnings.push('more than three follow-up replies risks looking automated');
  }
}

function variantMatches(variant, text) {
  const patterns = VARIANT_PATTERNS[variant];
  if (!patterns) return true;
  return patterns.some((pattern) => pattern.test(text));
}

function hanChars(text) {
  return (String(text).match(/\p{Script=Han}/gu) || []).length;
}

function firstLine(text) {
  return String(text || '').split(/\n/)[0].trim();
}

function normalizeShortPostForDuplicateCheck(text) {
  return String(text || '')
    .replace(/#[\p{Script=Han}A-Za-z0-9_]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
