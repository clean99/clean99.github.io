import { describe, expect, it } from "vitest";
import {
  formatDatePickerValue,
  getDatePickerDefaultMonth,
  isDateRangeValue
} from "../src/utils/date-picker";

describe("date picker utilities", () => {
  it("formats single and empty values deterministically", () => {
    expect(formatDatePickerValue(undefined, "single")).toBe("Pick a date");
    expect(formatDatePickerValue(new Date(Date.UTC(2026, 5, 12)), "single")).toBe("Jun 12, 2026");
  });

  it("formats range values including partial ranges", () => {
    expect(
      formatDatePickerValue(
        { from: new Date(Date.UTC(2026, 5, 8)), to: new Date(Date.UTC(2026, 5, 12)) },
        "range"
      )
    ).toBe("Jun 8, 2026 - Jun 12, 2026");
    expect(formatDatePickerValue({ from: new Date(Date.UTC(2026, 5, 8)) }, "range")).toBe(
      "Jun 8, 2026 - ..."
    );
  });

  it("resolves the initial calendar month from selected values", () => {
    const fallback = new Date(2026, 0, 1);
    expect(getDatePickerDefaultMonth(new Date(Date.UTC(2026, 5, 12)), fallback)).toEqual(
      new Date(2026, 5, 1)
    );
    expect(getDatePickerDefaultMonth({ from: new Date(Date.UTC(2026, 6, 8)) }, fallback)).toEqual(
      new Date(2026, 6, 1)
    );
    expect(getDatePickerDefaultMonth(undefined, fallback)).toBe(fallback);
  });

  it("detects range-shaped values", () => {
    expect(isDateRangeValue({ from: new Date(), to: undefined })).toBe(true);
    expect(isDateRangeValue(new Date())).toBe(false);
    expect(isDateRangeValue(undefined)).toBe(false);
  });
});
