import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_OUT_PATH = 'data/social-growth/x-publish-prep.md';
const DEFAULT_BUN_COMMAND = 'npx -y bun';

export async function buildXPublishPrep(preflight, {
  skillDir = defaultBaoyuPostToXSkillDir(),
  bunCommand = DEFAULT_BUN_COMMAND,
  articleUrlPlaceholder = '<x-article-url>',
} = {}) {
  if (!preflight?.selected?.id) {
    throw new Error('preflight with a selected item is required');
  }

  const packageDir = preflight.selected.packageDir;
  const scripts = {
    article: join(skillDir, 'scripts/x-article.ts'),
    regularPost: join(skillDir, 'scripts/x-browser.ts'),
  };
  const files = {
    xArticle: join(packageDir, 'x-article.md'),
    shortPost: join(packageDir, 'short-post.txt'),
    image: preflight.image.outputPath,
  };
  const blockers = [...(preflight.blockers || [])];

  if (!(await fileExists(scripts.article))) {
    blockers.push(`baoyu-post-to-x article script is missing: ${scripts.article}`);
  }
  if (!(await fileExists(scripts.regularPost))) {
    blockers.push(`baoyu-post-to-x regular post script is missing: ${scripts.regularPost}`);
  }

  return {
    generatedAt: preflight.generatedAt,
    status: blockers.length ? 'blocked' : 'ready',
    blockers,
    selected: preflight.selected,
    files,
    skill: {
      name: 'baoyu-post-to-x',
      dir: skillDir,
      bunCommand,
      scripts,
    },
    commands: {
      prepareArticle: `${bunCommand} ${shellQuote(scripts.article)} ${shellQuote(files.xArticle)} --cover ${shellQuote(files.image)}`,
      prepareShortPost: [
        `ARTICLE_URL=${shellQuote(articleUrlPlaceholder)}`,
        `SHORT_POST="$(cat ${shellQuote(files.shortPost)}; printf '\\n\\n%s' "$ARTICLE_URL")"`,
        `${bunCommand} ${shellQuote(scripts.regularPost)} "$SHORT_POST" --image ${shellQuote(files.image)}`,
      ].join('\n'),
    },
    boundary: [
      'The baoyu-post-to-x scripts may open Chrome and fill editors.',
      'They must not be treated as permission to click final publish.',
      'Stop before final X Article publish, final short-post publish, media upload confirmation, and every public reply/like/repost/follow/edit action.',
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

## baoyu-post-to-x Bridge

- Skill dir: \`${prep.skill.dir}\`
- Runtime: \`${prep.skill.bunCommand}\`
- X Article script: \`${prep.skill.scripts.article}\`
- Regular post script: \`${prep.skill.scripts.regularPost}\`

## Local Blockers

${blockers}

## Prepare X Article

This opens Chrome and fills the X Article editor. Stop before the final public publish click.

\`\`\`bash
${prep.commands.prepareArticle}
\`\`\`

## Prepare Image Post

Run this only after the X Article is public and \`ARTICLE_URL\` is replaced with the real X Article URL. Stop before the final public post click.

\`\`\`bash
${prep.commands.prepareShortPost}
\`\`\`

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
