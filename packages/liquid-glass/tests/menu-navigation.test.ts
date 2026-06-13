import { describe, expect, it } from "vitest";
import {
  getEnabledMenuItemIndexes,
  resolveMenuNavigationIndex
} from "../src/utils/menu-navigation";

describe("menu navigation", () => {
  it("returns enabled menu item indexes", () => {
    expect(getEnabledMenuItemIndexes([false, true, false, true])).toEqual([0, 2]);
  });

  it("resolves first and last enabled menu items", () => {
    const disabledItems = [true, false, false, true];

    expect(resolveMenuNavigationIndex(disabledItems, 2, "first")).toBe(1);
    expect(resolveMenuNavigationIndex(disabledItems, 1, "last")).toBe(2);
  });

  it("wraps next and previous navigation across disabled items", () => {
    const disabledItems = [false, true, false, false];

    expect(resolveMenuNavigationIndex(disabledItems, 0, "next")).toBe(2);
    expect(resolveMenuNavigationIndex(disabledItems, 2, "previous")).toBe(0);
    expect(resolveMenuNavigationIndex(disabledItems, 3, "next")).toBe(0);
    expect(resolveMenuNavigationIndex(disabledItems, 0, "previous")).toBe(3);
  });

  it("returns -1 when no item can receive focus", () => {
    expect(resolveMenuNavigationIndex([true, true], 0, "next")).toBe(-1);
  });
});
