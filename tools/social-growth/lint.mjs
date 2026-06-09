#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const targets = [
  ...(await filesIn('tools/social-growth', '.mjs')),
  ...(await filesIn('tools/ai-coding-lab', '.mjs')),
  ...(await filesIn('test', '.mjs')),
];

for (const target of targets) {
  const result = spawnSync(process.execPath, ['--check', target], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${targets.length} JavaScript files.`);

async function filesIn(dir, extension) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await filesIn(entryPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      results.push(entryPath);
    }
  }
  return results.sort();
}
