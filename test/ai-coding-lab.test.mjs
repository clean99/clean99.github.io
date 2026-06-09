import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assertCatalogIsPublic,
  buildCatalog,
  parseFrontmatter,
  sanitizePublicPath,
  sanitizeText
} from '../tools/ai-coding-lab/catalog.mjs';

function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-coding-lab-'));
  fs.mkdirSync(path.join(root, 'home/.codex/skills/public-skill'), { recursive: true });
  fs.mkdirSync(path.join(root, 'home/.codex/skills/bytedance-debug'), { recursive: true });
  fs.mkdirSync(path.join(root, 'home/.agents/skills/lark-calendar'), { recursive: true });
  fs.mkdirSync(path.join(root, 'home/.codex'), { recursive: true });
  fs.mkdirSync(path.join(root, 'home/.agents'), { recursive: true });

  fs.writeFileSync(path.join(root, 'README.md'), '# Setup\n\nPortable setup.');
  fs.writeFileSync(path.join(root, 'home/.codex/AGENTS.md'), '# Rules\n');
  fs.writeFileSync(path.join(root, 'home/.codex/CLAUDE.md'), '# Rules\n');
  fs.writeFileSync(path.join(root, 'home/.codex/config.toml'), 'TOKEN = "secret-value"\n');
  fs.writeFileSync(path.join(root, 'home/.codex/hooks.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'home/.agents/.skill-lock.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'home/.codex/skills/public-skill/SKILL.md'), [
    '---',
    'name: frontend-design',
    'description: Create distinctive production-grade frontend interfaces for portfolio pages.',
    '---',
    '',
    'Use when building web UI.'
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'home/.codex/skills/bytedance-debug/SKILL.md'), [
    '---',
    'name: bytedance-debug',
    'description: Debug ByteDance internal services with logid and token = "private-token".',
    '---',
    '',
    'Contact owner@example.com and open https://internal.bytedance.example/run.'
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'home/.agents/skills/lark-calendar/SKILL.md'), [
    '# Lark Calendar',
    '',
    'Operate Lark calendar workflows for internal users.'
  ].join('\n'));

  return root;
}

test('parseFrontmatter reads simple skill metadata', () => {
  const parsed = parseFrontmatter('---\nname: demo\ndescription: Demo skill.\n---\nBody');
  assert.equal(parsed.data.name, 'demo');
  assert.equal(parsed.data.description, 'Demo skill.');
  assert.equal(parsed.body, 'Body');
});

test('sanitizeText removes private values and internal terms', () => {
  const text = sanitizeText('Email a@corp.com with token = "abc" for ByteDance at /Users/me/.codex/config.toml');
  assert.equal(text.includes('ByteDance'), false);
  assert.equal(text.includes('a@corp.com'), false);
  assert.equal(text.includes('/Users/me'), false);
  assert.match(text, /\[internal\]/);
  assert.match(text, /\[email redacted\]/);
});

test('sanitizePublicPath redacts internal path segments', () => {
  assert.equal(
    sanitizePublicPath('home/.codex/skills/bytedance-debug/SKILL.md'),
    'home/.codex/skills/[internal]/SKILL.md'
  );
});

test('buildCatalog publishes public summaries and blocks leaked internal material', () => {
  const catalog = buildCatalog({
    sourceDir: fixtureRepo(),
    generatedAt: '2026-06-09T00:00:00.000Z'
  });

  assert.equal(catalog.stats.skills, 3);
  assert.equal(catalog.stats.files, 6);
  assert.equal(catalog.redaction.publishedRawMarkdown, false);
  assertCatalogIsPublic(catalog);

  const output = JSON.stringify(catalog);
  assert.equal(output.includes('ByteDance'), false);
  assert.equal(output.includes('bytedance-debug'), false);
  assert.equal(output.includes('Lark'), false);
  assert.equal(output.includes('owner@example.com'), false);
  assert.equal(output.includes('private-token'), false);
  assert.match(output, /frontend-design/);
  assert.match(output, /Redacted Internal Skill/);
});
