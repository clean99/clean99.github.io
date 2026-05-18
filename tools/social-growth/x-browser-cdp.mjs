#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, resolve, join } from 'node:path';

const X_COMPOSE_URL = 'https://x.com/compose/post';
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_PROBE_TIMEOUT_MS = 30_000;
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
  if (options.probe) {
    if (!options.timeoutProvided) options.timeoutMs = DEFAULT_PROBE_TIMEOUT_MS;
    await probeBrowser(options);
    return;
  }
  if (options.readUrl) {
    if (!options.timeoutProvided) options.timeoutMs = DEFAULT_PROBE_TIMEOUT_MS;
    await captureVisibleText(options);
    return;
  }
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
  profileDirectory = '',
  chromePath = '',
}) {
  const session = await connectCompose({
    timeoutMs,
    profileDir,
    profileDirectory,
    chromePath,
  });
  const { cdp, chrome } = session;

  try {
    await waitForEditor(cdp, timeoutMs);

    if (text) {
      const existingDraft = await readComposeDraft(cdp);
      if (existingDraft && !draftMatchesExpected(existingDraft, text)) {
        throw new Error('X compose already contains a different draft. Save, publish after confirmation, or discard it before running this handoff.');
      }
      if (draftMatchesExpected(existingDraft, text)) {
        console.log('[x-browser-cdp] Existing compose draft already matches the requested text.');
      } else {
        await cdp.evaluate(`
          const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
          if (editor) {
            editor.focus();
            document.execCommand('insertText', false, ${JSON.stringify(text)});
          }
        `);
      }
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

async function probeBrowser({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  profileDir = defaultProfileDir(),
  profileDirectory = '',
  chromePath = '',
  json = false,
  probeOut = '',
  expectedAccount = '',
}) {
  const session = await connectCompose({
    timeoutMs,
    profileDir,
    profileDirectory,
    chromePath,
  });
  const { cdp, chrome } = session;

  try {
    const editorReady = await waitForEditor(cdp, Math.min(timeoutMs, 15_000), { throwOnTimeout: false });
    const fileInputReady = await hasFileInput(cdp);
    const loginPromptVisible = await hasLoginPrompt(cdp);
    const account = await detectAccount(cdp);
    const composeDraftText = editorReady ? await readComposeDraft(cdp) : '';
    const currentUrl = await cdp.evaluate(`window.location.href`);
    const blockers = [];

    if (!editorReady) {
      blockers.push(loginPromptVisible
        ? 'X login is required before the compose editor is available.'
        : 'X compose editor was not detected.');
    }
    if (editorReady && !fileInputReady) {
      blockers.push('X image file input was not detected.');
    }

    const result = {
      status: blockers.length ? 'blocked' : 'ready',
      profileDir: session.profileDir,
      profileDirectory: session.profileDirectory,
      currentUrl,
      attachedToExistingChrome: Boolean(session.existingPort),
      editorReady,
      fileInputReady,
      loginPromptVisible,
      observedAccount: account,
      composeDraftText,
      publicActions: {
        typedText: false,
        uploadedMedia: false,
        clickedSubmit: false,
      },
      blockers,
    };
    if (probeOut) {
      await writeProbeRecord(probeOut, browserProbeRecordFromResult(result, expectedAccount));
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printProbeResult(result);
    }
  } finally {
    cdp.close();
    if (chrome) chrome.unref();
  }
}

async function captureVisibleText({
  readUrl,
  textOut = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  profileDir = defaultProfileDir(),
  profileDirectory = '',
  chromePath = '',
  json = false,
}) {
  const targetUrl = normalizeReadUrl(readUrl);
  const session = await connectCompose({
    timeoutMs,
    profileDir,
    profileDirectory,
    chromePath,
    initialUrl: targetUrl,
    requireCompose: false,
  });
  const { cdp, chrome } = session;

  try {
    await cdp.send('Page.navigate', { url: targetUrl });
    await waitForDocument(cdp, Math.min(timeoutMs, 30_000));
    const text = await waitForVisibleText(cdp, Math.min(timeoutMs, 30_000));
    const currentUrl = await cdp.evaluate(`window.location.href`).catch(() => targetUrl);

    if (textOut) {
      await mkdir(dirname(textOut), { recursive: true });
      await writeFile(textOut, `${text.trimEnd()}\n`);
    }

    const result = {
      status: text.trim() ? 'captured' : 'empty',
      requestedUrl: targetUrl,
      profileDirectory: session.profileDirectory,
      currentUrl,
      textOut,
      textLength: text.length,
      attachedToExistingChrome: Boolean(session.existingPort),
      publicActions: {
        typedText: false,
        uploadedMedia: false,
        clickedSubmit: false,
      },
    };

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[x-browser-cdp] Captured ${text.length} visible characters from ${currentUrl}.`);
    }
  } finally {
    cdp.close();
    if (chrome) chrome.unref();
  }
}

async function writeProbeRecord(filePath, record) {
  const previous = await readJsonFile(filePath);
  const merged = dropEmpty({
    ...previous,
    ...record,
  });
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`);
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

function browserProbeRecordFromResult(result, expectedAccount) {
  return {
    ...(expectedAccount ? { expectedAccount } : {}),
    observedAccount: result.observedAccount,
    profileDirectory: result.profileDirectory,
    chromeRunning: 'yes',
    loginState: result.editorReady
      ? 'logged_in'
      : result.loginPromptVisible ? 'logged_out' : 'unknown',
    mediaUpload: result.fileInputReady
      ? 'ready'
      : result.editorReady ? 'blocked' : 'unknown',
    composeDraftText: result.composeDraftText || '',
    generatedAt: new Date().toISOString(),
  };
}

function dropEmpty(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'composeDraftText') {
      output[key] = String(value ?? '');
      continue;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      output[key] = value;
    }
  }
  return output;
}

async function connectCompose({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  profileDir = defaultProfileDir(),
  profileDirectory = '',
  chromePath = '',
  initialUrl = X_COMPOSE_URL,
  requireCompose = true,
}) {
  const resolvedProfileDir = profileDir || defaultProfileDir();
  const resolvedProfileDirectory = String(profileDirectory || process.env.BAOYU_CHROME_PROFILE_DIRECTORY || process.env.X_BROWSER_PROFILE_DIRECTORY || '').trim();
  await mkdir(resolvedProfileDir, { recursive: true });
  const candidatePort = await findExistingDebugPort(resolvedProfileDir);
  const existingPort = candidatePort && await isDebugPortAlive(candidatePort) ? candidatePort : null;
  const port = existingPort || await freePort();
  let chrome = null;

  if (!existingPort) {
    chrome = launchChrome({
      chromePath: chromePath || findChromePath(),
      profileDir: resolvedProfileDir,
      profileDirectory: resolvedProfileDirectory,
      port,
      url: initialUrl,
    });
  }

  const target = await waitForPageTarget(port, timeoutMs);
  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);

  try {
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Page.enable');
    if (requireCompose) {
      await ensureComposePage(cdp, timeoutMs);
    } else {
      await waitForDocument(cdp, Math.min(timeoutMs, 30_000));
    }
    return {
      cdp,
      chrome,
      port,
      existingPort,
      profileDir: resolvedProfileDir,
      profileDirectory: resolvedProfileDirectory,
      target,
    };
  } catch (error) {
    cdp.close();
    if (chrome) chrome.unref();
    throw error;
  }
}

async function isDebugPortAlive(port) {
  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`).catch(() => null);
  return Boolean(version?.webSocketDebuggerUrl || version?.Browser);
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

async function waitForEditor(cdp, timeoutMs, { throwOnTimeout = true } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cdp.evaluateBoolean(`!!document.querySelector('[data-testid="tweetTextarea_0"]')`)) return true;
    await sleep(1000);
  }
  if (!throwOnTimeout) return false;
  throw new Error('Timed out waiting for X post editor. Log into X in this Chrome profile, then rerun.');
}

async function ensureComposePage(cdp, timeoutMs) {
  const href = await cdp.evaluate(`window.location.href`).catch(() => '');
  if (!String(href).includes('x.com/compose/post')) {
    await cdp.send('Page.navigate', { url: X_COMPOSE_URL });
  }
  await waitForDocument(cdp, Math.min(timeoutMs, 30_000));
}

async function waitForDocument(cdp, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const readyState = await cdp.evaluate(`document.readyState`).catch(() => '');
    if (readyState === 'interactive' || readyState === 'complete') return;
    await sleep(500);
  }
}

async function waitForVisibleText(cdp, timeoutMs) {
  const start = Date.now();
  let latest = '';
  while (Date.now() - start < timeoutMs) {
    latest = String(await cdp.evaluate(`document.body?.innerText || ''`).catch(() => '') || '');
    if (latest.trim().length > 0) return latest;
    await sleep(500);
  }
  return latest;
}

function normalizeReadUrl(value) {
  const url = new URL(String(value || ''));
  const hostname = url.hostname.toLowerCase();
  if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(hostname)) {
    throw new Error('Read-only capture is restricted to x.com/twitter.com URLs.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Read-only capture requires an HTTPS X URL.');
  }
  return url.toString();
}

async function hasFileInput(cdp) {
  return await cdp.evaluateBoolean(`
    !!document.querySelector('input[data-testid="fileInput"], input[type="file"][accept*="image"], input[type="file"]')
  `);
}

async function hasLoginPrompt(cdp) {
  return await cdp.evaluateBoolean(`
    !document.querySelector('[data-testid="tweetTextarea_0"]')
      && !!document.querySelector('[data-testid="loginButton"], a[href="/login"], input[name="text"], input[autocomplete="username"]')
  `);
}

async function detectAccount(cdp) {
  const value = await cdp.evaluate(`
    (() => {
      const reserved = new Set([
        'home', 'compose', 'explore', 'notifications', 'messages', 'settings',
        'i', 'login', 'logout', 'search', 'jobs'
      ]);
      const accountButton = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      const buttonText = accountButton?.innerText || '';
      const handle = buttonText.match(/@[A-Za-z0-9_]{1,15}/)?.[0];
      if (handle) return handle;
      const profileHref = [...document.querySelectorAll('a[href^="/"]')]
        .map((link) => link.getAttribute('href') || '')
        .map((href) => href.split('?')[0].replace(/^\\//, ''))
        .find((slug) => /^[A-Za-z0-9_]{1,15}$/.test(slug) && !reserved.has(slug));
      return profileHref ? \`@\${profileHref}\` : '';
    })()
  `).catch(() => '');
  return String(value || '').trim();
}

async function readComposeDraft(cdp) {
  const value = await cdp.evaluate(`
    (() => {
      const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
      if (!editor) return '';
      const text = editor.innerText || editor.textContent || '';
      const placeholder = editor.getAttribute('aria-label') || '';
      return text === placeholder ? '' : text;
    })()
  `).catch(() => '');
  return String(value || '').trim();
}

function draftMatchesExpected(draft, expected) {
  const normalizedDraft = normalizeDraft(draft);
  const normalizedExpected = normalizeDraft(expected);
  if (!normalizedDraft || !normalizedExpected) return false;
  return normalizedDraft === normalizedExpected || normalizedDraft.startsWith(`${normalizedExpected} `);
}

function normalizeDraft(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function previewText(value, limit = 96) {
  const normalized = normalizeDraft(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
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
    const parsedPort = Number(port) || null;
    if (parsedPort) return parsedPort;
  } catch {
  }
  return await findDebugPortFromProcessList(profileDir);
}

async function findDebugPortFromProcessList(profileDir) {
  const output = await readProcessList().catch(() => '');
  const normalizedProfileDir = resolve(profileDir);
  for (const command of output.split('\n')) {
    if (!command.includes('--remote-debugging-port=')) continue;
    if (!command.includes(`--user-data-dir=${normalizedProfileDir}`)) continue;
    const match = command.match(/--remote-debugging-port=(\d+)/);
    if (match) return Number(match[1]) || null;
  }
  return null;
}

function readProcessList() {
  return new Promise((resolveRead, rejectRead) => {
    const ps = spawn('/bin/ps', ['axo', 'command'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    ps.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    ps.on('error', rejectRead);
    ps.on('close', (code) => {
      if (code === 0) {
        resolveRead(stdout);
        return;
      }
      rejectRead(new Error(stderr || `ps exited with ${code}`));
    });
  });
}

function launchChrome({ chromePath, profileDir, profileDirectory, port, url }) {
  if (!chromePath) throw new Error('Chrome not found. Pass --chrome-path or install Chrome.');
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    url,
  ];
  if (profileDirectory) {
    args.splice(2, 0, `--profile-directory=${profileDirectory}`);
  }
  return spawn(chromePath, args, {
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
    probe: false,
    readUrl: '',
    textOut: '',
    json: false,
    probeOut: '',
    expectedAccount: '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    timeoutProvided: false,
    profileDir: '',
    profileDirectory: '',
    chromePath: '',
    help: false,
  };
  const textParts = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--probe') {
      options.probe = true;
    } else if (arg === '--read-url' && args[index + 1]) {
      options.readUrl = args[++index];
    } else if (arg === '--text-out' && args[index + 1]) {
      options.textOut = args[++index];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--probe-out' && args[index + 1]) {
      options.probeOut = args[++index];
    } else if (arg === '--account' && args[index + 1]) {
      options.expectedAccount = args[++index];
    } else if (arg === '--image' && args[index + 1]) {
      options.images.push(args[++index]);
    } else if (arg === '--submit') {
      options.submit = true;
    } else if (arg === '--profile' && args[index + 1]) {
      options.profileDir = args[++index];
    } else if (arg === '--profile-directory' && args[index + 1]) {
      options.profileDirectory = args[++index];
    } else if (arg === '--chrome-path' && args[index + 1]) {
      options.chromePath = args[++index];
    } else if (arg === '--timeout-ms' && args[index + 1]) {
      options.timeoutMs = Number(args[++index]) || DEFAULT_TIMEOUT_MS;
      options.timeoutProvided = true;
    } else if (arg && !arg.startsWith('-')) {
      textParts.push(arg);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.text = textParts.join(' ').trim();
  return options;
}

function printProbeResult(result) {
  console.log(`X Browser Probe

Status: ${result.status}
Profile: ${result.profileDir}
Chrome profile directory: ${result.profileDirectory || 'default'}
Current URL: ${result.currentUrl}
Attached to existing Chrome: ${result.attachedToExistingChrome ? 'yes' : 'no'}
Editor ready: ${result.editorReady ? 'yes' : 'no'}
Image file input ready: ${result.fileInputReady ? 'yes' : 'no'}
Observed account: ${result.observedAccount || 'unknown'}
Compose draft: ${result.composeDraftText ? previewText(result.composeDraftText) : 'empty or not captured'}

Public actions: no text typed, no media uploaded, no submit clicked.

Blockers:
${result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None'}`);
}

function printUsage(exitCode = 0) {
  console.log(`Prepare an X post in Chrome through CDP.

Usage:
  node tools/social-growth/x-browser-cdp.mjs [options] [text]

Options:
  --probe              Check Chrome/X compose readiness without typing or uploading
  --read-url <url>     Read visible text from an X URL without typing or uploading
  --text-out <path>    Write visible text captured by --read-url
  --json               Print probe result as JSON
  --probe-out <path>   Write browser-readiness probe state JSON
  --account <handle>   Expected X account handle for probe state
  --image <path>       Add image through file input; repeat for multiple images
  --profile <dir>      Chrome profile directory
  --profile-directory <name>
                       Chrome profile name inside --profile, e.g. "Profile 1"
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
