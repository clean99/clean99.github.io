# @clean99/liquid-glass

Refractive Liquid Glass components for React, built on `@hashintel/refractive` with accessible fallbacks.

`@clean99/liquid-glass` is a small open-source design system for building Apple-inspired Liquid Glass interfaces on the web. It provides typed React components, CSS tokens, Storybook demos, browser behavior checks, package tests, and conservative fallback materials. The refraction engine is delegated to `@hashintel/refractive`; this project owns the component API, accessibility contract, design tokens, fallback strategy, and integration tests.

The goal is not generic glassmorphism. The library treats Liquid Glass as an optical material with clear foreground content, capped enhanced surfaces, reduced-motion and reduced-transparency support, and browser-specific fallback behavior.

## Installation

```sh
pnpm add @clean99/liquid-glass
```

`@hashintel/refractive` is included as a package dependency. React is a peer dependency:

```sh
pnpm add react react-dom
```

## Quick Start

```tsx
"use client";

import { LiquidButton, LiquidCard, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function Example() {
  return (
    <LiquidProvider defaultMode="auto" maxEnhancedSurfaces={6}>
      <LiquidCard>
        <h2>Frontend Systems</h2>
        <p>Reliable UI architecture with readable Liquid Glass fallbacks.</p>
        <LiquidButton>Read Writing</LiquidButton>
      </LiquidCard>
    </LiquidProvider>
  );
}
```

## Repository Scripts

```sh
pnpm install
pnpm dev
pnpm format
pnpm lint
pnpm typecheck
pnpm test:docs
pnpm test:inventory
pnpm test:component-coverage
pnpm test:registry
pnpm test:shadcn-parity
pnpm test:release-readiness
pnpm test:unit
pnpm test:e2e
pnpm test:storybook
pnpm build
pnpm test:package
pnpm run ci
pnpm verify
```

Storybook runs at `http://localhost:6006`.

## Browser Support

| Browser                   | Default behavior                     | Notes                                                                  |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Chrome / Chromium desktop | Enhanced when capability checks pass | Uses `@hashintel/refractive` through `LiquidSurface` only.             |
| Chrome / Chromium mobile  | Fallback by default                  | Mobile can be forced, but enhanced surfaces are intentionally limited. |
| Safari / iOS Safari       | Fallback or solid                    | WebKit paths are treated as first-class fallback targets.              |
| Firefox                   | Fallback or solid                    | Layout and accessibility must work without SVG backdrop refraction.    |
| Reduced transparency      | Solid                                | Readability wins over visual effect.                                   |
| High contrast             | Higher contrast fallback             | Borders and fill are strengthened through CSS.                         |

## Enhanced, Fallback, Solid, Off

```ts
type LiquidMode = "auto" | "enhanced" | "fallback" | "solid" | "off";
```

- `auto`: conservative default. Enhanced mode is enabled only when runtime checks pass.
- `enhanced`: requests real refraction, but still falls back if unsupported.
- `fallback`: translucent material with blur, saturation, edge, highlight, and shadow.
- `solid`: opaque readable material for reduced transparency and high-risk contexts.
- `off`: no glass treatment beyond structural layout classes.

Users can force a global mode through `LiquidProvider` or `localStorage`:

```ts
localStorage.setItem("clean99-liquid-glass-mode", "fallback");
```

## Next.js Usage

Use components from a client boundary and import CSS once:

```tsx
"use client";

import { LiquidLink, LiquidNav, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function SiteChrome() {
  return (
    <LiquidProvider defaultMode="auto" disableOnMobile>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink href="/">Home</LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
      </LiquidNav>
    </LiquidProvider>
  );
}
```

For static export, avoid Node-only logic in component code. Capability detection runs after hydration and starts from a conservative fallback snapshot.

## Component API

Implemented components:

