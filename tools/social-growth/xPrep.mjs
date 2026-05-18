import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, delimiter } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_BROWSER_PROBE_PATH = 'data/social-growth/browser-probe.local.json';
const DEFAULT_BROWSER_COMMAND = shellQuote(process.execPath);

export async function buildXPublishPrep(preflight, {
  skillDir = defaultBaoyuPostToXSkillDir(),
  bunCommand,
  browserCommand = DEFAULT_BROWSER_COMMAND,
  regularPostScript = defaultProjectXBrowserScript(),
  articleUrlPlaceholder = '<x-article-url>',
  publishMode = 'x_article',
  profileDir,
  browserProbePath = DEFAULT_BROWSER_PROBE_PATH,
  expectedAccount = '@Clean993',
  runtimeResolver = resolveBunCommand,
} = {}) {
  if (!preflight?.selected?.id) {
    throw new Error('preflight with a selected item is required');
  }

  const resolvedPublishMode = normalizePublishMode(publishMode);
  const packageDir = preflight.selected.packageDir;
  const scripts = {
    article: join(skillDir, 'scripts/x-article.ts'),
    regularPost: regularPostScript,
  };
  const files = {
    xArticle: join(packageDir, 'x-article.md'),
    shortPost: join(packageDir, 'short-post.txt'),
    threadFallback: join(packageDir, 'thread-fallback.md'),
    image: preflight.image.outputPath,
  };
  const threadFallback = preflight.browser?.handoff?.threadFallback || [];
  const threadFirstPost = threadFallback[0] || preflight.browser?.handoff?.shortPost || '';
  const threadReplies = threadFallback.slice(1);
  const blockers = [...(preflight.blockers || [])];
  const profileArg = profileDir ? ` --profile ${shellQuote(profileDir)}` : '';
  const runtime = resolvedPublishMode === 'x_article'
    ? await runtimeResolver(bunCommand)
    : { command: null, status: 'not_required', blocker: null };
  const articleCommand = runtime.command || '# Install bun or npx before running baoyu-post-to-x';
  const browserRuntime = {
    command: browserCommand,
    status: browserCommand ? 'provided' : 'missing',
    blocker: browserCommand ? null : 'Browser handoff runtime is unavailable.',
  };

  if (runtime.blocker) blockers.push(runtime.blocker);
  if (browserRuntime.blocker) blockers.push(browserRuntime.blocker);

  if (resolvedPublishMode === 'x_article' && !(await fileExists(scripts.article))) {
    blockers.push(`baoyu-post-to-x article script is missing: ${scripts.article}`);
  }
  if (!(await fileExists(scripts.regularPost))) {
    blockers.push(`Project X browser handoff script is missing: ${scripts.regularPost}`);
  }
  if (resolvedPublishMode === 'thread_fallback' && !threadFirstPost.trim()) {
    blockers.push('Thread fallback first post is missing.');
  }

  return {
    generatedAt: preflight.generatedAt,
    status: blockers.length ? 'blocked' : 'ready',
    blockers,
    selected: preflight.selected,
    publishMode: resolvedPublishMode,
    files,
    thread: {
      firstPost: threadFirstPost,
      replies: threadReplies,
    },
    skill: {
      name: 'project-x-browser-cdp',
      articleHelper: 'baoyu-post-to-x',
      browserHandoff: 'cdp',
      dir: skillDir,
      bunCommand: runtime.command,
      runtimeStatus: runtime.status,
      browserCommand: browserRuntime.command,
      browserRuntimeStatus: browserRuntime.status,
      scripts,
      profileDir,
    },
    commands: {
      probeBrowser: `${browserRuntime.command} ${shellQuote(scripts.regularPost)} --probe --json${profileArg}`,
      recordBrowserProbe: `${browserRuntime.command} ${shellQuote(scripts.regularPost)} --probe --json --probe-out ${shellQuote(browserProbePath)} --account ${shellQuote(expectedAccount)}${profileArg}`,
      prepareArticle: resolvedPublishMode === 'x_article'
        ? `${articleCommand} ${shellQuote(scripts.article)} ${shellQuote(files.xArticle)} --cover ${shellQuote(files.image)}${profileArg}`
        : '# X Article is unavailable for this account. Use the thread fallback command below.',
      prepareShortPost: resolvedPublishMode === 'x_article'
        ? [
          `ARTICLE_URL=${shellQuote(articleUrlPlaceholder)}`,
          `SHORT_POST="$(cat ${shellQuote(files.shortPost)}; printf '\\n\\n%s' "$ARTICLE_URL")"`,
          `${browserRuntime.command} ${shellQuote(scripts.regularPost)} "$SHORT_POST" --image ${shellQuote(files.image)}${profileArg}`,
        ].join('\n')
        : `${browserRuntime.command} ${shellQuote(scripts.regularPost)} ${shellQuote(threadFirstPost)} --image ${shellQuote(files.image)}${profileArg}`,
      prepareThreadFirstPost: `${browserRuntime.command} ${shellQuote(scripts.regularPost)} ${shellQuote(threadFirstPost)} --image ${shellQuote(files.image)}${profileArg}`,
    },
    boundary: [
      'The baoyu-post-to-x scripts may open Chrome and fill editors.',
      'They must not be treated as permission to click final publish.',
      resolvedPublishMode === 'x_article'
        ? 'Stop before final X Article publish, final short-post publish, media upload confirmation, and every public reply/like/repost/follow/edit action.'
        : 'Stop before final thread post publish, media upload confirmation, and every public reply/like/repost/follow/edit action.',
    ],
  };
}

