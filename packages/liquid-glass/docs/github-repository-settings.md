# GitHub Repository Settings

This package is intended to live at `clean99/liquid-glass` as a public GitHub
repository. Keep the repository empty before the first push because this local
repository already contains the README, license, workflows, and issue templates.

## First Push

Create the repository in GitHub with:

- visibility: public
- name: `liquid-glass`
- owner: `clean99`
- description: `Refractive Liquid Glass components for React, built on @hashintel/refractive with accessible fallbacks.`
- README: disabled
- `.gitignore`: disabled
- license: disabled

Then run:

```sh
git remote set-url origin git@github.com:clean99/liquid-glass.git
git push -u origin main
```

If GitHub CLI is installed and authenticated, the equivalent bootstrap is:

```sh
gh repo create clean99/liquid-glass \
  --public \
  --description "Refractive Liquid Glass components for React, built on @hashintel/refractive with accessible fallbacks." \
  --source . \
  --remote origin \
  --push
```

## Required Settings

- General > Features: enable Issues, Discussions, and Projects only if they are
  actively used.
- Pages > Build and deployment: select GitHub Actions.
- Actions > General: allow GitHub Actions and reusable workflows.
- Actions > Workflow permissions: read and write permissions, with pull request
  creation enabled for the release workflow.
- Branches: protect `main` after the first successful CI run.
- Tags and releases: publish from Changesets only.

## Branch Protection

Require these checks before merging to `main`:

- `ci`
- `visual`

Use linear history if the repository does not need merge commits. Do not enable
rules that block the Changesets release workflow from opening its version pull
request.

## Repository Secrets

Required for npm publishing:

- `NPM_TOKEN`: npm automation token with publish access to
  `@clean99/liquid-glass`.

Provided by GitHub Actions:

- `GITHUB_TOKEN`: used by Changesets to open the version pull request.

No local auth, session, cache, Playwright report, or test-result files should be
committed.

## Topics

Use repository topics that reflect the public package surface:

- `react`
- `typescript`
- `design-system`
- `storybook`
- `accessibility`
- `liquid-glass`
- `shadcn-ui`
- `refractive`

## Public Site

The `pages.yml` workflow deploys Storybook through GitHub Pages. After the first
successful run, the public documentation URL should be added to the repository
homepage.

## Rollback

- Documentation or Storybook issue: revert the bad commit and let Pages redeploy.
- npm issue: publish a patch release that reverts the package behavior, then
  deprecate the bad version on npm if needed.
