"use client";

import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidTypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "p"
  | "lead"
  | "muted"
  | "small"
  | "code";

export type LiquidTypographyProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: LiquidTypographyVariant;
};

const defaultElementByVariant: Record<LiquidTypographyVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  p: "p",
  lead: "p",
  muted: "p",
  small: "small",
  code: "code"
};

export const LiquidTypography = forwardRef<HTMLElement, LiquidTypographyProps>(
  function LiquidTypography({ as, className, variant = "p", ...props }, ref) {
    const Component = as ?? defaultElementByVariant[variant];

    return (
      <Component
        {...props}
        className={cn("lg-typography", className)}
        data-variant={variant}
        ref={ref}
      />
    );
  }
);
