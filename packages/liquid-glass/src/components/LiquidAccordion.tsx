"use client";

import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

export type LiquidAccordionType = "single" | "multiple";

export type LiquidAccordionValue = string | string[];

export type LiquidAccordionItem = {
  content: ReactNode;
  disabled?: boolean;
  title: ReactNode;
  value: string;
};

export type LiquidAccordionSurfaceProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "disabled" | "kind" | "role"
>;

export type LiquidAccordionProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  collapsible?: boolean;
  contentClassName?: string;
  defaultValue?: LiquidAccordionValue;
  itemClassName?: string;
  items: LiquidAccordionItem[];
  onValueChange?: (value: LiquidAccordionValue) => void;
  surfaceProps?: LiquidAccordionSurfaceProps;
  type?: LiquidAccordionType;
  value?: LiquidAccordionValue;
};

export const LiquidAccordion = forwardRef<HTMLDivElement, LiquidAccordionProps>(
  function LiquidAccordion(
    {
      className,
      collapsible,
      contentClassName,
      defaultValue,
      itemClassName,
      items,
      onValueChange,
      surfaceProps,
      type = "single",
      value,
      ...props
    },
    ref
  ) {
    const baseId = useStableId("lg-accordion");
    const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState<LiquidAccordionValue>(
      defaultValue ?? (type === "multiple" ? [] : "")
    );
    const openValues = useMemo(
      () => normalizeAccordionValue(value ?? uncontrolledValue, type, items),
      [items, type, uncontrolledValue, value]
    );
    const enabledItems = useMemo(
      () => items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled),
      [items]
    );
    const canCollapse = collapsible ?? type === "multiple";
    const {
      className: surfaceClassName,
      intensity = "subtle",
      radius = "xl",
      ...resolvedSurfaceProps
    } = surfaceProps ?? {};

    const commitValues = (nextValues: string[]) => {
      const nextValue = type === "multiple" ? nextValues : (nextValues[0] ?? "");

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    };

    const toggleValue = (item: LiquidAccordionItem) => {
      if (item.disabled) {
        return;
      }

      const isOpen = openValues.includes(item.value);
      if (type === "multiple") {
        commitValues(
          isOpen
            ? openValues.filter((openValue) => openValue !== item.value)
            : [...openValues, item.value]
        );
        return;
      }

      if (isOpen && !canCollapse) {
        return;
      }

      commitValues(isOpen ? [] : [item.value]);
    };

    const focusEnabledItem = (
      currentValue: string,
      direction: "next" | "previous" | "first" | "last"
    ) => {
      const currentEnabledIndex = enabledItems.findIndex(({ item }) => item.value === currentValue);
      if (currentEnabledIndex < 0 || enabledItems.length === 0) {
        return;
      }

      let nextEnabledIndex = currentEnabledIndex;
      if (direction === "next") {
        nextEnabledIndex = (currentEnabledIndex + 1) % enabledItems.length;
      } else if (direction === "previous") {
        nextEnabledIndex = (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
      } else if (direction === "first") {
        nextEnabledIndex = 0;
      } else {
        nextEnabledIndex = enabledItems.length - 1;
      }

      const nextIndex = enabledItems[nextEnabledIndex]?.index;
      if (nextIndex === undefined) {
        return;
      }

      triggerRefs.current[nextIndex]?.focus();
    };

    const handleTriggerKeyDown = (
      event: KeyboardEvent<HTMLButtonElement>,
      currentValue: string
    ) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusEnabledItem(currentValue, "next");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusEnabledItem(currentValue, "previous");
      } else if (event.key === "Home") {
        event.preventDefault();
        focusEnabledItem(currentValue, "first");
      } else if (event.key === "End") {
        event.preventDefault();
        focusEnabledItem(currentValue, "last");
      }
    };

    return (
      <div {...props} className={cn("lg-accordion", className)} ref={ref}>
        {items.map((item, index) => {
          const isOpen = openValues.includes(item.value);
          const triggerId = getAccordionTriggerId(baseId, index);
          const panelId = getAccordionPanelId(baseId, index);

          return (
            <LiquidSurface
              {...resolvedSurfaceProps}
              as="section"
              className={cn("lg-accordion__item", itemClassName, surfaceClassName)}
              data-state={isOpen ? "open" : "closed"}
              disabled={item.disabled}
              intensity={intensity}
              key={item.value}
              kind="panel"
              radius={radius}
            >
              <h3 className="lg-accordion__heading">
                <button
                  aria-controls={panelId}
                  aria-disabled={item.disabled ? true : undefined}
                  aria-expanded={isOpen}
                  className="lg-accordion__trigger"
                  disabled={item.disabled}
                  id={triggerId}
                  onClick={() => toggleValue(item)}
                  onKeyDown={(event) => handleTriggerKeyDown(event, item.value)}
                  ref={(node) => {
                    triggerRefs.current[index] = node;
                  }}
                  type="button"
                >
                  <span className="lg-accordion__title">{item.title}</span>
                  <span aria-hidden="true" className="lg-accordion__chevron">
                    +
                  </span>
                </button>
              </h3>
              <div
                aria-labelledby={triggerId}
                className={cn("lg-accordion__panel", contentClassName)}
                hidden={!isOpen}
                id={panelId}
                role="region"
              >
                {item.content}
              </div>
            </LiquidSurface>
          );
        })}
      </div>
    );
  }
);

function normalizeAccordionValue(
  value: LiquidAccordionValue,
  type: LiquidAccordionType,
  items: LiquidAccordionItem[]
) {
  const knownValues = new Set(items.map((item) => item.value));
  const nextValues = Array.isArray(value) ? value : value ? [value] : [];
  const filteredValues = nextValues.filter((nextValue) => knownValues.has(nextValue));

  return type === "multiple" ? filteredValues : filteredValues.slice(0, 1);
}

function getAccordionTriggerId(baseId: string, index: number) {
  return `${baseId}-trigger-${index}`;
}

function getAccordionPanelId(baseId: string, index: number) {
  return `${baseId}-panel-${index}`;
}
