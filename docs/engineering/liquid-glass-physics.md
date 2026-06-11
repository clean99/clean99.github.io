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
