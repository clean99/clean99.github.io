"use client";

import { forwardRef } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidLinkProps = Omit<LiquidSurfaceProps, "as" | "kind" | "type"> & {
  as?: React.ElementType;
  href: string;
};

export const LiquidLink = forwardRef<HTMLElement, LiquidLinkProps>(function LiquidLink(
  { as = "a", interactive = true, radius = "pill", ...props },
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
    />
  );
});
