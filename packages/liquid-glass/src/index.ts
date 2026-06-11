"use client";

export { FallbackGlassSurface } from "./components/FallbackGlassSurface";
export { LiquidButton } from "./components/LiquidButton";
export { LiquidCard } from "./components/LiquidCard";
export {
  LiquidDialog,
  LiquidDialogClose,
  LiquidDialogContent,
  LiquidDialogDescription,
  LiquidDialogFooter,
  LiquidDialogHeader,
  LiquidDialogTitle,
  LiquidDialogTrigger
} from "./components/LiquidDialog";
export {
  LiquidField,
  LiquidFieldDescription,
  LiquidFieldError,
  LiquidInput,
  LiquidLabel,
  LiquidTextarea
} from "./components/LiquidField";
export { LiquidIconButton } from "./components/LiquidIconButton";
export { LiquidLens } from "./components/LiquidLens";
export { LiquidLink } from "./components/LiquidLink";
export { LiquidMusicPlayerBar } from "./components/LiquidMusicPlayerBar";
export { LiquidNav } from "./components/LiquidNav";
export { LiquidPill } from "./components/LiquidPill";
export { LiquidSearchBox } from "./components/LiquidSearchBox";
export { LiquidSegmentedControl } from "./components/LiquidSegmentedControl";
export { LiquidSlider } from "./components/LiquidSlider";
export { LiquidSurface } from "./components/LiquidSurface";
export { LiquidTabs } from "./components/LiquidTabs";
export { LiquidSwitch } from "./components/LiquidSwitch";
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
  defaultRefractionByIntensity,
  resolveRefractiveOptions,
  resolveRefractionRadius
} from "./utils/refraction";
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
export type {
  LiquidDialogCloseProps,
  LiquidDialogContentProps,
  LiquidDialogDescriptionProps,
  LiquidDialogFooterProps,
  LiquidDialogHeaderProps,
  LiquidDialogProps,
  LiquidDialogTitleProps,
  LiquidDialogTriggerProps
} from "./components/LiquidDialog";
export type {
  LiquidFieldDescriptionProps,
  LiquidFieldErrorProps,
  LiquidFieldProps,
  LiquidInputProps,
  LiquidInputSurfaceProps,
  LiquidLabelProps,
  LiquidTextareaProps
} from "./components/LiquidField";
export type { LiquidIconButtonProps } from "./components/LiquidIconButton";
export type { LiquidLensProps } from "./components/LiquidLens";
export type { LiquidLinkProps } from "./components/LiquidLink";
export type { LiquidMusicPlayerBarProps } from "./components/LiquidMusicPlayerBar";
export type { LiquidNavProps } from "./components/LiquidNav";
export type { LiquidPillProps } from "./components/LiquidPill";
export type { LiquidSearchBoxProps } from "./components/LiquidSearchBox";
export type {
  LiquidSegmentedControlItem,
  LiquidSegmentedControlProps
} from "./components/LiquidSegmentedControl";
export type { LiquidSurfaceProps } from "./components/LiquidSurface";
export type {
  LiquidTabsItem,
  LiquidTabsProps,
  LiquidTabsSurfaceProps
} from "./components/LiquidTabs";
export type { LiquidSliderProps } from "./components/LiquidSlider";
export type { LiquidSwitchProps } from "./components/LiquidSwitch";
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
