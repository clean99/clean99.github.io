"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidBadgeVariant = "default" | "accent" | "success" | "warning" | "danger";

export type LiquidBadgeProps = Omit<LiquidSurfaceProps, "kind"> & {
  variant?: LiquidBadgeVariant;
};

export const LiquidBadge = forwardRef<HTMLElement, LiquidBadgeProps>(function LiquidBadge(
  {
    as = "span",
    className,
    fallback = "material",
    intensity = "subtle",
    radius = "pill",
    variant = "default",
    ...props
  },
  ref
) {
  return (
    <LiquidSurface
      {...props}
      as={as}
      className={cn("lg-badge", className)}
      data-variant={variant}
      fallback={fallback}
      intensity={intensity}
      kind="pill"
      radius={radius}
      ref={ref}
    />
  );
});
