import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildGrowthRecommendations } from './recommendations.mjs';
import { validateQueueItem } from './validation.mjs';

const DEFAULT_OUT_PATH = 'data/social-growth/experiment-plan.md';

export function buildGrowthExperimentPlan({
  queue,
  ledger,
  now = new Date(),
  limit = 3,
  selectedId,
} = {}) {
  const recommendations = buildGrowthRecommendations(ledger);
  const lens = recommendations.algorithmLens;
  const candidates = selectExperimentCandidates(queue, recommendations, Number(limit || 3), {
    selectedId,
  });
  const experiments = candidates.map((item, index) => experimentFromItem({
    item,
    index,
    lens,
    recommendations,
  }));

  return {
    generatedAt: toIsoString(now),
    status: experiments.length ? 'ready' : 'needs_candidates',
    selectedId: selectedId || null,
    selectedAligned: Boolean(selectedId && candidates[0]?.id === selectedId),
    algorithmLens: lens,
    summary: recommendations.summary,
    candidates: candidates.map((item) => ({
      id: item.id,
      articleSlug: item.articleSlug,
      variant: item.variant,
      status: item.status,
    })),
    experiments,
    commands: {
      brief: experiments[0]
        ? `npm run social:x-tech-brief -- --id ${experiments[0].queueId}`
        : 'npm run social:queue -- --limit 5 --lang zh --out data/social-growth/queue.json',
      applyCopy: experiments[0]
        ? `npm run social:apply-copy -- --input data/social-growth/copy-overrides/${experiments[0].queueId}.json`
        : 'No candidate selected.',
      status: experiments[0]
        ? 'npm run social:status -- --day today --slot 1 --publishMode thread_fallback --out data/social-growth/status.md'
        : 'No candidate selected.',
    },
    boundary: 'Local experiment planning only. Do not publish, upload media, reply, like, repost, follow, edit profile, or pin content without action-time confirmation.',
  };
}

export function formatGrowthExperimentPlanMarkdown(plan) {
  const experimentLines = plan.experiments.length
    ? plan.experiments.map(formatExperiment).join('\n\n')
    : '- No experiment candidates. Refresh the queue or add validated Chinese posts.';
  const candidateLines = plan.candidates.length
    ? plan.candidates.map((item) => `- ${item.id}: ${item.articleSlug}, ${item.variant}, ${item.status}`).join('\n')
    : '- No candidates.';

  return `# X Growth Experiment Plan

Generated at: ${plan.generatedAt}
Status: ${plan.status}

## Algorithm Lens

- Stage: ${plan.algorithmLens.stage}
- Funnel status: ${plan.algorithmLens.status}
- Metric to move: ${plan.algorithmLens.metricToMove}
- Content rule: ${plan.algorithmLens.contentRule}
- Avoid: ${plan.algorithmLens.avoid}
- Pace: ${plan.algorithmLens.pace}
- Selected queue id: ${plan.selectedId || 'none'}
- Selected aligned: ${plan.selectedAligned ? 'yes' : 'no'}

## Candidates

${candidateLines}

## Experiments

${experimentLines}

## Commands

\`\`\`bash
${plan.commands.brief}
${plan.commands.applyCopy}
${plan.commands.status}
\`\`\`

## Boundary

${plan.boundary}
`;
}

