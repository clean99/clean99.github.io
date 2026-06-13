"use client";

import { forwardRef, useState } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";

export type LiquidToggleProps = Omit<LiquidSurfaceProps, "as" | "aria-pressed" | "kind"> & {
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  pressed?: boolean;
};

export const LiquidToggle = forwardRef<HTMLElement, LiquidToggleProps>(function LiquidToggle(
  { defaultPressed = false, disabled, onPressedChange, pressed, ...props },
  ref
) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
  const isControlled = typeof pressed === "boolean";
  const currentPressed = isControlled ? pressed : uncontrolledPressed;

  return (
    <LiquidSurface
      {...props}
      as="button"
      aria-pressed={currentPressed}
      data-state={currentPressed ? "on" : "off"}
      disabled={disabled}
      interactive
      kind="toggle"
      onClick={(event) => {
        if (disabled) {
          return;
        }

        const nextPressed = !currentPressed;
        if (!isControlled) {
          setUncontrolledPressed(nextPressed);
        }
        onPressedChange?.(nextPressed);
        props.onClick?.(event);
      }}
      radius={props.radius ?? "pill"}
      ref={ref}
      type={props.type ?? "button"}
    />
  );
});
