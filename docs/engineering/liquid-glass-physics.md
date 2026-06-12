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
- Focus is a material response. The focus rules must deepen the glass fill/shadow and scale the control, not add system-blue rings or high-contrast white/black outline rings.
- Pointer elasticity is modeled as data first. `resolveLiquidElasticResponse()` must rest outside the activation zone, fade from the edge, respect reduced motion, and cap scale/translation before any component uses it.

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

Current `pnpm --filter docs test:kube-reference` thresholds:

| Target | Compared Region | Current Threshold |
| --- | --- | --- |
| `magnifying-glass` | Lens optical crop, excluding article image and paragraphs | `0.30` |
| `searchbox` | Full component demo frame | `0.03` |
| `switch` | Full component demo frame | `0.03` |
| `slider` | Full component demo frame | `0.03` |

The lens uses a crop because the reference demo contains article-specific prose and a third-party photo. Those are not component-library acceptance criteria. The crop keeps the test focused on the optical shell, high-contrast text bend, edge highlight, and displacement behavior.

The searchbox, switch, and slider compare the full demo frame because their reference areas contain only deterministic fixture content and the component itself. Matching the reference `24px` grid and radial background reduced their pixel diff from roughly `15%` to roughly `1.4-1.7%`.

The separate Storybook behavior gate lives in `apps/docs/scripts/verify-liquid-behavior.mjs`. It validates the Apple-like interaction contract from built Storybook iframes: focus scale, material deepening, no hard white/black/system-blue rings, increased shadow layers, hover material alpha, active scale relaxation, and reduced-motion suppression.

The kube reference gate also writes `test-results/kube-reference/magnifying-glass-filter-contract.json`. That artifact records target and candidate geometry, computed `backdrop-filter`, SVG filter primitive counts, displacement scales, and filter image sources. It keeps the next 1:1 work honest: if the candidate differs because the target uses a two-pass displacement/specular filter and the local component uses a one-pass `@hashintel/refractive` filter, that is an engine-level gap, not a CSS-shadow tuning problem.

The gate loads the public reference page with `domcontentloaded`, not `networkidle`. The comparison only needs the target demo sections; waiting for every network request on a public page made the test flaky and produced false failures unrelated to component pixels.

The `rdev/liquid-glass-react` review lives in `docs/engineering/rdev-liquid-glass-react-review.md`. The adopted part is the edge-distance pointer elasticity idea, expressed as our own pure model in `packages/liquid-glass/src/utils/elasticity.ts`. The rejected parts are direct engine replacement, default runtime shader generation, and always-on pointer tracking.

The magnifying-glass Kube fixture uses measured target geometry, not guessed layout: 706px by 460px frame, label at y=46, title at y=81, and lens at y=36. A failed iteration moved the lens upward by eye and regressed the crop diff from 0.3123 to 0.4807. The fixture correction lowered the diff to 0.2897, so the gate was tightened from 0.33 to 0.30. The lens then adopted an explicit overscan optical radius: a visible 210 by 120 capsule keeps the target 75px filter radius instead of clamping to 60px. That lowered the crop diff to 0.2854 and aligned the computed CSS radius with kube.

The next useful adjustment was optical thickness. With `@hashintel/refractive`, `glassThickness: 88`, `bezelWidth: 18`, and `refractiveIndex: 1.5` produce a displacement scale of roughly `98.247`, matching the kube target's stronger displacement pass. That lowered the lens crop diff to 0.2826. A tempting nested two-surface experiment tried to model kube's weaker first pass (`glassThickness: 21.5`, `bezelWidth: 0`) outside the stronger 88-thickness pass. It was rejected because the screenshot diff regressed to 0.3086. The lesson is simple: DOM-stacking two backdrop filters is not equivalent to kube's filter graph. The remaining gap is engine-level filter composition, not CSS decoration or extra wrapper elements.

This is still not 1:1. The gate stays honest by accepting only measured improvement; more complex optical code must prove itself against the same pixel threshold before it lands.

`LiquidSurface` keeps the default physical radius cap. `LiquidLens` is the exception because small optical lens components can use a larger displacement map than their visible height. The exception is explicit through `allowOversizedRefractionRadius`; it must not be enabled for ordinary cards, fields, nav items, article containers, or long text surfaces.

The first overscan implementation was still wrong. It passed `radius: 75` into `@hashintel/refractive` while the measured lens box stayed `210 x 120`. The underlying engine builds rounded-rectangle filters from nine image slices where `cornerWidth = max(radius, bezelWidth)`. That made `cornerWidth * 2 = 150` exceed the 120px measured height, so the top and bottom slices overlapped. The visible result was an impossible internal rectangle/cross-line artifact: a real convex glass capsule can bend grid lines, but it should not invent hard seams inside the clear aperture.

The current fix keeps the visible lens at `210 x 120` by rendering an authored `210 x 150` optical box and scaling it with `scaleY(0.8)`. `ResizeObserver` still gives `@hashintel/refractive` the 150px layout height, which lets a 75px radius map fit without overlapping slices. The physics test now captures this invariant with `resolveFilterMapGeometry`: `210 x 150 / radius 75` is valid, while `210 x 120 / radius 75` is flagged as overlapping.

The next layer is now modeled as pure math in `src/utils/optics.ts` and `src/utils/lens-pipeline.ts`. `estimateMaximumDisplacement` samples the convex-squircle surface, applies the same orthogonal-ray Snell simplification described in the kube article, and returns the SVG `feDisplacementMap` scale. The reference lens pipeline has two stages: a `21.5px` thickness / `0px` bezel magnification pass that resolves to roughly `24px`, then the existing `88px` thickness / `18px` bezel displacement pass that resolves to `98.247133px`. This proves the next visual gap is a real two-pass filter-composition gap, not an arbitrary CSS tuning problem.

