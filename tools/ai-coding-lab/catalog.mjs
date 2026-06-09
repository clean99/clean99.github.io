import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_SOURCE_DIR = '/Users/bytedance/Documents/codex-setup';
const SKILL_PATH_MARKERS = [
  'home/.codex/skills',
  'home/.agents/skills'
];

const PUBLIC_FILE_RULES = [
  {
    path: 'README.md',
    type: 'repository',
    title: 'Portable setup README',
    summary: 'A public overview of what the portable agent setup includes and excludes.'
  },
  {
    path: 'home/.codex/AGENTS.md',
    type: 'agent policy',
    title: 'Global agent operating rules',
    summary: 'Long-running behavior, engineering standards, and verification expectations.'
  },
  {
    path: 'home/.codex/CLAUDE.md',
    type: 'agent policy',
    title: 'Companion agent instructions',
    summary: 'Shared operating rules for another local coding assistant.'
  },
  {
    path: 'home/.codex/config.toml',
    type: 'configuration',
    title: 'Local agent configuration',
    summary: 'Model, shell, and tool configuration with secrets removed before publication.'
  },
  {
    path: 'home/.codex/hooks.json',
    type: 'automation',
    title: 'Hook registry',
    summary: 'Local event hooks that connect agent work to automation and observability.'
  },
  {
    path: 'home/.agents/.skill-lock.json',
    type: 'inventory',
    title: 'Skill lockfile',
    summary: 'Pinned skill inventory for reproducible setup on another machine.'
  }
];

const INTERNAL_TERMS = [
  'bytedance',
  'bytedcli',
  'bytecloud',
  'byteintl',
  'bytetech',
  'feishu',
  'lark',
  'slardar',
  'tika',
  'goofy',
  'argos',
  'aeolus',
  'dorado',
  'overpass',
  'neptune',
  'netlink',
  'dataq',
  'dkms',
  'bmq',
  'tcc',
  'tce',
  'tos',
  'rds',
  'psm',
  'logid',
  'meego',
  'byte',
  'bits',
  'bam',
  'scm',
  'iam',
  'kms',
  'csp',
  'ttp',
  'annex',
  'annexc',
  'ppe',
  'boe',
  'eden',
  'whistle',
  'om-workspace',
  'tiktok'
];

const INTERNAL_RE_SOURCE = `\\b(${INTERNAL_TERMS.join('|')})(?:s)?\\b`;
const INTERNAL_RE = new RegExp(INTERNAL_RE_SOURCE, 'gi');
const INTERNAL_TEST_RE = new RegExp(INTERNAL_RE_SOURCE, 'i');
const INTERNAL_SEGMENT_RE = new RegExp(`(^|[-_])(${INTERNAL_TERMS.join('|')})([-_]|$)`, 'i');
const SECRET_RE = /\b(api[_-]?key|token|secret|password|credential|private[_-]?key)\b\s*[:=]\s*("[^"\n]*"|'[^'\n]*'|[^\s,\]}]+)/gi;
const SECRET_TEST_RE = /\b(api[_-]?key|token|secret|password|credential|private[_-]?key)\b\s*[:=]\s*("[^"\n]*"|'[^'\n]*'|[^\s,\]}]+)/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_TEST_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const HOME_PATH_RE = /(?:\/Users\/[^\s"'`),]+|__HOME__)(?:\/[^\s"'`),]*)?/g;
const INTERNAL_COMPOUND_RE = /\b(?:US[-_]?TTP\d*|ppe[_-]?workspace[_-]?annexc|om[-_]?workspace)\b/gi;
const INTERNAL_COMPOUND_TEST_RE = /\b(?:US[-_]?TTP\d*|ppe[_-]?workspace[_-]?annexc|om[-_]?workspace)\b/i;
const INTERNAL_URL_RE = /https?:\/\/[^\s"'<>)]*(?:corp|internal|bytedance|bytecloud|feishu|lark|slardar|tika|goofy|argos|meego)[^\s"'<>)]*/gi;
const INTERNAL_URL_TEST_RE = /https?:\/\/[^\s"'<>)]*(?:corp|internal|bytedance|bytecloud|feishu|lark|slardar|tika|goofy|argos|meego)[^\s"'<>)]*/i;
const LONG_SECRETISH_RE = /\b[A-Za-z0-9_\/+=.-]{40,}\b/g;

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function walkFiles(rootDir) {
  if (!exists(rootDir)) return [];
  const output = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      output.push(fullPath);
    }
  }
  return output;
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function relativePath(sourceDir, filePath) {
  return normalizePath(path.relative(sourceDir, filePath));
}

function sha(value, length = 8) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, length);
}

function titleFromSlug(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');
}

export function sanitizeText(value) {
  return String(value || '')
    .replace(INTERNAL_COMPOUND_RE, '[internal]')
    .replace(INTERNAL_URL_RE, '[internal URL]')
    .replace(SECRET_RE, '[redacted credential]')
    .replace(EMAIL_RE, '[email redacted]')
    .replace(HOME_PATH_RE, '~')
    .replace(INTERNAL_RE, '[internal]')
    .replace(LONG_SECRETISH_RE, function(match) {
      if (/^[a-f0-9]{40}$/i.test(match)) return match;
      return '[redacted value]';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizePublicPath(value) {
  const segments = normalizePath(value).split('/');
  return segments.map((segment) => {
    if (!segment) return segment;
    if (INTERNAL_SEGMENT_RE.test(segment)) return '[internal]';
    if (/secret|token|password|credential/i.test(segment)) return '[redacted]';
    return segment.replace(INTERNAL_RE, '[internal]');
  }).join('/');
}

export function parseFrontmatter(markdown) {
  const text = String(markdown || '');
  if (!text.startsWith('---\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end).trim();
  const data = {};
  for (const line of raw.split(/\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    data[key] = rawValue.replace(/^['"]|['"]$/g, '').trim();
  }
  return { data, body: text.slice(end + 4).trim() };
}

function firstUsefulText(markdown) {
  return String(markdown || '')
    .split(/\n{2,}/)
    .map((part) => part
      .replace(/^#+\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[[^\]]+\]\([^)]+\)/g, '$1')
      .replace(/[*_`>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim())
    .find((part) => part.length > 24) || '';
}

