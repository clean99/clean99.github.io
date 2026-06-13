"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidCardProps = Omit<LiquidSurfaceProps, "kind">;

export const LiquidCard = forwardRef<HTMLElement, LiquidCardProps>(function LiquidCard(
  { radius = "xl", ...props },
  ref
) {
  return <LiquidSurface {...props} kind="card" radius={radius} ref={ref} />;
});
