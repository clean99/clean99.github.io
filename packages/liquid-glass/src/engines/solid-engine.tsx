"use client";

import { createElement, forwardRef } from "react";
import type { LiquidEngineProps } from "./engine-props";

export const SolidEngine = forwardRef<HTMLElement, LiquidEngineProps>(function SolidEngine(
  { as: Component = "div", children, ...props },
  ref
) {
  return createElement(Component, { ...props, ref }, children);
});
