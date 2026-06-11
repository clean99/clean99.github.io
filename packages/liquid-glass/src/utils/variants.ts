import { cn } from "./cn";
import type { LiquidFallback, LiquidIntensity, LiquidMode, LiquidSurfaceKind } from "../types";

export function surfaceClassNames(options: {
  className?: string;
  disabled?: boolean;
  fallback: LiquidFallback;
  intensity: LiquidIntensity;
  interactive?: boolean;
  kind: LiquidSurfaceKind;
  mode: LiquidMode;
}): string {
  return cn(
    "lg-surface",
    `lg-surface--${options.kind}`,
    `lg-surface--${options.mode}`,
    `lg-surface--${options.intensity}`,
    `lg-surface--fallback-${options.fallback}`,
    options.interactive && "lg-surface--interactive",
    options.disabled && "lg-surface--disabled",
    options.className
  );
}
