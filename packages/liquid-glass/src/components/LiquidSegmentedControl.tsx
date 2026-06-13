"use client";

import { forwardRef, useMemo } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { LiquidButton } from "./LiquidButton";
import { continuousPlateRefraction } from "../utils/refraction";

export type LiquidSegmentedControlItem = {
  disabled?: boolean;
  label: React.ReactNode;
  value: string;
};

export type LiquidSegmentedControlProps = Omit<LiquidSurfaceProps, "as" | "children" | "kind"> & {
  "aria-label": string;
  items: LiquidSegmentedControlItem[];
  onValueChange?: (value: string) => void;
  value: string;
};

export const LiquidSegmentedControl = forwardRef<HTMLElement, LiquidSegmentedControlProps>(
  function LiquidSegmentedControl(
    { items, onValueChange, value, className, radius = "pill", refraction, ...props },
    ref
  ) {
    const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);

    return (
      <LiquidSurface
        {...props}
        as="div"
        className={["lg-segmented-control", className].filter(Boolean).join(" ")}
        kind="panel"
        radius={radius}
        ref={ref}
        refraction={{ ...continuousPlateRefraction, ...refraction }}
        role="radiogroup"
      >
        {items.map((item) => (
          <LiquidButton
            aria-checked={item.value === value}
            className="lg-segmented-control__item"
            disabled={item.disabled}
            fallback={props.fallback}
            intensity={props.intensity ?? "subtle"}
            key={item.value}
            mode="solid"
            onClick={() => {
              if (!item.disabled && item.value !== value) {
                onValueChange?.(item.value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }

              event.preventDefault();
              const currentIndex = enabledItems.findIndex(
                (enabledItem) => enabledItem.value === value
              );
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const nextIndex =
                (currentIndex + direction + enabledItems.length) % enabledItems.length;
              const nextItem = enabledItems[nextIndex];
              if (nextItem) {
                onValueChange?.(nextItem.value);
              }
            }}
            role="radio"
            tabIndex={item.value === value ? 0 : -1}
          >
            {item.label}
          </LiquidButton>
        ))}
      </LiquidSurface>
    );
  }
);
