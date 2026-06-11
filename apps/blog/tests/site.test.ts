import { describe, expect, it } from "vitest";
import { requiredStaticRoutes, siteNavigation } from "../lib/site";

describe("site scaffold", () => {
  it("keeps Interviewers out of primary navigation", () => {
    expect(siteNavigation.map((item) => item.href)).not.toContain("/interviewers/");
  });

  it("tracks required static compatibility routes", () => {
    expect(requiredStaticRoutes).toContain("/About/");
    expect(requiredStaticRoutes).toContain("/about/");
    expect(requiredStaticRoutes).toContain("/llms.txt");
  });
});
