import { describe, expect, it } from "vitest";
import {
  formatSidebarSize,
  resolveSidebarState,
  resolveSidebarWidth,
  toggleSidebarOpen
} from "../src/utils/sidebar";

describe("sidebar utilities", () => {
  it("formats sidebar sizes for css variables", () => {
    expect(formatSidebarSize(320)).toBe("320px");
    expect(formatSidebarSize("18rem")).toBe("18rem");
  });

  it("resolves non-collapsible sidebars as expanded", () => {
    expect(resolveSidebarState(false, "none")).toBe("expanded");
    expect(resolveSidebarWidth(false, "none", "16rem", "3.5rem")).toBe("16rem");
  });

  it("resolves icon and offcanvas collapsed states", () => {
    expect(resolveSidebarState(false, "icon")).toBe("collapsed");
    expect(resolveSidebarWidth(false, "icon", "16rem", "3.5rem")).toBe("3.5rem");
    expect(resolveSidebarWidth(false, "offcanvas", "16rem", "3.5rem")).toBe("0px");
  });

  it("toggles open state without special cases", () => {
    expect(toggleSidebarOpen(true)).toBe(false);
    expect(toggleSidebarOpen(false)).toBe(true);
  });
});
