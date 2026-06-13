import type { DateRange } from "react-day-picker";

export type LiquidDatePickerMode = "single" | "range";
export type LiquidDatePickerValue = Date | DateRange | undefined;

export type DatePickerFormatOptions = {
  locale?: string;
  placeholder?: string;
};

export function formatDatePickerValue(
  value: LiquidDatePickerValue,
  mode: LiquidDatePickerMode = "single",
  options: DatePickerFormatOptions = {}
) {
  const placeholder =
    options.placeholder ?? (mode === "range" ? "Pick a date range" : "Pick a date");

  if (!value) {
    return placeholder;
  }

  if (mode === "range") {
    if (!isDateRangeValue(value) || !value.from) {
      return placeholder;
    }

    const from = formatDate(value.from, options.locale);
    const to = value.to ? formatDate(value.to, options.locale) : "...";
    return `${from} - ${to}`;
  }

  return value instanceof Date ? formatDate(value, options.locale) : placeholder;
}

export function getDatePickerDefaultMonth(
  value: LiquidDatePickerValue,
  fallback = startOfMonth(new Date())
) {
  if (value instanceof Date) {
    return startOfMonth(value);
  }

  if (isDateRangeValue(value) && value.from) {
    return startOfMonth(value.from);
  }

  return fallback;
}

export function isDateRangeValue(value: LiquidDatePickerValue): value is DateRange {
  return Boolean(value && !(value instanceof Date) && "from" in value);
}

function formatDate(date: Date, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
