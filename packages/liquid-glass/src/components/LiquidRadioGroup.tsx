"use client";

import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { cn } from "../utils/cn";
import { useStableId } from "../hooks/use-stable-id";

export type LiquidRadioGroupOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

export type LiquidRadioGroupProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: LiquidRadioGroupOption[];
  orientation?: "horizontal" | "vertical";
  value?: string;
};

export type LiquidRadioInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const LiquidRadioGroup = forwardRef<HTMLDivElement, LiquidRadioGroupProps>(
  function LiquidRadioGroup(
    {
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      className,
      defaultValue,
      name,
      onKeyDown,
      onValueChange,
      options,
      orientation = "vertical",
      value,
      ...props
    },
    ref
  ) {
    const generatedName = useStableId("lg-radio");
    const groupName = name ?? generatedName;
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const currentValue = value ?? internalValue;
    const enabledOptions = useMemo(() => options.filter((option) => !option.disabled), [options]);

    const commitValue = (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || enabledOptions.length === 0) {
        return;
      }

      const direction = resolveRadioKeyDirection(event.key, orientation);
      if (direction === 0) {
        return;
      }

      event.preventDefault();
      const currentIndex = Math.max(
        0,
        enabledOptions.findIndex((option) => option.value === currentValue)
      );
      const nextOption =
        enabledOptions[(currentIndex + direction + enabledOptions.length) % enabledOptions.length];
      const nextIndex = options.findIndex((option) => option.value === nextOption.value);
      commitValue(nextOption.value);
      inputRefs.current[nextIndex]?.focus();
    };

    return (
      <div
        {...props}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-orientation={orientation}
        className={cn("lg-radio-group", className)}
        data-orientation={orientation}
        onKeyDown={handleKeyDown}
        ref={ref}
        role="radiogroup"
      >
        {options.map((option, index) => {
          const checked = option.value === currentValue;

          return (
            <label
              className="lg-radio-group__item"
              data-disabled={option.disabled ? "" : undefined}
              data-state={checked ? "checked" : "unchecked"}
              key={option.value}
            >
              <input
                checked={checked}
                className="lg-radio-group__input"
                disabled={option.disabled}
                name={groupName}
                onChange={() => {
                  if (!option.disabled) {
                    commitValue(option.value);
                  }
                }}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="radio"
                value={option.value}
              />
              <span aria-hidden="true" className="lg-radio-group__control" />
              <span className="lg-radio-group__body">
                <span className="lg-radio-group__label">{option.label}</span>
                {option.description ? (
                  <span className="lg-radio-group__description">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    );
  }
);

function resolveRadioKeyDirection(key: string, orientation: "horizontal" | "vertical"): number {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return orientation === "horizontal" || key === "ArrowDown" ? 1 : 0;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return orientation === "horizontal" || key === "ArrowUp" ? -1 : 0;
  }

  return 0;
}
