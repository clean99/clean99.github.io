"use client";

export { FallbackGlassSurface } from "./components/FallbackGlassSurface";
export { LiquidButton } from "./components/LiquidButton";
export { LiquidCard } from "./components/LiquidCard";
export { LiquidIconButton } from "./components/LiquidIconButton";
export { LiquidLink } from "./components/LiquidLink";
export { LiquidNav } from "./components/LiquidNav";
export { LiquidPill } from "./components/LiquidPill";
export { LiquidSegmentedControl } from "./components/LiquidSegmentedControl";
export { LiquidSurface } from "./components/LiquidSurface";
export { LiquidToggle } from "./components/LiquidToggle";
export { LiquidToolbar } from "./components/LiquidToolbar";
export { useIsomorphicLayoutEffect } from "./hooks/use-isomorphic-layout-effect";
export { useLiquidCapabilities } from "./hooks/use-liquid-capabilities";
export { useLiquidMode } from "./hooks/use-liquid-mode";
export { usePrefersReducedMotion } from "./hooks/use-prefers-reduced-motion";
export { usePrefersReducedTransparency } from "./hooks/use-prefers-reduced-transparency";
export { useStableId } from "./hooks/use-stable-id";
export { LiquidProvider } from "./providers/LiquidProvider";
export { cn } from "./utils/cn";
export {
  getBrowserCapabilities,
  isProbablyLowPowerMobile,
  readStoredLiquidMode,
  resolveLiquidMode,
  shouldReduceMotion,
  shouldReduceTransparency,
  shouldUseEnhancedLiquidGlass,
  supportsBackdropFilter,
  supportsSvgBackdropFilter
} from "./utils/support";
export { surfaceClassNames } from "./utils/variants";

export const liquidPackageName = "@clean99/liquid-glass";

export type { LiquidButtonProps } from "./components/LiquidButton";
export type { LiquidCardProps } from "./components/LiquidCard";
export type { LiquidIconButtonProps } from "./components/LiquidIconButton";
export type { LiquidLinkProps } from "./components/LiquidLink";
export type { LiquidNavProps } from "./components/LiquidNav";
export type { LiquidPillProps } from "./components/LiquidPill";
export type {
  LiquidSegmentedControlItem,
  LiquidSegmentedControlProps
} from "./components/LiquidSegmentedControl";
export type { LiquidSurfaceProps } from "./components/LiquidSurface";
export type { LiquidToggleProps } from "./components/LiquidToggle";
export type { LiquidToolbarProps } from "./components/LiquidToolbar";
export type { BrowserCapabilities, BrowserCapabilityEnvironment } from "./utils/support";
export type {
  LiquidFallback,
  LiquidIntensity,
  LiquidMode,
  LiquidProviderProps,
  LiquidRadius,
  LiquidSurfaceKind,
  RefractiveOptions,
  ResolvedLiquidMode
} from "./types";
export { isLiquidMode, liquidModeStorageKey, liquidModes } from "./types";
