"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { LiquidCalendar, type LiquidCalendarProps } from "./LiquidCalendar";
import {
  LiquidPopover,
  LiquidPopoverContent,
  type LiquidPopoverContentProps,
  LiquidPopoverTrigger
} from "./LiquidPopover";
import { cn } from "../utils/cn";
import {
  formatDatePickerValue,
  getDatePickerDefaultMonth,
  type LiquidDatePickerMode
} from "../utils/date-picker";

type CommonDatePickerProps = {
  "aria-label"?: string;
  calendarProps?: Omit<LiquidCalendarProps, "mode" | "onSelect" | "selected">;
  className?: string;
  disabled?: boolean;
  locale?: string;
  placeholder?: string;
  popoverProps?: Omit<LiquidPopoverContentProps, "children">;
};

export type LiquidDatePickerSingleProps = CommonDatePickerProps & {
  defaultValue?: Date;
  mode?: "single";
  onValueChange?: (value: Date | undefined) => void;
  value?: Date;
};

export type LiquidDatePickerRangeProps = CommonDatePickerProps & {
  defaultValue?: DateRange;
  mode: "range";
  onValueChange?: (value: DateRange | undefined) => void;
  value?: DateRange;
};

export type LiquidDatePickerProps = LiquidDatePickerSingleProps | LiquidDatePickerRangeProps;

export function LiquidDatePicker(props: LiquidDatePickerProps) {
  const {
    "aria-label": ariaLabel,
    calendarProps,
    className,
    disabled = false,
    locale,
    placeholder,
    popoverProps
  } = props;
  const mode: LiquidDatePickerMode = props.mode ?? "single";
  const [open, setOpen] = useState(false);
  const [uncontrolledSingleValue, setUncontrolledSingleValue] = useState<Date | undefined>(
    getInitialSingleValue(props)
  );
  const [uncontrolledRangeValue, setUncontrolledRangeValue] = useState<DateRange | undefined>(
    getInitialRangeValue(props)
  );
  const triggerLabel = ariaLabel ?? (mode === "range" ? "Choose date range" : "Choose date");

  const handleSingleSelect = (nextValue: Date | undefined) => {
    if (props.mode === "range") {
      return;
    }

    if (props.value === undefined) {
      setUncontrolledSingleValue(nextValue);
    }
    props.onValueChange?.(nextValue);
    setOpen(false);
  };

  const handleRangeSelect = (nextValue: DateRange | undefined) => {
    if (props.mode !== "range") {
      return;
    }

    if (props.value === undefined) {
      setUncontrolledRangeValue(nextValue);
    }
    props.onValueChange?.(nextValue);

    if (nextValue?.from && nextValue.to) {
      setOpen(false);
    }
  };

  if (props.mode === "range") {
    const rangeValue = props.value ?? uncontrolledRangeValue;
    const resolvedLabel = formatDatePickerValue(rangeValue, "range", { locale, placeholder });
    const defaultMonth = getDatePickerDefaultMonth(
      rangeValue,
      calendarProps?.defaultMonth
        ? getDatePickerDefaultMonth(calendarProps.defaultMonth)
        : new Date()
    );

    return (
      <LiquidPopover onOpenChange={setOpen} open={open}>
        <LiquidPopoverTrigger
          aria-label={triggerLabel}
          className={cn("lg-date-picker__trigger", className)}
          data-placeholder={!rangeValue ? "" : undefined}
          disabled={disabled}
        >
          <span className="lg-date-picker__icon" aria-hidden="true" />
          <span className="lg-date-picker__value">{resolvedLabel}</span>
        </LiquidPopoverTrigger>
        <LiquidPopoverContent
          {...popoverProps}
          className={cn("lg-date-picker__content", popoverProps?.className)}
          forceMount={popoverProps?.forceMount}
        >
          <LiquidCalendar
            {...calendarProps}
            defaultMonth={defaultMonth}
            mode="range"
            onSelect={handleRangeSelect}
            selected={rangeValue}
          />
        </LiquidPopoverContent>
      </LiquidPopover>
    );
  }

  const singleValue = props.value ?? uncontrolledSingleValue;
  const resolvedLabel = formatDatePickerValue(singleValue, "single", { locale, placeholder });
  const defaultMonth = getDatePickerDefaultMonth(
    singleValue,
    calendarProps?.defaultMonth ? getDatePickerDefaultMonth(calendarProps.defaultMonth) : new Date()
  );

  return (
    <LiquidPopover onOpenChange={setOpen} open={open}>
      <LiquidPopoverTrigger
        aria-label={triggerLabel}
        className={cn("lg-date-picker__trigger", className)}
        data-placeholder={!singleValue ? "" : undefined}
        disabled={disabled}
      >
        <span className="lg-date-picker__icon" aria-hidden="true" />
        <span className="lg-date-picker__value">{resolvedLabel}</span>
      </LiquidPopoverTrigger>
      <LiquidPopoverContent
        {...popoverProps}
        className={cn("lg-date-picker__content", popoverProps?.className)}
        forceMount={popoverProps?.forceMount}
      >
        <LiquidCalendar
          {...calendarProps}
          defaultMonth={defaultMonth}
          mode="single"
          onSelect={handleSingleSelect}
          selected={singleValue}
        />
      </LiquidPopoverContent>
    </LiquidPopover>
  );
}

function getInitialSingleValue(props: LiquidDatePickerProps) {
  return props.mode === "range" ? undefined : props.defaultValue;
}

function getInitialRangeValue(props: LiquidDatePickerProps) {
  return props.mode === "range" ? props.defaultValue : undefined;
}
