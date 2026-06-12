"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidLensProps = Omit<
  LiquidSurfaceProps,
  "children" | "intensity" | "kind" | "radius"
> & {
  children?: React.ReactNode;
  intensity?: LiquidSurfaceProps["intensity"];
  radius?: number;
};

const defaultLensRefraction = {
  blur: 0,
  glassThickness: 88,
  bezelWidth: 18,
  refractiveIndex: 1.5,
  radius: 75,
  specularOpacity: 0.5,
  specularAngle: 0.8
};

export const LiquidLens = forwardRef<HTMLElement, LiquidLensProps>(function LiquidLens(
  {
    allowOversizedRefractionRadius = true,
    children = null,
    className,
    fallback,
    intensity = "strong",
    mode,
    radius = 75,
    refraction,
    style,
    ...props
  },
  ref
) {
  return (
    <LiquidSurface
      {...props}
      allowOversizedRefractionRadius={allowOversizedRefractionRadius}
      aria-hidden={props["aria-hidden"] ?? (children ? undefined : true)}
      className={cn("lg-lens", className)}
      fallback={fallback}
      intensity={intensity}
      kind="pill"
      mode={mode}
      radius={radius}
      ref={ref}
      refraction={{ ...defaultLensRefraction, ...refraction, radius }}
      style={style}
    >
      {children}
    </LiquidSurface>
  );
});
