import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_OUT_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_BUN_COMMAND = 'npx -y bun';

export async function buildXPublishPrep(preflight, {
  skillDir = defaultBaoyuPostToXSkillDir(),
  bunCommand = DEFAULT_BUN_COMMAND,
  articleUrlPlaceholder = '<x-article-url>',
  publishMode = 'x_article',
  profileDir,
} = {}) {
  if (!preflight?.selected?.id) {
    throw new Error('preflight with a selected item is required');
  }

  const resolvedPublishMode = normalizePublishMode(publishMode);
  const packageDir = preflight.selected.packageDir;
  const scripts = {
    article: join(skillDir, 'scripts/x-article.ts'),
    regularPost: join(skillDir, 'scripts/x-browser.ts'),
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

  if (resolvedPublishMode === 'x_article' && !(await fileExists(scripts.article))) {
    blockers.push(`baoyu-post-to-x article script is missing: ${scripts.article}`);
  }
  if (!(await fileExists(scripts.regularPost))) {
    blockers.push(`baoyu-post-to-x regular post script is missing: ${scripts.regularPost}`);
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
      name: 'baoyu-post-to-x',
      dir: skillDir,
      bunCommand,
      scripts,
      profileDir,
    },
    commands: {
      prepareArticle: resolvedPublishMode === 'x_article'
        ? `${bunCommand} ${shellQuote(scripts.article)} ${shellQuote(files.xArticle)} --cover ${shellQuote(files.image)}${profileArg}`
        : '# X Article is unavailable for this account. Use the thread fallback command below.',
      prepareShortPost: resolvedPublishMode === 'x_article'
        ? [
          `ARTICLE_URL=${shellQuote(articleUrlPlaceholder)}`,
          `SHORT_POST="$(cat ${shellQuote(files.shortPost)}; printf '\\n\\n%s' "$ARTICLE_URL")"`,
          `${bunCommand} ${shellQuote(scripts.regularPost)} "$SHORT_POST" --image ${shellQuote(files.image)}${profileArg}`,
        ].join('\n')
        : `${bunCommand} ${shellQuote(scripts.regularPost)} ${shellQuote(threadFirstPost)} --image ${shellQuote(files.image)}${profileArg}`,
      prepareThreadFirstPost: `${bunCommand} ${shellQuote(scripts.regularPost)} ${shellQuote(threadFirstPost)} --image ${shellQuote(files.image)}${profileArg}`,
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

## baoyu-post-to-x Bridge

- Skill dir: \`${prep.skill.dir}\`
- Runtime: \`${prep.skill.bunCommand}\`
- X Article script: \`${prep.skill.scripts.article}\`
- Regular post script: \`${prep.skill.scripts.regularPost}\`
- Chrome profile: ${prep.skill.profileDir ? `\`${prep.skill.profileDir}\`` : 'default baoyu shared profile'}

## Local Blockers

${blockers}

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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
