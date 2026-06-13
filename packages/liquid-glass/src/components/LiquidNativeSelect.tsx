"use client";

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidNativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  endAdornment?: ReactNode;
  invalid?: boolean;
  startAdornment?: ReactNode;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "disabled" | "kind">;
};

export const LiquidNativeSelect = forwardRef<HTMLSelectElement, LiquidNativeSelectProps>(
  function LiquidNativeSelect(
    {
      "aria-invalid": ariaInvalid,
      children,
      className,
      disabled,
      endAdornment,
      invalid = false,
      startAdornment,
      surfaceProps,
      ...props
    },
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
        className={cn("lg-field-control lg-native-select-surface", surfaceClassName)}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        intensity={intensity}
        kind="panel"
        radius={radius}
      >
        {startAdornment ? (
          <span aria-hidden="true" className="lg-field-control__adornment">
            {startAdornment}
          </span>
        ) : null}
        <select
          {...props}
          aria-invalid={invalid ? true : ariaInvalid}
          className={cn("lg-native-select", className)}
          data-invalid={invalid ? "" : undefined}
          disabled={disabled}
          ref={ref}
        >
          {children}
        </select>
        <span aria-hidden="true" className="lg-native-select__chevron">
          {endAdornment ?? "⌄"}
        </span>
      </LiquidSurface>
    );
  }
);
