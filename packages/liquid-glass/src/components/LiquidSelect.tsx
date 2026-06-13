"use client";

import { forwardRef } from "react";
import { LiquidNativeSelect, type LiquidNativeSelectProps } from "./LiquidNativeSelect";
import { cn } from "../utils/cn";

export type LiquidSelectProps = LiquidNativeSelectProps;

export const LiquidSelect = forwardRef<HTMLSelectElement, LiquidSelectProps>(function LiquidSelect(
  { className, surfaceProps, ...props },
  ref
) {
  const { className: surfaceClassName, ...restSurfaceProps } = surfaceProps ?? {};

  return (
    <LiquidNativeSelect
      {...props}
      className={cn("lg-select", className)}
      ref={ref}
      surfaceProps={{
        ...restSurfaceProps,
        className: cn("lg-select-surface", surfaceClassName)
      }}
    />
  );
});
