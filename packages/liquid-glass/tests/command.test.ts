import { describe, expect, it } from "vitest";
import {
  filterLiquidCommandItems,
  getSelectableCommandItems,
  normalizeCommandText,
  resolveCommandNavigationValue,
  type LiquidCommandItemRecord
} from "../src/utils/command";

const items: LiquidCommandItemRecord[] = [
  {
    id: "cmd-1",
    searchText: "Open Writing",
    value: "writing",
    keywords: ["posts", "articles"]
  },
  {
    id: "cmd-2",
    searchText: "Open Projects",
    value: "projects",
    keywords: ["work"]
  },
  {
    disabled: true,
    id: "cmd-3",
    searchText: "Hidden Admin",
    value: "admin"
  }
];

describe("command utilities", () => {
  it("normalizes command text for deterministic filtering", () => {
    expect(normalizeCommandText("  Café   Writing  ")).toBe("cafe writing");
  });

  it("filters command items by value, label, and keywords", () => {
    expect(filterLiquidCommandItems(items, "articles").map((item) => item.value)).toEqual([
      "writing"
    ]);
    expect(filterLiquidCommandItems(items, "OPEN PROJECTS").map((item) => item.value)).toEqual([
      "projects"
    ]);
  });

  it("returns all items for an empty query and selectable items for navigation", () => {
    expect(filterLiquidCommandItems(items, "")).toHaveLength(3);
    expect(getSelectableCommandItems(items, "").map((item) => item.value)).toEqual([
      "writing",
      "projects"
    ]);
  });

  it("wraps command navigation unless loop is disabled", () => {
    const selectableItems = getSelectableCommandItems(items, "");

    expect(resolveCommandNavigationValue(selectableItems, "writing", "next")).toBe("projects");
    expect(resolveCommandNavigationValue(selectableItems, "projects", "next")).toBe("writing");
    expect(resolveCommandNavigationValue(selectableItems, "writing", "previous", false)).toBe(
      "writing"
    );
  });
});
