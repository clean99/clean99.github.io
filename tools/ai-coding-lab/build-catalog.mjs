import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function argValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const sourceDir = argValue('--source') || process.env.CODEX_SETUP_DIR;
const outputPath = path.resolve(repoRoot, argValue('--output') || 'source/ai-coding-lab/catalog.json');

const catalog = buildCatalog({ sourceDir });
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`ai coding catalog: ${catalog.stats.skills} skills, ${catalog.stats.files} files, ${catalog.stats.redacted} redacted`);
