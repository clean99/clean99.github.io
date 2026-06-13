import { describe, expect, it } from "vitest";
import {
  buildChartStyleText,
  getChartPayloadKey,
  getChartSeriesColor,
  getChartSeriesLabel,
  type LiquidChartConfig,
  type LiquidChartPayloadItem
} from "../src/utils/chart";

const chartConfig = {
  desktop: {
    color: "var(--chart-1)",
    label: "Desktop"
  },
  mobile: {
    label: "Mobile",
    theme: {
      dark: "oklch(0.7 0.18 250)",
      light: "oklch(0.62 0.2 220)"
    }
  }
} satisfies LiquidChartConfig;

describe("chart utilities", () => {
  it("builds scoped chart color variables for light and dark themes", () => {
    expect(buildChartStyleText("chart-a", chartConfig)).toBe(
      [
        '[data-chart="chart-a"]{--color-desktop:var(--chart-1);--color-mobile:oklch(0.62 0.2 220);}',
        '[data-lg-theme="dark"] [data-chart="chart-a"]{--color-mobile:oklch(0.7 0.18 250);}'
      ].join("\n")
    );
  });

  it("resolves series labels from config without coupling to chart data", () => {
    expect(getChartSeriesLabel(chartConfig, "desktop")).toBe("Desktop");
    expect(getChartSeriesLabel(chartConfig, "unknown", "Unknown")).toBe("Unknown");
  });

  it("resolves series colors from config or payload fallbacks", () => {
    const payload = {
      color: "#111827",
      dataKey: "unknown",
      fill: "#2563eb"
    } satisfies LiquidChartPayloadItem;

    expect(getChartSeriesColor(chartConfig, "desktop", payload)).toBe("var(--chart-1)");
    expect(getChartSeriesColor(chartConfig, "unknown", payload)).toBe("#111827");
  });

  it("resolves tooltip keys from explicit nameKey before recharts fallback keys", () => {
    const payload = {
      dataKey: "visitors",
      name: "fallback",
      payload: {
        browser: "safari"
      }
    } satisfies LiquidChartPayloadItem;

    expect(getChartPayloadKey(payload, "browser")).toBe("safari");
    expect(getChartPayloadKey(payload)).toBe("visitors");
  });
});
