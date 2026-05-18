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
  env = process.env,
  ensurePackage = false,
} = {}) {
  const generatedAt = toIsoString(now);
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
  });
  const profileAudit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt,
  });
  const recommendations = ledger ? buildGrowthRecommendations(ledger).recommendations : [];
  const status = statusName({ validation, weeklyPlan, preflight });

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
    profileAudit,
    nextActions: nextActions({
      validation,
      weeklyPlan,
      preflight,
      profileAudit,
      recommendations,
      day,
      slot,
    }),
  };
}

export function formatGrowthStatusMarkdown(status) {
  const summary = status.summary;
  const preflight = status.preflight;
  const blockers = preflight?.blockers?.length
    ? preflight.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No preflight blockers.';
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

Blockers:

${blockers}

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
npm run social:daily -- --limit 5 --package-limit 3 --lang zh
npm run social:validate -- --queue data/social-growth/queue.json --format markdown
npm run social:preflight -- --day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot} --out data/social-growth/publish-preflight.md
npm run social:image-brief -- --day ${status.selectedSlot.day} --slot ${status.selectedSlot.slot}
${preflight?.browser?.recordCommand || 'npm run social:mark-published -- --queue data/social-growth/queue.json --id <queue-id> --url <x-post-url> --article-url <x-article-url>'}
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

function statusName({ validation, weeklyPlan, preflight }) {
  if (validation.status !== 'pass') return 'blocked_quality';
  if (!weeklyPlan) return 'blocked_no_ledger';
  if (preflight.status === 'blocked') return 'blocked_preflight';
  if (weeklyPlan.candidates.missingSlots > 0) return 'needs_candidates';
  return 'ready_for_browser_confirmation';
}

function nextActions({
  validation,
  weeklyPlan,
  preflight,
  profileAudit,
  recommendations,
  day,
  slot,
}) {
  const actions = [];

  if (validation.status !== 'pass') {
    actions.push({
      priority: 'P0',
      action: 'Fix queue candidates that failed the publishing quality gate before opening Chrome.',
      reason: `${validation.failed} queue items failed validation.`,
    });
  }

  if (!weeklyPlan) {
    actions.push({
      priority: 'P0',
      action: 'Initialize or restore the growth ledger, then regenerate the weekly plan.',
      reason: 'Weekly pacing cannot be computed without a ledger.',
    });
  } else if (weeklyPlan.candidates.missingSlots > 0) {
    actions.push({
      priority: 'P0',
      action: 'Run the daily queue generator or add more Chinese blog candidates to fill the weekly cadence.',
      reason: `${weeklyPlan.candidates.missingSlots} publish slots are unfilled.`,
    });
  }

  if (preflight.status === 'blocked') {
    actions.push(...preflightActions(preflight, { day, slot }));
  } else {
    actions.push({
      priority: 'P0',
      action: 'Prepare the X Article and image-backed short post in Chrome, stopping before every public action for confirmation.',
      reason: 'Preflight has no blockers.',
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
    actions.push(...recommendations.slice(0, 2));
  }

  return dedupeActions(actions);
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

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
