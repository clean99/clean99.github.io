"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  getBrowserCapabilities,
  readStoredLiquidMode,
  type BrowserCapabilities
} from "../utils/support";
import type { LiquidMode, LiquidProviderProps } from "../types";

type LiquidContextValue = {
  capabilities: BrowserCapabilities;
  debug: boolean;
  defaultMode: LiquidMode;
  disableOnMobile: boolean;
  enhancedSurfaceCount: number;
  forcedMode: LiquidMode | null;
  maxEnhancedSurfaces: number;
  releaseEnhancedSurface: (id: string) => void;
  reserveEnhancedSurface: (id: string) => boolean;
  respectReducedMotion: boolean;
  respectReducedTransparency: boolean;
};

const defaultCapabilities: BrowserCapabilities = {
  supportsBackdropFilter: false,
  supportsSvgBackdropFilter: false,
  isChromium: false,
  isFirefox: false,
  isSafari: false,
  isIOS: false,
  isMobileLike: false,
  prefersReducedMotion: false,
  prefersReducedTransparency: false,
  prefersContrastMore: false
};

const LiquidContext = createContext<LiquidContextValue | null>(null);

export function LiquidProvider({
  children,
  defaultMode = "auto",
  disableOnMobile = true,
  respectReducedMotion = true,
  respectReducedTransparency = true,
  maxEnhancedSurfaces = 8,
  debug = false
}: LiquidProviderProps): ReactNode {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>(defaultCapabilities);
  const [forcedMode, setForcedMode] = useState<LiquidMode | null>(null);
  const enhancedSurfaceIds = useRef<Set<string>>(new Set());
  const [enhancedSurfaceCount, setEnhancedSurfaceCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCapabilities(getBrowserCapabilities());
      setForcedMode(readStoredLiquidMode());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const reserveEnhancedSurface = useCallback(
    (id: string) => {
      if (enhancedSurfaceIds.current.has(id)) {
        return true;
      }

      if (enhancedSurfaceIds.current.size >= maxEnhancedSurfaces) {
        return false;
      }

      enhancedSurfaceIds.current.add(id);
      setEnhancedSurfaceCount(enhancedSurfaceIds.current.size);
      return true;
    },
    [maxEnhancedSurfaces]
  );

  const releaseEnhancedSurface = useCallback((id: string) => {
    if (!enhancedSurfaceIds.current.delete(id)) {
      return;
    }

    setEnhancedSurfaceCount(enhancedSurfaceIds.current.size);
  }, []);

  const value = useMemo<LiquidContextValue>(
    () => ({
      capabilities,
      debug,
      defaultMode,
      disableOnMobile,
      enhancedSurfaceCount,
      forcedMode,
      maxEnhancedSurfaces,
      releaseEnhancedSurface,
      reserveEnhancedSurface,
      respectReducedMotion,
      respectReducedTransparency
    }),
    [
      capabilities,
      debug,
      defaultMode,
      disableOnMobile,
      enhancedSurfaceCount,
      forcedMode,
      maxEnhancedSurfaces,
      releaseEnhancedSurface,
      reserveEnhancedSurface,
      respectReducedMotion,
      respectReducedTransparency
    ]
  );

  return <LiquidContext.Provider value={value}>{children}</LiquidContext.Provider>;
}

export function useLiquidContext(): LiquidContextValue {
  const context = useContext(LiquidContext);

  if (context) {
    return context;
  }

  return {
    capabilities: defaultCapabilities,
    debug: false,
    defaultMode: "auto",
    disableOnMobile: true,
    enhancedSurfaceCount: 0,
    forcedMode: null,
    maxEnhancedSurfaces: 0,
    releaseEnhancedSurface: () => undefined,
    reserveEnhancedSurface: () => false,
    respectReducedMotion: true,
    respectReducedTransparency: true
  };
}
