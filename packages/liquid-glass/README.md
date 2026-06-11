# @clean99/liquid-glass

Refractive Liquid Glass components for React, built on `@hashintel/refractive` with accessible fallbacks.

This package provides a small design-system layer for Apple-inspired Liquid Glass UI. It does not copy the kube.io demo or reimplement refraction from scratch. Real SVG/backdrop refraction is delegated to `@hashintel/refractive`; this package owns the React component API, accessibility, fallback materials, tokens, and testable integration rules.

## Installation

```sh
pnpm add @clean99/liquid-glass @hashintel/refractive
```

The package is private inside this monorepo until publication is intentionally handled. The package name is kept stable so the blog can consume it exactly like an external dependency.

## Quick Start

```tsx
import { LiquidButton, LiquidCard, LiquidLens, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function Example() {
  return (
    <LiquidProvider defaultMode="auto" maxEnhancedSurfaces={6}>
      <LiquidCard>
        <h2>Frontend Systems</h2>
        <p>Reliable UI architecture with a readable fallback material.</p>
        <LiquidLens />
        <LiquidButton>Read Writing</LiquidButton>
      </LiquidCard>
    </LiquidProvider>
  );
}
```

## Browser Support

| Browser | Default behavior | Notes |
| --- | --- | --- |
| Chrome / Chromium desktop | Enhanced when capability checks pass | Uses `@hashintel/refractive` through `LiquidSurface` only. |
| Chrome / Chromium mobile | Fallback by default | Mobile can be forced, but enhanced surfaces are intentionally limited. |
| Safari / iOS Safari | Fallback or solid | iOS browsers run through WebKit, so real refraction is not enabled. |
| Firefox | Fallback or solid | Layout and accessibility must work without SVG backdrop refraction. |
| Reduced transparency | Solid | Readability wins over visual effect. |
| High contrast | Higher contrast fallback | Borders and fill are strengthened through CSS. |

## Enhanced, Fallback, Solid, Off

```ts
type LiquidMode = "auto" | "enhanced" | "fallback" | "solid" | "off";
```

- `auto`: conservative default. Enhanced is only used when runtime checks pass.
- `enhanced`: asks for real refraction, but still falls back if unsupported.
- `fallback`: translucent material with blur, saturation, edge, highlight, and shadow.
- `solid`: opaque readable material for reduced transparency and high-risk contexts.
- `off`: no glass treatment beyond structural layout classes.

Users can force a global mode through `LiquidProvider` or `localStorage`:

```ts
localStorage.setItem("clean99-liquid-glass-mode", "fallback");
```

## Next.js Usage

Use the components from a client boundary and import the CSS once:

```tsx
"use client";

import { LiquidNav, LiquidLink, LiquidProvider } from "@clean99/liquid-glass";
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
- `LiquidButton`
- `LiquidIconButton`
- `LiquidLens`
- `LiquidSearchBox`
- `LiquidCard`
- `LiquidPill`
- `LiquidToggle`
- `LiquidNav`
- `LiquidSegmentedControl`
- `LiquidToolbar`
- `LiquidLink`

`LiquidSurface` is the only component abstraction that selects the render engine. All higher-level components compose it instead of importing `@hashintel/refractive` directly.

Kube-aligned primitives:

- `LiquidLens` is a decorative capsule lens tuned for transparent refraction over high-contrast content. It defaults to a 210x120 lens, 75px filter radius, transparent fill, and light inset shadows.
- `LiquidSearchBox` is a native `<input type="search">` wrapped in a refractive pill surface. It follows the kube searchbox dimensions and keeps the editable text outside the displacement layer.

## Design Tokens

CSS token exports:

```css
@import "@clean99/liquid-glass/tokens.css";
@import "@clean99/liquid-glass/styles.css";
```

Core tokens include `--lg-bg`, `--lg-text`, `--lg-glass-fill`, `--lg-glass-border`, `--lg-glass-shadow`, `--lg-accent`, radius tokens, and `--lg-ease-apple`.

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
- `LiquidToggle` uses `aria-pressed`.
- `LiquidNav` and `LiquidToolbar` require accessible labels.
- `LiquidSegmentedControl` uses `radiogroup` / `radio`.
- Disabled controls suppress interaction and expose disabled state.
- Focus-visible styles are part of the CSS contract.
- Reduced transparency resolves to solid mode.

## Performance

- Enhanced refraction is opt-in through runtime capability checks.
- `maxEnhancedSurfaces` limits expensive surfaces.
- Mobile enhanced mode is disabled by default.
- Content is not placed inside a distorted filter layer.
- The package is tree-shakable and exports CSS separately.
- Avoid applying enhanced mode to article bodies, long lists, code blocks, and tables.

## Testing

The package has unit, component, SSR, CSS contract, and package output tests:

```sh
pnpm --filter @clean99/liquid-glass lint
pnpm --filter @clean99/liquid-glass typecheck
pnpm --filter @clean99/liquid-glass test
pnpm --filter @clean99/liquid-glass build
pnpm --filter @clean99/liquid-glass test:package
```

Storybook lives in `apps/docs` and loads stories from `packages/liquid-glass/stories`.

## Known Limitations

- `asChild` is accepted on `LiquidSurface` but not implemented yet.
- True refraction is currently limited to Chrome/Chromium capability checks.
- Safari and Firefox are first-class fallback targets, not enhanced targets.
- Storybook visual snapshots are added at the monorepo test layer.

## Roadmap

- Add shadcn-style copyable component examples.
- Add more navigation and disclosure primitives.
- Add build-time generated filter presets.
- Track Safari and Firefox support as backdrop filter capabilities evolve.
- Publish to npm after the blog migration proves the API in real usage.

## License and Attribution

MIT. See `LICENSE` and `ATTRIBUTIONS.md`.
