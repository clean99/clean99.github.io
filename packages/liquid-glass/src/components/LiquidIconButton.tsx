"use client";

import { forwardRef } from "react";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";

export type LiquidIconButtonProps = Omit<LiquidButtonProps, "children"> & {
  "aria-label": string;
  children: React.ReactNode;
};

export const LiquidIconButton = forwardRef<HTMLElement, LiquidIconButtonProps>(
  function LiquidIconButton({ className, radius = "pill", ...props }, ref) {
    return (
      <LiquidButton
        {...props}
        className={["lg-icon-button", className].filter(Boolean).join(" ")}
        radius={radius}
        ref={ref}
      />
    );
  }
);
