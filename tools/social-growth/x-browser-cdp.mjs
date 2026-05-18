#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

const X_COMPOSE_URL = 'https://x.com/compose/post';
const DEFAULT_TIMEOUT_MS = 120_000;
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printUsage(0);
  if (!options.text && !options.images.length) {
    throw new Error('Provide text or at least one image.');
  }

  await preparePost(options);
}

async function preparePost({
  text,
  images,
  submit = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  profileDir = defaultProfileDir(),
  chromePath = '',
}) {
  await mkdir(profileDir, { recursive: true });
  const existingPort = await findExistingDebugPort(profileDir);
  const port = existingPort || await freePort();
  let chrome = null;

  if (!existingPort) {
    chrome = launchChrome({
      chromePath: chromePath || findChromePath(),
      profileDir,
      port,
      url: X_COMPOSE_URL,
    });
  }

  const target = await waitForPageTarget(port, timeoutMs);
  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);

  try {
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await waitForEditor(cdp, timeoutMs);

    if (text) {
      await cdp.evaluate(`
        const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, ${JSON.stringify(text)});
        }
      `);
    }

    for (const image of images) {
      await uploadImage(cdp, image);
    }

    if (submit) {
      await cdp.evaluate(`document.querySelector('[data-testid="tweetButton"]')?.click()`);
      console.log('[x-browser-cdp] Post submitted.');
    } else {
      console.log('[x-browser-cdp] Post composed. Review it in Chrome and stop before final publish unless confirmed.');
    }
  } finally {
    cdp.close();
    if (chrome) chrome.unref();
  }
}

async function uploadImage(cdp, imagePath) {
  const absolutePath = resolve(imagePath);
  if (!existsSync(absolutePath)) throw new Error(`Image not found: ${absolutePath}`);

  const before = await cdp.evaluateNumber(`document.querySelectorAll('img[src^="blob:"]').length`);
  const document = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const selectors = [
    'input[data-testid="fileInput"]',
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ];

  for (const selector of selectors) {
    const result = await cdp.send('DOM.querySelector', {
      nodeId: document.root.nodeId,
      selector,
    });
    if (!result.nodeId) continue;

    await cdp.send('DOM.setFileInputFiles', {
      nodeId: result.nodeId,
      files: [absolutePath],
    });
    await waitForImageCount(cdp, before + 1);
    console.log(`[x-browser-cdp] Uploaded image: ${absolutePath}`);
    return;
  }

  throw new Error('X image file input was not found.');
}

async function waitForEditor(cdp, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cdp.evaluateBoolean(`!!document.querySelector('[data-testid="tweetTextarea_0"]')`)) return;
    await sleep(1000);
  }
  throw new Error('Timed out waiting for X post editor. Log into X in this Chrome profile, then rerun.');
}

async function waitForImageCount(cdp, expectedCount) {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const count = await cdp.evaluateNumber(`document.querySelectorAll('img[src^="blob:"]').length`);
    if (count >= expectedCount) return;
    await sleep(1000);
  }
  throw new Error('Image upload was not detected in the X editor.');
}

async function waitForPageTarget(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`).catch(() => []);
    const target = targets.find((item) => (
      item.type === 'page'
      && item.webSocketDebuggerUrl
      && String(item.url || '').includes('x.com')
    )) || targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (target) return target;
    await sleep(500);
  }
  throw new Error('Timed out waiting for a Chrome CDP page target.');
}

async function findExistingDebugPort(profileDir) {
  try {
    const content = await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8');
    const [port] = content.trim().split(/\s+/);
    return Number(port) || null;
  } catch {
    return null;
  }
}

function launchChrome({ chromePath, profileDir, port, url }) {
  if (!chromePath) throw new Error('Chrome not found. Pass --chrome-path or install Chrome.');
  return spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    url,
  ], {
    detached: true,
    stdio: 'ignore',
  });
}

function findChromePath() {
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate)) || '';
}

function defaultProfileDir() {
  return process.env.BAOYU_CHROME_PROFILE_DIR
    || process.env.X_BROWSER_PROFILE_DIR
    || join(homedir(), 'Library/Application Support/baoyu-skills/chrome-profile');
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return await response.json();
}

class CdpClient {
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    const client = new CdpClient(ws);
    await client.opened;
    return client;
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.opened = new Promise((resolveOpen, rejectOpen) => {
      ws.onopen = resolveOpen;
      ws.onerror = rejectOpen;
    });
    ws.onmessage = (event) => this.handleMessage(event.data);
    ws.onclose = () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('Chrome CDP websocket closed.'));
      }
      this.pending.clear();
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = { id, method, params };
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.ws.send(JSON.stringify(payload));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed.');
    }
    return response.result?.value;
  }

  async evaluateBoolean(expression) {
    return Boolean(await this.evaluate(expression));
  }

  async evaluateNumber(expression) {
    return Number(await this.evaluate(expression)) || 0;
  }

  handleMessage(data) {
    const message = JSON.parse(String(data));
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message || 'CDP command failed.'));
      return;
    }
    pending.resolve(message.result || {});
  }

  close() {
    this.ws.close();
  }
}

function parseArgs(args) {
  const options = {
    text: '',
    images: [],
    submit: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    profileDir: '',
    chromePath: '',
    help: false,
  };
  const textParts = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--image' && args[index + 1]) {
      options.images.push(args[++index]);
    } else if (arg === '--submit') {
      options.submit = true;
    } else if (arg === '--profile' && args[index + 1]) {
      options.profileDir = args[++index];
    } else if (arg === '--chrome-path' && args[index + 1]) {
      options.chromePath = args[++index];
    } else if (arg === '--timeout-ms' && args[index + 1]) {
      options.timeoutMs = Number(args[++index]) || DEFAULT_TIMEOUT_MS;
    } else if (arg && !arg.startsWith('-')) {
      textParts.push(arg);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.text = textParts.join(' ').trim();
  return options;
}

function printUsage(exitCode = 0) {
  console.log(`Prepare an X post in Chrome through CDP.

Usage:
  node tools/social-growth/x-browser-cdp.mjs [options] [text]

Options:
  --image <path>       Add image through file input; repeat for multiple images
  --profile <dir>      Chrome profile directory
  --chrome-path <path> Chrome executable path
  --timeout-ms <ms>    Wait timeout
  --submit             Click the public post button
  --help               Show this help

Default behavior fills the editor and stops before final publish.`);
  process.exit(exitCode);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

await main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
