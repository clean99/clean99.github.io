"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";
import { createCalendarClassNames } from "../utils/calendar";
import { cn } from "../utils/cn";

export type LiquidCalendarProps = DayPickerProps;

export function LiquidCalendar({
  className,
  classNames,
  fixedWeeks = true,
  navLayout = "after",
  showOutsideDays = true,
  ...props
}: LiquidCalendarProps) {
  return (
    <DayPicker
      {...props}
      className={cn("lg-calendar", className)}
      classNames={createCalendarClassNames(classNames)}
      fixedWeeks={fixedWeeks}
      navLayout={navLayout}
      showOutsideDays={showOutsideDays}
    />
  );
}
