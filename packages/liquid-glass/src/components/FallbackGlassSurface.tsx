"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export const FallbackGlassSurface = forwardRef<HTMLElement, LiquidSurfaceProps>(
  function FallbackGlassSurface(props, ref) {
    return <LiquidSurface {...props} fallback="material" mode="fallback" ref={ref} />;
  }
);
