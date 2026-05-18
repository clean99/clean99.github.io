import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseXProfileMetrics } from './capture.mjs';

const DEFAULT_PROFILE_AUDIT_PATH = 'data/social-growth/profile-audit.md';
const DEFAULT_PROFILE_UPDATE_PATH = 'data/social-growth/profile-update.md';
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
  const profileIndex = findProfileHandleIndex(lines);
  const handleLine = profileIndex >= 0 ? lines[profileIndex] : lines.find((line) => /^@[\w_]{1,30}$/.test(line));
  const displayName = profileIndex > 0 ? lines[profileIndex - 1] : lines[0] || '';
  const linkLine = extractProfileLink(lines.find((line) => /https?:\/\/|clean99\.github\.io|github\.io/i.test(line)));
  const pinned = lines.some((line) => /Pinned|置顶|已置顶/i.test(line));
  const bio = extractLikelyBio(lines, { handleLine, linkLine, profileIndex });

  return {
    rawLines: lines,
    displayName,
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

export function buildProfileUpdatePackage(audit, {
  generatedAt = audit?.generatedAt || new Date(),
} = {}) {
  if (!audit) {
    throw new Error('profile audit is required');
  }
  const failedChecks = audit.checks.filter((check) => check.status !== 'pass');

  return {
    generatedAt: toIsoString(generatedAt),
    status: audit.status === 'pass' ? 'no_change_needed' : 'needs_browser_confirmation',
    current: {
      displayName: audit.profile.displayName || '',
      bio: audit.profile.bio || '',
      link: audit.profile.link || '',
      pinned: audit.profile.pinned,
      followers: audit.profile.followers,
    },
    proposed: {
      displayName: audit.suggestions.displayName,
      bio: audit.suggestions.bio,
      link: audit.suggestions.link,
      pinnedPost: audit.suggestions.pinnedPost,
    },
    failedChecks,
    browser: {
      stopBefore: [
        'final profile save click',
        'final pinned-post publish click',
        'final pin-to-profile confirmation click',
      ],
      steps: [
        'Open the Clean993 X profile.',
        'Open Edit profile and fill display name, bio, and link from the proposed copy.',
        'Stop before saving profile changes and request action-time confirmation.',
        'Create a new post from the pinned-post draft.',
        'Stop before publishing the post and request action-time confirmation.',
        'After the post is public, pin it to the profile.',
        'Stop before the final pin confirmation and request action-time confirmation.',
        'Recapture visible profile text and rerun social:profile-audit.',
      ],
    },
    boundary: [
      'This package is a local handoff only.',
      'Profile edits and pinned-post changes are public account actions and require action-time confirmation in Chrome.',
    ],
  };
}

export function formatProfileUpdatePackageMarkdown(profilePackage) {
  const failedChecks = profilePackage.failedChecks.length
    ? profilePackage.failedChecks.map((check) => `- ${check.message}`).join('\n')
    : '- No failed profile checks.';
  const stopPoints = profilePackage.browser.stopBefore.map((item) => `- ${item}`).join('\n');
  const steps = profilePackage.browser.steps.map((item, index) => `${index + 1}. ${item}`).join('\n');

  return `# X Profile Update Package

Generated at: ${profilePackage.generatedAt}
Status: ${profilePackage.status}

## Failed Checks

${failedChecks}

## Current Profile

- Display name: ${profilePackage.current.displayName || 'unknown'}
- Bio: ${profilePackage.current.bio || 'missing'}
- Link: ${profilePackage.current.link || 'missing'}
- Pinned post detected: ${profilePackage.current.pinned}
- Followers: ${profilePackage.current.followers || 'unknown'}

## Proposed Profile Copy

Display name:

\`\`\`text
${profilePackage.proposed.displayName}
\`\`\`

Bio:

\`\`\`text
${profilePackage.proposed.bio}
\`\`\`

Link:

\`\`\`text
${profilePackage.proposed.link}
\`\`\`

Pinned post draft:

\`\`\`text
${profilePackage.proposed.pinnedPost}
\`\`\`

## Chrome Handoff

Steps:

${steps}

Stop before:

${stopPoints}

## Boundary

${profilePackage.boundary.map((item) => `- ${item}`).join('\n')}
`;
}

export async function writeProfileUpdatePackage(profilePackage, filePath = DEFAULT_PROFILE_UPDATE_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatProfileUpdatePackageMarkdown(profilePackage).trimEnd()}\n`);
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
    displayName: 'Clean99 | AI 工程化 / 前端性能',
    bio: `写 ${primaryThemes}。只发能复用的工程判断：问题、指标、验证、失败轮次。`,
    link: 'https://clean99.github.io',
    pinnedPost: [
      '这里不做技术新闻搬运。',
      '',
      '我会把真实工程问题拆成四件事：',
      '问题到底是什么；',
      '哪个指标能证明它；',
      '改动有没有复验；',
      '失败轮次留下了什么。',
      '',
      '主要写 AI Agent 落地、前端性能、React、测试和技术博客增长。关注这里，应该能少踩一点“看起来很对但没证据”的坑。',
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

function findProfileHandleIndex(lines) {
  const handleIndexes = lines
    .map((line, index) => (/^@[\w_]{1,30}$/.test(line) ? index : -1))
    .filter((index) => index >= 0);

  return handleIndexes.findLast((index) => (
    lines.slice(index, index + 16).some((line) => /followers|关注者|粉丝/i.test(line))
  )) ?? handleIndexes[0] ?? -1;
}

function extractLikelyBio(lines, { handleLine, linkLine, profileIndex = -1 }) {
  const ignored = new Set([
    handleLine,
    linkLine,
    lines[0],
  ].filter(Boolean));
  const metricsPattern = /following|followers|正在关注|关注者|位关注者|joined|加入|posts|帖子/i;
  const sourceLines = profileIndex >= 0 ? lines.slice(profileIndex + 1, profileIndex + 12) : lines;
  const line = sourceLines.find((item) => (
    !ignored.has(item)
    && !metricsPattern.test(item)
    && !/^@/.test(item)
    && !/Edit profile|See new posts|Get verified|You aren’t verified/i.test(item)
    && !/^\d+(\.\d+)?[KMB万亿]?\s*/i.test(item)
  ));
  return line || '';
}

function extractProfileLink(line = '') {
  const value = String(line || '').trim();
  if (/clean99\.github\.io/i.test(value)) return 'clean99.github.io';
  const match = value.match(/https?:\/\/\S+|[A-Za-z0-9.-]*github\.io\S*/i);
  return match ? match[0] : '';
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