export function formatXPublishPrepMarkdown(prep) {
  const blockers = prep.blockers.length
    ? prep.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No local blockers. Chrome can be prepared after final account/content review.';
  const boundary = prep.boundary.map((item) => `- ${item}`).join('\n');

  return `# X Publish Prep

Generated at: ${prep.generatedAt}
Status: ${prep.status}

## Selected Package

- Queue id: ${prep.selected.id}
- Article slug: ${prep.selected.articleSlug}
- Variant: ${prep.selected.variant}
- Package: \`${prep.selected.packageDir}\`
- Image: \`${prep.files.image}\`
- Publish mode: ${prep.publishMode}

## X Browser Handoff

- Regular post helper: project CDP handoff
- Browser runtime: ${prep.skill.browserCommand ? `\`${prep.skill.browserCommand}\`` : 'unavailable'}
- Browser runtime status: ${prep.skill.browserRuntimeStatus}
- Regular post script: \`${prep.skill.scripts.regularPost}\`
- X Article helper: ${prep.skill.articleHelper}
- X Article runtime: ${formatArticleRuntime(prep)}
- X Article runtime status: ${prep.skill.runtimeStatus}
- X Article script: \`${prep.skill.scripts.article}\`
- Chrome profile: ${prep.skill.profileDir ? `\`${prep.skill.profileDir}\`` : 'default baoyu shared profile'}

## Local Blockers

${blockers}

## Probe Browser Without Public Actions

Run this before any publish handoff when login/editor/media-upload state is unknown. It opens or attaches Chrome, checks X compose readiness, records the local probe state, and does not type text, upload media, or click a public button.

\`\`\`bash
${prep.commands.recordBrowserProbe}
\`\`\`

## Prepare X Article

${prep.publishMode === 'x_article'
    ? 'This opens Chrome and fills the X Article editor. Stop before the final public publish click.'
    : 'X Article publishing is disabled for this package because the account/browser probe showed the Article editor is unavailable.'}

\`\`\`bash
${prep.commands.prepareArticle}
\`\`\`

## Prepare Image Post Or Thread First Post

${prep.publishMode === 'x_article'
    ? 'Run this only after the X Article is public and `ARTICLE_URL` is replaced with the real X Article URL. Stop before the final public post click.'
    : 'Run this to prepare the first fallback thread post with the generated image. Stop before the final public post click.'}

\`\`\`bash
${prep.commands.prepareShortPost}
\`\`\`

${formatThreadFallbackForPrep(prep)}

## Boundary

${boundary}
`;
}

export async function writeXPublishPrep(prep, filePath = DEFAULT_OUT_PATH) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${formatXPublishPrepMarkdown(prep).trimEnd()}\n`);
  return filePath;
}

function defaultBaoyuPostToXSkillDir() {
  return join(homedir(), '.codex/skills/baoyu-post-to-x');
}

function defaultProjectXBrowserScript() {
  return join(dirname(fileURLToPath(import.meta.url)), 'x-browser-cdp.mjs');
}

function normalizePublishMode(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  if (['thread', 'fallback', 'thread_fallback'].includes(normalized)) return 'thread_fallback';
  return 'x_article';
}

function formatThreadFallbackForPrep(prep) {
  if (prep.publishMode !== 'thread_fallback') return '';
  const replies = prep.thread.replies.length
    ? prep.thread.replies.map((reply, index) => `### Thread Reply ${index + 1}\n\n${reply}`).join('\n\n')
    : '- No thread replies prepared.';

  return `## Thread Replies After First Post

Prepare these only after the first post is public. Stop before each public reply click.

${replies}
`;
}

function formatArticleRuntime(prep) {
  if (prep.skill.bunCommand) return `\`${prep.skill.bunCommand}\``;
  if (prep.skill.runtimeStatus === 'not_required') return 'not required for this publish mode';
  return 'unavailable';
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function resolveBunCommand(preferredCommand) {
  const preferred = String(preferredCommand || '').trim();
  if (preferred) {
    return {
      command: preferred,
      status: 'provided',
      blocker: null,
    };
  }

  if (await executableOnPath('bun')) {
    return {
      command: 'bun',
      status: 'auto_bun',
      blocker: null,
    };
  }

  const homeBun = join(homedir(), '.bun/bin/bun');
  if (await fileExists(homeBun)) {
    return {
      command: shellQuote(homeBun),
      status: 'auto_home_bun',
      blocker: null,
    };
  }

  for (const bunPath of ['/opt/homebrew/bin/bun', '/usr/local/bin/bun']) {
    if (await fileExists(bunPath)) {
      return {
        command: shellQuote(bunPath),
        status: 'auto_absolute_bun',
        blocker: null,
      };
    }
  }

  if (await executableOnPath('npx')) {
    return {
      command: 'npx -y bun',
      status: 'auto_npx_bun',
      blocker: null,
    };
  }

  return {
    command: null,
    status: 'missing',
    blocker: 'Bun runtime is unavailable: install bun or provide --bunCommand with an executable command before preparing Chrome.',
  };
}

async function executableOnPath(name) {
  const paths = String(process.env.PATH || '').split(delimiter).filter(Boolean);
  for (const dir of paths) {
    if (await fileExists(join(dir, name))) return true;
  }
  return false;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
