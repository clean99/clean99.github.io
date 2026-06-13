"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidSeparatorProps = HTMLAttributes<HTMLDivElement> & {
  decorative?: boolean;
  orientation?: "horizontal" | "vertical";
};

export const LiquidSeparator = forwardRef<HTMLDivElement, LiquidSeparatorProps>(
  function LiquidSeparator(
    { className, decorative = true, orientation = "horizontal", ...props },
    ref
  ) {
    return (
      <div
        {...props}
        aria-hidden={decorative ? "true" : undefined}
        aria-orientation={!decorative && orientation === "vertical" ? "vertical" : undefined}
        className={cn("lg-separator", className)}
        data-orientation={orientation}
        ref={ref}
        role={decorative ? undefined : "separator"}
      />
    );
  }
);
