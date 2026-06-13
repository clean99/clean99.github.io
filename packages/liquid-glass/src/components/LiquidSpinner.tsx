"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidSpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  decorative?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
};

export const LiquidSpinner = forwardRef<HTMLSpanElement, LiquidSpinnerProps>(function LiquidSpinner(
  { className, decorative = false, label = "Loading", size = "md", ...props },
  ref
) {
  return (
    <span
      {...props}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={cn("lg-spinner", className)}
      data-size={size}
      ref={ref}
      role={decorative ? undefined : "status"}
    />
  );
});
