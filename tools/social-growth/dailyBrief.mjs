import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildDayReadiness } from './dayReadiness.mjs';
import {
  buildEngagementPlan,
  buildEngagementSearchPlan,
} from './engagement.mjs';
import { createMetricsTemplateFromQueue } from './ledger.mjs';
import { buildGrowthFunnel } from './funnel.mjs';
import { summarizeGrowthLedger } from './metrics.mjs';
import {
  buildMetricsReadiness,
  mergeMetricsTemplate,
} from './metricsCycle.mjs';
import {
  buildProfileAudit,
  buildProfileUpdatePackage,
} from './profile.mjs';

const DEFAULT_DAILY_BRIEF_PATH = 'data/social-growth/daily-brief.md';

export async function buildDailyExecutionBrief({
  queue,
  ledger,
  metrics = null,
  profileText = '',
  opportunityTexts = [],
  day = 1,
  slot = 1,
  now = new Date(),
  imageDir = 'output/imagegen',
  packageOutDir = 'data/social-growth/packages',
  xSkillDir,
  xBunCommand,
  xProfileDir,
  xProfileDirectory,
  publishMode,
  browserReadiness = null,
  loginHandoff = null,
  loginHandoffPath = 'data/social-growth/login-handoff.md',
  engagementLimit = 5,
  env = process.env,
} = {}) {
  const generatedAt = toIsoString(now);
  const dayReadiness = await buildDayReadiness({
    queue,
    ledger,
    day,
    now,
    imageDir,
    packageOutDir,
    ensurePackage: true,
    xSkillDir,
    xBunCommand,
    xProfileDir,
    xProfileDirectory,
    publishMode,
    env,
  });
  const engagementSearch = buildEngagementSearchPlan({
    queue,
    now,
    limit: engagementLimit,
  });
  const engagementPlan = buildEngagementPlan({
    queue,
    opportunityTexts,
    now,
    limit: engagementLimit,
  });
  const metricsTemplate = createMetricsTemplateFromQueue(queue, {
    date: generatedAt.slice(0, 10),
  });
  const mergedMetrics = mergeMetricsTemplate(metrics, metricsTemplate);
  const metricsReadiness = buildMetricsReadiness(mergedMetrics);
  const profileAudit = await buildProfileAudit({
    profileText,
    queue,
    generatedAt,
  });
  const profileUpdatePackage = buildProfileUpdatePackage(profileAudit, {
    generatedAt,
  });
  const summary = summarizeGrowthLedger(ledger);
  const funnel = buildGrowthFunnel(ledger);
  const browserSummary = summarizeBrowserReadiness(browserReadiness);
  const manualPublishFallback = buildManualPublishFallback({
    dayReadiness,
    browserReadiness: browserSummary,
    slot,
  });
  const actionItems = buildActionItems({
    dayReadiness,
    engagementSearch,
    engagementPlan,
    metricsReadiness,
    profileAudit,
    funnel,
    browserReadiness: browserSummary,
    manualPublishFallback,
    day,
  });
  const browserReadinessCommand = buildBrowserReadinessCommand({
    day: dayReadiness.day,
    slot,
    publishMode: browserReadiness?.publishMode || selectedSlot(dayReadiness, slot)?.publishMode || publishMode,
    profileDir: xProfileDir || browserReadiness?.profileDir,
    profileDirectory: xProfileDirectory || browserReadiness?.profileDirectory,
  });

  return {
    version: 1,
    generatedAt,
    status: briefStatus({
      dayReadiness,
      metricsReadiness,
      profileAudit,
      funnel,
      browserReadiness,
    }),
    day: dayReadiness.day,
    selectedSlot: Number(slot || 1),
    date: dayReadiness.date,
    timezone: dayReadiness.timezone,
    summary,
    funnel,
    dayReadiness,
    engagementSearch,
    engagementPlan,
    metricsReadiness,
    profileAudit,
    profileUpdatePackage,
    browserReadiness: browserSummary,
    loginHandoff: summarizeLoginHandoffForBrief(loginHandoff, loginHandoffPath),
    browserReadinessCommand,
    manualPublishFallback,
    actionItems,
    boundary: 'Local brief only. Publishing, media upload, reply, like, repost, follow, profile edit, and pin actions still require action-time confirmation in Chrome.',
  };
}

