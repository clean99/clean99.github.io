"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";
import { referenceLensDisplacementRefraction } from "../utils/lens-pipeline";

export type LiquidLensProps = Omit<
  LiquidSurfaceProps,
  "children" | "enhancedEngine" | "intensity" | "kind" | "radius"
> & {
  children?: React.ReactNode;
  engine?: "refractive" | "reference";
  intensity?: LiquidSurfaceProps["intensity"];
  radius?: number;
};

export const LiquidLens = forwardRef<HTMLElement, LiquidLensProps>(function LiquidLens(
  {
    allowOversizedRefractionRadius = true,
    children = null,
    className,
    engine = "refractive",
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
      enhancedEngine={engine === "reference" ? "reference-lens" : "refractive"}
      fallback={fallback}
      intensity={intensity}
      kind="pill"
      mode={mode}
      radius={radius}
      ref={ref}
      refraction={{ ...referenceLensDisplacementRefraction, ...refraction, radius }}
      style={style}
    >
      {children}
    </LiquidSurface>
  );
});
