# Component Inventory

The source of truth is `docs/component-inventory.json`.

The inventory tracks component coverage against the shadcn/ui baseline in `docs/shadcn-parity.json`. It is intentionally honest:

- `implemented`: exported, has source, has Storybook coverage, and is checked by `pnpm test:inventory`
- `planned`: part of the product-ready target but not shipped yet
- `research`: requires design or accessibility research before implementation

Run:

```sh
pnpm test:inventory
pnpm registry:build
pnpm test:registry
pnpm test:shadcn-parity
```

This prevents implemented components from drifting out of `src/index.ts`, source files, or Storybook coverage, and prevents the parity baseline from losing official shadcn/ui component entries.

`pnpm test:shadcn-parity` fetches `https://ui.shadcn.com/docs/components` and
compares the official component slugs with `docs/shadcn-parity.json` and the
inventory. Use `pnpm shadcn:sync` to update the baseline only after deciding to
implement the newly detected entries.

The same inventory drives the shadcn-style registry. `pnpm registry:build`
generates one package-backed item per implemented component under
`registry/components/` and rewrites the root `registry.json` index. The generated
shim files intentionally import from `@clean99/liquid-glass`; they are registry
entrypoints for package users, not a second copy of the component source.
