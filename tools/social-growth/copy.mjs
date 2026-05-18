import { addUtm } from './articles.mjs';

const DEFAULT_CAMPAIGN = 'blog-growth-2026w21';
const MAX_POST_CHARS = 260;

export function buildDistributionCandidates(article, options = {}) {
  const campaign = options.campaign || DEFAULT_CAMPAIGN;
  const variants = ['sharp-take', 'useful-lesson', 'thread'];

  return variants.map((variant) => {
    const targetUrl = addUtm(article.url, {
      campaign,
      content: `${article.slug}-${variant}`,
    });

    if (variant === 'thread') {
      return {
        articleSlug: article.slug,
        lang: article.lang,
        variant,
        channel: 'x',
        targetUrl,
        posts: buildThread(article),
        linkPostIndex: 2,
        requiresBrowserConfirmation: true,
      };
    }

    return {
      articleSlug: article.slug,
      lang: article.lang,
      variant,
      channel: 'x',
      targetUrl,
      posts: [buildSinglePost(article, variant)],
      linkPostIndex: 0,
      requiresBrowserConfirmation: true,
    };
  });
}

export function buildSinglePost(article, variant) {
  const hook = variant === 'sharp-take'
    ? sharpTake(article)
    : usefulLesson(article);
  const tags = selectHashtags(article.tags);
  return clampPost(`${hook}${tags ? `\n\n${tags}` : ''}`);
}

export function buildThread(article) {
  const takeaway = sentence(article.excerpt);
  const compactTitle = clamp(article.title, 100);
  const posts = [
    clampPost(`${compactTitle}\n\n${takeaway}`),
    clampPost(`The useful frame:\n\n1. Start from the real problem.\n2. Make the signal measurable.\n3. Run one small loop at a time.`),
    clampPost('Full post:'),
  ];

  return posts;
}

export function sharpTake(article) {
  const takeaway = clamp(sentence(article.excerpt), 130);
  if (article.lang === 'zh') {
    return clamp(`很多技术文章的问题不是不够长，而是没有一个可复用的判断框架。\n\n这篇写的是：${takeaway}`, 220);
  }

  return clamp(`A technical post is useful only when it leaves a reusable frame.\n\nI wrote about: ${takeaway}`, 220);
}

export function usefulLesson(article) {
  const title = clamp(article.title, 96);
  const takeaway = clamp(sentence(article.excerpt), 130);
  if (article.lang === 'zh') {
    return clamp(`我把这篇文章压成一个结论：${takeaway}\n\n主题：${title}`, 220);
  }

  return clamp(`I compressed this post into one practical lesson: ${takeaway}\n\nTopic: ${title}`, 220);
}

export function selectHashtags(tags) {
  const selected = tags
    .filter((tag) => /^[A-Za-z][A-Za-z0-9 -]{1,24}$/.test(tag))
    .slice(0, 2)
    .map((tag) => `#${tag.replace(/\s+/g, '')}`);

  return selected.join(' ');
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
