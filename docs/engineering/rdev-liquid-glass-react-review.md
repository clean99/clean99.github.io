# rdev/liquid-glass-react Review

Reference inspected:

- Repository: https://github.com/rdev/liquid-glass-react
- Commit: `ac48eab18d1f7f444ae30002d240cae29c863a21`
- License: MIT, copyright 2025 MAX ROVENSKY

This project can use the repository as an implementation reference, but it should not copy source code or switch away from `@hashintel/refractive` as the enhanced engine. The current architecture deliberately keeps `LiquidSurface` as the only component that directly touches the refraction engine.

## Useful Ideas

The implementation has three useful design ideas:

1. Edge-first displacement
   - The center content remains clean.
   - Strong optical movement is concentrated near the rounded boundary.
   - This matches the physical expectation for a small convex lens better than applying uniform blur.

2. Foreground separation
   - The backdrop layer is warped.
   - User content stays in a separate foreground layer.
   - This matches our existing `.lg-surface__content` contract.

3. Pointer elasticity
   - Pointer movement is computed from distance to the surface edge, not from a global mousemove blanket.
   - The surface stretches slightly on the dominant axis and translates toward the pointer.
   - The response fades out outside an activation zone.

## Rejected Parts

These parts are intentionally not adopted directly:

- Custom SVG displacement maps as the primary engine.
  The package requirement is to build on `@hashintel/refractive`, with fallbacks handled by our own components.

- Always-on mouse tracking.
  That would make dense blog pages expensive and would violate the performance rule against global pointer work.

- Direct transform ownership inside the component wrapper.
  Our current controls already use CSS transforms for focus, hover, and active states. Adding inline transforms too early would break focus behavior.

- Runtime shader/canvas generation in the default path.
  It is useful research, but not acceptable as a default for a product-ready library until it has deterministic tests, browser support gates, and perf budgets.

## Adopted Change

The first adopted piece is a pure pointer-elasticity model:

- `resolveLiquidElasticResponse()`
- `distanceFromRectEdge()`

The model has no DOM side effects. It returns:

- `active`
- `fade`
- `translateX`
- `translateY`
- `scaleX`
- `scaleY`
- CSS `transform`

This keeps the data structure simple and testable before it is connected to any component.

## Physics Contract

The model follows these rules:

- Far outside the activation distance, the response is exactly the resting transform.
- At or inside the component edge, fade is `1`.
- Between the edge and the activation distance, fade decreases monotonically.
- Horizontal pointer dominance stretches `scaleX` more than `scaleY`.
- Vertical pointer dominance stretches `scaleY` more than `scaleX`.
- Translation and scale are capped so the surface cannot visually tear.
- `reducedMotion` and `disabled` always return the resting response.

## Next Integration Step

The next safe UI integration should be opt-in and limited to small controls:

- `LiquidLens`
- `LiquidSearchBox`
- `LiquidButton`
- `LiquidSwitch` thumb
- `LiquidSlider` thumb

The integration should not be enabled for:

- article bodies
- long lists
- code blocks
- tables
- all nav children in a dense layout

Before integrating into components, tests should verify that CSS focus transforms and elastic transforms compose rather than overwrite each other.
