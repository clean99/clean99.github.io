"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";
import { continuousPlateRefraction } from "../utils/refraction";

export type LiquidTabsItem = {
  content: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

export type LiquidTabsSurfaceProps = Omit<LiquidSurfaceProps, "as" | "children" | "kind" | "role">;

export type LiquidTabsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  "aria-label": string;
  activationMode?: "automatic" | "manual";
  defaultValue?: string;
  items: LiquidTabsItem[];
  listClassName?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  panelClassName?: string;
  surfaceProps?: LiquidTabsSurfaceProps;
  value?: string;
};

export const LiquidTabs = forwardRef<HTMLDivElement, LiquidTabsProps>(function LiquidTabs(
  {
    "aria-label": ariaLabel,
    activationMode = "automatic",
    className,
    defaultValue,
    items,
    listClassName,
    onValueChange,
    orientation = "horizontal",
    panelClassName,
    surfaceProps,
    value,
    ...props
  },
  ref
) {
  const baseId = useStableId("lg-tabs");
  const firstEnabledValue = useMemo(
    () => items.find((item) => !item.disabled)?.value ?? items[0]?.value ?? "",
    [items]
  );
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? firstEnabledValue);
  const selectedValue = value ?? uncontrolledValue;
  const resolvedValue = items.some((item) => item.value === selectedValue)
    ? selectedValue
    : firstEnabledValue;
  const [focusedValue, setFocusedValue] = useState(resolvedValue);
  const enabledItems = useMemo(
    () => items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled),
    [items]
  );
  const rovingValue = enabledItems.some(({ item }) => item.value === focusedValue)
    ? focusedValue
    : resolvedValue;
  const {
    className: surfaceClassName,
    radius = "pill",
    refraction,
    ...resolvedSurfaceProps
  } = surfaceProps ?? {};

  useEffect(() => {
    if (!isControlled && selectedValue !== resolvedValue) {
      setUncontrolledValue(resolvedValue);
    }
  }, [isControlled, resolvedValue, selectedValue]);

  useEffect(() => {
    setFocusedValue(resolvedValue);
  }, [resolvedValue]);

  const activateValue = (nextValue: string) => {
    const nextItem = items.find((item) => item.value === nextValue);
    if (!nextItem || nextItem.disabled || nextValue === resolvedValue) {
      return;
    }

    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  const focusValue = (nextValue: string) => {
    const nextIndex = items.findIndex((item) => item.value === nextValue);
    if (nextIndex < 0) {
      return;
    }

    setFocusedValue(nextValue);
    window.requestAnimationFrame(() => {
      document.getElementById(getTabId(baseId, nextIndex))?.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
    const currentIndex = enabledItems.findIndex(({ item }) => item.value === currentValue);
    if (currentIndex < 0 || enabledItems.length === 0) {
      return;
    }

    const isHorizontal = orientation === "horizontal";
    const isPreviousKey = event.key === (isHorizontal ? "ArrowLeft" : "ArrowUp");
    const isNextKey = event.key === (isHorizontal ? "ArrowRight" : "ArrowDown");
    const isActivationKey = event.key === "Enter" || event.key === " ";

    if (activationMode === "manual" && isActivationKey) {
      event.preventDefault();
      activateValue(currentValue);
      return;
    }

    if (!isPreviousKey && !isNextKey && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();
    let nextIndex = currentIndex;
    if (isPreviousKey) {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (isNextKey) {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    }

    const nextValue = enabledItems[nextIndex]?.item.value;
    if (!nextValue) {
      return;
    }

    focusValue(nextValue);
    if (activationMode === "automatic") {
      activateValue(nextValue);
    }
  };

  return (
    <div
      {...props}
      className={cn("lg-tabs", orientation === "vertical" && "lg-tabs--vertical", className)}
      data-orientation={orientation}
      ref={ref}
    >
      <LiquidSurface
        {...resolvedSurfaceProps}
        as="div"
        className={cn("lg-tabs__list", listClassName, surfaceClassName)}
        kind="panel"
        radius={radius}
        refraction={{ ...continuousPlateRefraction, ...refraction }}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
      >
        {items.map((item, index) => {
          const isSelected = item.value === resolvedValue;

          return (
            <button
              aria-controls={getPanelId(baseId, index)}
              aria-disabled={item.disabled ? true : undefined}
              aria-selected={isSelected}
              className="lg-tabs__tab"
              disabled={item.disabled}
              id={getTabId(baseId, index)}
              key={item.value}
              onClick={() => {
                setFocusedValue(item.value);
                activateValue(item.value);
              }}
              onKeyDown={(event) => handleKeyDown(event, item.value)}
              role="tab"
              tabIndex={item.disabled ? -1 : item.value === rovingValue ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </LiquidSurface>

      {items.map((item, index) => (
        <div
          aria-labelledby={getTabId(baseId, index)}
          className={cn("lg-tabs__panel", panelClassName)}
          hidden={item.value !== resolvedValue}
          id={getPanelId(baseId, index)}
          key={item.value}
          role="tabpanel"
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
});

function getTabId(baseId: string, index: number) {
  return `${baseId}-tab-${index}`;
}

function getPanelId(baseId: string, index: number) {
  return `${baseId}-panel-${index}`;
}
