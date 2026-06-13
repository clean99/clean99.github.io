# Testing

Core checks:

```sh
pnpm lint
pnpm typecheck
pnpm test:docs
pnpm test:inventory
pnpm test:unit
pnpm test:a11y
pnpm test:e2e
pnpm test:storybook
pnpm test:kube-reference:strict
pnpm build
pnpm test:package
```

Release check:

```sh
pnpm verify
```

`pnpm verify` runs `pnpm run ci`, visual regression, Kube reference comparison,
and `pnpm pack --dry-run`. Use it before versioning, tagging, or publishing the
package.

Optical checks:

```sh
pnpm test:physics
pnpm test:kube-reference
pnpm test:kube-reference:strict
```

Visual checks:

```sh
pnpm test:visual
pnpm test:visual:update
```

`pnpm test:storybook` builds static Storybook and checks the enhanced-mode
contract for representative stories: resolved mode, SVG `url(...)` filter use,
radius, dimensions, and background material values.

`pnpm test:e2e` builds static Storybook, opens it in Chromium, and performs real
pointer actions for focus, hover, active press, and the draggable lens board. The
test uses real pointer actions instead of synthetic DOM events, records
`requestAnimationFrame` samples, and asserts pressed, dragging, and released
animation states.

`pnpm test:a11y` builds static Storybook, opens representative component stories in
Chromium, runs `@axe-core/playwright`, writes `test-results/a11y/storybook-a11y-summary.json`,
and fails on any `critical` or `serious` accessibility violation. This is the CI
gate; the Storybook addon is useful while developing, but it is not treated as
the only source of truth.

`pnpm test:kube-reference` captures the public Kube reference page and matching
Storybook stories. It includes static component screenshots plus
`pressed and dragged magnifying-glass screenshots` produced by real pointer input.
For the magnifying-glass target, the script also asserts the SVG filter contract:
the candidate must expose the same two-pass displacement pipeline, image count,
map count, and displacement scales before pixels are compared. This contract is
checked for idle, pressed, and dragged magnifying-glass captures.
The interactive lens screenshots and pointer action metrics are both hard
assertions, so press and drag cannot silently stop working or drift visually.
`pnpm test:kube-reference:strict` sets `KUBE_STRICT_INTERACTIVE=1` and preserves
the release-candidate target for the Kube replica work. The current measured gaps
and threshold-tightening plan are tracked in `docs/kube-parity-gate.md`.
Those hard metrics include the Kube-derived water-drop rule that press expands
both axes, while drag is taller and narrower than press. The comparison script
also compares candidate action metrics against the live Kube target with explicit
per-metric tolerances.
The script waits for observable pointer-action geometry before capture instead
of trusting a fixed timeout. This avoids a bad flaky pattern: pressing the real
reference page during hydration or animation startup and measuring the resting
box as if the interaction had failed.

`pnpm test:docs` verifies the open-source repository contract: required GitHub
templates, registry files, docs, attributions, testing notes, and package scripts.

`pnpm test:package` builds the package and verifies the publish contract:
CommonJS and ESM entries, type declarations, CSS exports, `sideEffects`, npm
publish access, package file whitelist, React peer dependencies, the
`@hashintel/refractive` dependency, and the generated CSS/type outputs.

The physical unit tests intentionally exercise pure functions before UI:

- `tests/displacement-map.test.ts` samples generated RGBA displacement and
  specular maps so capsule edge direction, neutral center behavior, and pixel
  ratio clamping stay deterministic. It also locks the reference lens map
  dimensions to `210x150` for magnification and `420x300` for displacement and
  specular maps, matching the live reference assets.
- `tests/edge-mask.test.ts` verifies edge-only refraction and clean-center
  recovery.
- `tests/elasticity.test.ts` verifies bounded pointer-driven scaling and
  translation.
- `tests/refraction-physics.test.ts` verifies optical ranges, filter geometry,
  foreground layering, focus material behavior, and Kube reference pipeline
  assumptions.
