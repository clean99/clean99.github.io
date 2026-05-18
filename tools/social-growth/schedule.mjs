import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { summarizeGrowthLedger } from './metrics.mjs';
import { validateQueue } from './validation.mjs';

const DEFAULT_POST_TIMES = ['09:30', '14:30', '21:30'];
const DEFAULT_CAPTURE_TIMES = ['12:30', '23:00'];
const DEFAULT_TIMEZONE = 'Asia/Singapore';
const DEFAULT_DAYS = 7;
const DEFAULT_POSTS_PER_DAY = 3;

export function buildWeeklyExecutionPlan({
  queue,
  ledger,
  now = new Date(),
  days = DEFAULT_DAYS,
  postsPerDay = DEFAULT_POSTS_PER_DAY,
  timezone = DEFAULT_TIMEZONE,
  postTimes = DEFAULT_POST_TIMES,
  captureTimes = DEFAULT_CAPTURE_TIMES,
} = {}) {
  const generatedAt = toIsoString(now);
  const postsPerDayCount = Number(postsPerDay || DEFAULT_POSTS_PER_DAY);
  const summary = summarizeGrowthLedger(ledger);
  const validation = validateQueue(queue);
  const passById = new Map(validation.items.map((item) => [item.id, item.status === 'pass']));
  const target = ledger?.target || {};
  const startDate = target.startDate || generatedAt.slice(0, 10);
  const planDays = makePlanDates(startDate, Number(days || DEFAULT_DAYS));
  const candidates = rankedDraftItems(queue)
    .filter((item) => passById.get(item.id));
  const slots = planDays.length * postsPerDayCount;
  const scheduledItems = candidates.slice(0, slots);
  const plannedDays = planDays.map((date, dayIndex) => {
    const dayItems = scheduledItems.slice(
      dayIndex * postsPerDayCount,
      dayIndex * postsPerDayCount + postsPerDayCount,
    );

    return {
      day: dayIndex + 1,
      date,
      cumulativeFollowerTarget: Math.round(summary.targetFollowers * ((dayIndex + 1) / DEFAULT_DAYS)),
      publishSlots: dayItems.map((item, slotIndex) => ({
        time: postTimes[slotIndex] || postTimes[postTimes.length - 1],
        item,
        packageDir: packageDirForItem(item),
      })),
      captureTimes,
    };
  });
  const missingSlots = Math.max(0, slots - scheduledItems.length);

  return {
    generatedAt,
    timezone,
    days: plannedDays,
    validationSummary: {
      status: validation.status,
      passed: validation.passed,
      failed: validation.failed,
      warnings: validation.warnings,
    },
    target: {
      baselineFollowers: summary.baselineFollowers,
      latestFollowers: summary.latestFollowers,
      followerDelta: summary.followerDelta,
      targetFollowers: summary.targetFollowers,
      requiredDailyPace: summary.requiredDailyPace,
      actualDailyPace: summary.actualDailyPace,
      remainingFollowers: Math.max(0, summary.targetFollowers - summary.followerDelta),
    },
    cadence: {
      postsPerDay: postsPerDayCount,
      postTimes,
      captureTimes,
    },
    candidates: {
      availableValidatedDrafts: candidates.length,
      plannedPosts: scheduledItems.length,
      missingSlots,
    },
    warnings: buildPlanWarnings({
      validation,
      candidates,
      missingSlots,
      requiredDailyPace: summary.requiredDailyPace,
      actualDailyPace: summary.actualDailyPace,
    }),
  };
}

