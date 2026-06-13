"use client";

import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { clamp } from "../utils/clamp";

export type LiquidProgressProps = HTMLAttributes<HTMLDivElement> & {
  getValueLabel?: (value: number, max: number) => string;
  max?: number;
  value?: number;
};

export const LiquidProgress = forwardRef<HTMLDivElement, LiquidProgressProps>(
  function LiquidProgress(
    { className, getValueLabel, max = 100, style, value = 0, ...props },
    ref
  ) {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = clamp(Number.isFinite(value) ? value : 0, 0, safeMax);
    const percentage = Math.round((safeValue / safeMax) * 1000) / 10;

    return (
      <div
        {...props}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        aria-valuetext={getValueLabel?.(safeValue, safeMax)}
        className={cn("lg-progress", className)}
        ref={ref}
        role="progressbar"
        style={{ "--lg-progress-value": `${percentage}%`, ...style } as CSSProperties}
      >
        <span className="lg-progress__track">
          <span className="lg-progress__indicator" />
        </span>
      </div>
    );
  }
);
