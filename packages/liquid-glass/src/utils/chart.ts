import type { CSSProperties, ComponentType, ReactNode } from "react";

export type LiquidChartTheme = "dark" | "light";

export type LiquidChartConfigItem = {
  color?: string;
  icon?: ComponentType;
  label?: ReactNode;
  theme?: Partial<Record<LiquidChartTheme, string>>;
};

export type LiquidChartConfig = Record<string, LiquidChartConfigItem>;

export type LiquidChartPayloadItem = {
  color?: string;
  dataKey?: string | number;
  fill?: string;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: unknown;
  [key: string]: unknown;
};

export function buildChartStyleText(chartId: string, config: LiquidChartConfig) {
  const lightVariables = buildChartDeclarations(config, "light");
  const darkVariables = buildChartDeclarations(config, "dark");
  const selector = `[data-chart="${escapeCssAttribute(chartId)}"]`;
  const rules = [];

  if (lightVariables.length > 0) {
    rules.push(`${selector}{${lightVariables.join("")}}`);
  }

  if (darkVariables.length > 0) {
    rules.push(`[data-lg-theme="dark"] ${selector}{${darkVariables.join("")}}`);
  }

  return rules.join("\n");
}

export function buildChartCssProperties(config: LiquidChartConfig): CSSProperties {
  return Object.entries(config).reduce<CSSProperties>((style, [key, item]) => {
    const color = item.color ?? item.theme?.light;

    if (color) {
      (style as Record<string, string>)[`--color-${formatChartKey(key)}`] = color;
    }

    return style;
  }, {});
}

export function getChartPayloadKey(
  item: LiquidChartPayloadItem | undefined,
  nameKey?: string
): string | number | undefined {
  if (!item) {
    return undefined;
  }

  const explicitKey = nameKey ? (item.payload?.[nameKey] ?? item[nameKey]) : undefined;

  return toChartKey(explicitKey ?? item.dataKey ?? item.name);
}

export function getChartSeriesLabel(
  config: LiquidChartConfig,
  key: string | number | undefined,
  fallback?: ReactNode
) {
  if (key === undefined) {
    return fallback;
  }

  return config[String(key)]?.label ?? fallback ?? String(key);
}

export function getChartSeriesColor(
  config: LiquidChartConfig,
  key: string | number | undefined,
  item?: LiquidChartPayloadItem
) {
  if (key !== undefined) {
    const chartItem = config[String(key)];
    const configuredColor = chartItem?.color ?? chartItem?.theme?.light;

    if (configuredColor) {
      return configuredColor;
    }
  }

  return item?.color ?? item?.fill;
}

function buildChartDeclarations(config: LiquidChartConfig, theme: LiquidChartTheme) {
  return Object.entries(config).flatMap(([key, item]) => {
    const color = theme === "light" ? (item.color ?? item.theme?.light) : item.theme?.dark;

    return color ? [`--color-${formatChartKey(key)}:${color};`] : [];
  });
}

function formatChartKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeCssAttribute(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

function toChartKey(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return undefined;
}
