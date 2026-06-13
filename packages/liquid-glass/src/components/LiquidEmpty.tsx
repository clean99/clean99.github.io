"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidEmptyProps = HTMLAttributes<HTMLDivElement>;
export type LiquidEmptyIconProps = HTMLAttributes<HTMLDivElement>;
export type LiquidEmptyTitleProps = HTMLAttributes<HTMLHeadingElement>;
export type LiquidEmptyDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export type LiquidEmptyActionsProps = HTMLAttributes<HTMLDivElement>;

export const LiquidEmpty = forwardRef<HTMLDivElement, LiquidEmptyProps>(function LiquidEmpty(
  { className, ...props },
  ref
) {
  return <div {...props} className={cn("lg-empty", className)} ref={ref} />;
});

export const LiquidEmptyIcon = forwardRef<HTMLDivElement, LiquidEmptyIconProps>(
  function LiquidEmptyIcon({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-empty__icon", className)} ref={ref} />;
  }
);

export const LiquidEmptyTitle = forwardRef<HTMLHeadingElement, LiquidEmptyTitleProps>(
  function LiquidEmptyTitle({ className, ...props }, ref) {
    return <h3 {...props} className={cn("lg-empty__title", className)} ref={ref} />;
  }
);

export const LiquidEmptyDescription = forwardRef<HTMLParagraphElement, LiquidEmptyDescriptionProps>(
  function LiquidEmptyDescription({ className, ...props }, ref) {
    return <p {...props} className={cn("lg-empty__description", className)} ref={ref} />;
  }
);

export const LiquidEmptyActions = forwardRef<HTMLDivElement, LiquidEmptyActionsProps>(
  function LiquidEmptyActions({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-empty__actions", className)} ref={ref} />;
  }
);
