import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function buildLoginHandoff({
  browserReadiness,
  profileDiagnostics,
  day = 1,
  slot = 1,
  publishMode = 'thread_fallback',
  generatedAt = new Date(),
  nodeCommand = 'node',
} = {}) {
  const publishingProfile = buildPublishingProfile({
    browserReadiness,
    profileDiagnostics,
    day,
    slot,
    publishMode,
    nodeCommand,
  });
  const alternateProfiles = buildAlternateProfiles({
    profileDiagnostics,
    day,
    slot,
    publishMode,
    nodeCommand,
  });
  const status = browserReadiness?.status === 'needs_x_login'
    ? 'needs_x_login'
    : 'not_needed';

  return {
    generatedAt: toIsoString(generatedAt),
    status,
    blocker: browserReadiness?.blockers?.find((item) => item.includes('not logged into X')) || '',
    selected: browserReadiness?.selected || {},
    publishingProfile,
    alternateProfiles,
    recoveryCheckCommand: buildCliCommand(nodeCommand, 'scheduled-run', {
      day,
      slot,
      publishMode,
      xProfileDir: publishingProfile.profileDir,
      xProfileDirectory: publishingProfile.profileDirectory,
    }),
    boundary: 'Login handoff only. It may open or inspect login pages, but it must not publish, upload media, reply, like, repost, follow, edit the profile, pin content, or click final X buttons without action-time confirmation.',
  };
}

export function formatLoginHandoffMarkdown(handoff) {
  const alternateProfiles = handoff.alternateProfiles.length
    ? handoff.alternateProfiles.map(formatAlternateProfile).join('\n\n')
    : '- No alternate Chrome profiles were found.';

  return `# X Login Handoff

Generated at: ${handoff.generatedAt}
Status: ${handoff.status}

## Selected Package

- Queue id: ${handoff.selected?.id || 'none'}
- Article slug: ${handoff.selected?.articleSlug || 'none'}
- Image: \`${handoff.selected?.imagePath || 'none'}\`

## Current Blocker

${handoff.blocker ? `- ${handoff.blocker}` : '- No X login blocker in the latest browser readiness report.'}

## Option A: Login In Publishing Chrome

- Profile dir: ${handoff.publishingProfile.profileDir || 'default baoyu shared profile'}
- Profile directory: ${handoff.publishingProfile.profileDirectory || 'default'}
- Profile dir state: ${handoff.publishingProfile.state || 'unknown'}
- Current URL: ${handoff.publishingProfile.currentUrl || 'unknown'}

After logging into @Clean993 in that Chrome window, run:

\`\`\`bash
${handoff.publishingProfile.loginRecoveryCommand}
\`\`\`

## Option B: Reuse Normal Chrome Profile

${alternateProfiles}

## After Login Is Recovered

Run the scheduled check:

\`\`\`bash
${handoff.recoveryCheckCommand}
\`\`\`

Then continue from \`data/social-growth/scheduled-run.md\` or \`data/social-growth/manual-publish-kits/day<N>-ready-slots.md\`. Stop before every public X action.

## Boundary

${handoff.boundary}
`;
}

export async function writeLoginHandoff(handoff, filePath = 'data/social-growth/login-handoff.md') {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatLoginHandoffMarkdown(handoff).trimEnd()}\n`);
  return filePath;
}

function buildPublishingProfile({
  browserReadiness,
  profileDiagnostics,
  day,
  slot,
  publishMode,
  nodeCommand,
}) {
  const profileDir = browserReadiness?.profileDir || '';
  const profileDirectory = browserReadiness?.profileDirectory || '';
  return {
    profileDir,
    profileDirectory,
    state: profileDiagnostics?.profileDirState?.status || 'unknown',
    currentUrl: browserReadiness?.currentUrl || '',
    loginRecoveryCommand: buildCliCommand(nodeCommand, 'login-recovery', {
      day,
      slot,
      publishMode,
      xProfileDir: profileDir,
      xProfileDirectory: profileDirectory,
      continueOnProbeError: true,
    }),
  };
}

function buildAlternateProfiles({
  profileDiagnostics,
  day,
  slot,
  publishMode,
  nodeCommand,
}) {
  return (profileDiagnostics?.alternateProfileDirs || []).flatMap((dir) => (
    (dir.profiles || []).map((profile) => ({
      profileDir: dir.profileDir,
      profileDirectory: profile.id,
      profileName: profile.name,
      accountHint: profile.accountHint,
      isLastUsed: Boolean(profile.isLastUsed),
      state: dir.profileDirState?.status || 'unknown',
      requiresChromeClose: dir.profileDirState?.status === 'locked_without_debug',
      loginRecoveryCommand: buildCliCommand(nodeCommand, 'login-recovery', {
        day,
        slot,
        publishMode,
        xProfileDir: dir.profileDir,
        xProfileDirectory: profile.id,
        continueOnProbeError: true,
      }),
    }))
  ));
}

function formatAlternateProfile(profile) {
  const lockNote = profile.requiresChromeClose
    ? '- Required first: close normal Chrome so this user-data-dir can be relaunched with CDP.'
    : '- Required first: none; the profile dir is not locked without CDP.';

  return `### ${profile.profileDirectory}${profile.isLastUsed ? ' (last used)' : ''}

- Profile dir: ${profile.profileDir}
- Name: ${profile.profileName || 'unknown'}
- Account hint: ${profile.accountHint || 'none'}
- Profile dir state: ${profile.state}
${lockNote}

\`\`\`bash
${profile.loginRecoveryCommand}
\`\`\``;
}

function buildCliCommand(nodeCommand, command, options) {
  const args = [
    shellQuote(nodeCommand),
    'tools/social-growth/cli.mjs',
    command,
  ];
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === '') continue;
    args.push(`--${toKebabCase(key)}`);
    if (value !== true) args.push(shellQuote(value));
  }
  return args.join(' ');
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