export async function writeDailyExecutionBrief(brief, filePath = DEFAULT_DAILY_BRIEF_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatDailyExecutionBriefMarkdown(brief).trimEnd()}\n`);
  return filePath;
}

export function formatDailyExecutionBriefMarkdown(brief) {
  const slots = brief.dayReadiness.slots.length
    ? brief.dayReadiness.slots.map(formatSlot).join('\n')
    : '- No publish slots for this day.';
  const blockedSlotFixes = formatBlockedSlotFixes(brief.dayReadiness);
  const manualPublishFallback = formatManualPublishFallback(brief.manualPublishFallback);
  const loginHandoff = formatLoginHandoffForBrief(brief.loginHandoff, brief.browserReadiness);
  const actions = brief.actionItems.length
    ? brief.actionItems.map((item) => `- ${item.priority}: ${item.action}\n  Reason: ${item.reason}`).join('\n')
    : '- No actions.';
  const profileFixes = brief.profileAudit.checks
    .filter((check) => check.status !== 'pass')
    .map((check) => `- ${check.message}`)
    .join('\n') || '- No profile fixes.';
  const profileHandoff = formatProfileConversionHandoff(brief.profileUpdatePackage);

  return `# Daily X Growth Brief

Generated at: ${brief.generatedAt}
Status: ${brief.status}
Day: ${brief.day}
Date: ${brief.date}
Timezone: ${brief.timezone}

## Target

- Baseline followers: ${brief.summary.baselineFollowers}
- Latest followers: ${brief.summary.latestFollowers}
- Follower delta: ${brief.summary.followerDelta}
- 7-day target: ${brief.summary.targetFollowers}
- Required daily pace: ${round(brief.summary.requiredDailyPace)}
- Actual daily pace: ${round(brief.summary.actualDailyPace)}
- Day cumulative target: +${brief.dayReadiness.cumulativeFollowerTarget}

## Publish Readiness

- Ready slots: ${brief.dayReadiness.readySlots}/${brief.dayReadiness.totalSlots}
- Day status: ${brief.dayReadiness.status}

${slots}

${blockedSlotFixes}

## Browser Readiness

- Status: ${brief.browserReadiness.status}
- Blockers: ${brief.browserReadiness.blockers.length}

${formatBrowserBlockers(brief.browserReadiness.blockers)}

Command:

\`\`\`bash
${browserCommandBlock(brief)}
\`\`\`

${loginHandoff}
${manualPublishFallback}
## Engagement

- Search status: ${brief.engagementSearch.status}
- Search queries: ${brief.engagementSearch.searchCount}
- Engagement plan status: ${brief.engagementPlan.status}
- Captured opportunities: ${brief.engagementPlan.opportunityCount}
- Ready reply candidates: ${brief.engagementPlan.selectedCount}

Commands:

\`\`\`bash
npm run social:engagement-search -- --out data/social-growth/engagement-search.md
npm run social:engagement -- --opportunities data/social-growth/engagement-opportunities --out data/social-growth/engagement-plan.md
\`\`\`

## Metrics Capture

- Published posts in template: ${brief.metricsReadiness.totalPosts}
- Followers ready: ${brief.metricsReadiness.followersReady}
- Posts with any metrics: ${brief.metricsReadiness.postsWithAnyMetrics}/${brief.metricsReadiness.totalPosts}
- Posts with views: ${brief.metricsReadiness.postsWithViews}/${brief.metricsReadiness.totalPosts}
- Fully complete posts: ${brief.metricsReadiness.completePosts}/${brief.metricsReadiness.totalPosts}

Command:

\`\`\`bash
npm run social:metrics-cycle -- --metrics data/social-growth/posts.local.json --profile-text data/social-growth/profile.local.txt --post-text-dir data/social-growth/post-texts
\`\`\`

## Conversion Funnel

- Status: ${brief.funnel.status}
- Bottleneck: ${brief.funnel.bottleneck}
- Views: ${brief.funnel.totals.views}
- Interactions: ${brief.funnel.totals.interactions}
- Profile clicks: ${brief.funnel.totals.profileClicks}
- Follows: ${brief.funnel.totals.follows}
- Interaction / view: ${formatPercent(brief.funnel.rates.interactionPerView)}
- Profile click / view: ${formatPercent(brief.funnel.rates.profileClickPerView)}
- Follow / profile click: ${formatPercent(brief.funnel.rates.followPerProfileClick)}

Command:

\`\`\`bash
npm run social:funnel -- --ledger data/social-growth/ledger.json --format markdown
\`\`\`

## Profile

- Audit status: ${brief.profileAudit.status}
- Display name: ${brief.profileAudit.profile.displayName || 'unknown'}
- Bio: ${brief.profileAudit.profile.bio || 'missing'}
- Link: ${brief.profileAudit.profile.link || 'missing'}
- Pinned post detected: ${brief.profileAudit.profile.pinned}

Fixes:

${profileFixes}

${profileHandoff}

## Action Order

${actions}

## Boundary

${brief.boundary}
`;
}

