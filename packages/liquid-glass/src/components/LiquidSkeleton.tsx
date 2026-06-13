"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidSkeletonProps = HTMLAttributes<HTMLDivElement>;

export const LiquidSkeleton = forwardRef<HTMLDivElement, LiquidSkeletonProps>(
  function LiquidSkeleton({ className, ...props }, ref) {
    return (
      <div
        {...props}
        aria-hidden={props["aria-hidden"] ?? "true"}
        className={cn("lg-skeleton", className)}
        ref={ref}
      />
    );
  }
);