- `LiquidProvider`
- `LiquidSurface`
- `FallbackGlassSurface`
- `LiquidAccordion`
- `LiquidAlert`
- `LiquidAlertTitle`
- `LiquidAlertDescription`
- `LiquidAlertDialog`
- `LiquidAlertDialogTrigger`
- `LiquidAlertDialogContent`
- `LiquidAlertDialogTitle`
- `LiquidAlertDialogDescription`
- `LiquidAlertDialogCancel`
- `LiquidAlertDialogAction`
- `LiquidAspectRatio`
- `LiquidAvatar`
- `LiquidAvatarImage`
- `LiquidAvatarFallback`
- `LiquidBadge`
- `LiquidBreadcrumb`
- `LiquidButton`
- `LiquidButtonGroup`
- `LiquidCalendar`
- `LiquidCarousel`
- `LiquidCarouselContent`
- `LiquidCarouselItem`
- `LiquidCarouselPrevious`
- `LiquidCarouselNext`
- `LiquidCheckbox`
- `LiquidCollapsible`
- `LiquidCollapsibleTrigger`
- `LiquidCollapsibleContent`
- `LiquidCombobox`
- `LiquidCommand`
- `LiquidCommandInput`
- `LiquidCommandList`
- `LiquidCommandItem`
- `LiquidCommandEmpty`
- `LiquidCommandGroup`
- `LiquidCommandSeparator`
- `LiquidContextMenu`
- `LiquidContextMenuTrigger`
- `LiquidContextMenuContent`
- `LiquidContextMenuItem`
- `LiquidChart`
- `LiquidChartContainer`
- `LiquidChartTooltipContent`
- `LiquidChartLegendContent`
- `LiquidDataTable`
- `LiquidDatePicker`
- `LiquidDirection`
- `LiquidDrawer`
- `LiquidDrawerTrigger`
- `LiquidDrawerContent`
- `LiquidDrawerTitle`
- `LiquidDrawerDescription`
- `LiquidDrawerClose`
- `LiquidDropdownMenu`
- `LiquidDropdownMenuTrigger`
- `LiquidDropdownMenuContent`
- `LiquidDropdownMenuItem`
- `LiquidEmpty`
- `LiquidIconButton`
- `LiquidDialog`
- `LiquidDialogTrigger`
- `LiquidDialogContent`
- `LiquidDialogTitle`
- `LiquidDialogDescription`
- `LiquidDialogClose`
- `LiquidField`
- `LiquidLabel`
- `LiquidInput`
- `LiquidInputGroup`
- `LiquidInputOtp`
- `LiquidTextarea`
- `LiquidFieldDescription`
- `LiquidFieldError`
- `LiquidHoverCard`
- `LiquidHoverCardTrigger`
- `LiquidHoverCardContent`
- `LiquidItem`
- `LiquidKbd`
- `LiquidLens`
- `LiquidMenubar`
- `LiquidSearchBox`
- `LiquidNativeSelect`
- `LiquidSelect`
- `LiquidPagination`
- `LiquidPaginationList`
- `LiquidPaginationItem`
- `LiquidPaginationLink`
- `LiquidPaginationPrevious`
- `LiquidPaginationNext`
- `LiquidProgress`
- `LiquidRadioGroup`
- `LiquidResizable`
- `LiquidResizablePanelGroup`
- `LiquidResizablePanel`
- `LiquidResizableHandle`
- `LiquidScrollArea`
- `LiquidPopover`
- `LiquidPopoverTrigger`
- `LiquidPopoverContent`
- `LiquidPopoverClose`
- `LiquidSeparator`
- `LiquidSheet`
- `LiquidSheetTrigger`
- `LiquidSheetContent`
- `LiquidSheetTitle`
- `LiquidSheetDescription`
- `LiquidSheetClose`
- `LiquidSidebar`
- `LiquidSidebarProvider`
- `LiquidSidebarTrigger`
- `LiquidSidebarInset`
- `LiquidSidebarMenu`
- `LiquidSidebarMenuButton`
- `LiquidSkeleton`
- `LiquidSpinner`
- `LiquidToast`
- `LiquidToastClose`
- `LiquidToaster`
- `LiquidSonner`
- `LiquidSwitch`
- `LiquidSlider`
- `LiquidMusicPlayerBar`
- `LiquidTable`
- `LiquidTableHeader`
- `LiquidTableBody`
- `LiquidTableRow`
- `LiquidTableHead`
- `LiquidTableCell`
- `LiquidCard`
- `LiquidPill`
- `LiquidToggle`
- `LiquidNav`
- `LiquidSegmentedControl`
- `LiquidTabs`
- `LiquidTooltip`
- `LiquidTooltipTrigger`
- `LiquidTooltipContent`
- `LiquidToolbar`
- `LiquidLink`
- `LiquidTypography`

Coverage against shadcn/ui-style primitives is tracked in `docs/component-inventory.json`. Implemented rows are verified by `pnpm test:inventory`.

The current shadcn/ui component baseline is stored in `docs/shadcn-parity.json`.
`pnpm test:inventory` fails if the inventory misses a baseline entry.
`pnpm test:shadcn-parity` fetches the official shadcn/ui component index and
fails when the local baseline falls behind. Run `pnpm shadcn:sync` only when you
are ready to update the baseline and implement the newly detected components.

