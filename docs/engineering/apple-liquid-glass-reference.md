# Apple Liquid Glass Reference Contract

This project uses Apple Liquid Glass and the kube.io CSS/SVG article as behavior references. The goal is not to copy article prose, screenshots, or third-party images. The goal is to make the component library reproduce the same control behavior on the web.

References:

- Apple design guidance: https://developer.apple.com/design/
- Apple adopting Liquid Glass overview: https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
- kube.io Liquid Glass article: https://kube.io/blog/liquid-glass-css-svg/

## Material Model

Liquid Glass is a system material, not a card skin.

Required behavior:

- The background is sampled and bent by the optical surface.
- Foreground text, icons, and editable content stay outside the displacement layer.
- The resting surface has low fill opacity. Shape is carried by edge highlights, rim contrast, and local shadow.
- Dense controls use one continuous plate. Individual child controls are clear hit targets, not independent refractive objects.
- Strong refraction is reserved for small controls, lenses, thumbs, and a small number of showcase cards.
- Long reading surfaces, code blocks, article bodies, and tables do not use strong refraction.

Forbidden behavior:

- Generated crosshatch or diagonal texture inside the material.
- Blue focus rings pasted on top of glass controls.
- Plastic-looking filled pills where every tab is its own lens.
- Text inside a displaced backdrop/filter layer.
- Motion that survives `prefers-reduced-motion: reduce`.

## Focus, Hover, Active

Apple-like focus is a material response. It is not a default browser outline and not a system-blue ring unless a platform accessibility mode explicitly requires it.

Our focus contract:

- Keyboard focus remains visible.
- Focused glass controls scale up slightly.
- The edge rim gets brighter.
- The shadow stack grows.
- Text remains sharp and foreground-only.
- Dark controls use near-white foreground text with a short dark shadow.
- Light controls may keep dark text when contrast is better.
- `prefers-reduced-motion: reduce` removes focus/hover scale while keeping a visible material rim.

Hover contract:

- Hover gently lifts or expands the control.
- Fill opacity increases only slightly.
- The hover response does not allocate a new enhanced filter for child nav or tab items.

Active contract:

- Active press relaxes the scale back toward the resting geometry.
- Active does not introduce a new colored ring.

## Automated Gates

The behavior is enforced by CI, not by manual screenshots.

Commands:

```bash
pnpm --filter docs test:storybook
pnpm --filter docs test:kube-reference
pnpm test:visual
```

`apps/docs/scripts/verify-enhanced-storybook.mjs` checks that enhanced stories really use `backdrop-filter: url(...)`, have stable geometry, and keep the physical optical radius within the measured component bounds.

`apps/docs/scripts/verify-liquid-behavior.mjs` checks interaction behavior from built Storybook iframes:

- tabs focus scales to at least `1.04`
- field focus scales to at least `1.012`
- button focus scales to at least `1.018`
- focus outlines are not default blue rings
- focus increases the shadow layer count
- focused tab text has a foreground text shadow
- hover increases tab material alpha
- active press relaxes scale relative to hover
- reduced motion removes elastic focus scale

`apps/docs/scripts/compare-kube-reference.mjs` compares selected local Storybook demos against deterministic regions from the kube.io reference page.

## Practical Translation

The component library should express this through API and defaults:

- `LiquidSurface` remains the only direct `@hashintel/refractive` integration point.
- `LiquidNav`, `LiquidTabs`, `LiquidToolbar`, and `LiquidSegmentedControl` use continuous plate refraction.
- Child items in dense controls render as foreground controls with disabled backdrop filters.
- Focus styles use neutral rim/glow tokens, not `--lg-accent`.
- Reduced motion keeps focus visible but removes scale transforms.