function formatSlot(slot) {
  const blockers = slot.blockers.length
    ? slot.blockers.join('; ')
    : 'none';
  return `- ${slot.time}: ${slot.id}
  Image ready: ${slot.imageReady}; preflight: ${slot.preflightStatus}; X prep: ${slot.xPrepStatus}; mode: ${slot.publishMode}; blockers: ${blockers}`;
}

function formatBlockedSlotFixes(dayReadiness) {
  const blockedSlots = (dayReadiness?.slots || [])
    .filter((slot) => slot.preflightStatus !== 'ready' || slot.xPrepStatus !== 'ready');
  if (!blockedSlots.length) return '';
  const sections = blockedSlots.map((slot) => {
    const register = `npm run social:register-image -- --id ${shellQuote(slot.id)} --source '/absolute/path/to/generated.png'`;
    return `### Slot ${slot.slot}: ${slot.id}

Blockers: ${slot.blockers.length ? slot.blockers.join('; ') : 'unknown'}

\`\`\`bash
${slot.commands.imageBrief}
${register}
${slot.commands.preflight}
${slot.commands.xPrep}
\`\`\``;
  }).join('\n\n');
  return `## Blocked Slot Fixes

${sections}`;
}

function formatProfileConversionHandoff(profilePackage) {
  if (!profilePackage || profilePackage.status === 'no_change_needed') return '';
  const stopPoints = profilePackage.browser.stopBefore.map((item) => `- ${item}`).join('\n');
  return `## Profile Conversion Handoff

Generate the full local package, then prepare the profile update and pinned post in Chrome. Stop before every public account action.

Display name:

\`\`\`text
${profilePackage.proposed.displayName}
\`\`\`

Bio:

\`\`\`text
${profilePackage.proposed.bio}
\`\`\`

Link:

\`\`\`text
${profilePackage.proposed.link}
\`\`\`

Pinned post draft:

\`\`\`text
${profilePackage.proposed.pinnedPost}
\`\`\`

Commands:

\`\`\`bash
npm run social:profile-package -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-update.md
npm run social:profile-audit -- --profile-text data/social-growth/profile.local.txt --out data/social-growth/profile-audit.md
\`\`\`

Stop before:

${stopPoints}
`;
}

function selectedSlot(dayReadiness, slot) {
  const slotNumber = Number(slot || 1);
  return dayReadiness.slots.find((item) => item.slot === slotNumber)
    || dayReadiness.slots[0]
    || null;
}

