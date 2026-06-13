import { describe, expect, it } from "vitest";
import { createCalendarClassNames, getCalendarCaptionLabel } from "../src/utils/calendar";

describe("calendar utilities", () => {
  it("generates stable DayPicker class names with override support", () => {
    const classNames = createCalendarClassNames({
      day: "custom-day",
      selected: "custom-selected"
    });

    expect(classNames.root).toContain("lg-calendar");
    expect(classNames.months).toContain("lg-calendar__months");
    expect(classNames.day).toContain("lg-calendar__day");
    expect(classNames.day).toContain("custom-day");
    expect(classNames.selected).toContain("lg-calendar__day--selected");
    expect(classNames.selected).toContain("custom-selected");
  });

  it("formats a deterministic accessible month caption", () => {
    expect(getCalendarCaptionLabel(new Date(Date.UTC(2026, 5, 12)))).toBe("June 2026");
  });
});
