# Component Inventory

The source of truth is `docs/component-inventory.json`.

The inventory tracks component coverage against the shadcn/ui baseline in `docs/shadcn-parity.json`. It is intentionally honest:

- `implemented`: exported, has source, has Storybook coverage, has component test
  coverage, and is checked by `pnpm test:inventory`
- `planned`: part of the product-ready target but not shipped yet
- `research`: requires design or accessibility research before implementation

Run:

```sh
pnpm test:inventory
pnpm test:component-coverage
pnpm registry:build
pnpm test:registry
pnpm test:shadcn-parity
```

This prevents implemented components from drifting out of `src/index.ts`,
source files, Storybook coverage, or the generated registry. The validator does
not accept a story file merely because it exists: the story must reference the
component export it claims to cover, and the source file must reference the same
public export. Every implemented component must also have both generated
`registry/components/*.json` metadata and a package-backed `*.tsx` shim.

`pnpm test:component-coverage` reads the same inventory and verifies that every
implemented public component export is imported and exercised in
`tests/components.test.tsx`. This catches the bad state where a component has
source, a story, and a registry shim, but no component-level behavior check.

`pnpm test:shadcn-parity` fetches `https://ui.shadcn.com/docs/components` and
compares the official component slugs with `docs/shadcn-parity.json` and the
inventory. Use `pnpm shadcn:sync` to update the baseline only after deciding to
implement the newly detected entries.

The same inventory drives the shadcn-style registry. `pnpm registry:build`
generates one package-backed item per implemented component under
`registry/components/` and rewrites the root `registry.json` index. The generated
shim files intentionally import from `@clean99/liquid-glass`; they are registry
entrypoints for package users, not a second copy of the component source.
