"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export const LiquidButtonGroup = forwardRef<HTMLDivElement, LiquidButtonGroupProps>(
  function LiquidButtonGroup(
    { className, orientation = "horizontal", role = "group", ...props },
    ref
  ) {
    return (
      <div
        {...props}
        className={cn("lg-button-group", className)}
        data-orientation={orientation}
        ref={ref}
        role={role}
      />
    );
  }
);
