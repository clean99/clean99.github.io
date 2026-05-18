# Community Skills Installed for X Growth

Last updated: 2026-05-19

## Installed

### `social-writer`

- Source: `itechmeat/llm-code`, path `skills/social-writer`
- Local path: `.agents/skills/social-writer`
- Use: X hook/thread/style reference, AI-writing avoidance, technical-blog-to-X critique.
- Boundary: advisory only. It cannot publish, schedule, call APIs, or write public actions.

Why it is useful here: it has concrete X post/thread references, an AI-writing avoidance checklist, hook references, and technical style notes. That directly addresses the current failure mode: posts sounding like generic AI summaries.

### `twitter-algorithm-optimizer`

- Source: `composiohq/awesome-claude-skills`, path `twitter-algorithm-optimizer`
- Local path: `.agents/skills/twitter-algorithm-optimizer`
- Use: algorithmic critique for Real-graph, SimClusters, TwHIN, Tweepcred, early engagement, and negative feedback hypotheses.
- Boundary: advisory only. It cannot publish, schedule, call X APIs, or overwrite `queue.json`.

Why it is useful here: it gives a second review lens for whether a draft has follower fit, niche fit, topic identity, and measurable engagement triggers before we spend a publish slot.

### `agent-browser`

- Source: `vercel-labs/agent-browser`, path `skills/agent-browser`
- Local path: `$HOME/.codex/skills/agent-browser`
- Use: optional browser-diagnostics fallback for CDP/accessibility snapshots after Codex restart and after the `agent-browser` CLI is actually installed.
- Boundary: not part of the X publishing path yet. The current project Chrome/CDP scripts remain authoritative for X prep, metrics capture, login recovery, and confirmation stops.

Why it is useful here: it is a mature open-source browser automation skill with Chrome/CDP support and persistent sessions. It may help diagnose login/profile/browser state if the existing Chrome plugin or project CDP scripts are insufficient.

Current blocker: this environment does not have `npm`/`npx`, so the skill is installed as a reference only. Do not call `agent-browser` until the CLI exists.

### `playwright`

- Source: `openai/skills`, path `skills/.curated/playwright`
- Local path: `$HOME/.codex/skills/playwright`
- Use: optional local browser QA and read-only diagnostics through `playwright-cli` when `npx` exists.
- Boundary: not part of the X publishing path. It must not publish, upload media, reply, like, repost, follow, or edit profile.

Why it is useful here: it gives a standard fallback workflow for real-browser snapshots, screenshots, and form diagnostics if local browser QA is needed outside X account actions.

Current blocker: the wrapper requires `npx`, which is absent in this environment.

## Rejected for This System

- Twitter/X API automation skills: conflicts with the explicit no-X-API constraint.
- Cookie/GraphQL X automation skills such as `bird`: conflicts with the browser-only publishing constraint even when they are not official X API.
- Typefully or scheduler skills: creates a third-party publishing path outside the browser confirmation boundary.
- Generic automation skills that can like, follow, repost, or reply directly: too much public-action risk for the Clean993 account.

## Invocation Order

1. `x-growth-publishing` remains the controller.
2. `x-technical-sharing` produces X-native Chinese technical copy.
3. `social-writer` audits hook shape, thread pacing, and AI-writing patterns.
4. `twitter-algorithm-optimizer` audits algorithmic reach hypotheses.
5. `humanizer-zh` removes stiff phrasing and template residue.
6. `agent-browser` / `playwright` may help only with browser diagnostics after their CLIs are available.
7. Local quality gate, image readiness, browser readiness, and confirmation boundary decide whether the package is eligible.

## Security Audit Notes

- `agent-browser`: installed skill contains only `SKILL.md`. It asks for restricted Bash commands (`agent-browser:*`, `npx agent-browser:*`) and points to a separate CLI install. No bundled scripts, symlinks, lifecycle hooks, or secret reads were present in the installed skill directory.
- `playwright`: installed skill includes one wrapper script, `scripts/playwright_cli.sh`. The wrapper exits when `npx` is missing, then runs `npx --yes --package @playwright/cli playwright-cli "$@"`; no secret reads, config writes, symlinks, lifecycle hooks, or arbitrary project writes were found.
- `uv` is not installed, so the `skill-scanner` automated scanner could not be run. This note records the manual fallback audit.
