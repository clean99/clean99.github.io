"use client";

import {
  forwardRef,
  useId,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type InputHTMLAttributes
} from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> & {
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "kind">;
};

const defaultSliderThumbRefraction = {
  blur: 0,
  glassThickness: 60,
  bezelWidth: 14,
  refractiveIndex: 1.5,
  radius: 30,
  specularOpacity: 0.4,
  specularAngle: 0.78
};

export const LiquidSlider = forwardRef<HTMLInputElement, LiquidSliderProps>(function LiquidSlider(
  {
    className,
    defaultValue = 10,
    disabled,
    max = 100,
    min = 0,
    onChange,
    surfaceProps,
    value,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(Number(defaultValue));
  const isControlled = value !== undefined;
  const numericValue = Number(isControlled ? value : uncontrolledValue);
  const minValue = Number(min);
  const maxValue = Number(max);
  const progress =
    maxValue === minValue ? 0 : ((numericValue - minValue) / (maxValue - minValue)) * 100;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const inputId = props.id ?? generatedId;
  const {
    className: thumbClassName,
    intensity = "strong",
    radius = 30,
    refraction,
    ...restSurfaceProps
  } = surfaceProps ?? {};

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setUncontrolledValue(Number(event.currentTarget.value));
    }
    onChange?.(event);
  };

  return (
    <div
      className={cn("lg-slider", className)}
      data-disabled={disabled ? "" : undefined}
      style={{ "--lg-slider-progress": `${clampedProgress}%` } as CSSProperties}
    >
      <div aria-hidden="true" className="lg-slider__track">
        <span className="lg-slider__fill" />
      </div>
      <LiquidSurface
        {...restSurfaceProps}
        aria-hidden="true"
        className={cn("lg-slider__thumb", thumbClassName)}
        intensity={intensity}
        kind="pill"
        radius={radius}
        refraction={{
          ...defaultSliderThumbRefraction,
          ...refraction,
          radius: Number(radius) || 30
        }}
      >
        {null}
      </LiquidSurface>
      <input
        {...props}
        className="lg-slider__input"
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        onChange={handleChange}
        ref={ref}
        type="range"
        value={isControlled ? value : uncontrolledValue}
      />
    </div>
  );
});
