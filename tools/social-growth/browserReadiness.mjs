import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/browser-readiness.md';
const DEFAULT_PROBE_PATH = 'data/social-growth/browser-probe.local.json';
const UNKNOWN = 'unknown';
const PROBE_FIELDS = [
  'expectedAccount',
  'observedAccount',
  'chromeRunning',
  'extensionInstalled',
  'nativeHost',
  'extensionPipe',
  'loginState',
  'articleAvailable',
  'mediaUpload',
  'profileDirectory',
  'currentUrl',
  'userBrowserAccount',
  'userBrowserLoginState',
  'userBrowserCurrentUrl',
  'userBrowserTitle',
  'composeDraftText',
  'generatedAt',
];

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
  composeDraftText,
  profileDir = xPrep?.skill?.profileDir || '',
  profileDirectory = xPrep?.skill?.profileDirectory || '',
  currentUrl = '',
  userBrowserAccount = '',
  userBrowserLoginState = UNKNOWN,
  userBrowserCurrentUrl = '',
  userBrowserTitle = '',
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
  const composeDraft = buildComposeDraft({
    composeDraftText,
    expectedTexts: selectedComposeDraftTexts({ preflight, xPrep, publishMode }),
  });
  const userBrowserSession = buildUserBrowserSession({
    expectedAccount,
    userBrowserAccount,
    userBrowserLoginState,
    userBrowserCurrentUrl,
    userBrowserTitle,
  });
  const cdpHandoffReady = xPrep?.status === 'ready' && (
    xPrep?.skill?.browserHandoff === 'cdp'
    || xPrep?.skill?.name === 'baoyu-post-to-x'
  );
  const blockers = [];
  const warnings = [];

  if (preflight?.status && preflight.status !== 'ready') {
    blockers.push('Local publish preflight is not ready.');
  }
  if (xPrep?.status && xPrep.status !== 'ready') {
    blockers.push('X publish prep is not ready.');
    for (const blocker of xPrep.blockers || []) {
      blockers.push(`X publish prep blocker: ${blocker}`);
    }
  }
  if (signals.chromeRunning === 'no') {
    blockers.push('Google Chrome is not running.');
  }
  if (signals.extensionInstalled === 'no' && !cdpHandoffReady) {
    blockers.push('Codex Chrome Extension is not installed or enabled.');
  }
  if (signals.nativeHost === 'no' && !cdpHandoffReady) {
    blockers.push('Codex Chrome native host manifest is missing or invalid.');
  }
  if (signals.extensionPipe === 'closed' && !cdpHandoffReady) {
    blockers.push('Codex Chrome Extension native pipe is closed.');
  }
  if (signals.loginState === 'logged_out' && !userBrowserSession.usable) {
    blockers.push('The Chrome profile used for publishing is not logged into X.');
  } else if (signals.loginState === 'logged_out' && userBrowserSession.usable) {
    warnings.push('The CDP publishing profile is logged out, but normal Chrome is logged into the expected X account.');
  }
  if (observedAccount && !sameAccount(observedAccount, expectedAccount) && !userBrowserSession.usable) {
    blockers.push(`Chrome is logged into ${observedAccount}, not ${expectedAccount}.`);
  } else if (observedAccount && !sameAccount(observedAccount, expectedAccount) && userBrowserSession.usable) {
    warnings.push(`The CDP publishing profile appears to be ${observedAccount}, but normal Chrome is logged into ${expectedAccount}.`);
  }
  if (composeDraft.status === 'different') {
    blockers.push('X compose already contains a different draft; save, publish after confirmation, or discard it before writing the selected package.');
  }
  if (signals.articleAvailable === 'no' && publishMode !== 'thread_fallback') {
    blockers.push('X Article editor is unavailable; use thread fallback mode.');
  }
  if (signals.mediaUpload === 'blocked') {
    blockers.push('Media upload is blocked in the current browser automation path.');
  }

  return {
    generatedAt: toIsoString(generatedAt),
    status: readinessStatus({ blockers, signals, observedAccount, publishMode, userBrowserSession }),
    expectedAccount,
    observedAccount,
    publishMode,
    profileDir,
    profileDirectory,
    currentUrl: String(currentUrl || '').trim(),
    userBrowserSession,
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
    composeDraft,
    blockers,
    warnings,
    nextActions: nextActions({ blockers, signals, publishMode, profileDir, profileDirectory, userBrowserSession }),
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
  const warnings = readiness.warnings?.length
    ? readiness.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- No browser readiness warnings.';
  const userSession = readiness.userBrowserSession || {};

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
- Chrome profile directory: ${readiness.profileDirectory || 'default'}
- Current URL: ${readiness.currentUrl || 'unknown'}

## Normal Chrome Session

- Account: ${userSession.account || 'unknown'}
- Login state: ${userSession.loginState || 'unknown'}
- Usable for confirmation flow: ${Boolean(userSession.usable)}
- Current URL: ${userSession.currentUrl || 'unknown'}
- Title: ${userSession.title || 'unknown'}

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

## Compose Draft

- Status: ${readiness.composeDraft.status}
- Preview: ${readiness.composeDraft.preview || 'none'}
- Expected selected first post: ${readiness.composeDraft.expectedPreview || 'unknown'}

## Blockers

${blockers}

## Warnings

${warnings}

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

export async function readBrowserProbe(filePath = DEFAULT_PROBE_PATH) {
  try {
    return normalizeBrowserProbe(JSON.parse(await readFile(filePath, 'utf8')));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

export async function writeBrowserProbe(probe, filePath = DEFAULT_PROBE_PATH) {
  const normalized = normalizeBrowserProbe({
    ...probe,
    generatedAt: probe?.generatedAt || new Date().toISOString(),
  });
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`);
  return filePath;
}

export function mergeBrowserProbe(...probes) {
  const merged = {};
  for (const probe of probes) {
    const normalized = normalizeBrowserProbe(probe || {});
    for (const field of PROBE_FIELDS) {
      if (probeFieldHasValue(normalized, field)) merged[field] = normalized[field];
    }
  }
  return merged;
}

export function hasBrowserProbeValues(probe = {}) {
  const normalized = normalizeBrowserProbe(probe);
  return PROBE_FIELDS.some((field) => field !== 'generatedAt' && probeFieldHasValue(normalized, field));
}

function readinessStatus({ blockers, signals, observedAccount, publishMode, userBrowserSession }) {
  if (!blockers.length) {
    if (userBrowserSession?.usable && signals.loginState === 'logged_out') {
      return 'ready_via_user_chrome_confirmation';
    }
    const unknowns = Object.values(signals).filter((value) => value === UNKNOWN).length;
    if (!observedAccount || unknowns) return 'needs_browser_probe';
    return 'ready_for_browser_confirmation';
  }
  if (blockers.some((item) => item.includes('preflight') || item.includes('prep'))) return 'blocked_local_prep';
  if (blockers.some((item) => item.includes('native pipe'))) return 'needs_chrome_extension_reconnect';
  if (blockers.some((item) => item.includes('Chrome is not running'))) return 'needs_chrome_launch';
  if (blockers.some((item) => item.includes('Extension') || item.includes('native host'))) return 'blocked_chrome_extension';
  if (blockers.some((item) => item.includes('different draft'))) return 'needs_compose_draft_resolution';
  if (blockers.some((item) => item.includes('not logged into X') || item.includes('not @'))) return 'needs_x_login';
  if (blockers.some((item) => item.includes('X Article') && publishMode !== 'thread_fallback')) return 'needs_thread_fallback';
  if (blockers.some((item) => item.includes('Media upload'))) return 'needs_media_upload_permission';
  return 'blocked_browser_readiness';
}

function nextActions({ blockers, signals, publishMode, profileDir, userBrowserSession }) {
  const actions = [];
  if (!blockers.length) {
    if (userBrowserSession?.usable) {
      actions.push({
        priority: 'P0',
        action: 'Use the logged-in normal Chrome session with the manual publish kit, stopping before media upload and final publish confirmation.',
        reason: 'The CDP publishing profile is not the active X session, but normal Chrome is already logged into the expected account.',
      });
      return actions;
    }
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
  if (blockers.some((item) => item.includes('Bun runtime is unavailable'))) {
    actions.push({
      priority: 'P0',
      action: 'Install bun or rerun the X prep command with --bunCommand pointing to an executable Bun command.',
      reason: 'The X Article helper cannot run its TypeScript scripts without a Bun runtime.',
    });
  }
  if (blockers.some((item) => item.includes('different draft'))) {
    actions.push({
      priority: 'P0',
      action: 'Resolve the existing X compose draft before preparing the selected package.',
      reason: 'The automation must not overwrite a draft that does not match the selected queue item.',
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

function normalizeBrowserProbe(probe = {}) {
  const normalized = {};
  if (hasValue(probe.expectedAccount)) normalized.expectedAccount = String(probe.expectedAccount).trim();
  if (hasValue(probe.observedAccount)) normalized.observedAccount = String(probe.observedAccount).trim();
  for (const field of ['chromeRunning', 'extensionInstalled', 'nativeHost', 'extensionPipe', 'loginState', 'articleAvailable', 'mediaUpload']) {
    if (hasValue(probe[field])) normalized[field] = normalizeSignal(probe[field]);
  }
  if (Object.prototype.hasOwnProperty.call(probe, 'composeDraftText')) {
    normalized.composeDraftText = String(probe.composeDraftText === true ? '' : (probe.composeDraftText ?? '')).trim();
  }
  if (hasValue(probe.profileDirectory)) normalized.profileDirectory = String(probe.profileDirectory).trim();
  if (hasValue(probe.currentUrl)) normalized.currentUrl = String(probe.currentUrl).trim();
  if (hasValue(probe.userBrowserAccount)) normalized.userBrowserAccount = String(probe.userBrowserAccount).trim();
  if (hasValue(probe.userBrowserLoginState)) normalized.userBrowserLoginState = normalizeSignal(probe.userBrowserLoginState);
  if (hasValue(probe.userBrowserCurrentUrl)) normalized.userBrowserCurrentUrl = String(probe.userBrowserCurrentUrl).trim();
  if (hasValue(probe.userBrowserTitle)) normalized.userBrowserTitle = String(probe.userBrowserTitle).trim();
  if (hasValue(probe.generatedAt)) normalized.generatedAt = toIsoString(probe.generatedAt);
  return normalized;
}

function buildUserBrowserSession({
  expectedAccount,
  userBrowserAccount,
  userBrowserLoginState,
  userBrowserCurrentUrl,
  userBrowserTitle,
} = {}) {
  const account = String(userBrowserAccount || '').trim();
  const loginState = normalizeSignal(userBrowserLoginState);
  return {
    account,
    loginState,
    currentUrl: String(userBrowserCurrentUrl || '').trim(),
    title: String(userBrowserTitle || '').trim(),
    usable: loginState === 'yes' && Boolean(account) && sameAccount(account, expectedAccount),
  };
}

function probeFieldHasValue(probe, field) {
  if (field === 'composeDraftText') {
    return Object.prototype.hasOwnProperty.call(probe, field);
  }
  return hasValue(probe[field]);
}

function selectedComposeDraftTexts({ preflight, xPrep, publishMode }) {
  const handoff = preflight?.browser?.handoff || {};
  const texts = [];
  if (publishMode === 'thread_fallback') {
    texts.push(
      xPrep?.thread?.firstPost,
      handoff.threadFallback?.[0],
      handoff.shortPost,
    );
  } else {
    texts.push(
      handoff.shortPost,
      xPrep?.thread?.firstPost,
    );
  }
  return uniqueNonEmpty(texts);
}

function buildComposeDraft({ composeDraftText, expectedTexts = [] } = {}) {
  if (composeDraftText === undefined || composeDraftText === null) {
    return {
      status: 'unknown',
      hasText: false,
      preview: '',
      expectedPreview: previewText(expectedTexts[0] || ''),
    };
  }

  const text = String(composeDraftText).trim();
  if (!text) {
    return {
      status: 'empty',
      hasText: false,
      preview: '',
      expectedPreview: previewText(expectedTexts[0] || ''),
    };
  }

  const matches = expectedTexts.some((expected) => draftMatchesExpected(text, expected));
  return {
    status: matches ? 'matches_selected' : 'different',
    hasText: true,
    preview: previewText(text),
    expectedPreview: previewText(expectedTexts[0] || ''),
  };
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

function uniqueNonEmpty(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = normalizeDraft(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(String(value).trim());
  }
  return output;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
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
