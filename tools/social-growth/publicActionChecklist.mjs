import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/public-action-checklist.md';

export function buildPublicActionChecklist({
  generatedAt = new Date(),
  publishConfirmation = null,
  manualPublishKits = null,
  profileUpdate = null,
  engagementPlan = null,
  browserReadiness = null,
} = {}) {
  const profile = profileActions(profileUpdate);
  const publish = publishActions({ publishConfirmation, manualPublishKits });
  const replies = replyActions(engagementPlan);
  const actions = [
    ...profile,
    ...publish,
    ...replies,
  ];
  const blockedByLogin = browserReadiness?.status === 'needs_x_login';
  const priorityNote = profile.length && publish.length
    ? 'Profile conversion actions come before publish actions so profile clicks from a launch can convert into follows.'
    : '';

  return {
    version: 1,
    generatedAt: toIsoString(generatedAt),
    status: actions.length
      ? (blockedByLogin ? 'blocked_until_x_login' : 'pending_confirmation')
      : 'no_public_actions_ready',
    actionCount: actions.length,
    blockedByLogin,
    priorityNote,
    actions,
    allowedLocalActions: [
      'read-only X search and copied visible-text capture',
      'local queue/package/profile/metrics report generation',
      'post-publish recovery after a confirmed public X status URL is pasted locally',
      'metrics parsing from copied visible X text',
    ],
    prohibitedAutomation: [
      'publish a post or X Article',
      'upload media',
      'reply, like, repost, quote, follow, DM, or edit profile',
      'save profile changes',
      'publish or pin a profile post',
    ],
    boundary: 'Checklist only. Every public X action must stop before the final Chrome action and receive action-time confirmation.',
  };
}

export function formatPublicActionChecklistMarkdown(checklist) {
  const actions = checklist.actions.length
    ? checklist.actions.map(formatAction).join('\n\n')
    : '- No pending public X actions generated from current local state.';
  const allowed = checklist.allowedLocalActions.map((item) => `- ${item}`).join('\n');
  const prohibited = checklist.prohibitedAutomation.map((item) => `- ${item}`).join('\n');

  return `# Public X Action Checklist

Generated at: ${checklist.generatedAt}
Status: ${checklist.status}

## Summary

- Pending public actions: ${checklist.actionCount}
- Blocked until X login: ${checklist.blockedByLogin}
${checklist.priorityNote ? `- Priority: ${checklist.priorityNote}\n` : ''}

## Pending Public Actions

${actions}

## Allowed Local Actions

${allowed}

## Prohibited Automation

${prohibited}

## Boundary

${checklist.boundary}
`;
}

export async function writePublicActionChecklist(checklist, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublicActionChecklistMarkdown(checklist).trimEnd()}\n`);
  return filePath;
}

function publishActions({ publishConfirmation, manualPublishKits }) {
  const entries = manualPublishKits?.entries || [];
  if (entries.length) {
    return entries
      .filter((entry) => entry.status === 'ready_for_manual_confirmation')
      .map((entry) => ({
        type: 'publish_image_thread',
        status: 'needs_action_time_confirmation',
        queueId: entry.id,
        source: entry.path,
        stopBefore: 'final public publish click',
        confirm: [
          'Chrome is logged into @Clean993',
          'first post text matches the kit',
          'image path is attached',
          'no raw blog URL is pasted into the first post',
        ],
        afterConfirmed: entry.recoveryCommand || 'paste the public X status URL into the local recovery command',
      }));
  }

  if (publishConfirmation?.status === 'ready_for_confirmation') {
    return [{
      type: publishConfirmation.publishMode === 'thread_fallback'
        ? 'publish_image_thread'
        : 'publish_x_article_and_short_post',
      status: 'needs_action_time_confirmation',
      queueId: publishConfirmation.selected?.id || '',
      source: 'data/social-growth/publish-confirmation.md',
      stopBefore: publishConfirmation.publishMode === 'thread_fallback'
        ? 'final image-backed thread first-post publish click'
        : 'final X Article publish and image-backed short-post publish clicks',
      confirm: [
        'Chrome is logged into @Clean993',
        'copy and image match the confirmation packet',
        'all stop points in the confirmation packet are still valid',
      ],
      afterConfirmed: publishConfirmation.commands?.recoverPublished || publishConfirmation.commands?.recordPublished || '',
    }];
  }

  return [];
}

function profileActions(profileUpdate) {
  if (profileUpdate?.status !== 'needs_browser_confirmation') return [];
  return [
    {
      type: 'edit_profile',
      status: 'needs_action_time_confirmation',
      queueId: '',
      source: 'data/social-growth/profile-update.md',
      stopBefore: 'final profile save click',
      confirm: [
        'display name, bio, and link match the proposed profile copy',
        'account is @Clean993',
      ],
      afterConfirmed: 'recapture visible profile text and rerun social:profile-audit',
    },
    {
      type: 'publish_pinned_post',
      status: 'needs_action_time_confirmation',
      queueId: '',
      source: 'data/social-growth/profile-update.md',
      stopBefore: 'final pinned-post publish click',
      confirm: [
        'pinned-post draft matches the proposed copy',
        'the post is published from @Clean993',
      ],
      afterConfirmed: 'copy the public post URL before pinning',
    },
    {
      type: 'pin_profile_post',
      status: 'needs_action_time_confirmation',
      queueId: '',
      source: 'data/social-growth/profile-update.md',
      stopBefore: 'final pin-to-profile confirmation click',
      confirm: [
        'the intended profile post is selected',
        'the account is @Clean993',
      ],
      afterConfirmed: 'recapture visible profile text and rerun social:profile-audit',
    },
  ];
}

function replyActions(engagementPlan) {
  return (engagementPlan?.opportunities || []).map((item) => ({
    type: 'reply',
    status: 'needs_action_time_confirmation',
    queueId: item.queueId || '',
    source: item.sourcePath || item.id,
    stopBefore: item.browserAction?.stopBefore || 'final public Reply click',
    confirm: [
      'reply text matches the engagement plan',
      'reply adds mechanism, proof caveat, checklist, or correction',
      'no link, hashtag, low-value agreement, or engagement bait is included',
    ],
    afterConfirmed: 'record visible reply context if it becomes part of a measured launch window',
  }));
}

function formatAction(action, index) {
  const queue = action.queueId ? `- Queue id: ${action.queueId}\n` : '';
  const confirm = action.confirm.map((item) => `  - ${item}`).join('\n');
  return `### ${index + 1}. ${action.type}

- Status: ${action.status}
${queue}- Source: \`${action.source || 'local state'}\`
- Stop before: ${action.stopBefore}

Confirm before action:

${confirm}

After confirmed:

\`\`\`text
${action.afterConfirmed || 'record the confirmed public outcome locally'}
\`\`\``;
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
