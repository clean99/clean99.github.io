# Open Source Release Checklist

This repository is prepared as an independent package, not as a private blog
subdirectory.

## GitHub Repository Bootstrap

The intended remote is `git@github.com:clean99/liquid-glass.git`. Create the
repository as a public GitHub repository before the first push. With GitHub CLI
available, the bootstrap command is:

```sh
gh repo create clean99/liquid-glass \
  --public \
  --description "Refractive Liquid Glass components for React, built on @hashintel/refractive with accessible fallbacks." \
  --source . \
  --remote origin \
  --push
```

Without GitHub CLI, create `clean99/liquid-glass` in the GitHub UI, keep it
empty, then run:

```sh
git remote set-url origin git@github.com:clean99/liquid-glass.git
git push -u origin main
```

Do not initialize the GitHub repository with a README, license, or `.gitignore`;
those files already live in this repository.

## Required Repository Files

- `README.md`
- `LICENSE`
- `ATTRIBUTIONS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`
- `.github/workflows/ci.yml`
- `.github/workflows/visual.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/release.yml`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/dependabot.yml`

`pnpm test:docs` verifies the presence of these files and the key claims they
must contain.

## Release Flow

1. Run `pnpm test:release-readiness` to validate package metadata, workflows,
   docs, registry files, Changesets, and strict release gates.
2. Run `pnpm verify`.
3. Run `pnpm test:kube-reference:strict` for release-candidate visual parity.
4. Confirm `pnpm pack --dry-run` includes only package, docs, examples, registry,
   schema, license, README, and attribution files.
5. Add a changeset for user-visible changes.
6. Merge to `main`.
7. Run the release workflow manually after reviewing the generated version PR.
8. The release workflow runs `pnpm verify`, then uses Changesets to either open
   a version PR or publish the already-versioned package with `pnpm release`.

Publishing requires repository secrets:

- `NPM_TOKEN`: npm automation token with publish access for the package.
- `GITHUB_TOKEN`: provided by GitHub Actions for the version PR.

`package.json` must keep `publishConfig.access` set to `public`; scoped packages
default to private publishing on npm unless this is explicit.

## GitHub Pages

The `pages.yml` workflow installs Chromium, runs `pnpm test:a11y`, builds
Storybook, and deploys it through GitHub Pages Actions. Repository settings must
use "GitHub Actions" as the Pages source.

## Rollback

For documentation or Storybook issues, revert the commit and let Pages redeploy.
For package issues, publish a patch release that reverts the exported API or mark
the bad version as deprecated in npm.
