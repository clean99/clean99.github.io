"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidInputGroupProps = HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  invalid?: boolean;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "disabled" | "kind">;
};

export const LiquidInputGroup = forwardRef<HTMLDivElement, LiquidInputGroupProps>(
  function LiquidInputGroup(
    { children, className, disabled, invalid, surfaceProps, ...props },
    ref
  ) {
    const {
      className: surfaceClassName,
      intensity = "subtle",
      radius = "md",
      ...restSurfaceProps
    } = surfaceProps ?? {};

    return (
      <LiquidSurface
        {...restSurfaceProps}
        className={cn("lg-field-control lg-input-group", surfaceClassName)}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        intensity={intensity}
        kind="panel"
        radius={radius}
      >
        <div {...props} className={cn("lg-input-group__inner", className)} ref={ref}>
          {children}
        </div>
      </LiquidSurface>
    );
  }
);
