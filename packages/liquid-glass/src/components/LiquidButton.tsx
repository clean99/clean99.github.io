"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidButtonProps = Omit<LiquidSurfaceProps, "as" | "kind"> & {
  as?: "button" | "a";
};

export const LiquidButton = forwardRef<HTMLElement, LiquidButtonProps>(function LiquidButton(
  { as = "button", interactive = true, radius = "pill", type = "button", ...props },
  ref
) {
  return (
    <LiquidSurface
      {...props}
      as={as}
      interactive={interactive}
      kind="button"
      radius={radius}
      ref={ref}
      type={as === "button" ? type : undefined}
    />
  );
});
