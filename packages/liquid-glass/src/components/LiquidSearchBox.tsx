"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidSearchBoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  icon?: ReactNode;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "kind">;
};

const defaultSearchRefraction = {
  blur: 1,
  glassThickness: 84,
  bezelWidth: 12,
  refractiveIndex: 1.42,
  radius: 28,
  specularOpacity: 0.2
};

export const LiquidSearchBox = forwardRef<HTMLInputElement, LiquidSearchBoxProps>(
  function LiquidSearchBox(
    { className, icon, placeholder = "Search", surfaceProps, type = "search", ...props },
    ref
  ) {
    const {
      className: surfaceClassName,
      intensity = "medium",
      radius = 28,
      refraction,
      style,
      ...restSurfaceProps
    } = surfaceProps ?? {};

    return (
      <LiquidSurface
        {...restSurfaceProps}
        className={cn("lg-searchbox", surfaceClassName)}
        intensity={intensity}
        kind="pill"
        opticalBounds="layout"
        radius={radius}
        refraction={{ ...defaultSearchRefraction, ...refraction, radius: Number(radius) || 28 }}
        style={style}
      >
        <span aria-hidden="true" className="lg-searchbox__icon">
          {icon ?? (
            <svg
              aria-hidden="true"
              className="lg-searchbox__magnifier"
              fill="none"
              viewBox="0 0 20 20"
            >
              <circle cx="8.65" cy="8.65" r="5.15" />
              <path d="m12.35 12.35 4.15 4.15" />
            </svg>
          )}
        </span>
        <input
          {...props}
          className={cn("lg-searchbox__input", className)}
          placeholder={placeholder}
          ref={ref}
          type={type}
        />
      </LiquidSurface>
    );
  }
);
