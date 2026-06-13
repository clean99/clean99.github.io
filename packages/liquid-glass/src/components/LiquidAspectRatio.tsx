"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidAspectRatioProps = HTMLAttributes<HTMLDivElement> & {
  ratio?: number;
};

export const LiquidAspectRatio = forwardRef<HTMLDivElement, LiquidAspectRatioProps>(
  function LiquidAspectRatio({ children, className, ratio = 16 / 9, style, ...props }, ref) {
    return (
      <div
        {...props}
        className={cn("lg-aspect-ratio", className)}
        ref={ref}
        style={{ aspectRatio: ratio, ...style }}
      >
        {children}
      </div>
    );
  }
);
