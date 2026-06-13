"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactNode
} from "react";
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
  type LegendPayload,
  type ResponsiveContainerProps
} from "recharts";
import { cn } from "../utils/cn";
import {
  buildChartCssProperties,
  buildChartStyleText,
  getChartPayloadKey,
  getChartSeriesColor,
  getChartSeriesLabel,
  type LiquidChartConfig,
  type LiquidChartPayloadItem
} from "../utils/chart";

type LiquidChartContextValue = {
  config: LiquidChartConfig;
};

const LiquidChartContext = createContext<LiquidChartContextValue | null>(null);

export type LiquidChartContainerProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  chartId?: string;
  children: ResponsiveContainerProps["children"];
  config: LiquidChartConfig;
  responsiveProps?: Omit<ResponsiveContainerProps, "children" | "className">;
};

export type LiquidChartTooltipContentProps = HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  formatter?: (
    value: unknown,
    name: string | number | undefined,
    item: LiquidChartPayloadItem,
    index: number,
    payload: LiquidChartPayloadItem[]
  ) => ReactNode | [ReactNode, ReactNode];
  hideIndicator?: boolean;
  hideLabel?: boolean;
  indicator?: "dashed" | "dot" | "line";
  label?: ReactNode;
  labelFormatter?: (label: ReactNode, payload: LiquidChartPayloadItem[]) => ReactNode;
  labelKey?: string;
  nameKey?: string;
  payload?: LiquidChartPayloadItem[];
};

export type LiquidChartLegendContentProps = HTMLAttributes<HTMLDivElement> & {
  hideIcon?: boolean;
  nameKey?: string;
  payload?: ReadonlyArray<LegendPayload>;
  verticalAlign?: "bottom" | "middle" | "top";
};

export const LiquidChart = {
  Legend,
  ResponsiveContainer,
  Tooltip
};

export const LiquidChartTooltip = Tooltip;
export const LiquidChartLegend = Legend;

export function useLiquidChart() {
  const context = useContext(LiquidChartContext);

  if (!context) {
    throw new Error("useLiquidChart must be used inside <LiquidChartContainer />");
  }

  return context;
}

export const LiquidChartContainer = forwardRef<HTMLDivElement, LiquidChartContainerProps>(
  function LiquidChartContainer(
    { chartId, children, className, config, responsiveProps, style, ...props },
    ref
  ) {
    const generatedId = useId();
    const id = chartId ?? `liquid-chart-${generatedId.replace(/:/g, "")}`;

    return (
      <LiquidChartContext.Provider value={{ config }}>
        <div
          {...props}
          className={cn("lg-chart-container", className)}
          data-chart={id}
          ref={ref}
          style={{ ...buildChartCssProperties(config), ...style }}
        >
          <LiquidChartStyle chartId={id} config={config} />
          <ResponsiveContainer
            height={responsiveProps?.height ?? "100%"}
            initialDimension={responsiveProps?.initialDimension ?? { height: 320, width: 640 }}
            minHeight={responsiveProps?.minHeight ?? 240}
            width={responsiveProps?.width ?? "100%"}
            {...responsiveProps}
          >
            {children}
          </ResponsiveContainer>
        </div>
      </LiquidChartContext.Provider>
    );
  }
);

export function LiquidChartStyle({
  chartId,
  config
}: {
  chartId: string;
  config: LiquidChartConfig;
}) {
  const cssText = buildChartStyleText(chartId, config);

  if (!cssText) {
    return null;
  }

  return <style dangerouslySetInnerHTML={{ __html: cssText }} />;
}

export const LiquidChartTooltipContent = forwardRef<HTMLDivElement, LiquidChartTooltipContentProps>(
  function LiquidChartTooltipContent(
    {
      active,
      className,
      formatter,
      hideIndicator = false,
      hideLabel = false,
      indicator = "dot",
      label,
      labelFormatter,
      labelKey,
      nameKey,
      payload,
      ...props
    },
    ref
  ) {
    const { config } = useLiquidChart();
    const items = payload?.filter((item) => item.value !== null && item.value !== undefined) ?? [];

    if (!active || items.length === 0) {
      return null;
    }

    const firstKey = getChartPayloadKey(items[0], labelKey);
    const labelContent = hideLabel
      ? null
      : (labelFormatter?.(label, items) ?? getChartSeriesLabel(config, firstKey, label));

    return (
      <div {...props} className={cn("lg-chart-tooltip", className)} ref={ref} role="status">
        {labelContent ? <div className="lg-chart-tooltip__label">{labelContent}</div> : null}
        <div className="lg-chart-tooltip__items">
          {items.map((item, index) => {
            const key = getChartPayloadKey(item, nameKey);
            const name = getChartSeriesLabel(config, key, item.name);
            const color = getChartSeriesColor(config, key, item);
            const formatted = formatter?.(item.value, key, item, index, items);
            const [value, resolvedName] = Array.isArray(formatted)
              ? formatted
              : [formatted ?? item.value, name];

            return (
              <div className="lg-chart-tooltip__item" key={`${String(key)}-${index}`}>
                {hideIndicator ? null : (
                  <span
                    aria-hidden="true"
                    className="lg-chart-tooltip__indicator"
                    data-indicator={indicator}
                    style={
                      indicator === "dashed"
                        ? { borderTopColor: color }
                        : { backgroundColor: color }
                    }
                  />
                )}
                <span className="lg-chart-tooltip__name">{resolvedName}</span>
                <span className="lg-chart-tooltip__value">{value as ReactNode}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

export const LiquidChartLegendContent = forwardRef<HTMLDivElement, LiquidChartLegendContentProps>(
  function LiquidChartLegendContent(
    { className, hideIcon = false, nameKey, payload, verticalAlign = "bottom", ...props },
    ref
  ) {
    const { config } = useLiquidChart();
    const items = payload ?? [];

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        {...props}
        className={cn("lg-chart-legend", className)}
        data-vertical-align={verticalAlign}
        ref={ref}
      >
        {items.map((item) => {
          const key = getChartPayloadKey(item as LiquidChartPayloadItem, nameKey);
          const chartItem = key === undefined ? undefined : config[String(key)];
          const Icon = chartItem?.icon;
          const color = getChartSeriesColor(config, key, item as LiquidChartPayloadItem);
          const label = getChartSeriesLabel(config, key, item.value);

          return (
            <div className="lg-chart-legend__item" key={String(key ?? item.value)}>
              {hideIcon ? null : Icon ? (
                <Icon />
              ) : (
                <span
                  aria-hidden="true"
                  className="lg-chart-legend__swatch"
                  style={{ backgroundColor: color }}
                />
              )}
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
