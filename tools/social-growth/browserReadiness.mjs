import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/browser-readiness.md';
const UNKNOWN = 'unknown';

export function buildBrowserReadiness({
  preflight,
  xPrep,
  expectedAccount = '@Clean993',
  observedAccount = '',
  chromeRunning = UNKNOWN,
  extensionInstalled = UNKNOWN,
  nativeHost = UNKNOWN,
  extensionPipe = UNKNOWN,
  loginState = UNKNOWN,
  articleAvailable = UNKNOWN,
  mediaUpload = UNKNOWN,
  profileDir = xPrep?.skill?.profileDir || '',
  generatedAt = preflight?.generatedAt || new Date().toISOString(),
} = {}) {
  const signals = {
    chromeRunning: normalizeSignal(chromeRunning),
    extensionInstalled: normalizeSignal(extensionInstalled),
    nativeHost: normalizeSignal(nativeHost),
    extensionPipe: normalizeSignal(extensionPipe),
    loginState: normalizeSignal(loginState),
    articleAvailable: normalizeSignal(articleAvailable),
    mediaUpload: normalizeSignal(mediaUpload),
  };
  const publishMode = xPrep?.publishMode || 'x_article';
  const blockers = [];

  if (preflight?.status && preflight.status !== 'ready') {
    blockers.push('Local publish preflight is not ready.');
  }
  if (xPrep?.status && xPrep.status !== 'ready') {
    blockers.push('X publish prep is not ready.');
  }
  if (signals.chromeRunning === 'no') {
    blockers.push('Google Chrome is not running.');
  }
  if (signals.extensionInstalled === 'no') {
    blockers.push('Codex Chrome Extension is not installed or enabled.');
  }
  if (signals.nativeHost === 'no') {
    blockers.push('Codex Chrome native host manifest is missing or invalid.');
  }
  if (signals.extensionPipe === 'closed') {
    blockers.push('Codex Chrome Extension native pipe is closed.');
  }
  if (signals.loginState === 'logged_out') {
    blockers.push('The Chrome profile used for publishing is not logged into X.');
  }
  if (observedAccount && !sameAccount(observedAccount, expectedAccount)) {
    blockers.push(`Chrome is logged into ${observedAccount}, not ${expectedAccount}.`);
  }
  if (signals.articleAvailable === 'no' && publishMode !== 'thread_fallback') {
    blockers.push('X Article editor is unavailable; use thread fallback mode.');
  }
  if (signals.mediaUpload === 'blocked') {
    blockers.push('Media upload is blocked in the current browser automation path.');
  }

  return {
    generatedAt: toIsoString(generatedAt),
    status: readinessStatus({ blockers, signals, observedAccount, publishMode }),
    expectedAccount,
    observedAccount,
    publishMode,
    profileDir,
    selected: {
      id: preflight?.selected?.id || xPrep?.selected?.id || '',
      articleSlug: preflight?.selected?.articleSlug || xPrep?.selected?.articleSlug || '',
      imagePath: preflight?.image?.outputPath || xPrep?.files?.image || '',
      imageReady: Boolean(preflight?.image?.ready),
    },
    local: {
      preflightStatus: preflight?.status || UNKNOWN,
      xPrepStatus: xPrep?.status || UNKNOWN,
    },
    signals,
    blockers,
    nextActions: nextActions({ blockers, signals, publishMode, profileDir }),
    boundary: 'Readiness only. Do not publish, upload media, reply, like, repost, follow, edit profile, pin content, or click final X buttons without action-time confirmation.',
  };
}

export function formatBrowserReadinessMarkdown(readiness) {
  const blockers = readiness.blockers.length
    ? readiness.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No browser readiness blockers recorded.';
  const actions = readiness.nextActions.length
    ? readiness.nextActions.map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`).join('\n')
    : '- No next actions.';

  return `# X Browser Readiness

Generated at: ${readiness.generatedAt}
Status: ${readiness.status}

## Selected Package

- Queue id: ${readiness.selected.id || 'none'}
- Article slug: ${readiness.selected.articleSlug || 'none'}
- Image: \`${readiness.selected.imagePath || 'none'}\`
- Image ready: ${readiness.selected.imageReady}
- Publish mode: ${readiness.publishMode}

## Account And Profile

- Expected account: ${readiness.expectedAccount}
- Observed account: ${readiness.observedAccount || 'unknown'}
- Chrome profile dir: ${readiness.profileDir ? `\`${readiness.profileDir}\`` : 'default baoyu shared profile'}

## Local Prep

- Preflight: ${readiness.local.preflightStatus}
- X prep: ${readiness.local.xPrepStatus}

## Browser Signals

