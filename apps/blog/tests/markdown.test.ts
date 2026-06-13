import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../lib/markdown";

describe("markdown rendering", () => {
  it("wraps tables in a keyboard-focusable scroll region", async () => {
    const html = await renderMarkdown(`
| Goal | Constraint |
| --- | --- |
| Reliable links | Recover the route |
`);

    expect(html).toContain('class="table-scroll"');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Scrollable table"');
    expect(html).toContain("<table>");
  });
});
