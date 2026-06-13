"use client";

import { createElement, forwardRef } from "react";
import type { LiquidEngineProps } from "./engine-props";

export const FallbackEngine = forwardRef<HTMLElement, LiquidEngineProps>(function FallbackEngine(
  { as: Component = "div", children, ...props },
  ref
) {
  return createElement(Component, { ...props, ref }, children);
});
