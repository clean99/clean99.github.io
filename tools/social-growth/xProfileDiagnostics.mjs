import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_PROFILE_DIR = join(homedir(), 'Library/Application Support/baoyu-skills/chrome-profile');
const DEFAULT_SYSTEM_CHROME_PROFILE_DIR = join(homedir(), 'Library/Application Support/Google/Chrome');

export async function buildXProfileDiagnostics({
  profileDir = DEFAULT_PROFILE_DIR,
  includeSystemChrome = false,
  extraProfileDirs = [],
  debugPort = '',
  generatedAt = new Date(),
} = {}) {
  const resolvedProfileDir = resolve(profileDir || DEFAULT_PROFILE_DIR);
  const profiles = await readChromeProfiles(resolvedProfileDir);
  const ports = uniqueNumbers([
    Number(debugPort) || null,
    ...discoverDebugPorts(resolvedProfileDir),
  ]);
  const liveBrowsers = [];

  for (const port of ports) {
    const pages = await readXPages(port);
    liveBrowsers.push({
      port,
      xPages: pages,
      inferredLoginState: inferLoginState(pages),
    });
  }
  const alternateProfileDirs = await readAlternateProfileDirs({
    primaryProfileDir: resolvedProfileDir,
    includeSystemChrome,
    extraProfileDirs,
    debugPort,
  });

  return {
    generatedAt: toIsoString(generatedAt),
    profileDir: resolvedProfileDir,
    profiles,
    alternateProfileDirs,
    liveBrowsers,
    recommendations: buildRecommendations({ profiles, liveBrowsers, alternateProfileDirs }),
    publicActions: {
      typedText: false,
      uploadedMedia: false,
      clickedSubmit: false,
    },
  };
}

export function formatXProfileDiagnosticsMarkdown(diagnostics) {
  const profiles = diagnostics.profiles.length
    ? diagnostics.profiles.map((profile) => formatProfile(profile, {
      profileDir: diagnostics.profileDir,
      includeProfileDir: false,
    })).join('\n')
    : '- No Chrome profiles found under the publishing profile dir.';
  const alternateProfileDirs = diagnostics.alternateProfileDirs?.length
    ? diagnostics.alternateProfileDirs.map(formatAlternateProfileDir).join('\n\n')
    : '- No alternate Chrome profile dirs scanned. Pass --includeSystemChrome true or --extraProfileDir to inspect a normal Chrome profile dir.';
  const liveBrowsers = diagnostics.liveBrowsers.length
    ? diagnostics.liveBrowsers.map((browser) => {
      const pages = browser.xPages.length
        ? browser.xPages.map((page) => `  - ${page.state}: ${page.title || 'untitled'} | ${page.url}`).join('\n')
        : '  - No X pages observed on this debugging port.';
      return `- Port ${browser.port}: ${browser.inferredLoginState}\n${pages}`;
    }).join('\n')
    : '- No running Chrome debugging port found for this profile dir.';
  const recommendations = diagnostics.recommendations.length
    ? diagnostics.recommendations.map((item) => `- ${item}`).join('\n')
    : '- No profile diagnostics recommendations.';

  return `# X Profile Diagnostics

Generated at: ${diagnostics.generatedAt}

## Publishing User Data Dir

\`${diagnostics.profileDir}\`

## Chrome Profiles

${profiles}

## Alternate Chrome Profile Dirs

${alternateProfileDirs}

## Live X Pages

${liveBrowsers}

## Recommendations

${recommendations}

## Boundary

Read-only diagnostics only. This command does not type text, upload media, click publish, reply, like, repost, follow, edit profile, or inspect cookies/session storage.
`;
}

export async function writeXProfileDiagnostics(diagnostics, filePath = 'data/social-growth/x-profile-diagnostics.md') {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatXProfileDiagnosticsMarkdown(diagnostics).trimEnd()}\n`);
  return filePath;
}

async function readAlternateProfileDirs({
  primaryProfileDir,
  includeSystemChrome,
  extraProfileDirs = [],
  debugPort = '',
}) {
  const dirs = uniqueStrings([
    ...(includeSystemChrome ? [DEFAULT_SYSTEM_CHROME_PROFILE_DIR] : []),
    ...normalizeList(extraProfileDirs),
  ]);
  const alternates = [];

  for (const dir of dirs) {
    const resolvedDir = resolve(dir);
    if (resolvedDir === primaryProfileDir) continue;
    if (!existsSync(resolvedDir)) continue;

    const profiles = await readChromeProfiles(resolvedDir);
    const ports = uniqueNumbers([
      Number(debugPort) || null,
      ...discoverDebugPorts(resolvedDir),
    ]);
    const liveBrowsers = [];
    for (const port of ports) {
      const pages = await readXPages(port);
      liveBrowsers.push({
        port,
        xPages: pages,
        inferredLoginState: inferLoginState(pages),
      });
    }

    if (profiles.length || liveBrowsers.length) {
      alternates.push({
        profileDir: resolvedDir,
        profiles,
        liveBrowsers,
      });
    }
  }

  return alternates;
}

async function readChromeProfiles(profileDir) {
  const localStatePath = join(profileDir, 'Local State');
  if (!existsSync(localStatePath)) return [];
  const localState = await readJson(localStatePath);
  const cache = localState.profile?.info_cache || {};
  const orderedIds = localState.profile?.profiles_order || Object.keys(cache);
  const lastUsed = localState.profile?.last_used || '';
  const profiles = [];

  for (const id of orderedIds) {
    const info = cache[id] || {};
    const preferences = await readJson(join(profileDir, id, 'Preferences')).catch(() => ({}));
    const accountInfo = Array.isArray(preferences.account_info) ? preferences.account_info : [];
    profiles.push({
      id,
      name: info.name || preferences.profile?.name || '',
      isLastUsed: id === lastUsed,
      hasChromeAccount: accountInfo.length > 0 || Boolean(info.user_name),
      accountHint: maskEmail(info.user_name || accountInfo[0]?.email || accountInfo[0]?.account_id || ''),
    });
  }

  return profiles;
}

function discoverDebugPorts(profileDir) {
  const output = spawnSync('/bin/ps', ['axo', 'command'], { encoding: 'utf8' });
  if (output.status !== 0) return [];
  const normalizedProfileDir = resolve(profileDir);
  const ports = [];
  for (const command of output.stdout.split('\n')) {
    if (!command.includes('--remote-debugging-port=')) continue;
    if (!command.includes(`--user-data-dir=${normalizedProfileDir}`)) continue;
    const match = command.match(/--remote-debugging-port=(\d+)/);
    if (match) ports.push(Number(match[1]));
  }
  return ports;
}

async function readXPages(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`).catch(() => []);
  return targets
    .filter((target) => target.type === 'page' && /https:\/\/(x|twitter)\.com\//.test(String(target.url || '')))
    .map((target) => ({
      title: target.title || '',
      url: target.url || '',
      state: inferPageState(target),
    }));
}

