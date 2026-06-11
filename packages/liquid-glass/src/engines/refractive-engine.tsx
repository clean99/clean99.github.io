"use client";

import {
  createElement,
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref
} from "react";
import { refractive } from "@hashintel/refractive";
import type { LiquidEngineProps } from "./engine-props";

type RefractiveHostProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  ref?: Ref<HTMLElement>;
  type?: string;
};

function Host({ as: Component = "div", children, ref, ...props }: RefractiveHostProps) {
  return createElement(Component, { ...props, ref }, children);
}

const RefractiveHost = refractive(Host);

export const RefractiveEngine = forwardRef<HTMLElement, LiquidEngineProps>(
  function RefractiveEngine({ refraction, ...props }, ref) {
    if (!refraction) {
      return createElement(Host, { ...props, ref }, props.children);
    }

    return createElement(RefractiveHost, { ...props, ref, refraction }, props.children);
  }
);
