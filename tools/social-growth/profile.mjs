import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseXProfileMetrics } from './capture.mjs';

const DEFAULT_PROFILE_AUDIT_PATH = 'data/social-growth/profile-audit.md';
const POSITIONING_KEYWORDS = [
  'AI',
  'Agent',
  '工程',
  '前端',
  '性能',
  'React',
  '测试',
  '博客',
];

export async function buildProfileAudit({
  profileText = '',
  queue = null,
  generatedAt = new Date(),
} = {}) {
  const profile = parseProfileText(profileText);
  const themes = inferQueueThemes(queue);
  const suggestions = buildProfileSuggestions({ themes });
  const checks = profileChecks({ profile, suggestions });
  const status = checks.every((check) => check.status === 'pass') ? 'pass' : 'needs_work';

  return {
    generatedAt: toIsoString(generatedAt),
    status,
    profile,
    themes,
    checks,
    suggestions,
    boundary: [
      'Do not edit X profile, bio, link, pinned post, or account settings without action-time confirmation.',
      'This audit is local guidance only; it does not perform public X actions.',
    ],
  };
}

export function parseProfileText(text = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const followers = safeParseFollowers(text);
  const handleLine = lines.find((line) => /^@[\w_]{1,30}$/.test(line));
  const linkLine = lines.find((line) => /https?:\/\/|clean99\.github\.io|github\.io/i.test(line));
  const pinned = lines.some((line) => /Pinned|置顶|已置顶/i.test(line));
  const bio = extractLikelyBio(lines, { handleLine, linkLine });

  return {
    rawLines: lines,
    displayName: lines[0] || '',
    handle: handleLine || '',
    bio,
    link: linkLine || '',
    pinned,
    followers: followers ?? '',
  };
}

export function formatProfileAuditMarkdown(audit) {
  const checks = audit.checks.map((check) => {
    const marker = check.status === 'pass' ? 'PASS' : 'FIX';
    return `- ${marker}: ${check.message}`;
  }).join('\n');
  const themes = audit.themes.length
    ? audit.themes.map((theme) => `- ${theme}`).join('\n')
    : '- No queue themes inferred.';

  return `# X Profile Conversion Audit

Generated at: ${audit.generatedAt}
Status: ${audit.status}

## Current Profile Signals

- Display name: ${audit.profile.displayName || 'unknown'}
- Handle: ${audit.profile.handle || 'unknown'}
- Followers: ${audit.profile.followers || 'unknown'}
- Link: ${audit.profile.link || 'missing'}
- Pinned post detected: ${audit.profile.pinned}
- Bio: ${audit.profile.bio || 'missing'}

## Queue Themes

${themes}

## Checks

${checks}

## Suggested Profile Copy

Display name:

\`\`\`text
${audit.suggestions.displayName}
\`\`\`

Bio:

\`\`\`text
${audit.suggestions.bio}
\`\`\`

Link:

\`\`\`text
${audit.suggestions.link}
\`\`\`

Pinned post draft:

\`\`\`text
${audit.suggestions.pinnedPost}
\`\`\`

## Boundary

${audit.boundary.map((item) => `- ${item}`).join('\n')}
`;
}

export async function writeProfileAudit(audit, filePath = DEFAULT_PROFILE_AUDIT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatProfileAuditMarkdown(audit).trimEnd()}\n`);
  return filePath;
}

export async function readOptionalText(filePath) {
  if (!filePath) return '';
  try {
    await access(filePath);
    return readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function profileChecks({ profile, suggestions }) {
  return [
    {
      status: profile.rawLines.length ? 'pass' : 'fail',
      message: profile.rawLines.length
        ? 'profile text was captured locally'
        : 'copy visible X profile text into data/social-growth/profile.local.txt',
    },
    {
      status: hasPositioning(profile.bio) || hasPositioning(profile.displayName) ? 'pass' : 'fail',
      message: 'profile should state the account promise around AI engineering, frontend, performance, React, testing, or technical blogging',
    },
    {
      status: profile.link ? 'pass' : 'fail',
      message: `profile should expose the blog link, suggested link: ${suggestions.link}`,
    },
    {
      status: profile.pinned ? 'pass' : 'fail',
      message: 'profile should pin a post that explains why technical readers should follow',
    },
    {
      status: profile.followers !== '' ? 'pass' : 'fail',
      message: 'profile follower count should be visible for snapshot comparison',
    },
  ];
}

function buildProfileSuggestions({ themes }) {
  const primaryThemes = themes.length ? themes.slice(0, 4).join(' / ') : 'AI 工程化 / 前端性能 / React / 测试';
  return {
    displayName: 'Clean99 | AI 工程化与前端性能',
    bio: `写 ${primaryThemes}。把真实工程问题压成可复用框架：指标、harness、验证、复盘。`,
    link: 'https://clean99.github.io',
    pinnedPost: [
      '我会持续写三类东西：',
      '',
      '1. AI Agent 怎么真正落到工程流程',
      '2. 前端性能、React、测试里的可复用判断',
      '3. 每篇长文提炼成能直接拿走的框架',
      '',
      '关注价值：少看口号，多拿方法。',
    ].join('\n'),
  };
}

function inferQueueThemes(queue) {
  const text = (queue?.items || [])
    .slice(0, 21)
    .map((item) => [
      item.articleSlug,
      item.shortPost,
      item.xArticle?.title,
      ...(item.posts || []),
    ].join(' '))
    .join(' ');
  const themes = [
    [/Agent|Skill|AI/i, 'AI 工程化'],
    [/性能|Performance|FMP|harness|baseline/i, '前端性能'],
    [/React|RSC|Server Component|Error Boundary/i, 'React'],
    [/测试|testing|TDD/i, '测试'],
    [/SEO|搜索|sitemap/i, '技术博客 SEO'],
    [/Spec|Vibe|OpenSpec/i, 'Spec-Driven Coding'],
  ];

  return themes
    .filter(([pattern]) => pattern.test(text))
    .map(([, theme]) => theme);
}

function extractLikelyBio(lines, { handleLine, linkLine }) {
  const ignored = new Set([
    handleLine,
    linkLine,
    lines[0],
  ].filter(Boolean));
  const metricsPattern = /following|followers|正在关注|关注者|位关注者|joined|加入|posts|帖子/i;
  const line = lines.find((item) => (
    !ignored.has(item)
    && !metricsPattern.test(item)
    && !/^@/.test(item)
    && !/^\d+(\.\d+)?[KMB万亿]?\s*/i.test(item)
  ));
  return line || '';
}

function hasPositioning(text) {
  return POSITIONING_KEYWORDS.some((keyword) => String(text || '').includes(keyword));
}

function safeParseFollowers(text) {
  try {
    return parseXProfileMetrics(text).followers;
  } catch {
    return null;
  }
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
