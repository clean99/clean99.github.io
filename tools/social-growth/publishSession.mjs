import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/publish-session.md';

export function buildPublishSession({
  generatedAt = new Date(),
  selected = {},
  metrics = {},
  browserReadiness = {},
  manualPublishUrls = {},
  publicActionHandoff = {},
  profileActionHandoff = {},
  paths = {},
} = {}) {
  const pendingUrl = (manualPublishUrls.pendingItems || [])[0] || null;
  const publishedPosts = Number(metrics.publishedPosts || 0);
  const publishReady = publicActionHandoff.status === 'ready_for_action_time_confirmation'
    && Boolean(publicActionHandoff.action?.actionId || publicActionHandoff.actionId);
  const status = publishedPosts > 0
    ? 'post_published'
    : publishReady ? 'ready_for_first_publish_confirmation' : 'blocked';
  const urlCaptureMode = manualPublishUrls.discoveryStatus === 'blocked'
    ? 'manual_url_fill'
    : 'timeline_discovery_first';

  return {
    generatedAt: toIsoString(generatedAt),
    status,
    selected: {
      id: selected.id || publicActionHandoff.action?.queueId || '',
      articleSlug: selected.articleSlug || '',
      variant: selected.variant || '',
    },
    browser: {
      status: browserReadiness.status || 'unknown',
      cdpLoginState: browserReadiness.loginState || 'unknown',
      cdpProfileDirectory: browserReadiness.profileDirectory || '',
      cdpCurrentUrl: browserReadiness.currentUrl || '',
      userBrowserSession: browserReadiness.userBrowserSession || null,
    },
    publicAction: publicActionSummary(publicActionHandoff),
    profileAction: publicActionSummary(profileActionHandoff),
    urlCapture: {
      mode: urlCaptureMode,
      status: manualPublishUrls.status || 'unknown',
      discoveryStatus: manualPublishUrls.discoveryStatus || 'unknown',
      discoveryBlockedReason: manualPublishUrls.discoveryBlockedReason || '',
      discoveryCommand: manualPublishUrls.discoveryCommand || '',
      fillCommand: pendingUrl?.fillCommand || '',
      recoveryCommand: manualPublishUrls.recoveryCommand || '',
      pending: manualPublishUrls.pending ?? 0,
      filled: manualPublishUrls.filled ?? 0,
      total: manualPublishUrls.total ?? 0,
    },
    metrics: {
      status: metrics.status || 'unknown',
      followers: metrics.followers || '',
      publishedPosts,
    },
    paths,
    boundary: 'Local publish session only. Publishing, uploading media, replying, liking, reposting, following, editing profile, saving profile changes, and pinning content still require action-time confirmation in Chrome.',
  };
}

export function formatPublishSessionMarkdown(session) {
  const userBrowser = session.browser.userBrowserSession || {};
  const urlCaptureStep = session.urlCapture.mode === 'manual_url_fill'
    ? `Timeline URL discovery is blocked: ${session.urlCapture.discoveryBlockedReason || 'unknown blocker'}.

After the first post is public, paste its public X URL with:

\`\`\`bash
${session.urlCapture.fillCommand || 'npm run social:manual-publish-url -- --input <template> --id <queue-id> --url <x-thread-url>'}
\`\`\``
    : `After the first post is public, try timeline URL discovery first:

\`\`\`bash
${session.urlCapture.discoveryCommand || 'npm run social:discover-published-urls -- --input <published-urls.json>'}
\`\`\``;

  return `# X Publish Session

Generated at: ${session.generatedAt}
Status: ${session.status}

## Current Target

- Queue id: ${session.selected.id || 'none'}
- Article slug: ${session.selected.articleSlug || 'unknown'}
- Variant: ${session.selected.variant || 'unknown'}
- Followers: ${session.metrics.followers || 'missing'}
- Published posts: ${session.metrics.publishedPosts}

## Browser State

- Readiness: ${session.browser.status}
- CDP profile: ${session.browser.cdpProfileDirectory || 'default'}
- CDP login state: ${session.browser.cdpLoginState}
- CDP URL: ${session.browser.cdpCurrentUrl || 'unknown'}
- Normal Chrome account: ${userBrowser.account || 'unknown'}
- Normal Chrome usable: ${Boolean(userBrowser.usable)}
- Normal Chrome URL: ${userBrowser.currentUrl || 'unknown'}

## Confirmed Publish Step

- Action id: ${session.publicAction.actionId || 'none'}
- Action type: ${session.publicAction.actionType || 'unknown'}
- Source: \`${session.publicAction.source || 'not selected'}\`
- Stop before: ${session.publicAction.stopBefore || 'final public publish click'}

Open the source kit, create the post in Chrome, attach the image, then stop before the final public publish click and confirm account/content.

## URL And Recovery

${urlCaptureStep}

Then run local recovery:

\`\`\`bash
${session.urlCapture.recoveryCommand || 'npm run social:post-publish-recovery-batch -- --input <published-urls.json>'}
\`\`\`

Recovery marks the queue item as published, refreshes the metrics template, writes reply handoffs, and creates early launch-window checkpoints.

## Next Local Checks

- Metrics cycle: \`${session.paths.metricsCycle || 'data/social-growth/metrics-cycle.md'}\`
- Launch window: \`${session.paths.launchWindow || 'data/social-growth/launch-window.md'}\`
- Public action handoff: \`${session.paths.publicActionHandoff || 'data/social-growth/public-action-handoff.md'}\`
- Profile action handoff: \`${session.paths.profileActionHandoff || 'data/social-growth/profile-action-handoff.md'}\`

## Profile Step

- Action id: ${session.profileAction.actionId || 'none'}
- Action type: ${session.profileAction.actionType || 'unknown'}
- Source: \`${session.profileAction.source || 'not selected'}\`

Only edit or save the public profile after action-time confirmation in Chrome.

## Boundary

${session.boundary}
`;
}

export async function writePublishSession(session, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublishSessionMarkdown(session).trimEnd()}\n`);
  return filePath;
}

function publicActionSummary(handoff = {}) {
  const action = handoff.action || {};
  return {
    status: handoff.status || 'unknown',
    actionId: action.actionId || handoff.actionId || '',
    actionType: action.type || handoff.actionType || '',
    source: action.source || handoff.source || '',
    stopBefore: action.stopBefore || '',
  };
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
