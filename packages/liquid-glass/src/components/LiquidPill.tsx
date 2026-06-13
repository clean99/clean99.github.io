"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidPillProps = Omit<LiquidSurfaceProps, "kind">;

export const LiquidPill = forwardRef<HTMLElement, LiquidPillProps>(function LiquidPill(
  { as = "span", radius = "pill", ...props },
  ref
) {
  return <LiquidSurface {...props} as={as} kind="pill" radius={radius} ref={ref} />;
});
