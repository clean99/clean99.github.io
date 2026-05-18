import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { summarizeGrowthLedger } from './metrics.mjs';
import { buildPublishPreflight } from './preflight.mjs';
import { buildProfileAudit } from './profile.mjs';
import { buildGrowthRecommendations } from './recommendations.mjs';
import { buildWeeklyExecutionPlan } from './schedule.mjs';
import { validateQueue } from './validation.mjs';

const DEFAULT_STATUS_PATH = 'data/social-growth/status.md';

export async function buildGrowthStatus({
  queue,
  ledger,
  day = 1,
  slot = 1,
  now = new Date(),
  imageDir = 'output/imagegen',
  packageOutDir = 'data/social-growth/packages',
  profileText = '',
  publishMode = 'x_article',
  xProfileDir,
  browserReadiness = null,
  env = process.env,
  ensurePackage = false,
  preferReadyImage = false,
} = {}) {
  const generatedAt = toIsoString(now);
  const resolvedPublishMode = normalizePublishMode(publishMode);
  const validation = validateQueue(queue);
  const summary = ledger ? summarizeGrowthLedger(ledger) : null;
  const weeklyPlan = ledger
    ? buildWeeklyExecutionPlan({ queue, ledger, now })
    : null;
  const preflight = await buildStatusPreflight({
    queue,
    ledger,
    day,
    slot,
    now,
    imageDir,
    packageOutDir,
    env,
    ensurePackage,
    preferReadyImage,
  });
  const profileAudit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt,
  });
  const recommendations = ledger ? buildGrowthRecommendations(ledger).recommendations : [];
  const browserSummary = summarizeBrowserReadiness(browserReadiness);
  const status = statusName({
    validation,
    weeklyPlan,
    preflight,
    browserReadiness: browserSummary,
  });

  return {
    generatedAt,
    status,
    selectedSlot: {
      day: Number(day || 1),
      slot: Number(slot || 1),
    },
    validation: {
      status: validation.status,
      passed: validation.passed,
      failed: validation.failed,
      warnings: validation.warnings,
    },
    weeklyPlan: weeklyPlan ? {
      plannedPosts: weeklyPlan.candidates.plannedPosts,
      missingSlots: weeklyPlan.candidates.missingSlots,
      availableValidatedDrafts: weeklyPlan.candidates.availableValidatedDrafts,
      remainingFollowers: weeklyPlan.target.remainingFollowers,
      requiredDailyPace: weeklyPlan.target.requiredDailyPace,
      actualDailyPace: weeklyPlan.target.actualDailyPace,
      warnings: weeklyPlan.warnings,
    } : null,
    summary,
    preflight,
    browserReadiness: browserSummary,
    profileAudit,
    publishMode: resolvedPublishMode,
    xProfileDir,
    nextActions: nextActions({
      validation,
      weeklyPlan,
      preflight,
      browserReadiness: browserSummary,
      profileAudit,
      recommendations,
      publishMode: resolvedPublishMode,
      day,
      slot,
    }),
  };
}