`LensReferenceEngine` is an experimental implementation of that two-pass filter contract. It now matches the kube primitive shape: three `feImage` inputs, two `feDisplacementMap` passes, a saturation pass, specular compositing, and the same displacement scales. It is intentionally opt-in through `LiquidLens engine="reference"` because the generated map pixels still miss the kube visual gate (`0.3022` versus the current `0.30` threshold in the first trial). The stable `LiquidLens` default remains `@hashintel/refractive` until the generated vector field beats the gate.

## Lessons From the Failed Iterations

The ugly versions failed for mundane reasons:

- The nav looked like plastic because every tab created its own mini glass object. The fix was to make the nav plate refractive and make child items clear foreground controls.
- The search icon looked wrong because it was treated as generic text/icon content. The fix was a fixed-size SVG with line caps and foreground-only rendering.
- The diagonal/crossed texture was not a refraction artifact. It came from using repeating diagonal fixture backgrounds. Real refraction bends existing pixels; it does not invent a woven pattern.
- Text shadow is context-dependent. Dark, high-variance backgrounds can use white text with a short dark shadow. Light glass should usually use dark text with little or no shadow.

The rule of thumb: if a component still looks interesting after the background is replaced with a plain grid, the glass is probably doing the work. If it only works on a busy pattern, the fixture is carrying the design.

## 2026-06-12 Material Tuning Pass

The nav and tabs needed a material fix, not another decorative layer.

What changed:

- `LiquidNav`, `LiquidToolbar`, and `LiquidTabs` now bias toward one continuous refractive plate. Child controls stay as clear foreground hit targets and do not allocate their own enhanced filters.
- Dark enhanced controls use near-white foreground text with a short dark shadow. This matches the high-variance background use case without putting text inside the displacement layer.
- Light enhanced controls keep dark text and lighter shadows. A universal white-text rule is wrong on light glass because it destroys contrast and makes the control look painted.
- `LiquidSearchBox` now uses a smaller, fixed `20x20` SVG magnifier with round caps and non-scaling stroke. The previous icon read as a generic search glyph rather than a precise foreground SF-style symbol.
- Shared Storybook fixtures moved diagonal/color bands below the control area. A lens can bend a line that passes underneath it, but a busy diagonal fixture crossing every pill makes the result look like crosshatch texture.

Additional gate coverage:

- `verify-enhanced-storybook.mjs` now checks `LiquidNav` and `LiquidTabs` in addition to the kube reference primitives.
- The gate asserts that these surfaces are really enhanced, that `backdrop-filter` contains `url(...)`, and that their measured geometry stays stable.

Manual Chromium checks from Storybook:

| Story | Selector | Mode | Filter |
| --- | --- | --- | --- |
| `liquid-glass-liquidnav--apple-like-tabs` | `.lg-nav__surface` | `enhanced` | `url("#...")` |
| `liquid-glass-liquidtabs--dense-blog-example` | `.lg-tabs__list` | `enhanced` | `url("#...")` |
| `liquid-glass-liquidsearchbox--kube-reference` | `.lg-searchbox` | `enhanced` | `url("#...")` |

## 2026-06-12 Search Focus Measurement

The kube searchbox focus behavior is geometric and material-based:

- The authored layout is `420 x 56`.
- Idle visual size is produced by `transform: scale(0.8)`, yielding roughly `336 x 45`.
- Focus returns the control to `scale(1)`, so the visual width grows by at least `1.2x`.
- Focus material deepens into a darker frosted capsule. It must not use a hard white, black, or system-blue focus ring.
- Focus has a real transform transition; the behavior gate asserts `transition-property` includes `transform` and that duration is non-zero.
- Reduced motion removes the scale transition while preserving the material-deepening response.

`LiquidSearchBox` passes `opticalBounds="layout"` into `LiquidSurface`. That keeps the refraction radius based on the authored `420 x 56` capsule instead of the transformed idle visual bounds. The default for other surfaces remains `opticalBounds="visual"` because most controls should use their measured visual geometry.

## rdev/liquid-glass-react Audit

The `rdev/liquid-glass-react` package is MIT licensed and is useful as a reference implementation, but it is not a drop-in replacement for this project.

Useful ideas:

- It treats displacement as an edge-heavy optical field, not a uniform frosted blur.
- It separates the warped backdrop layer from sharp foreground content.
- It models chromatic aberration by displacing RGB channels separately near the edge.
- It exposes interaction elasticity as a first-class parameter.

Reasons not to fork it directly now:

- This project already selected `@hashintel/refractive` as the real refraction engine. Replacing it would invalidate the ADR and duplicate a hard browser-compatibility problem.
- The package performs its own SVG filter and shader-map work inside the component. That is useful for a single effect, but it mixes engine concerns with the public React component API.
- The implementation uses direct browser globals and a user-agent Firefox branch. Our design requires SSR/static-export safety and capability checks based on runtime features, not only UA strings.
- Some displacement maps are embedded as large data URLs. That is fine for a focused effect package, but bad for a tree-shakable design-system package unless moved behind a dedicated optional engine export.

Decision:

- Keep `@hashintel/refractive` as the default engine.
- Use the rdev package as a benchmark for future optional engine work: edge-only displacement, chromatic aberration tests, and elastic pointer response.
- Do not copy source into this repository unless a later ADR explicitly changes the engine strategy and preserves MIT attribution.