`LiquidSurface` is the only component abstraction that selects the render engine. Higher-level components compose it instead of importing `@hashintel/refractive` directly.

Kube-aligned primitives:

- `LiquidLens`: transparent capsule lens tuned for high-contrast refraction targets.
- `LiquidSearchBox`: native search input wrapped in a refractive pill surface.
- `LiquidSwitch`: semantic switch with refraction only on the thumb.
- `LiquidSlider`: native range input with refraction only on the thumb.
- `LiquidMusicPlayerBar`: refractive player plate with foreground metadata outside the displacement layer.

## Design Tokens

CSS token exports:

```css
@import "@clean99/liquid-glass/tokens.css";
@import "@clean99/liquid-glass/styles.css";
```

Core tokens include `--lg-bg`, `--lg-bg-2`, `--lg-text`, `--lg-text-muted`, `--lg-glass-fill`, `--lg-glass-border`, `--lg-glass-highlight`, `--lg-glass-edge`, `--lg-glass-shadow`, `--lg-accent`, `--lg-accent-2`, radius tokens, and `--lg-ease-apple`.

The font stack intentionally uses system fonts:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial,
"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

## Theming

The package supports system color scheme and explicit theme scopes:

```tsx
<div data-lg-theme="dark">
  <LiquidButton>Dark material</LiquidButton>
</div>
```

## Accessibility

- Interactive components use native buttons or anchors by default.
- Dialog uses the native `<dialog>` element, labelled content, and native cancel/close events.
- AlertDialog reuses dialog plumbing but exposes `role="alertdialog"` and disables backdrop dismissal by default.
- Drawer reuses sheet semantics and defaults to a bottom-mounted surface for mobile ergonomics.
- Field controls use native `input`, `textarea`, `label`, and alert semantics.
- Select is a styled native `<select>` entry point; Combobox composes Popover and Command for searchable listbox selection.
- Command uses a registry-backed item model, `searchbox` / `listbox` / `option` semantics, Arrow/Home/End navigation, Enter selection, disabled item skipping, and empty-state announcements.
- InputOtp uses real text inputs with paste distribution, arrow-key navigation, hidden form value support, and forwarded group refs.
- `LiquidToggle` uses `aria-pressed`.
- `LiquidNav` and `LiquidToolbar` require accessible labels.
- `LiquidSegmentedControl` uses `radiogroup` / `radio`.
- `LiquidTabs` uses `tablist` / `tab` / `tabpanel`, roving tab index, Home/End, and arrow-key navigation.
- `LiquidAccordion` uses native trigger buttons, `aria-expanded`, labelled region panels, and Arrow/Home/End focus movement.
- Menu primitives use `menu` / `menuitem`, Escape dismissal, Home/End, arrow-key navigation, disabled item skipping, and context-menu keyboard fallback through Shift+F10.
- Toast primitives use `status` for passive updates, `alert` for warning/danger variants, and expose dismiss controls with readable labels.
- Resizable primitives wrap `react-resizable-panels`, preserving keyboard-accessible separators and panel constraints while applying Liquid Glass handle styling.
- Calendar wraps React DayPicker for localized date grids, selection modes, keyboard focus, and ARIA semantics while applying Liquid Glass shell styling.
- Carousel wraps Embla Carousel for drag physics, snapping, loop behavior, orientation, and API events while exposing labelled regions, slide groups, and native previous/next buttons.
- DataTable wraps TanStack Table for typed sorting, filtering, pagination, and `aria-sort` while keeping rows and cells as clear semantic table content.
- Chart wraps Recharts composition, scoped color variables, clear tooltip/legend content, and accessible chart output without refracting dense data labels.
- Sidebar uses a provider-driven composition model with landmark, list, active link, trigger, and rail semantics while keeping dense navigation text outside enhanced refraction.
- Disabled controls suppress interaction and expose disabled state.
- Focus-visible deepens and scales the material instead of drawing hard white/black rings.
- Reduced transparency resolves to solid mode.

## Performance

- Enhanced refraction is opt-in through runtime capability checks.
- `maxEnhancedSurfaces` limits expensive surfaces.
- Mobile enhanced mode is disabled by default.
- Foreground content is not placed inside a distorted filter layer.
- The package is tree-shakable and exports CSS separately.
- Avoid enhanced mode for article bodies, long lists, code blocks, and tables.
- Calendar never creates enhanced refraction per date cell; date buttons stay clear and cheap to render.
- DataTable never creates enhanced refraction per row or cell; only toolbar controls may use material styling.
- Carousel delegates drag physics to Embla and applies material styling to the frame and controls instead of creating enhanced refraction per slide.

