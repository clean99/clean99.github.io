import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, body: source };
  }

  return {
    data: parseSimpleYaml(match[1]),
    body: source.slice(match[0].length),
  };
}

export function parseSimpleYaml(yaml) {
  const data = {};

  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    data[key] = parseYamlValue(rawValue);
  }

  return data;
}

export function parseYamlValue(value) {
  const withoutComment = stripInlineComment(value).trim();
  if (!withoutComment) return '';

  if (withoutComment.startsWith('[') && withoutComment.endsWith(']')) {
    return withoutComment
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }

  return unquote(withoutComment);
}

export function stripInlineComment(value) {
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== '\\') {
      quote = quote === char ? null : quote || char;
    }

    if (char === '#' && !quote && /\s/.test(value[index - 1] || '')) {
      return value.slice(0, index);
    }
  }

  return value;
}

export function unquote(value) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

export async function loadArticles({
  postsDir = path.join(process.cwd(), 'source/_posts'),
  siteUrl = 'https://clean99.github.io',
} = {}) {
  const files = (await readdir(postsDir))
    .filter((file) => file.endsWith('.md'))
    .sort();

  const articles = await Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(postsDir, file);
      const source = await readFile(absolutePath, 'utf8');
      return articleFromMarkdown({ file, absolutePath, source, siteUrl });
    }),
  );

  return articles
    .filter((article) => article.title && article.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function articleFromMarkdown({ file, absolutePath = file, source, siteUrl }) {
  const { data, body } = parseFrontmatter(source);
  const slug = data.i18n_key || file.replace(/\.md$/, '').replace(/-zh$/, '');
  const lang = data.lang || (file.endsWith('-zh.md') ? 'zh' : 'en');
  const date = String(data.date || '');
  const url = buildArticleUrl({ siteUrl, date, slug, permalink: data.permalink });
  const text = markdownToPlainText(body);

  return {
    file,
    absolutePath,
    title: String(data.title || ''),
    date,
    lang,
    tags: Array.isArray(data.tags) ? data.tags : [],
    i18nKey: data.i18n_key || slug,
    slug,
    url,
    excerpt: extractExcerpt(body, text),
    text,
    wordCount: countWords(text),
  };
}

export function buildArticleUrl({ siteUrl, date, slug, permalink }) {
  const base = siteUrl.replace(/\/$/, '');

  if (permalink) {
    return `${base}/${String(permalink).replace(/^\/+/, '')}`;
  }

  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return `${base}/${slug}/`;
  }

  const [, year, month, day] = match;
  return `${base}/${year}/${month}/${day}/${slug}/`;
}

export function markdownToPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractExcerpt(markdown, plainText) {
  const tldr = markdown.match(/^>\s*\*\*TL;DR\*\*:\s*([\s\S]*?)(?:\n\n|$)/m);
  if (tldr) {
    return markdownToPlainText(tldr[1]);
  }

  const firstParagraph = markdown
    .replace(FRONTMATTER_RE, '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .find((paragraph) => paragraph && !paragraph.startsWith('#') && !paragraph.startsWith('!['));

  return firstParagraph ? markdownToPlainText(firstParagraph) : plainText.slice(0, 240);
}

export function countWords(text) {
  const asciiWords = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
  const cjkChars = text.match(/[\u3400-\u9fff]/g) || [];
  return asciiWords.length + cjkChars.length;
}

export function addUtm(url, { source = 'x', medium = 'social', campaign, content }) {
  const target = new URL(url);
  target.searchParams.set('utm_source', source);
  target.searchParams.set('utm_medium', medium);
  if (campaign) target.searchParams.set('utm_campaign', campaign);
  if (content) target.searchParams.set('utm_content', content);
  return target.toString();
}
