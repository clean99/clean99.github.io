# Resizable Architecture

`LiquidResizable` is a Liquid Glass wrapper around `react-resizable-panels`.

## Decision

Resizable panels are behavior-heavy UI primitives. A credible implementation needs pointer drag, keyboard resize, ARIA separator semantics, min/max constraints, persisted layouts, nested groups, disabled panels, and imperative panel APIs.

Hand-rolling that behavior would create a second layout engine inside the design system. The library instead delegates the behavior layer to `react-resizable-panels` and keeps this package responsible for:

- Liquid Glass styling
- package-level API names
- React 19 type exports
- Storybook coverage
- component tests that verify the wrapper preserves accessible separator semantics

## API

The public wrappers are:

- `LiquidResizablePanelGroup`
- `LiquidResizablePanel`
- `LiquidResizableHandle`
- `LiquidResizable` as an alias for `LiquidResizablePanelGroup`

The wrapper forwards `elementRef` to the underlying DOM elements so consumers still get usable refs.

## Glass Rules

The panel group gets the material shell. The resize handle gets the interactive liquid highlight and a larger hit area than its visual line. Panel content remains clear foreground content; large text, code blocks, and dense lists should not sit inside a refractive filter.

## Testing

`tests/components.test.tsx` verifies:

- panel content renders inside `data-panel` nodes
- handles preserve `role="separator"`
- horizontal groups expose vertical separator orientation

The dependency owns the lower-level drag and keyboard resize behavior. Our tests make sure the Liquid wrapper does not break that contract.
