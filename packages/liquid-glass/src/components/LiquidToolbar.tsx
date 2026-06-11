"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidToolbarProps = Omit<LiquidSurfaceProps, "as" | "kind"> & {
  "aria-label": string;
};

export const LiquidToolbar = forwardRef<HTMLElement, LiquidToolbarProps>(
  function LiquidToolbar({ children, className, radius = "pill", ...props }, ref) {
    return (
      <LiquidSurface
        {...props}
        as="div"
        className={["lg-toolbar", className].filter(Boolean).join(" ")}
        kind="panel"
        radius={radius}
        ref={ref}
        role="toolbar"
      >
        {children}
      </LiquidSurface>
    );
  }
);