function firstSentence(value, maxLength = 220) {
  const text = sanitizeText(value);
  const sentence = text.match(/^.{40,}?[.!?](?:\s|$)/);
  const selected = sentence ? sentence[0] : text;
  if (selected.length <= maxLength) return selected;
  return `${selected.slice(0, maxLength - 3).replace(/\s+\S*$/, '')}...`;
}

function detectCategory(text) {
  const lower = String(text || '').toLowerCase();
  if (/seo|marketing|content|copy|social/.test(lower)) return 'growth';
  if (/speech|audio|music|transcribe|voice/.test(lower)) return 'media';
  if (/figma|design|frontend|react|component|css|ui/.test(lower)) return 'frontend';
  if (/test|lint|review|judge|scanner|quality|performance/.test(lower)) return 'quality';
  if (/doc|writing|paper|presentation|spreadsheet|powerpoint/.test(lower)) return 'writing';
  if (/github|deploy|ci|workflow|browser|playwright/.test(lower)) return 'automation';
  if (INTERNAL_TEST_RE.test(lower)) return 'redacted internal workflow';
  return 'agent workflow';
}

function safeSkillName(rawName, slug) {
  const raw = rawName || titleFromSlug(slug);
  const sanitized = sanitizeText(raw);
  if (!sanitized || sanitized.includes('[internal]')) {
    return `Redacted Internal Skill ${sha(slug, 6)}`;
  }
  return sanitized;
}

function sourceLabel(relative) {
  return relative.includes('/.agents/') ? 'Agents' : 'Codex';
}

function skillSlug(relative) {
  return path.basename(path.dirname(relative));
}

function buildSkillItem(sourceDir, filePath) {
  const relative = relativePath(sourceDir, filePath);
  const slug = skillSlug(relative);
  const content = readText(filePath);
  const parsed = parseFrontmatter(content);
  const rawName = parsed.data.name || slug;
  const rawDescription = parsed.data.description || firstUsefulText(parsed.body);
  const combined = `${rawName} ${rawDescription} ${parsed.body.slice(0, 400)}`;
  const category = sanitizeText(detectCategory(combined));
  const redacted = INTERNAL_SEGMENT_RE.test(slug) || sanitizeText(rawName).includes('[internal]') || sanitizeText(rawDescription).includes('[internal]');

  return {
    id: `skill-${sourceLabel(relative).toLowerCase()}-${sha(relative)}`,
    kind: 'skill',
    name: safeSkillName(rawName, slug),
    description: firstSentence(rawDescription || 'Reusable agent workflow skill.'),
    category,
    source: sourceLabel(relative),
    path: redacted ? `home/.../skills/redacted-${sha(slug, 6)}/SKILL.md` : sanitizePublicPath(relative),
    redacted,
    size: Buffer.byteLength(content, 'utf8')
  };
}

