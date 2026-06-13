"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type MouseEventHandler } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidSwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onChange" | "role"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "kind">;
};

const defaultSwitchThumbRefraction = {
  blur: 0.2,
  glassThickness: 92,
  bezelWidth: 18,
  refractiveIndex: 1.5,
  radius: 46,
  specularOpacity: 0.5,
  specularAngle: 0.78
};

export const LiquidSwitch = forwardRef<HTMLButtonElement, LiquidSwitchProps>(function LiquidSwitch(
  {
    checked,
    className,
    defaultChecked = false,
    disabled,
    onCheckedChange,
    onClick,
    surfaceProps,
    type = "button",
    ...props
  },
  ref
) {
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const isControlled = typeof checked === "boolean";
  const currentChecked = isControlled ? checked : uncontrolledChecked;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (disabled) {
      return;
    }

    const nextChecked = !currentChecked;
    if (!isControlled) {
      setUncontrolledChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
    onClick?.(event);
  };

  const {
    className: thumbClassName,
    intensity = "strong",
    radius = 46,
    refraction,
    ...restSurfaceProps
  } = surfaceProps ?? {};

  return (
    <button
      {...props}
      aria-checked={currentChecked}
      className={cn("lg-switch", className)}
      data-state={currentChecked ? "on" : "off"}
      disabled={disabled}
      onClick={handleClick}
      ref={ref}
      role="switch"
      type={type}
    >
      <span aria-hidden="true" className="lg-switch__track" />
      <LiquidSurface
        {...restSurfaceProps}
        aria-hidden="true"
        className={cn("lg-switch__thumb", thumbClassName)}
        intensity={intensity}
        kind="pill"
        radius={radius}
        refraction={{
          ...defaultSwitchThumbRefraction,
          ...refraction,
          radius: Number(radius) || 46
        }}
      >
        {null}
      </LiquidSurface>
    </button>
  );
});
