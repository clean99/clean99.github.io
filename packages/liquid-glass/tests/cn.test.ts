import { describe, expect, it } from "vitest";
import { cn } from "../src";

describe("cn", () => {
  it("joins truthy class names without adding placeholders", () => {
    expect(cn("base", false, null, undefined, "active")).toBe("base active");
  });
});
