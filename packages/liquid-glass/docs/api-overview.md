# API Overview

The public API is intentionally boring: native elements first, optical material
second.

## Provider

`LiquidProvider` owns default mode, mobile policy, accessibility preferences,
surface budget, and debug behavior.

```tsx
<LiquidProvider defaultMode="auto" disableOnMobile maxEnhancedSurfaces={6}>
  <App />
</LiquidProvider>
```

## Surface

`LiquidSurface` is the only public component that talks to the render engines.

```tsx
<LiquidSurface kind="button" intensity="medium" interactive>
  Clear foreground
</LiquidSurface>
```

`refraction.chromaticAberration` is an experimental opt-in for the reference
lens engine. Leave it unset for production surfaces; the default enhanced path
keeps channel splitting disabled to preserve Kube parity and readable content.

## Components

Controls are typed React components with forwarded refs where interaction needs
DOM access. Examples:

- `LiquidButton`
- `LiquidButtonGroup`
- `LiquidCalendar`
- `LiquidDatePicker`
- `LiquidCarousel`
- `LiquidCarouselContent`
- `LiquidCarouselItem`
- `LiquidCarouselPrevious`
- `LiquidCarouselNext`
- `LiquidAlertDialog`
- `LiquidCollapsible`
- `LiquidContextMenu`
- `LiquidDrawer`
- `LiquidDropdownMenu`
- `LiquidHoverCard`
- `LiquidIconButton`
- `LiquidInputOtp`
- `LiquidLink`
- `LiquidMenubar`
- `LiquidNav`
- `LiquidNativeSelect`
- `LiquidSelect`
- `LiquidCombobox`
- `LiquidCommand`
- `LiquidPagination`
- `LiquidPopover`
- `LiquidRadioGroup`
- `LiquidResizable`
- `LiquidResizablePanelGroup`
- `LiquidResizablePanel`
- `LiquidResizableHandle`
- `LiquidScrollArea`
- `LiquidSheet`
- `LiquidSidebar`
- `LiquidSidebarProvider`
- `LiquidSidebarTrigger`
- `LiquidTabs`
- `LiquidTable`
- `LiquidDataTable`
- `LiquidChart`
- `LiquidChartContainer`
- `LiquidChartTooltipContent`
- `LiquidChartLegendContent`
- `LiquidSearchBox`
- `LiquidSwitch`
- `LiquidToast`
- `LiquidToaster`
- `LiquidSlider`
- `LiquidDialog`
- `LiquidAccordion`
- `LiquidTooltip`
- `LiquidAspectRatio`
- `LiquidSpinner`
- `LiquidTypography`

## Modes

```ts
type LiquidMode = "auto" | "enhanced" | "fallback" | "solid" | "off";
```

`auto` is conservative. It starts from a safe fallback and upgrades only after
runtime capability checks pass.

## Styling

Import the package CSS once:

```tsx
import "@clean99/liquid-glass/styles.css";
```

For token-only integrations:

```tsx
import "@clean99/liquid-glass/tokens.css";
```