## Testing

The repository includes unit, component, SSR, CSS contract, Storybook behavior, real drag animation, kube-reference, and package output checks.

```sh
pnpm lint
pnpm typecheck
pnpm test:docs
pnpm test:inventory
pnpm test:component-coverage
pnpm test:release-readiness
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
pnpm test:storybook
pnpm test:kube-reference
pnpm test:kube-reference:strict
pnpm build
pnpm test:package
pnpm verify
```

`test:storybook` builds Storybook, opens stories in Chromium, and checks
enhanced-mode rendering contracts such as resolved mode, SVG filter use, radius,
dimensions, and material values.

`test:e2e` builds Storybook and runs real browser interaction checks for
focus/hover/active behavior, reduced motion, and pointer-driven drag frames for
the draggable lens board.

`test:a11y` builds static Storybook and runs `@axe-core/playwright` against
representative component stories. CI fails on critical or serious violations,
and writes the JSON summary under `test-results/a11y`.

`test:kube-reference` captures the public Kube reference and local Storybook
stories. `test:kube-reference:strict` additionally turns pressed and dragged
lens pixels into hard gates through `KUBE_STRICT_INTERACTIVE=1`; that command is
the target for release-candidate visual parity.

`pnpm verify` is the release gate. It runs formatting, linting, typechecking,
docs and inventory validation, unit/component/physics checks, Storybook
behavior checks, build/package checks, visual regression, Kube reference
strict comparison, and `pnpm pack --dry-run`.

## shadcn-style Registry

This repository includes a root `registry.json`, a flat `liquid-glass.json`, and a package-local `registry/liquid-glass.json`. It is intentionally source-readable: consumers can inspect the components, tokens, and examples without depending on a private monorepo layout.

After the GitHub repository is public, registry examples can be installed with:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/liquid-glass.json
```

Single package-backed component shims can be installed the same way:

```sh
npx shadcn@latest add https://raw.githubusercontent.com/clean99/liquid-glass/main/registry/components/liquid-button.json
```

The registry also includes generated package-backed entries under
`registry/components/`, one per implemented component. Run `pnpm registry:build`
after inventory changes and `pnpm test:registry` before review. The gate fails if
the root registry or component entries drift from `docs/component-inventory.json`.

## Release

The package uses Changesets. For user-visible changes, run:

```sh
pnpm changeset
```

The GitHub release workflow runs `pnpm verify`, then uses Changesets to open a
version PR or publish the package with `pnpm release`. npm publishing requires an
`NPM_TOKEN` repository secret, and `publishConfig.access` is pinned to `public`
so the scoped package cannot accidentally publish as private.

## Documentation Map

- `docs/api-overview.md`: public API shape and mode model.
- `docs/calendar-architecture.md`: DayPicker boundary, date-grid accessibility, and test contract.
- `docs/carousel-architecture.md`: carousel composition, Embla boundary, accessibility, and test contract.
- `docs/component-inventory.md`: implemented and planned component inventory.
- `docs/date-picker-architecture.md`: DatePicker composition boundary, local date semantics, and accessibility contract.
- `docs/github-repository-settings.md`: GitHub repository, Pages, secrets, and branch protection setup.
- `docs/optics-architecture.md`: physical invariants and engine boundaries.
- `docs/reference-research.md`: Kube, rdev, and registry research notes.
- `docs/shadcn-registry.md`: shadcn-style registry distribution model and commands.
- `docs/testing.md`: local and CI validation strategy.
- `docs/open-source-release.md`: release, Pages, and rollback checklist.

## Known Limitations

- `asChild` is accepted on `LiquidSurface` but not implemented yet.
- True refraction is currently limited to Chrome/Chromium capability checks.
- Safari and Firefox are first-class fallback targets, not enhanced targets.
- The experimental two-pass reference lens engine is shipped for research but the default enhanced path remains `@hashintel/refractive`.

## Roadmap

- Publish the first npm version after final API review and repository creation.
- Add copyable shadcn registry items per component.
- Add more navigation and disclosure primitives.
- Add build-time generated filter presets.
- Track Safari and Firefox support as platform capabilities evolve.

## License and Attribution

MIT. See `LICENSE` and `ATTRIBUTIONS.md`.
