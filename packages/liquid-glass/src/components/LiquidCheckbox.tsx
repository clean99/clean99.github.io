"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidCheckboxSurfaceProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "disabled" | "kind"
>;

export type LiquidCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "type"
> & {
  children?: ReactNode;
  description?: ReactNode;
  surfaceProps?: LiquidCheckboxSurfaceProps;
};

export const LiquidCheckbox = forwardRef<HTMLInputElement, LiquidCheckboxProps>(
  function LiquidCheckbox(
    { children, className, description, disabled, surfaceProps, ...props },
    ref
  ) {
    const {
      className: surfaceClassName,
      intensity = "subtle",
      radius = "lg",
      ...restSurfaceProps
    } = surfaceProps ?? {};

    return (
      <label className={cn("lg-checkbox", className)} data-disabled={disabled ? "" : undefined}>
        <input
          {...props}
          className="lg-checkbox__input"
          disabled={disabled}
          ref={ref}
          type="checkbox"
        />
        <LiquidSurface
          {...restSurfaceProps}
          as="span"
          className={cn("lg-checkbox__surface", surfaceClassName)}
          disabled={disabled}
          intensity={intensity}
          kind="panel"
          radius={radius}
        >
          <span aria-hidden="true" className="lg-checkbox__control" />
          <span className="lg-checkbox__body">
            {children ? <span className="lg-checkbox__label">{children}</span> : null}
            {description ? <span className="lg-checkbox__description">{description}</span> : null}
          </span>
        </LiquidSurface>
      </label>
    );
  }
);
