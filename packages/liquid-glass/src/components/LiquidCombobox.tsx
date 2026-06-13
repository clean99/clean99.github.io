"use client";

import { forwardRef, useMemo, useState, type ReactNode } from "react";
import { type LiquidButtonProps } from "./LiquidButton";
import {
  LiquidCommand,
  LiquidCommandEmpty,
  LiquidCommandGroup,
  LiquidCommandInput,
  LiquidCommandItem,
  LiquidCommandList,
  type LiquidCommandProps
} from "./LiquidCommand";
import {
  LiquidPopover,
  LiquidPopoverContent,
  LiquidPopoverTrigger,
  type LiquidPopoverContentProps
} from "./LiquidPopover";
import { cn } from "../utils/cn";

export type LiquidComboboxOption = {
  description?: ReactNode;
  disabled?: boolean;
  keywords?: string[];
  label: ReactNode;
  value: string;
};

export type LiquidComboboxProps = Omit<
  LiquidButtonProps,
  "children" | "defaultValue" | "onChange" | "onSelect" | "value"
> & {
  commandProps?: Omit<
    LiquidCommandProps,
    "children" | "defaultValue" | "onValueChange" | "onValueSelect" | "value"
  >;
  contentProps?: Omit<LiquidPopoverContentProps, "children">;
  defaultValue?: string;
  emptyMessage?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: string) => void;
  open?: boolean;
  options: LiquidComboboxOption[];
  placeholder?: ReactNode;
  renderOption?: (option: LiquidComboboxOption, selected: boolean) => ReactNode;
  searchPlaceholder?: string;
  value?: string;
};

export const LiquidCombobox = forwardRef<HTMLElement, LiquidComboboxProps>(function LiquidCombobox(
  {
    "aria-label": ariaLabel,
    className,
    commandProps,
    contentProps,
    defaultValue,
    disabled = false,
    emptyMessage = "No results found.",
    onOpenChange,
    onValueChange,
    open,
    options,
    placeholder = "Select option",
    renderOption,
    searchPlaceholder = "Search",
    value,
    ...props
  },
  ref
) {
  const isValueControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const selectedValue = value ?? uncontrolledValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue]
  );
  const isOpenControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const resolvedOpen = open ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (!isOpenControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const selectValue = (nextValue: string) => {
    if (!isValueControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <LiquidPopover onOpenChange={setOpen} open={resolvedOpen}>
      <LiquidPopoverTrigger
        {...props}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? (typeof placeholder === "string" ? placeholder : "Combobox")}
        className={cn("lg-combobox__trigger", className)}
        data-placeholder={!selectedOption ? "" : undefined}
        disabled={disabled}
        ref={ref}
        role="combobox"
      >
        <span className="lg-combobox__value">{selectedOption?.label ?? placeholder}</span>
        <span aria-hidden="true" className="lg-combobox__chevron">
          ▾
        </span>
      </LiquidPopoverTrigger>
      <LiquidPopoverContent
        {...contentProps}
        align={contentProps?.align ?? "start"}
        className={cn("lg-combobox__content", contentProps?.className)}
        radius={contentProps?.radius ?? "xl"}
        sideOffset={contentProps?.sideOffset ?? 8}
      >
        <LiquidCommand
          {...commandProps}
          className={cn("lg-combobox__command", commandProps?.className)}
          onValueSelect={selectValue}
        >
          <LiquidCommandInput placeholder={searchPlaceholder} />
          <LiquidCommandList>
            <LiquidCommandEmpty>{emptyMessage}</LiquidCommandEmpty>
            <LiquidCommandGroup>
              {options.map((option) => {
                const selected = option.value === selectedValue;

                return (
                  <LiquidCommandItem
                    disabled={option.disabled}
                    key={option.value}
                    keywords={option.keywords}
                    value={option.value}
                  >
                    {renderOption ? (
                      renderOption(option, selected)
                    ) : (
                      <>
                        <span className="lg-combobox__option-copy">
                          <span className="lg-combobox__option-label">{option.label}</span>
                          {option.description ? (
                            <span className="lg-combobox__option-description">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                        <span aria-hidden="true" className="lg-combobox__check">
                          {selected ? "✓" : ""}
                        </span>
                      </>
                    )}
                  </LiquidCommandItem>
                );
              })}
            </LiquidCommandGroup>
          </LiquidCommandList>
        </LiquidCommand>
      </LiquidPopoverContent>
    </LiquidPopover>
  );
});
