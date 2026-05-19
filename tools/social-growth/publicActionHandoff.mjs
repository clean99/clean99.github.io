import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_OUT_PATH = 'data/social-growth/public-action-handoff.md';

export function buildPublicActionHandoff({
  checklistText = '',
  actionId = '',
  sourceText = '',
  generatedAt = new Date(),
} = {}) {
  const actions = parsePublicActionChecklistMarkdown(checklistText);
  const action = actions.find((item) => item.actionId === actionId);

  if (!action) {
    return {
      generatedAt: toIsoString(generatedAt),
      status: 'not_found',
      requestedActionId: actionId,
      availableActionIds: actions.map((item) => item.actionId).filter(Boolean),
      action: null,
      sourceExcerpt: '',
      boundary: 'No public X action is authorized. Pick an action id from the current public action checklist.',
    };
  }

  return {
    generatedAt: toIsoString(generatedAt),
    status: 'ready_for_action_time_confirmation',
    requestedActionId: actionId,
    availableActionIds: actions.map((item) => item.actionId).filter(Boolean),
    action,
    sourceExcerpt: sourceExcerpt(sourceText),
    boundary: 'Handoff only. Publishing, uploading media, replying, liking, reposting, following, editing profile, saving profile changes, and pinning content still require action-time confirmation in Chrome.',
  };
}

export function formatPublicActionHandoffMarkdown(handoff) {
  if (handoff.status === 'not_found') {
    const available = handoff.availableActionIds.length
      ? handoff.availableActionIds.map((id) => `- \`${id}\``).join('\n')
      : '- No action ids available.';

    return `# Public X Action Handoff

Generated at: ${handoff.generatedAt}
Status: ${handoff.status}
Requested action id: \`${handoff.requestedActionId || 'missing'}\`

## Available Action IDs

${available}

## Boundary

${handoff.boundary}
`;
  }

  const action = handoff.action;
  const confirm = action.confirm.length
    ? action.confirm.map((item) => `- ${item}`).join('\n')
    : '- Re-read the source and public action checklist before acting.';
  const source = handoff.sourceExcerpt
    ? `\n## Source Excerpt\n\n\`\`\`\`text\n${handoff.sourceExcerpt}\n\`\`\`\`\n`
    : '';

  return `# Public X Action Handoff

Generated at: ${handoff.generatedAt}
Status: ${handoff.status}

## Action

- Action id: \`${action.actionId}\`
- Type: ${action.type}
- Status: ${action.status}
- Queue id: ${action.queueId || 'none'}
- Source: \`${action.source || 'local state'}\`
- Stop before: ${action.stopBefore || 'final public Chrome action'}

## Confirm Before Action

${confirm}

## After Confirmed

\`\`\`text
${action.afterConfirmed || 'record the confirmed public outcome locally'}
\`\`\`
${source}
## Boundary

${handoff.boundary}
`;
}

export async function writePublicActionHandoff(handoff, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatPublicActionHandoffMarkdown(handoff).trimEnd()}\n`);
  return filePath;
}

export function parsePublicActionChecklistMarkdown(markdown = '') {
  const text = String(markdown || '');
  const sectionPattern = /^###\s+\d+\.\s+(.+)$/gm;
  const matches = [...text.matchAll(sectionPattern)];
  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.indexOf('\n## ', start + 1);
    const section = text.slice(start, end === -1 ? text.length : end);
    return parseActionSection(match[1].trim(), section);
  }).filter((item) => item.actionId);
}

function parseActionSection(type, section) {
  return {
    type,
    actionId: field(section, 'Action id').replace(/^`|`$/g, ''),
    status: field(section, 'Status'),
    queueId: field(section, 'Queue id'),
    source: field(section, 'Source').replace(/^`|`$/g, ''),
    stopBefore: field(section, 'Stop before'),
    confirm: confirmItems(section),
    afterConfirmed: afterConfirmed(section),
  };
}

function field(section, label) {
  const pattern = new RegExp(`^- ${escapeRegExp(label)}: (.+)$`, 'm');
  const match = section.match(pattern);
  return match?.[1]?.trim() || '';
}

function confirmItems(section) {
  const start = section.indexOf('Confirm before action:');
  const end = section.indexOf('After confirmed:', start);
  if (start === -1 || end === -1) return [];
  return section.slice(start, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function afterConfirmed(section) {
  const match = section.match(/After confirmed:\s*```(?:text)?\s*([\s\S]*?)```/);
  return match?.[1]?.trim() || '';
}

function sourceExcerpt(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return '';
  const lines = normalized.split(/\r?\n/).slice(0, 120).join('\n');
  return lines.length > 3000 ? `${lines.slice(0, 3000).trimEnd()}\n...` : lines;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