export async function writeGrowthExperimentPlan(plan, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatGrowthExperimentPlanMarkdown(plan).trimEnd()}\n`);
  return filePath;
}

function selectExperimentCandidates(queue = {}, recommendations, limit, { selectedId } = {}) {
  const draftItems = (queue.items || [])
    .filter((item) => item.status !== 'published' && !item.xPostUrl)
    .filter((item) => validateQueueItem(item).status === 'pass');
  if (!draftItems.length) return [];

  const topVariant = recommendations.variantPerformance[0]?.key;
  const topArticle = recommendations.articlePerformance[0]?.key;
  const stage = recommendations.algorithmLens.stage;

  const ranked = draftItems
    .map((item) => ({
      item,
      score: candidateScore(item, { topVariant, topArticle, stage }),
    }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .map((entry) => entry.item);

  const selected = selectedId
    ? draftItems.find((item) => item.id === selectedId)
    : null;
  if (!selected) {
    return ranked.slice(0, limit);
  }

  return [
    selected,
    ...ranked.filter((item) => item.id !== selected.id).slice(0, Math.max(0, limit - 1)),
  ];
}

function candidateScore(item, { topVariant, topArticle, stage }) {
  let score = 0;
  if (item.variant === topVariant) score += 30;
  if (item.articleSlug === topArticle) score += 20;
  if (stage === 'candidate_entry' && item.variant === 'strong-thesis') score += 25;
  if (stage === 'winner_scaling' && item.articleSlug === topArticle) score += 30;
  if (stage !== 'winner_scaling' && item.variant === 'case-story') score += 8;
  if (item.media?.prompt) score += 5;
  if (item.threadFallback?.length >= 3) score += 5;
  return score;
}

function experimentFromItem({ item, index, lens, recommendations }) {
  return {
    id: `exp-${index + 1}`,
    queueId: item.id,
    articleSlug: item.articleSlug,
    variant: item.variant,
    hypothesis: hypothesisFor(lens, item),
    editFocus: editFocusFor(lens),
    successMetric: lens.metricToMove,
    minimumEvidence: minimumEvidenceFor(lens),
    stopCondition: stopConditionFor(lens),
    sourceSignals: sourceSignalsFor(recommendations),
  };
}

function hypothesisFor(lens, item) {
  if (lens.stage === 'candidate_entry') {
    return `Publishing an image-backed thread for \`${item.articleSlug}\` will create the first measurable recommender signal.`;
  }
  if (lens.stage === 'multi_action_prediction') {
    return `A sharper first-screen claim and concrete image promise can lift interaction probability for \`${item.articleSlug}\`.`;
  }
  if (lens.stage === 'profile_handoff') {
    return `Making the account promise explicit in the post and replies can turn interactions into profile clicks.`;
  }
  if (lens.stage === 'follow_conversion') {
    return `Aligning the post, bio, and pinned promise can convert profile interest into follows.`;
  }
  if (lens.stage === 'winner_scaling') {
    return `Reusing the winning mechanism from current metrics with fresh wording can improve follow per view.`;
  }
  return `Testing \`${item.articleSlug}\` will clarify the next measurable bottleneck.`;
}

function editFocusFor(lens) {
  return {
    candidate_entry: ['publish package', 'image attachment', 'public URL recording'],
    measurement_hydration: ['metrics capture', 'post text capture', 'profile text capture'],
    multi_action_prediction: ['shortPost first line', 'image.prompt', 'threadFallback post 2'],
    profile_handoff: ['shortPost account promise', 'followUpReplies', 'pinned post handoff'],
    follow_conversion: ['profile bio', 'pinned post', 'thread closing post'],
    winner_scaling: ['topic reuse', 'variant reuse', 'surface wording diversity'],
  }[lens.stage] || ['ledger inspection', 'copy review'];
}

function minimumEvidenceFor(lens) {
  if (lens.stage === 'candidate_entry') return 'A public X URL is marked and at least views are captured.';
  if (lens.stage === 'measurement_hydration') return 'Views, interactions, profile clicks, follows, and bookmarks are captured for each published post.';
  if (lens.stage === 'multi_action_prediction') return 'Interaction / view improves versus the previous measured post.';
  if (lens.stage === 'profile_handoff') return 'Profile click / interaction becomes non-zero.';
  if (lens.stage === 'follow_conversion') return 'Follow / profile click becomes non-zero.';
  if (lens.stage === 'winner_scaling') return 'Follow / view holds while publishing a second surface wording.';
  return 'The next ledger snapshot changes a funnel stage or records the missing metric.';
}

function stopConditionFor(lens) {
  if (lens.stage === 'candidate_entry') return 'Stop optimizing copy until the first public URL and metrics exist.';
  if (lens.stage === 'measurement_hydration') return 'Stop rewriting content until visible metrics are captured.';
  if (lens.stage === 'winner_scaling') return 'Stop duplicating the same wording once topic fatigue appears in interactions or follows.';
  return `Stop this experiment if ${lens.metricToMove} does not move after two measured posts.`;
}

function sourceSignalsFor(recommendations) {
  const bestVariant = recommendations.variantPerformance[0];
  const bestArticle = recommendations.articlePerformance[0];
  return {
    bestVariant: bestVariant ? {
      key: bestVariant.key,
      score: bestVariant.score,
      follows: bestVariant.follows,
    } : null,
    bestArticle: bestArticle ? {
      key: bestArticle.key,
      score: bestArticle.score,
      follows: bestArticle.follows,
    } : null,
  };
}

function formatExperiment(experiment) {
  return `### ${experiment.id}: ${experiment.queueId}

- Article: ${experiment.articleSlug}
- Variant: ${experiment.variant}
- Hypothesis: ${experiment.hypothesis}
- Edit focus: ${experiment.editFocus.join(', ')}
- Success metric: ${experiment.successMetric}
- Minimum evidence: ${experiment.minimumEvidence}
- Stop condition: ${experiment.stopCondition}`;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