- Chrome running: ${readiness.signals.chromeRunning}
- Extension installed/enabled: ${readiness.signals.extensionInstalled}
- Native host: ${readiness.signals.nativeHost}
- Extension pipe: ${readiness.signals.extensionPipe}
- X login state: ${readiness.signals.loginState}
- X Article editor available: ${readiness.signals.articleAvailable}
- Media upload: ${readiness.signals.mediaUpload}

## Blockers

${blockers}

## Next Actions

${actions}

## Boundary

${readiness.boundary}
`;
}

export async function writeBrowserReadiness(readiness, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatBrowserReadinessMarkdown(readiness).trimEnd()}\n`);
  return filePath;
}

function readinessStatus({ blockers, signals, observedAccount, publishMode }) {
  if (!blockers.length) {
    const unknowns = Object.values(signals).filter((value) => value === UNKNOWN).length;
    if (!observedAccount || unknowns) return 'needs_browser_probe';
    return 'ready_for_browser_confirmation';
  }
  if (blockers.some((item) => item.includes('preflight') || item.includes('prep'))) return 'blocked_local_prep';
  if (blockers.some((item) => item.includes('native pipe'))) return 'needs_chrome_extension_reconnect';
  if (blockers.some((item) => item.includes('Chrome is not running'))) return 'needs_chrome_launch';
  if (blockers.some((item) => item.includes('Extension') || item.includes('native host'))) return 'blocked_chrome_extension';
  if (blockers.some((item) => item.includes('not logged into X') || item.includes('not @'))) return 'needs_x_login';
  if (blockers.some((item) => item.includes('X Article') && publishMode !== 'thread_fallback')) return 'needs_thread_fallback';
  if (blockers.some((item) => item.includes('Media upload'))) return 'needs_media_upload_permission';
  return 'blocked_browser_readiness';
}

function nextActions({ blockers, signals, publishMode, profileDir }) {
  const actions = [];
  if (!blockers.length) {
    actions.push({
      priority: 'P0',
      action: 'Open the prepared Chrome handoff and stop before media upload and final publish confirmation.',
      reason: 'Local package and browser readiness have no recorded blockers.',
    });
    return actions;
  }
  if (blockers.some((item) => item.includes('native pipe'))) {
    actions.push({
      priority: 'P0',
      action: 'Confirm opening a new Chrome window for the selected profile, then retry the Chrome extension connection.',
      reason: 'The extension and native host are installed, but the active communication pipe is closed.',
    });
  }
  if (blockers.some((item) => item.includes('not logged into X'))) {
    actions.push({
      priority: 'P0',
      action: profileDir
        ? `Log into X in \`${profileDir}\`, then rerun browser readiness.`
        : 'Log into X in the baoyu shared Chrome profile or pass --xProfileDir for a logged-in profile.',
      reason: 'The publishing script needs the same profile that owns the X session.',
    });
  }
  if (blockers.some((item) => item.includes('X Article'))) {
    actions.push({
      priority: 'P0',
      action: 'Regenerate x-prep and confirmation with --publishMode thread_fallback.',
      reason: 'The account/browser path cannot open X Article compose.',
    });
  }
  if (blockers.some((item) => item.includes('Media upload'))) {
    actions.push({
      priority: 'P0',
      action: 'Enable Chrome extension file access or use the baoyu profile script path that can attach media.',
      reason: 'The first post needs the generated image to avoid a weak text-only launch.',
    });
  }
  if (signals.chromeRunning === 'no') {
    actions.push({
      priority: 'P0',
      action: 'Launch Chrome before retrying browser confirmation.',
      reason: 'The extension cannot be used while Chrome is closed.',
    });
  }
  if (!actions.length) {
    actions.push({
      priority: 'P0',
      action: 'Resolve the listed browser readiness blockers, then rerun this report.',
      reason: blockers.join('; '),
    });
  }
  return actions;
}

function normalizeSignal(value) {
  const normalized = String(value ?? UNKNOWN).trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (['true', 'yes', 'ok', 'ready', 'running', 'installed', 'enabled', 'available', 'logged_in'].includes(normalized)) return 'yes';
  if (['false', 'no', 'missing', 'disabled', 'unavailable'].includes(normalized)) return 'no';
  if (['closed', 'pipe_closed', 'native_pipe_closed'].includes(normalized)) return 'closed';
  if (['blocked', 'permission_blocked'].includes(normalized)) return 'blocked';
  if (['logged_out', 'logout'].includes(normalized)) return 'logged_out';
  return UNKNOWN;
}

function sameAccount(left, right) {
  return normalizeAccount(left) === normalizeAccount(right);
}

function normalizeAccount(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
