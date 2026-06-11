"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidNavProps = Omit<LiquidSurfaceProps, "as" | "kind"> & {
  "aria-label": string;
};

export const LiquidNav = forwardRef<HTMLElement, LiquidNavProps>(
  function LiquidNav({ children, className, radius = "pill", ...props }, ref) {
    return (
      <nav aria-label={props["aria-label"]} className="lg-nav" ref={ref}>
        <LiquidSurface
          {...props}
          aria-label={undefined}
          as="div"
          className={["lg-nav__surface", className].filter(Boolean).join(" ")}
          kind="nav"
          radius={radius}
        >
          {children}
        </LiquidSurface>
      </nav>
    );
  }
);