export function formatGrowthStatusMarkdown(status) {
  const summary = status.summary;
  const preflight = status.preflight;
  const browserReadiness = status.browserReadiness || summarizeBrowserReadiness(null);
  const loginRecovery = loginRecoveryMarkdown(status, browserReadiness);
  const blockers = preflight?.blockers?.length
    ? preflight.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No preflight blockers.';
  const browserBlockers = browserReadiness.blockers.length
    ? browserReadiness.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No browser blockers recorded in this status.';
  const actions = status.nextActions.length
    ? status.nextActions.map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`).join('\n')
    : '- No next actions.';
  const planWarnings = status.weeklyPlan?.warnings?.length
    ? status.weeklyPlan.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- No weekly plan warnings.';
  const profile = status.profileAudit;
  const profileFixes = profile?.checks?.filter((check) => check.status !== 'pass') || [];
  const profileChecks = profile?.checks?.length
    ? profile.checks.map((check) => {
      const marker = check.status === 'pass' ? 'PASS' : 'FIX';
      return `- ${marker}: ${check.message}`;
    }).join('\n')
    : '- No profile audit was generated.';

  return `# X Growth Status

Generated at: ${status.generatedAt}
Status: ${status.status}
Selected slot: Day ${status.selectedSlot.day}, Slot ${status.selectedSlot.slot}

## Follower Target

- Baseline followers: ${summary?.baselineFollowers ?? 'unknown'}
- Latest followers: ${summary?.latestFollowers ?? 'unknown'}
- Follower delta: ${summary?.followerDelta ?? 'unknown'}
- 7-day target: ${summary?.targetFollowers ?? 'unknown'}
- Required daily pace: ${round(summary?.requiredDailyPace)}
- Actual daily pace: ${round(summary?.actualDailyPace)}

## Queue And Schedule

- Quality gate: ${status.validation.passed}/${status.validation.passed + status.validation.failed} passed, ${status.validation.warnings} warnings.
- Validated drafts: ${status.weeklyPlan?.availableValidatedDrafts ?? 'unknown'}
- Planned posts: ${status.weeklyPlan?.plannedPosts ?? 'unknown'}
- Unfilled slots: ${status.weeklyPlan?.missingSlots ?? 'unknown'}
- Remaining followers: ${status.weeklyPlan?.remainingFollowers ?? 'unknown'}

Warnings:

${planWarnings}

## Publish Preflight

- Selected queue id: ${preflight?.selected?.id || 'none'}
- Article slug: ${preflight?.selected?.articleSlug || 'none'}
- Variant: ${preflight?.selected?.variant || 'none'}
- Package: \`${preflight?.selected?.packageDir || 'none'}\`
- Image: \`${preflight?.image?.outputPath || 'none'}\`
- Image ready: ${preflight?.image?.ready ?? false}
- Preferred image generator: ${preflight?.image?.preferredGenerator || 'imagegen built-in tool'}
- OPENAI_API_KEY present: ${preflight?.image?.hasOpenAiKey ?? false}
- OPENAI_API_KEY required for preferred path: ${preflight?.image?.keyRequired ?? false}
- Publish mode: ${status.publishMode}

Blockers:

${blockers}

## Browser Readiness

- Status: ${browserReadiness.status}
- Blockers: ${browserReadiness.blockers.length}

${browserBlockers}

${loginRecovery}

## Profile Conversion

- Audit status: ${profile?.status || 'unknown'}
- Display name: ${profile?.profile?.displayName || 'unknown'}
- Bio: ${profile?.profile?.bio || 'missing'}
- Link: ${profile?.profile?.link || 'missing'}
- Pinned post detected: ${profile?.profile?.pinned ?? false}
- Follower count visible: ${profile?.profile?.followers !== '' && profile?.profile?.followers !== undefined}
- Blocking follow-conversion issues: ${profileFixes.length}

Checks:

${profileChecks}

Suggested bio:

\`\`\`text
${profile?.suggestions?.bio || 'Run social:profile-audit after capturing profile text.'}
\`\`\`

Suggested pinned post:

\`\`\`text
${profile?.suggestions?.pinnedPost || 'Run social:profile-audit after capturing profile text.'}
\`\`\`

## Next Actions

${actions}

## Commands

\`\`\`bash
${cliCommand('daily', '--limit 5 --package-limit 3 --lang zh')}
${cliCommand('validate', '--queue data/social-growth/queue.json --format markdown')}
${cliCommand('preflight', `--day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot} --out data/social-growth/publish-preflight.md`)}
${cliCommand('image-brief', `--day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot}`)}
${cliCommand('x-prep', `--day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot}${publishModeArgs(status)} --out data/social-growth/x-publish-prep.md`)}
${cliCommand('profile-audit', '--profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md')}
${cliCommand('profile-package', '--profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-update.md')}
${recordCommand(status, preflight)}
\`\`\`

Public X actions still require action-time confirmation in Chrome.
`;
}