export function formatWeeklyExecutionPlanMarkdown(plan) {
  const warningLines = plan.warnings.length
    ? plan.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- No schedule warnings.';
  const daySections = plan.days.map((day) => formatPlanDay(day)).join('\n\n');

  return `# Weekly X Growth Execution Plan

Generated at: ${plan.generatedAt}
Timezone: ${plan.timezone}

## Target

- Baseline followers: ${plan.target.baselineFollowers}
- Latest followers: ${plan.target.latestFollowers}
- Follower delta: ${plan.target.followerDelta}
- 7-day follower target: ${plan.target.targetFollowers}
- Remaining followers: ${plan.target.remainingFollowers}
- Required daily pace: ${round(plan.target.requiredDailyPace)}
- Actual daily pace: ${round(plan.target.actualDailyPace)}

## Candidate Coverage

- Quality gate: ${plan.validationSummary.passed}/${plan.validationSummary.passed + plan.validationSummary.failed} passed, ${plan.validationSummary.warnings} warnings.
- Validated draft candidates: ${plan.candidates.availableValidatedDrafts}
- Planned publish slots: ${plan.candidates.plannedPosts}
- Unfilled slots: ${plan.candidates.missingSlots}

## Warnings

${warningLines}

## Operating Rules

- Publish the X Article or fallback thread first, then publish the image-backed short post with the X Article URL.
- Stop before every public publish, upload, reply, like, repost, follow, or edit action and get action-time confirmation.
- Use follow-up replies only when they add a mechanism, checklist, failure mode, or result.
- Capture follower count and post metrics at the listed capture times.

${daySections}
`;
}

export async function writeWeeklyExecutionPlan(plan, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatWeeklyExecutionPlanMarkdown(plan).trimEnd()}\n`);
  return filePath;
}

export function rankedDraftItems(queue) {
  const drafts = (queue?.items || []).filter((item) => item.status === 'draft');
  const groups = new Map();
  for (const item of drafts) {
    const group = groups.get(item.articleSlug) || [];
    group.push(item);
    groups.set(item.articleSlug, group);
  }

  for (const group of groups.values()) {
    group.sort(compareQueueItems);
  }

  const ranked = [];
  while (groups.size) {
    for (const [slug, group] of groups.entries()) {
      const item = group.shift();
      if (item) ranked.push(item);
      if (!group.length) groups.delete(slug);
    }
  }

  return ranked;
}

export function packageDirForItem(item, baseDir = 'data/social-growth/packages') {
  return join(baseDir, safePathSegment(item.id));
}

function formatPlanDay(day) {
  const slots = day.publishSlots.length
    ? day.publishSlots.map((slot) => [
      `- ${slot.time}: ${slot.item.id}`,
      `  Package: \`${slot.packageDir}\``,
      `  Variant: ${slot.item.variant}`,
    ].join('\n')).join('\n')
    : '- No validated candidate assigned. Generate or improve more article candidates.';
  const captures = day.captureTimes.map((time) => `- ${time}: capture profile followers and per-post metrics`).join('\n');

  return `## Day ${day.day}: ${day.date}

Cumulative follower target: +${day.cumulativeFollowerTarget}

Publish slots:

${slots}

Metric capture:

${captures}`;
}

function buildPlanWarnings({
  validation,
  candidates,
  missingSlots,
  requiredDailyPace,
  actualDailyPace,
}) {
  const warnings = [];
  if (validation.failed) {
    warnings.push(`${validation.failed} queue items failed the publishing quality gate and were excluded.`);
  }
  if (missingSlots) {
    warnings.push(`Need ${missingSlots} more validated candidates to fill the full 7-day cadence.`);
  }
  if (!candidates.length) {
    warnings.push('No validated draft candidates are available; run social:daily or fix the queue before opening Chrome.');
  }
  if (actualDailyPace < requiredDailyPace) {
    warnings.push(`Follower pace is behind target: ${round(actualDailyPace)} per day versus ${round(requiredDailyPace)} required.`);
  }
  return warnings;
}

function compareQueueItems(a, b) {
  return variantPriority(a.variant) - variantPriority(b.variant)
    || String(a.articleSlug).localeCompare(String(b.articleSlug))
    || String(a.id).localeCompare(String(b.id));
}

function variantPriority(variant) {
  return {
    'strong-thesis': 0,
    'research-utility': 1,
    'case-story': 2,
  }[variant] ?? 99;
}

function makePlanDates(startDate, days) {
  const parsed = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid plan start date: ${startDate}`);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(parsed + index * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._=-]+/g, '-');
}
