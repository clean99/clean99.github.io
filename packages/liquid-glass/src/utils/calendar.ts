import { getDefaultClassNames, type ClassNames } from "react-day-picker";
import { cn } from "./cn";

const liquidCalendarClassNames: Partial<ClassNames> = {
  root: "lg-calendar",
  months: "lg-calendar__months",
  month: "lg-calendar__month",
  month_caption: "lg-calendar__caption",
  caption_label: "lg-calendar__caption-label",
  nav: "lg-calendar__nav",
  button_previous: "lg-calendar__nav-button lg-calendar__nav-button--previous",
  button_next: "lg-calendar__nav-button lg-calendar__nav-button--next",
  chevron: "lg-calendar__chevron",
  dropdowns: "lg-calendar__dropdowns",
  dropdown_root: "lg-calendar__dropdown-root",
  dropdown: "lg-calendar__dropdown",
  months_dropdown: "lg-calendar__dropdown lg-calendar__dropdown--months",
  years_dropdown: "lg-calendar__dropdown lg-calendar__dropdown--years",
  month_grid: "lg-calendar__grid",
  weekdays: "lg-calendar__weekdays",
  weekday: "lg-calendar__weekday",
  weeks: "lg-calendar__weeks",
  week: "lg-calendar__week",
  week_number: "lg-calendar__week-number",
  week_number_header: "lg-calendar__week-number-header",
  day: "lg-calendar__day",
  day_button: "lg-calendar__day-button",
  today: "lg-calendar__day--today",
  outside: "lg-calendar__day--outside",
  disabled: "lg-calendar__day--disabled",
  hidden: "lg-calendar__day--hidden",
  selected: "lg-calendar__day--selected",
  range_start: "lg-calendar__day--range-start",
  range_middle: "lg-calendar__day--range-middle",
  range_end: "lg-calendar__day--range-end",
  focused: "lg-calendar__day--focused",
  footer: "lg-calendar__footer"
};

export function createCalendarClassNames(overrides: Partial<ClassNames> = {}): Partial<ClassNames> {
  const defaultClassNames = getDefaultClassNames();
  const keys = new Set([
    ...Object.keys(defaultClassNames),
    ...Object.keys(liquidCalendarClassNames),
    ...Object.keys(overrides)
  ]);
  const classNames: Partial<ClassNames> = {};

  for (const key of keys) {
    const classNameKey = key as keyof ClassNames;
    classNames[classNameKey] = cn(
      defaultClassNames[classNameKey],
      liquidCalendarClassNames[classNameKey],
      overrides[classNameKey]
    );
  }

  return classNames;
}

export function getCalendarCaptionLabel(date: Date, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}
