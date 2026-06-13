# shadcn-style Registry

This repository follows the shadcn/ui registry model without copying shadcn/ui
source code. The registry is a distribution surface for package-backed examples
and component entrypoints.

The registry structure follows the public shadcn registry contract:

- the root `registry.json` is the registry index
- every registry item conforms to `https://ui.shadcn.com/schema/registry-item.json`
- package-backed entries under `registry/components/` import from
  `@clean99/liquid-glass`
- examples are installable files, not a second private implementation

## Install From npm

Most consumers should install the package directly:

```sh
pnpm add @clean99/liquid-glass
```

Then import CSS once:

```tsx
import "@clean99/liquid-glass/styles.css";
```

## Install Registry Examples

After the GitHub repository is public, consumers can install a registry item by
URL with the shadcn CLI:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/liquid-glass.json
```

Single component shims are also published as registry items:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/registry/components/liquid-button.json
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/registry/components/liquid-card.json
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/registry/components/liquid-searchbox.json
```

These items intentionally install imports from `@clean99/liquid-glass`. They do
not vendor the component implementation into the consumer app.

## Maintainer Workflow

```sh
pnpm test:inventory
pnpm registry:build
pnpm test:registry
pnpm test:shadcn-parity
```

`pnpm registry:build` rewrites `registry.json` and
`registry/components/*.json` from `docs/component-inventory.json`.

`pnpm test:registry` fails if the generated registry drifts from the inventory.

`pnpm test:shadcn-parity` checks the local shadcn baseline against the current
public shadcn/ui component index. Use `pnpm shadcn:sync` only after deciding how
the new baseline entries map into this library.

## Design Boundary

The registry is not a shortcut around the package API. Production components
live in `src/`, are exported from `src/index.ts`, tested, documented, and built
into `dist/`.

Registry shims exist for discoverability and copyable integration. If a shim
needs custom behavior, the underlying package component should be fixed first.

## References

- shadcn/ui registry introduction:
  `https://ui.shadcn.com/docs/registry`
- shadcn/ui registry getting started:
  `https://ui.shadcn.com/docs/registry/getting-started`
- shadcn/ui registry item schema:
  `https://ui.shadcn.com/docs/registry/registry-item-json`