function inferPageState(page) {
  const url = String(page.url || '');
  const title = String(page.title || '');
  if (/\/i\/flow\/login/.test(url) || /login/i.test(title)) return 'logged_out';
  if (/\/compose\/post/.test(url) && /Home \/ X|X/i.test(title)) return 'compose_maybe_logged_in';
  if (/\/home(?:$|[?#])/.test(url) || /Home \/ X/i.test(title)) return 'logged_in';
  return 'unknown';
}

function inferLoginState(pages) {
  if (pages.some((page) => ['logged_in', 'compose_maybe_logged_in'].includes(page.state))) return 'maybe_logged_in';
  if (pages.some((page) => page.state === 'logged_out')) return 'logged_out';
  return 'unknown';
}

function buildRecommendations({ profiles, liveBrowsers, alternateProfileDirs = [] }) {
  const recommendations = [];
  const lastUsed = profiles.find((profile) => profile.isLastUsed);
  const hasNonDefault = profiles.some((profile) => profile.id !== 'Default');
  const hasLoggedOutLivePage = liveBrowsers.some((browser) => browser.inferredLoginState === 'logged_out');
  const hasMaybeLoggedInLivePage = liveBrowsers.some((browser) => browser.inferredLoginState === 'maybe_logged_in');

  if (lastUsed) {
    recommendations.push(`Current publishing Chrome last-used profile is ${lastUsed.id}. If X was logged in elsewhere, rerun with --xProfileDirectory ${shellQuote(lastUsed.id)} or the correct listed profile.`);
  }
  if (hasNonDefault) {
    recommendations.push('Multiple Chrome profiles exist under the publishing user data dir; make the intended X profile explicit with --xProfileDirectory.');
  }
  if (hasLoggedOutLivePage && !hasMaybeLoggedInLivePage) {
    recommendations.push('The live publishing CDP pages are X login pages. Log into @Clean993 in that same Chrome window, then rerun login-recovery.');
  }
  if (hasMaybeLoggedInLivePage) {
    recommendations.push('A live X page may already be logged in. Run login-recovery with the matching profile directory before preparing a public post.');
  }
  for (const alternate of alternateProfileDirs) {
    if (!alternate.profiles.length) continue;
    const suggested = alternate.profiles.find((profile) => profile.isLastUsed) || alternate.profiles[0];
    recommendations.push(`If @Clean993 is already logged into normal Chrome, rerun login-recovery with --xProfileDir ${shellQuote(alternate.profileDir)} --xProfileDirectory ${shellQuote(suggested.id)}, or choose the exact listed profile from that dir.`);
  }
  return recommendations;
}

function formatAlternateProfileDir(item) {
  const profiles = item.profiles.length
    ? item.profiles.map((profile) => formatProfile(profile, {
      profileDir: item.profileDir,
      includeProfileDir: true,
    })).join('\n')
    : '- No Chrome profiles found.';
  const liveBrowsers = item.liveBrowsers.length
    ? item.liveBrowsers.map((browser) => `- Port ${browser.port}: ${browser.inferredLoginState}`).join('\n')
    : '- No running Chrome debugging port found for this profile dir.';

  return `### ${item.profileDir}

${profiles}

Live X pages:
${liveBrowsers}`;
}

function formatProfile(profile, { profileDir, includeProfileDir }) {
  const command = includeProfileDir
    ? `--xProfileDir ${shellQuote(profileDir)} --xProfileDirectory ${shellQuote(profile.id)}`
    : `--xProfileDirectory ${shellQuote(profile.id)}`;

  return [
    `- ${profile.id}${profile.isLastUsed ? ' (last used)' : ''}`,
    `  Name: ${profile.name || 'unknown'}`,
    `  Signed-in Chrome profile: ${profile.hasChromeAccount ? 'yes' : 'no'}`,
    `  Account hint: ${profile.accountHint || 'none'}`,
    `  Use with: ${command}`,
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function uniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function maskEmail(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.)([^@]*)(@.+)$/);
  if (!match) return text;
  return `${match[1]}***${match[3]}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
