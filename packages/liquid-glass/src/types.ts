import type { ReactNode } from "react";

export type LiquidMode = "auto" | "enhanced" | "fallback" | "solid" | "off";
export type ResolvedLiquidMode = Exclude<LiquidMode, "auto">;
export type LiquidIntensity = "subtle" | "medium" | "strong";
export type LiquidSurfaceKind = "nav" | "button" | "card" | "pill" | "toggle" | "panel";
export type LiquidFallback = "material" | "solid" | "gradient";
export type LiquidRadius = number | "sm" | "md" | "lg" | "xl" | "pill";

export type RefractiveOptions = {
  radius: number;
  blur?: number;
  glassThickness?: number;
  bezelWidth?: number;
  refractiveIndex?: number;
  specularOpacity?: number;
  specularAngle?: number;
  bezelHeightFn?: (x: number) => number;
};

export type LiquidProviderProps = {
  children: ReactNode;
  defaultMode?: LiquidMode;
  disableOnMobile?: boolean;
  respectReducedMotion?: boolean;
  respectReducedTransparency?: boolean;
  maxEnhancedSurfaces?: number;
  debug?: boolean;
};

export const liquidModeStorageKey = "clean99-liquid-glass-mode";

export const liquidModes = ["auto", "enhanced", "fallback", "solid", "off"] as const;

export function isLiquidMode(value: unknown): value is LiquidMode {
  return typeof value === "string" && liquidModes.includes(value as LiquidMode);
}
