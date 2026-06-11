# Liquid Glass Physics Notes

This project treats Liquid Glass as an optical component, not as a translucent card skin.

## Rendering Model

The component has three separate layers:

1. Background content
   - Grid lines, imagery, text, and color bands live behind the glass.
   - They are test fixtures or page content, not the material texture.
2. Optical surface
   - Enhanced mode uses `@hashintel/refractive` to generate an SVG displacement map and apply it through `backdrop-filter: url(...)`.
   - CSS may add tint, shadow, and edge highlights, but it must not invent crosshatch texture.
3. Foreground content
   - Labels, icons, and article text stay outside the displacement layer.
   - Text can use contrast shadows on dark or photographic backgrounds, but it must not be refracted.

If a component creates diagonal or crossing marks that are not present in the background, the material model is wrong.

## Physical Checks

Enhanced components must satisfy these checks in Chromium:

- `data-liquid-mode="enhanced"` only when capability checks pass.
- `backdrop-filter` contains `url(...)`, not only `blur(...)`.
- A high-contrast line behind a lens bends near curved edges.
- The central content layer remains readable and geometrically stable.
- Large text containers do not use strong refraction.
- Nav/tab foreground items do not each instantiate expensive filters. The plate refracts; labels stay clear.

The package now has a dedicated physics contract test:

```bash
pnpm --filter @clean99/liquid-glass test:physics
```

That test guards the non-negotiable invariants:

- Default refraction settings stay in a plausible optical range:
  - `refractiveIndex` stays between `1.3` and `1.6`.
  - `blur` stays at or below `1px`, because this is a lens, not frosted glass.
  - `glassThickness`, `bezelWidth`, and `specularOpacity` increase monotonically from `subtle` to `strong`.
  - `specularOpacity` stays at or below `0.6`, so highlights do not become painted plastic.
- SVG filter radius is clamped to the bounded displacement range.
- `.lg-surface__content` never gets `filter` or `backdrop-filter`.
- Component CSS and shared Storybook fixtures do not use `repeating-linear-gradient` to fake a material texture.
- Nav and toolbar item filters stay disabled; only the shared plate owns refraction.

This is intentionally a unit-level gate. Visual tests prove that pixels look right; the physics test proves that future CSS/API changes do not violate the rendering model before we even open a browser.

Fallback components must satisfy these checks in Safari-like and Firefox-like modes:

- No SVG backdrop filter is required.
- Text remains readable.
- Layout dimensions match enhanced mode closely enough to avoid jumps.
- Reduced transparency resolves to solid material.

## Kube Reference Targets

The public kube.io Liquid Glass article is used as a visual reference for component behavior and geometry. We do not copy article prose or third-party image assets into the package.

Current component targets:

| Component | Target Geometry | Enhanced Filter Owner |
| --- | --- | --- |
| `LiquidLens` | `210 x 120`, `75px` radius | lens surface |
| `LiquidSearchBox` | `336 x 45`, `28px` radius | searchbox plate |
| `LiquidSwitch` | `160 x 67` track, visual `95 x 60` thumb | thumb only |
| `LiquidSlider` | `330 x 14` track, visual `54 x 36` thumb | thumb only |
| `LiquidMusicPlayerBar` | `640 x 63`, `34px` radius | player plate |
| `LiquidNav` | one continuous plate | nav plate only |

## Design Rules

- Do not put article bodies, tables, code blocks, or long lists into strong refraction.
- Do not let every item in a dense list allocate an enhanced filter.
- Use white text plus a subtle dark shadow only on dark, photographic, or high-variance backgrounds.
- Use dark text with little or no shadow on light backgrounds.
- Prefer one refractive container plus clear foreground controls for nav, toolbar, and tabs.

## Visual Gate Plan

The reference-clone gate should compare:

1. A captured reference screenshot from the target public page.
2. A local Storybook or docs clone screenshot built from `@clean99/liquid-glass`.
3. A deterministic pixel diff with fixed viewport, fonts, disabled animation, and frozen dynamic state.

The gate should fail on:

- Missing `url(...)` filters in Chromium enhanced mode.
- Foreground text inside the displacement layer.
- Unexpected crosshatch material texture.
- Layout geometry drift beyond the documented component target.

## Lessons From the Failed Iterations

The ugly versions failed for mundane reasons:

- The nav looked like plastic because every tab created its own mini glass object. The fix was to make the nav plate refractive and make child items clear foreground controls.
- The search icon looked wrong because it was treated as generic text/icon content. The fix was a fixed-size SVG with line caps and foreground-only rendering.
- The diagonal/crossed texture was not a refraction artifact. It came from using repeating diagonal fixture backgrounds. Real refraction bends existing pixels; it does not invent a woven pattern.
- Text shadow is context-dependent. Dark, high-variance backgrounds can use white text with a short dark shadow. Light glass should usually use dark text with little or no shadow.

The rule of thumb: if a component still looks interesting after the background is replaced with a plain grid, the glass is probably doing the work. If it only works on a busy pattern, the fixture is carrying the design.
