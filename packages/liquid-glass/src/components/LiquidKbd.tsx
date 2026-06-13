"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidKbdProps = HTMLAttributes<HTMLElement>;

export const LiquidKbd = forwardRef<HTMLElement, LiquidKbdProps>(function LiquidKbd(
  { className, ...props },
  ref
) {
  return <kbd {...props} className={cn("lg-kbd", className)} ref={ref} />;
});