function buildBrowserReadinessCommand({
  day,
  slot,
  publishMode,
  profileDir,
  profileDirectory,
} = {}) {
  const args = [
    'npm run social:browser-readiness --',
    `--day ${Number(day || 1)}`,
    `--slot ${Number(slot || 1)}`,
  ];
  if (publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  if (profileDir) args.push(`--xProfileDir ${shellQuote(profileDir)}`);
  if (profileDirectory) args.push(`--xProfileDirectory ${shellQuote(profileDirectory)}`);
  args.push('--out data/social-growth/browser-readiness.md');
  return args.join(' ');
}

function browserCommandBlock(brief) {
  return [
    brief.browserReadinessCommand || buildBrowserReadinessCommand({ day: brief.day, slot: 1 }),
    loginRecoveryCommand(brief),
    composeDraftResolutionCommand(brief),
    composeDraftStashCommand(brief),
  ].filter(Boolean).join('\n');
}

function summarizeLoginHandoffForBrief(handoff, path) {
  if (!handoff) {
    return {
      status: 'not_generated',
      path,
      blocker: '',
      publishingProfile: null,
      alternateProfiles: [],
      recoveryCheckCommand: '',
    };
  }
  return {
    status: handoff.status,
    path,
    blocker: handoff.blocker || '',
    publishingProfile: handoff.publishingProfile || null,
    alternateProfiles: handoff.alternateProfiles || [],
    recoveryCheckCommand: handoff.recoveryCheckCommand || '',
  };
}

function formatLoginHandoffForBrief(handoff, browserReadiness) {
  if (browserReadiness?.status !== 'needs_x_login') return '';
  if (!handoff || handoff.status === 'not_generated') {
    return `## Login Handoff

- Report: \`${handoff?.path || 'data/social-growth/login-handoff.md'}\`
- Status: not_generated

Run \`social:scheduled-run\` or \`social:automation\` to refresh the full login handoff before trying alternate Chrome profiles.

`;
  }

  const publishing = handoff.publishingProfile || {};
  const alternates = handoff.alternateProfiles || [];
  const lockedAlternates = alternates.filter((profile) => profile.requiresChromeClose);
  const firstAlternate = alternates[0] || null;
  const firstAlternateCommand = firstAlternate?.loginRecoveryCommand
    ? `
First alternate profile command:

\`\`\`bash
${firstAlternate.loginRecoveryCommand}
\`\`\`
`
    : '';
  const closeChromeNote = lockedAlternates.length
    ? `- Locked normal Chrome profiles: ${lockedAlternates.map((profile) => profile.profileDirectory).join(', ')}. Close normal Chrome before using those profile commands.`
    : '- Locked normal Chrome profiles: none detected.';

  return `## Login Handoff

- Report: \`${handoff.path}\`
- Status: ${handoff.status}
- Publishing profile: ${publishing.profileDirectory || 'default'} (${publishing.state || 'unknown'})
- Current URL: ${publishing.currentUrl || 'unknown'}
- Alternate profiles: ${alternates.length}
${closeChromeNote}

After logging into \`@Clean993\` in the publishing Chrome window, run:

\`\`\`bash
${publishing.loginRecoveryCommand || loginRecoveryFallback(browserReadiness)}
\`\`\`
${firstAlternateCommand}
After login is recovered, rerun:

\`\`\`bash
${handoff.recoveryCheckCommand || 'npm run social:scheduled-run -- --day today --slot 1 --publishMode thread_fallback'}
\`\`\`

`;
}

function loginRecoveryFallback(browserReadiness) {
  const args = ['npm run social:login-recovery --'];
  if (browserReadiness?.publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  if (browserReadiness?.profileDir) args.push(`--xProfileDir ${shellQuote(browserReadiness.profileDir)}`);
  if (browserReadiness?.profileDirectory) args.push(`--xProfileDirectory ${shellQuote(browserReadiness.profileDirectory)}`);
  return args.join(' ');
}

function composeDraftResolutionCommand(brief) {
  if (!brief.browserReadiness?.blockers?.some((item) => item.includes('different draft'))) return '';
  const args = [
    'npm run social:compose-draft-resolution --',
    `--day ${Number(brief.day || 1)}`,
    `--slot ${Number(brief.selectedSlot || 1)}`,
  ];
  const publishMode = brief.browserReadiness?.publishMode || selectedSlot(brief.dayReadiness, brief.selectedSlot)?.publishMode;
  if (publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  args.push('--out data/social-growth/compose-draft-resolution.md');
  return args.join(' ');
}

function loginRecoveryCommand(brief) {
  if (brief.browserReadiness?.status !== 'needs_x_login') return '';
  const args = [
    'npm run social:login-recovery --',
    `--day ${Number(brief.day || 1)}`,
    `--slot ${Number(brief.selectedSlot || 1)}`,
  ];
  const publishMode = brief.browserReadiness?.publishMode || selectedSlot(brief.dayReadiness, brief.selectedSlot)?.publishMode;
  if (publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  if (brief.browserReadiness?.profileDir) args.push(`--xProfileDir ${shellQuote(brief.browserReadiness.profileDir)}`);
  if (brief.browserReadiness?.profileDirectory) args.push(`--xProfileDirectory ${shellQuote(brief.browserReadiness.profileDirectory)}`);
  return args.join(' ');
}

function composeDraftStashCommand(brief) {
  if (!brief.browserReadiness?.blockers?.some((item) => item.includes('different draft'))) return '';
  const args = [
    'npm run social:compose-draft-stash --',
    `--day ${Number(brief.day || 1)}`,
    `--slot ${Number(brief.selectedSlot || 1)}`,
  ];
  const publishMode = brief.browserReadiness?.publishMode || selectedSlot(brief.dayReadiness, brief.selectedSlot)?.publishMode;
  if (publishMode === 'thread_fallback') args.push('--publishMode thread_fallback');
  args.push('--out-dir data/social-growth/compose-drafts');
  return args.join(' ');
}

function buildManualPublishFallback({
  dayReadiness,
  browserReadiness,
  slot,
} = {}) {
  const browserBlockers = blockingBrowserIssues(browserReadiness);
  const browserBlocked = browserBlockers.length > 0;
  const selected = selectedReadySlot(dayReadiness, slot);
  const readySlots = dayReadiness.slots.filter((item) => item.preflightStatus === 'ready' && item.xPrepStatus === 'ready');
  const items = readySlots.map((item) => {
    const kitPath = manualPublishKitPath(dayReadiness.day, item);
    return {
      selected: item,
      slotLabel: `day ${dayReadiness.day} slot ${item.slot}`,
      kitPath,
      kitCommand: manualPublishKitCommand(dayReadiness.day, item, kitPath),
      recoveryCommand: postPublishRecoveryCommand(item),
    };
  });
  const selectedItem = items.find((item) => item.selected.slot === selected?.slot) || items[0] || null;
  const base = {
    available: false,
    selected: selected || null,
    slotLabel: selected ? `day ${dayReadiness.day} slot ${selected.slot}` : '',
    batchIndexPath: manualPublishKitIndexPath(dayReadiness.day),
    batchUrlTemplatePath: manualPublishUrlTemplatePath(dayReadiness.day),
    batchKitCommand: manualPublishKitsCommand(dayReadiness.day, selected?.publishMode || readySlots[0]?.publishMode),
    batchRecoveryCommand: manualPublishBatchRecoveryCommand(dayReadiness.day),
    kitPath: selectedItem?.kitPath || 'data/social-growth/manual-publish-kit.md',
    kitCommand: '',
    recoveryCommand: '',
    items: [],
    reason: '',
  };
  if (browserBlockers.some((item) => item.includes('different draft'))) return base;
  if (!browserBlocked || !selectedItem) return base;

  return {
    ...base,
    available: true,
    kitCommand: selectedItem.kitCommand,
    recoveryCommand: selectedItem.recoveryCommand,
    items,
    reason: `${items.length} ready slot(s) are locally ready with images; the blocker is the CDP publishing browser state, not the content package.`,
  };
}

function selectedReadySlot(dayReadiness, slot) {
  const slotNumber = Number(slot || 1);
  const readySlots = dayReadiness.slots.filter((item) => item.preflightStatus === 'ready' && item.xPrepStatus === 'ready');
  return readySlots.find((item) => item.slot === slotNumber)
    || readySlots[0]
    || null;
}

function manualPublishKitCommand(day, slot, outPath = 'data/social-growth/manual-publish-kit.md') {
  return `npm run social:manual-publish-kit -- --day ${Number(day)} --slot ${slot.slot}${publishModeArg(slot.publishMode)} --id ${shellQuote(slot.id)} --out ${outPath}`;
}

function postPublishRecoveryCommand(slot) {
  if (slot.publishMode === 'thread_fallback') {
    return `npm run social:post-publish-recovery -- --queue data/social-growth/queue.json --id ${shellQuote(slot.id)} --url '<x-thread-url>' --reply-out data/social-growth/thread-reply-handoff.md`;
  }
  return `npm run social:post-publish-recovery -- --queue data/social-growth/queue.json --id ${shellQuote(slot.id)} --url '<x-post-url>' --article-url '<x-article-url>' --reply-out data/social-growth/thread-reply-handoff.md`;
}

function formatManualPublishFallback(fallback) {
  if (!fallback?.available) return '';
  const commands = (fallback.items?.length ? fallback.items : [fallback])
    .map((item) => {
      const label = item.selected?.id
        ? `${item.slotLabel}: ${item.selected.id}`
        : item.slotLabel;
      return `### ${label}

\`\`\`bash
${item.kitCommand}
${item.recoveryCommand}
\`\`\``;
    })
    .join('\n\n');
  return `## Manual Publish Fallback

Use this if a normal Chrome profile is already logged into \`@Clean993\` while the CDP publishing profile is blocked. This is a local kit only; every publish, media upload, reply, like, repost, follow, profile edit, and pin still requires action-time confirmation in Chrome.

Batch index: \`${fallback.batchIndexPath}\`

Batch URL template: \`${fallback.batchUrlTemplatePath}\`

\`\`\`bash
${fallback.batchKitCommand}
${fallback.batchRecoveryCommand}
\`\`\`

${commands}

`;
}

function manualPublishKitsCommand(day, publishMode) {
  return `npm run social:manual-publish-kits -- --day ${Number(day)}${publishModeArg(publishMode)} --out ${manualPublishKitIndexPath(day)}`;
}

function manualPublishKitIndexPath(day) {
  return `data/social-growth/manual-publish-kits/day${Number(day)}-ready-slots.md`;
}

function manualPublishUrlTemplatePath(day) {
  return `data/social-growth/manual-publish-kits/day${Number(day)}-published-urls.json`;
}

function manualPublishBatchRecoveryCommand(day) {
  return `npm run social:post-publish-recovery-batch -- --input ${manualPublishUrlTemplatePath(day)} --queue data/social-growth/queue.json --metrics data/social-growth/posts.local.json --reply-out-dir data/social-growth/thread-replies --launch-window-dir data/social-growth/launch-windows`;
}

function manualPublishKitPath(day, slot) {
  return `data/social-growth/manual-publish-kits/day${Number(day)}-slot${slot.slot}-${safePathSegment(slot.id)}.md`;
}

function publishModeArg(publishMode) {
  return publishMode === 'thread_fallback' ? ' --publishMode thread_fallback' : '';
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function buildActionItems({
  dayReadiness,
  engagementSearch,
  engagementPlan,
  metricsReadiness,
  profileAudit,
  funnel,
  browserReadiness,
  manualPublishFallback,
  day,
}) {
  const actions = [];
  const blockedSlots = dayReadiness.slots.filter((slot) => slot.preflightStatus !== 'ready' || slot.xPrepStatus !== 'ready');
  const readySlots = dayReadiness.slots.filter((slot) => slot.preflightStatus === 'ready' && slot.xPrepStatus === 'ready');
  const browserBlockers = blockingBrowserIssues(browserReadiness);

  if (blockedSlots.length) {
    const hasReadySlots = readySlots.length > 0;
    actions.push({
      priority: hasReadySlots ? 'P2' : 'P0',
      action: hasReadySlots
        ? `Fix ${blockedSlots.length} remaining blocked publish slot(s) without delaying ready slots.`
        : `Fix ${blockedSlots.length} blocked publish slot(s), usually by generating/registering the missing image and rerunning preflight.`,
      reason: `${dayReadiness.readySlots}/${dayReadiness.totalSlots} publish slots are ready.`,
    });
  }
  if (browserBlockers.length) {
    const hasDraftBlocker = browserBlockers.some((item) => item.includes('different draft'));
    actions.push({
      priority: 'P0',
      action: hasDraftBlocker
        ? 'Resolve the existing X compose draft before preparing public X editors.'
        : `Fix browser readiness before preparing public X editors: ${browserReadiness.status}.`,
      reason: browserBlockers.join(' '),
    });
    if (manualPublishFallback?.available) {
      actions.push({
        priority: 'P0',
        action: `Generate manual publish kit(s) for ${manualPublishFallback.items.length || 1} ready slot(s), publish from a logged-in normal Chrome profile with confirmation, then fill the batch URL template and run post-publish-recovery-batch.`,
        reason: manualPublishFallback.reason,
      });
    }
  }
  if (readySlots.length && !browserBlockers.length) {
    actions.push({
      priority: 'P0',
      action: `Prepare ${readySlots.length} ready ${publishSurface(readySlots)} in Chrome, stopping before every public action for confirmation.`,
      reason: 'Ready slots are the direct path to measurable follower and interaction data.',
    });
  } else if (readySlots.length && browserBlockers.length) {
    actions.push({
      priority: 'P1',
      action: `Keep ${readySlots.length} ready ${publishSurface(readySlots)} queued; prepare them only after browser readiness passes.`,
      reason: 'Local packages are ready, but Chrome/media readiness is still blocked.',
    });
  }
  if (engagementSearch.status === 'ready_for_read_only_search' && engagementPlan.status === 'needs_opportunity_capture') {
    actions.push({
      priority: 'P1',
      action: 'Run social:engagement-browser-capture or open read-only X search URLs, capture 5-10 relevant technical threads, then rerun the engagement plan.',
      reason: 'Second-degree technical conversations are missing; the plan has search queries but no captured opportunities.',
    });
  } else if (engagementPlan.status === 'ready_for_browser_confirmation') {
    actions.push({
      priority: 'P1',
      action: `Prepare ${engagementPlan.selectedCount} substantive reply candidate(s), stopping before every public Reply click.`,
      reason: 'Selective replies can create social proof without mass interaction.',
    });
  }
  if (!metricsReadiness.totalPosts) {
    actions.push({
      priority: 'P1',
      action: 'After confirmed publishing, mark the X URLs so metrics capture has published posts to track.',
      reason: 'No published posts are present in the metrics template yet.',
    });
  } else if (!metricsReadiness.followersReady || metricsReadiness.postsWithAnyMetrics < metricsReadiness.totalPosts) {
    actions.push({
      priority: 'P1',
      action: 'Capture visible profile and post metrics, then run the metrics cycle.',
      reason: `${metricsReadiness.postsWithAnyMetrics}/${metricsReadiness.totalPosts} published posts have any metrics and followersReady=${metricsReadiness.followersReady}.`,
    });
  }
  if (funnel.status !== 'needs_published_posts' && funnel.status !== 'converting') {
    actions.push({
      priority: 'P1',
      action: `Fix conversion funnel bottleneck: ${funnel.bottleneck}`,
      reason: funnel.nextActions[0]?.reason || 'The follower funnel is not yet converting.',
    });
  }
  if (profileAudit.status === 'needs_work') {
    actions.push({
      priority: 'P2',
      action: 'Prepare profile promise and pinned post update for browser confirmation.',
      reason: `${profileAudit.checks.filter((check) => check.status !== 'pass').length} profile conversion checks need work.`,
    });
  }

  actions.push({
    priority: 'P2',
    action: `Regenerate day ${Number(day)} brief after publishing, engagement capture, or metrics changes.`,
    reason: 'The brief is a current-state runbook, not a static plan.',
  });

  return sortActionItems(actions);
}

function sortActionItems(actions) {
  const order = new Map([
    ['P0', 0],
    ['P1', 1],
    ['P2', 2],
  ]);
  return actions
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = order.get(left.item.priority) ?? 99;
      const rightOrder = order.get(right.item.priority) ?? 99;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ item }) => item);
}

function publishSurface(slots) {
  const modes = new Set(slots.map((slot) => slot.publishMode));
  if (modes.size === 1 && modes.has('thread_fallback')) return 'image-backed thread slot(s)';
  if (modes.has('thread_fallback')) return 'X Article/image post or image-backed thread slot(s)';
  return 'X Article/image post slot(s)';
}

function briefStatus({
  dayReadiness,
  metricsReadiness,
  profileAudit,
  funnel,
  browserReadiness,
}) {
  if (dayReadiness.readySlots === 0) return 'needs_publish_readiness';
  if (blockingBrowserIssues(browserReadiness).length) return browserReadiness.status;
  if (!metricsReadiness.totalPosts) return 'ready_to_publish';
  if (!metricsReadiness.followersReady || metricsReadiness.postsWithAnyMetrics < metricsReadiness.totalPosts) {
    return 'needs_metrics_capture';
  }
  if (profileAudit.status === 'needs_work') return 'needs_profile_conversion';
  if (funnel.status !== 'converting') return 'needs_funnel_optimization';
  return 'ready_for_next_iteration';
}

function summarizeBrowserReadiness(browserReadiness) {
  return {
    status: browserReadiness?.status || 'not_checked',
    publishMode: browserReadiness?.publishMode || '',
    profileDir: browserReadiness?.profileDir || '',
    profileDirectory: browserReadiness?.profileDirectory || '',
    blockers: [...(browserReadiness?.blockers || [])],
  };
}

function blockingBrowserIssues(browserReadiness) {
  if (!browserReadiness?.blockers?.length) return [];
  if (browserReadiness.status === 'needs_browser_probe') return [];
  if (browserReadiness.status === 'ready_for_browser_confirmation') return [];
  if (browserReadiness.status === 'blocked_local_prep') return [];
  return browserReadiness.blockers;
}

function formatBrowserBlockers(blockers) {
  return blockers.length
    ? blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No browser blockers recorded in this brief.';
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 10000) / 100}%`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
