"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { continuousPlateRefraction } from "../utils/refraction";

export type LiquidToolbarProps = Omit<LiquidSurfaceProps, "as" | "kind"> & {
  "aria-label": string;
};

export const LiquidToolbar = forwardRef<HTMLElement, LiquidToolbarProps>(function LiquidToolbar(
  { children, className, radius = "pill", refraction, ...props },
  ref
) {
  return (
    <LiquidSurface
      {...props}
      as="div"
      className={["lg-toolbar", className].filter(Boolean).join(" ")}
      kind="panel"
      radius={radius}
      ref={ref}
      refraction={{ ...continuousPlateRefraction, ...refraction }}
      role="toolbar"
    >
      {children}
    </LiquidSurface>
  );
});
