"use client";

import { useLiquidContext } from "../providers/LiquidProvider";
import { resolveLiquidMode } from "../utils/support";
import type { LiquidMode } from "../types";

export function useLiquidMode(mode: LiquidMode = "auto") {
  const context = useLiquidContext();

  return resolveLiquidMode({
    requestedMode: mode,
    defaultMode: context.defaultMode,
    forcedMode: context.forcedMode,
    capabilities: context.capabilities,
    disableOnMobile: context.disableOnMobile,
    enhancedSurfaceCount: context.enhancedSurfaceCount,
    maxEnhancedSurfaces: context.maxEnhancedSurfaces,
    respectReducedMotion: context.respectReducedMotion,
    respectReducedTransparency: context.respectReducedTransparency
  });
}
