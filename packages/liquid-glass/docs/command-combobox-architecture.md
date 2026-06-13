# Command and Combobox Architecture

`LiquidCommand` and `LiquidCombobox` are built around a small item registry instead of DOM-first querying.

## Why a Registry

Command palettes need the same ordered item data for filtering, active-descendant state, disabled item skipping, and Enter selection. Querying the DOM for each key event creates special cases: hidden items, disabled options, custom rendered labels, and virtualization all start disagreeing with each other.

The registry keeps one source of truth:

- `value`
- stable DOM `id`
- `disabled`
- `searchText`
- optional `keywords`
- optional `onSelect`

Filtering and navigation consume that array through pure functions in `src/utils/command.ts`.

## Semantics

`LiquidCommandInput` is a native input with `role="searchbox"`. It owns `aria-activedescendant` and points at the active item inside `LiquidCommandList`.

`LiquidCommandList` uses `role="listbox"`.

`LiquidCommandItem` uses `role="option"` and exposes `aria-selected` and `aria-disabled`.

`LiquidCombobox` composes `LiquidPopover` and `LiquidCommand`. The trigger uses `role="combobox"`, `aria-expanded`, and `aria-haspopup="listbox"`.

## Glass Rules

Only the Command shell and Popover shell are glass surfaces. Items use lightweight selected-state materials instead of instantiating individual refraction filters. That keeps dense command lists readable and avoids expensive per-row SVG filters.

## Test Surface

The pure data path is covered by `tests/command.test.ts`.

Component behavior is covered by `tests/components.test.tsx`:

- query filtering
- empty state
- Arrow/Home/End navigation through the registry
- Enter selection
- disabled item skipping
- Combobox Popover + Command composition

This matches the library rule: keep behavior testable outside the visual layer, then use Storybook and visual gates for the material shell.