export async function writeGrowthStatus(status, filePath = DEFAULT_STATUS_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatGrowthStatusMarkdown(status).trimEnd()}\n`);
  return filePath;
}

async function buildStatusPreflight(options) {
  try {
    return await buildPublishPreflight(options);
  } catch (error) {
    return {
      status: 'blocked',
      blockers: [`Unable to build publish preflight: ${error.message}`],
      selected: null,
      image: null,
      browser: null,
    };
  }
}

function statusName({
  validation,
  weeklyPlan,
  preflight,
  browserReadiness,
}) {
  if (validation.status !== 'pass' && (!weeklyPlan || !weeklyPlan.candidates.availableValidatedDrafts)) return 'blocked_quality';
  if (!weeklyPlan) return 'blocked_no_ledger';
  if (preflight.status === 'blocked') return 'blocked_preflight';
  if (blockingBrowserStatus(browserReadiness)) return browserReadiness.status;
  return 'ready_for_browser_confirmation';
}

function nextActions({
  validation,
  weeklyPlan,
  preflight,
  browserReadiness,
  profileAudit,
  recommendations,
  publishMode,
  day,
  slot,
}) {
  const actions = [];
  const browserBlocked = Boolean(blockingBrowserStatus(browserReadiness));
  const executionBlocked = preflight.status === 'blocked' || browserBlocked;

  if (preflight.status === 'blocked') {
    actions.push(...preflightActions(preflight, { day, slot }));
  } else if (browserBlocked) {
    actions.push({
      priority: 'P0',
      action: `Fix browser readiness before preparing public X editors: ${browserReadiness.status}.`,
      reason: browserReadiness.blockers.join(' ') || 'Browser readiness is blocking the selected publish slot.',
    });
  } else {
    actions.push({
      priority: 'P0',
      action: publishMode === 'thread_fallback'
        ? 'Prepare the image-backed thread first post in Chrome, stopping before media upload and final publish confirmation.'
        : 'Prepare the X Article and image-backed short post in Chrome, stopping before every public action for confirmation.',
      reason: 'Preflight has no blockers.',
    });
  }

  if (!weeklyPlan) {
    actions.push({
      priority: 'P0',
      action: 'Initialize or restore the growth ledger, then regenerate the weekly plan.',
      reason: 'Weekly pacing cannot be computed without a ledger.',
    });
  }

  if (validation.status !== 'pass') {
    const hasReadySelection = preflight.status !== 'blocked';
    actions.push({
      priority: hasReadySelection ? 'P2' : 'P0',
      action: 'Fix queue candidates that failed the publishing quality gate.',
      reason: `${validation.failed} queue items failed validation; ${validation.passed} items are still usable now.`,
    });
  }

  if (weeklyPlan?.candidates?.missingSlots > 0) {
    actions.push({
      priority: preflight.status === 'blocked' ? 'P1' : 'P2',
      action: 'Add or improve more Chinese blog candidates to fill the weekly cadence.',
      reason: `${weeklyPlan.candidates.missingSlots} later publish slots are unfilled; this should not block a ready current slot.`,
    });
  }

  if (profileAudit?.status === 'needs_work') {
    const failedChecks = profileAudit.checks.filter((check) => check.status !== 'pass');
    actions.push({
      priority: 'P1',
      action: 'Prepare a profile promise and pinned post update for Chrome confirmation before scaling distribution.',
      reason: `${failedChecks.length} profile conversion checks need work; profile edits and pinned-post changes remain public actions requiring confirmation.`,
    });
  }

  if (recommendations.length) {
    actions.push(...deferActionsWhenBlocked(recommendations.slice(0, 2), executionBlocked));
  }

  return dedupeActions(actions);
}

function deferActionsWhenBlocked(actions, blocked) {
  if (!blocked) return actions;
  return actions.map((item) => {
    if (item.priority !== 'P0') return item;
    return {
      ...item,
      priority: 'P1',
      reason: `After the current blocker is cleared: ${item.reason}`,
    };
  });
}

function summarizeBrowserReadiness(browserReadiness) {
  return {
    status: browserReadiness?.status || 'not_checked',
    blockers: [...(browserReadiness?.blockers || [])],
  };
}

function loginRecoveryMarkdown(status, browserReadiness) {
  if (browserReadiness.status !== 'needs_x_login') return '';
  const profileArg = status.xProfileDir ? ` --profile ${shellQuote(status.xProfileDir)}` : '';
  const publishArgs = publishModeArgs(status);

  return `## X Login Recovery

