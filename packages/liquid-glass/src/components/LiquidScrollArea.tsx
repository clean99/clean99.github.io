"use client";

import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  maxHeight?: CSSProperties["maxHeight"];
  orientation?: "both" | "horizontal" | "vertical";
  viewportProps?: HTMLAttributes<HTMLDivElement>;
};

export const LiquidScrollArea = forwardRef<HTMLDivElement, LiquidScrollAreaProps>(
  function LiquidScrollArea(
    {
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      children,
      className,
      maxHeight,
      orientation = "vertical",
      style,
      viewportProps,
      ...props
    },
    ref
  ) {
    const {
      className: viewportClassName,
      style: viewportStyle,
      tabIndex = 0,
      ...restViewportProps
    } = viewportProps ?? {};
    const labelled = ariaLabel || ariaLabelledBy;

    return (
      <div
        {...props}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn("lg-scroll-area", className)}
        data-orientation={orientation}
        ref={ref}
        role={labelled ? "region" : undefined}
        style={{ "--lg-scroll-area-max-height": maxHeight, ...style } as CSSProperties}
      >
        <div
          {...restViewportProps}
          className={cn("lg-scroll-area__viewport", viewportClassName)}
          data-orientation={orientation}
          style={viewportStyle}
          tabIndex={tabIndex}
        >
          {children}
        </div>
      </div>
    );
  }
);
