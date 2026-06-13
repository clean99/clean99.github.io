import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiquidButton, LiquidProvider, LiquidSurface } from "../src";

describe("SSR safety", () => {
  it("renders without touching browser globals during server render", () => {
    const html = renderToString(
      <LiquidProvider defaultMode="auto">
        <LiquidSurface>Server surface</LiquidSurface>
        <LiquidButton>Server button</LiquidButton>
      </LiquidProvider>
    );

    expect(html).toContain("Server surface");
    expect(html).toContain("Server button");
    expect(html).toContain('data-liquid-mode="fallback"');
  });
});