Run this to open or attach the publishing Chrome profile at the X compose/login page. It only probes browser state: no text input, no media upload, no publish click.

\`\`\`bash
${xBrowserCommand(`--probe --json --probe-out data/social-growth/browser-probe.local.json --account '@Clean993'${profileArg}`)}
\`\`\`

After logging in as @Clean993 in that Chrome window, rerun:

\`\`\`bash
${xBrowserCommand(`--probe --json --probe-out data/social-growth/browser-probe.local.json --account '@Clean993'${profileArg}`)}
${cliCommand('browser-readiness', `--day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot}${publishArgs} --out data/social-growth/browser-readiness.md`)}
${cliCommand('status', `--day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot}${publishArgs} --out data/social-growth/status.md`)}
\`\`\`

`;
}

function blockingBrowserStatus(browserReadiness) {
  if (!browserReadiness?.blockers?.length) return '';
  if (browserReadiness.status === 'needs_browser_probe') return '';
  if (browserReadiness.status === 'ready_for_browser_confirmation') return '';
  return browserReadiness.status;
}

function preflightActions(preflight, { day, slot }) {
  const blockers = preflight.blockers || [];
  const selectedId = preflight.selected?.id || '<queue-id>';
  const actions = [];

  if (blockers.some((blocker) => blocker.includes('Image file is missing'))) {
    actions.push({
      priority: 'P0',
      action: `Generate the image with built-in imagegen or register an externally generated PNG for \`${selectedId}\`.`,
      reason: `Selected slot Day ${day}, Slot ${slot} has no image at ${preflight.image?.outputPath || '<missing path>'}.`,
    });
  }

  if (blockers.some((blocker) => blocker.includes('quality validation'))) {
    actions.push({
      priority: 'P0',
      action: 'Fix the selected queue item and rerun social:validate before browser work.',
      reason: 'Publishing failed content would waste the first growth slot.',
    });
  }

  if (!actions.length) {
    actions.push({
      priority: 'P0',
      action: 'Resolve publish preflight blockers before opening Chrome.',
      reason: blockers.join('; ') || 'Preflight status is blocked.',
    });
  }

  return actions;
}

function dedupeActions(actions) {
  const seen = new Set();
  return actions.filter((item) => {
    const key = `${item.priority}:${item.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function round(value) {
  if (value === undefined || value === null) return 'unknown';
  return Math.round(Number(value || 0) * 10) / 10;
}

function normalizePublishMode(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  if (['thread', 'fallback', 'thread_fallback'].includes(normalized)) return 'thread_fallback';
  return 'x_article';
}

function publishModeArgs(status) {
  const args = [];
  if (status.publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  if (status.xProfileDir) args.push(`--xProfileDir ${shellQuote(status.xProfileDir)}`);
  return args.length ? ` ${args.join(' ')}` : '';
}

function recordCommand(status, preflight) {
  const id = shellQuote(preflight?.selected?.id || '<queue-id>');
  if (status.publishMode === 'thread_fallback') {
    return cliCommand('mark-published', `--queue data/social-growth/queue.json --id ${id} --url '<x-thread-url>' --reply-out data/social-growth/thread-reply-handoff.md`);
  }
  return cliCommand('mark-published', `--queue data/social-growth/queue.json --id ${id} --url '<x-post-url>' --article-url '<x-article-url>'`);
}

function cliCommand(command, args = '') {
  return nodeScriptCommand('tools/social-growth/cli.mjs', `${command}${args ? ` ${args}` : ''}`);
}

function xBrowserCommand(args = '') {
  return nodeScriptCommand('tools/social-growth/x-browser-cdp.mjs', args);
}

function nodeScriptCommand(script, args = '') {
  return `${shellQuote(process.execPath)} ${script}${args ? ` ${args}` : ''}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
