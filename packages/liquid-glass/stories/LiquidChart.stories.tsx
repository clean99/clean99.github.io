import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  LiquidChartContainer,
  LiquidChartLegend,
  LiquidChartLegendContent,
  LiquidChartTooltip,
  LiquidChartTooltipContent,
  LiquidProvider,
  LiquidTypography,
  type LiquidChartConfig
} from "../src";
import { StoryFrame } from "./story-fixtures";

const chartData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 }
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    theme: {
      dark: "oklch(0.74 0.18 232)",
      light: "oklch(0.62 0.19 232)"
    }
  },
  mobile: {
    label: "Mobile",
    theme: {
      dark: "oklch(0.7 0.18 156)",
      light: "oklch(0.58 0.17 156)"
    }
  }
} satisfies LiquidChartConfig;

const meta = {
  title: "Liquid Glass/Chart",
  parameters: { a11y: { test: "error" } }
} satisfies Meta;

export default meta;
type Story = StoryObj;

function AreaChartExample() {
  return (
    <LiquidChartContainer
      aria-label="Visitors by platform"
      className="lg-surface-scaffold"
      config={chartConfig}
      responsiveProps={{ height: 320 }}
      style={{ padding: "1.25rem" }}
    >
      <AreaChart accessibilityLayer data={chartData} margin={{ left: 8, right: 8, top: 10 }}>
        <defs>
          <linearGradient id="desktop" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="mobile" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.42} />
            <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <LiquidChartTooltip content={<LiquidChartTooltipContent indicator="line" />} />
        <LiquidChartLegend content={<LiquidChartLegendContent />} />
        <Area
          dataKey="desktop"
          fill="url(#desktop)"
          fillOpacity={1}
          stroke="var(--color-desktop)"
          strokeWidth={2}
          type="natural"
        />
        <Area
          dataKey="mobile"
          fill="url(#mobile)"
          fillOpacity={1}
          stroke="var(--color-mobile)"
          strokeWidth={2}
          type="natural"
        />
      </AreaChart>
    </LiquidChartContainer>
  );
}

export const ProductMetrics: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={920} height={620}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography as="div" variant="h2">
          Product metrics
        </LiquidTypography>
        <AreaChartExample />
      </div>
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={920} height={620}>
      <AreaChartExample />
    </StoryFrame>
  )
};

export const StandaloneTooltipLegend: Story = {
  render: () => (
    <LiquidProvider defaultMode="solid">
      <div data-lg-theme="light" style={{ display: "grid", gap: 20, padding: 32 }}>
        <LiquidChartContainer
          config={chartConfig}
          responsiveProps={{ height: 180, width: 480 }}
          style={{ minHeight: 180 }}
        >
          <div aria-label="Static chart preview" role="img" />
          <LiquidChartTooltipContent
            active
            label="June"
            payload={[
              { color: "var(--color-desktop)", dataKey: "desktop", value: 214 },
              { color: "var(--color-mobile)", dataKey: "mobile", value: 140 }
            ]}
          />
          <LiquidChartLegendContent
            payload={[
              { color: "var(--color-desktop)", dataKey: "desktop", value: "desktop" },
              { color: "var(--color-mobile)", dataKey: "mobile", value: "mobile" }
            ]}
          />
        </LiquidChartContainer>
      </div>
    </LiquidProvider>
  )
};
