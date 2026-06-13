"use client";

import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidItemProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  disabled?: boolean;
  interactive?: boolean;
};

export const LiquidItem = forwardRef<HTMLElement, LiquidItemProps>(function LiquidItem(
  { as: Component = "div", className, disabled, interactive, ...props },
  ref
) {
  return (
    <Component
      {...props}
      aria-disabled={disabled || undefined}
      className={cn("lg-item", className)}
      data-disabled={disabled ? "" : undefined}
      data-interactive={interactive ? "" : undefined}
      ref={ref}
    />
  );
});
