"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidDirectionProps = HTMLAttributes<HTMLDivElement> & {
  dir: "ltr" | "rtl";
};

export const LiquidDirection = forwardRef<HTMLDivElement, LiquidDirectionProps>(
  function LiquidDirection({ className, dir, ...props }, ref) {
    return <div {...props} className={cn("lg-direction", className)} dir={dir} ref={ref} />;
  }
);
