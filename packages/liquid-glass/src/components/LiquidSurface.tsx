"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent
} from "react";
import { FallbackEngine } from "../engines/fallback-engine";
import { RefractiveEngine } from "../engines/refractive-engine";
import { SolidEngine } from "../engines/solid-engine";
import { useLiquidContext } from "../providers/LiquidProvider";
import type {
  LiquidFallback,
  LiquidIntensity,
  LiquidMode,
  LiquidRadius,
  LiquidSurfaceKind,
  RefractiveOptions
} from "../types";
import { useStableId } from "../hooks/use-stable-id";
import { resolveLiquidMode } from "../utils/support";
import { surfaceClassNames } from "../utils/variants";

export type LiquidSurfaceProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: ElementType;
  asChild?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  fallback?: LiquidFallback;
  href?: string;
  intensity?: LiquidIntensity;
  interactive?: boolean;
  kind?: LiquidSurfaceKind;
  mode?: LiquidMode;
  radius?: LiquidRadius;
  refraction?: Partial<RefractiveOptions>;
  type?: string;
};

const radiusMap: Record<Exclude<LiquidRadius, number>, number> = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999
};

const intensityOptions: Record<LiquidIntensity, Omit<RefractiveOptions, "radius">> = {
  subtle: {
    blur: 0,
    glassThickness: 48,
    bezelWidth: 6,
    refractiveIndex: 1.32,
    specularOpacity: 0.12,
    specularAngle: 0.85
  },
  medium: {
    blur: 0,
    glassThickness: 68,
    bezelWidth: 10,
    refractiveIndex: 1.42,
    specularOpacity: 0.18,
    specularAngle: 0.85
  },
  strong: {
    blur: 1,
    glassThickness: 88,
    bezelWidth: 14,
    refractiveIndex: 1.5,
    specularOpacity: 0.26,
    specularAngle: 0.85
  }
};

export const LiquidSurface = forwardRef<HTMLElement, LiquidSurfaceProps>(function LiquidSurface(
  {
    as: Component = "div",
    asChild = false,
    children,
    className,
    disabled = false,
    fallback = "material",
    intensity = "subtle",
    interactive = false,
    kind = "panel",
    mode = "auto",
    onClick,
    radius = "lg",
    refraction,
    style,
    tabIndex,
    type,
    ...props
  },
  ref
) {
  const context = useLiquidContext();
  const surfaceId = useStableId("lg-surface");
  const [hasEnhancedSlot, setHasEnhancedSlot] = useState(false);
  const radiusPx = resolveRadius(radius);
  // TODO: implement Slot-compatible asChild semantics once the dependency boundary is decided.

  const preliminaryMode = resolveLiquidMode({
    requestedMode: mode,
    defaultMode: context.defaultMode,
    forcedMode: context.forcedMode,
    capabilities: context.capabilities,
    disableOnMobile: context.disableOnMobile,
    enhancedSurfaceCount: context.enhancedSurfaceCount,
    maxEnhancedSurfaces: context.maxEnhancedSurfaces,
    respectReducedMotion: context.respectReducedMotion,
    respectReducedTransparency: context.respectReducedTransparency
  });

  useEffect(() => {
    if (preliminaryMode !== "enhanced") {
      setHasEnhancedSlot(false);
      context.releaseEnhancedSurface(surfaceId);
      return;
    }

    const reserved = context.reserveEnhancedSurface(surfaceId);
    setHasEnhancedSlot(reserved);

    return () => {
      if (reserved) {
        context.releaseEnhancedSurface(surfaceId);
      }
    };
  }, [context, preliminaryMode, surfaceId]);

  const resolvedMode =
    preliminaryMode === "enhanced" && hasEnhancedSlot
      ? "enhanced"
      : preliminaryMode === "enhanced"
        ? "fallback"
        : preliminaryMode;
  const Engine =
    resolvedMode === "enhanced" ? RefractiveEngine : resolvedMode === "solid" ? SolidEngine : FallbackEngine;
  const surfaceClassName = surfaceClassNames({
    className,
    disabled,
    fallback,
    intensity,
    interactive,
    kind,
    mode: resolvedMode
  });
  const refractiveOptions = useMemo<RefractiveOptions>(
    () => ({
      ...intensityOptions[intensity],
      ...refraction,
      radius: refraction?.radius ?? radiusPx
    }),
    [intensity, radiusPx, refraction]
  );
  const componentName = typeof Component === "string" ? Component : "";
  const supportsDisabled = ["button", "input", "select", "textarea"].includes(componentName);
  const surfaceStyle = {
    ...style,
    "--lg-surface-radius": `${radiusPx}px`
  } as CSSProperties;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event);
  };

  return (
    <Engine
      {...props}
      aria-disabled={!supportsDisabled && disabled ? true : props["aria-disabled"]}
      as={Component}
      className={surfaceClassName}
      data-liquid-as-child={asChild ? "" : undefined}
      data-liquid-kind={kind}
      data-liquid-mode={resolvedMode}
      data-liquid-reduced-motion={
        context.capabilities.prefersReducedMotion && context.respectReducedMotion ? "" : undefined
      }
      disabled={supportsDisabled && disabled ? true : undefined}
      onClick={handleClick}
      ref={ref}
      refraction={resolvedMode === "enhanced" ? refractiveOptions : undefined}
      style={surfaceStyle}
      tabIndex={!supportsDisabled && disabled ? -1 : tabIndex}
      type={componentName === "button" ? type : undefined}
    >
      <span className="lg-surface__content">{children}</span>
    </Engine>
  );
});

function resolveRadius(radius: LiquidRadius): number {
  return typeof radius === "number" ? radius : radiusMap[radius];
}