function fileSummary(sourceDir, rule) {
  const fullPath = path.join(sourceDir, rule.path);
  if (!exists(fullPath)) return null;
  const content = readText(fullPath);
  return {
    id: `file-${sha(rule.path)}`,
    kind: 'file',
    name: rule.title,
    description: sanitizeText(rule.summary),
    category: rule.type,
    source: 'Setup',
    path: sanitizePublicPath(rule.path),
    redacted: /config|hook|policy/i.test(rule.type),
    size: Buffer.byteLength(content, 'utf8')
  };
}

function gitValue(sourceDir, args) {
  try {
    return execFileSync('git', ['-C', sourceDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function sourceInfo(sourceDir) {
  const commit = gitValue(sourceDir, ['rev-parse', 'HEAD']);
  const branch = gitValue(sourceDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = gitValue(sourceDir, ['config', '--get', 'remote.origin.url']);
  return {
    repository: 'clean99/codex-setup',
    url: 'https://github.com/clean99/codex-setup',
    branch: branch || 'main',
    commit: commit || 'unknown',
    remote: remote ? sanitizeText(remote.replace(/^git@github.com:/, 'https://github.com/').replace(/\.git$/, '')) : 'https://github.com/clean99/codex-setup'
  };
}

export function buildCatalog(options = {}) {
  const sourceDir = path.resolve(options.sourceDir || process.env.CODEX_SETUP_DIR || DEFAULT_SOURCE_DIR);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const available = exists(sourceDir);
  const files = available
    ? PUBLIC_FILE_RULES.map((rule) => fileSummary(sourceDir, rule)).filter(Boolean)
    : [];
  const skillFiles = available
    ? walkFiles(sourceDir)
      .filter((filePath) => filePath.endsWith('/SKILL.md') || filePath.endsWith('\\SKILL.md'))
      .filter((filePath) => SKILL_PATH_MARKERS.some((marker) => relativePath(sourceDir, filePath).includes(marker)))
      .sort((a, b) => relativePath(sourceDir, a).localeCompare(relativePath(sourceDir, b)))
    : [];
  const skills = skillFiles.map((filePath) => buildSkillItem(sourceDir, filePath));
  const items = [...files, ...skills].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'file' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const redactedCount = items.filter((item) => item.redacted).length;

  const catalog = {
    schemaVersion: 1,
    generatedAt,
    status: available ? 'ready' : 'source-missing',
    source: available ? sourceInfo(sourceDir) : {
      repository: 'clean99/codex-setup',
      url: 'https://github.com/clean99/codex-setup',
      branch: 'main',
      commit: 'unavailable',
      remote: 'https://github.com/clean99/codex-setup'
    },
    redaction: {
      publishedRawMarkdown: false,
      policy: [
        'Company and internal platform names are replaced.',
        'Credentials, emails, home paths, and internal URLs are removed.',
        'Generated data is scanned before publication.'
      ],
      redactedCount
    },
    stats: {
      files: files.length,
      skills: skills.length,
      redacted: redactedCount,
      bytesIndexed: items.reduce((total, item) => total + item.size, 0)
    },
    items
  };

  assertCatalogIsPublic(catalog);
  return catalog;
}

export function assertCatalogIsPublic(catalog) {
  const output = JSON.stringify(catalog);
  const leakedTerm = INTERNAL_TERMS.find((term) => new RegExp(`\\b${term}\\b`, 'i').test(output));
  if (leakedTerm) {
    throw new Error(`Generated catalog contains a redacted internal term: ${leakedTerm}`);
  }
  if (SECRET_TEST_RE.test(output) || EMAIL_TEST_RE.test(output) || INTERNAL_URL_TEST_RE.test(output) || INTERNAL_COMPOUND_TEST_RE.test(output)) {
    throw new Error('Generated catalog contains private contact, credential, or URL material.');
  }
  return true;
}
