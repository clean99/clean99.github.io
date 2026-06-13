"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type MouseEvent
} from "react";
import { FallbackEngine } from "../engines/fallback-engine";
import { LensReferenceEngine } from "../engines/lens-reference-engine";
import { RefractiveEngine } from "../engines/refractive-engine";
import { SolidEngine } from "../engines/solid-engine";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
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
import { resolveRefractiveOptions } from "../utils/refraction";
import { resolveLiquidMode } from "../utils/support";
import { surfaceClassNames } from "../utils/variants";

export type LiquidSurfaceProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: ElementType;
  asChild?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  fallback?: LiquidFallback;
  href?: string;
  allowOversizedRefractionRadius?: boolean;
  enhancedEngine?: "refractive" | "reference-lens";
  intensity?: LiquidIntensity;
  interactive?: boolean;
  kind?: LiquidSurfaceKind;
  mode?: LiquidMode;
  opticalBounds?: "layout" | "visual";
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

export const LiquidSurface = forwardRef<HTMLElement, LiquidSurfaceProps>(function LiquidSurface(
  {
    as: Component = "div",
    asChild = false,
    allowOversizedRefractionRadius = false,
    children,
    className,
    disabled = false,
    enhancedEngine = "refractive",
    fallback = "material",
    intensity = "subtle",
    interactive = false,
    kind = "panel",
    mode = "auto",
    onClick,
    opticalBounds = "visual",
    radius = "lg",
    refraction,
    style,
    tabIndex,
    type,
    ...props
  },
  ref
) {
  const {
    capabilities,
    defaultMode,
    disableOnMobile,
    enhancedSurfaceCount,
    forcedMode,
    maxEnhancedSurfaces,
    releaseEnhancedSurface,
    reserveEnhancedSurface,
    respectReducedMotion,
    respectReducedTransparency
  } = useLiquidContext();
  const surfaceId = useStableId("lg-surface");
  const surfaceRef = useRef<HTMLElement | null>(null);
  const [hasEnhancedSlot, setHasEnhancedSlot] = useState(false);
  const [surfaceBounds, setSurfaceBounds] = useState<
    { height: number; width: number } | undefined
  >();
  const radiusPx = resolveRadius(radius);
  // TODO: implement Slot-compatible asChild semantics once the dependency boundary is decided.

  const requestedResolvedMode = resolveLiquidMode({
    requestedMode: mode,
    defaultMode,
    forcedMode,
    capabilities,
    disableOnMobile,
    enhancedSurfaceCount: 0,
    maxEnhancedSurfaces,
    respectReducedMotion,
    respectReducedTransparency
  });
  const wantsEnhanced = requestedResolvedMode === "enhanced";

  useEffect(() => {
    return () => {
      releaseEnhancedSurface(surfaceId);
    };
  }, [releaseEnhancedSurface, surfaceId]);

  useEffect(() => {
    if (!wantsEnhanced) {
      releaseEnhancedSurface(surfaceId);
      setHasEnhancedSlot((current) => (current ? false : current));
      return;
    }

    const reserved = reserveEnhancedSurface(surfaceId);
    setHasEnhancedSlot((current) => (current === reserved ? current : reserved));
  }, [
    enhancedSurfaceCount,
    releaseEnhancedSurface,
    reserveEnhancedSurface,
    surfaceId,
    wantsEnhanced
  ]);

  const resolvedMode =
    requestedResolvedMode === "enhanced" && hasEnhancedSlot
      ? "enhanced"
      : requestedResolvedMode === "enhanced"
        ? "fallback"
        : requestedResolvedMode;
  const Engine =
    resolvedMode === "enhanced"
      ? enhancedEngine === "reference-lens"
        ? LensReferenceEngine
        : RefractiveEngine
      : resolvedMode === "solid"
        ? SolidEngine
        : FallbackEngine;
  const surfaceClassName = surfaceClassNames({
    className,
    disabled,
    fallback,
    intensity,
    interactive,
    kind,
    mode: resolvedMode
  });
  useIsomorphicLayoutEffect(() => {
    const node = surfaceRef.current;
    if (!node || resolvedMode !== "enhanced") {
      return;
    }

    const updateBounds = () => {
      const rect = node.getBoundingClientRect();
      const view = node.ownerDocument.defaultView;
      const transformScale = resolveTransformScale(
        view?.getComputedStyle(node).transform ?? "none"
      );
      const measuredHeight =
        opticalBounds === "layout" ? rect.height / transformScale : rect.height;
      const measuredWidth = opticalBounds === "layout" ? rect.width / transformScale : rect.width;
      const nextBounds = {
        height: roundRectValue(measuredHeight),
        width: roundRectValue(measuredWidth)
      };

      setSurfaceBounds((current) =>
        current?.height === nextBounds.height && current.width === nextBounds.width
          ? current
          : nextBounds
      );
    };

    updateBounds();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateBounds);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [opticalBounds, resolvedMode]);

  useIsomorphicLayoutEffect(() => {
    assignRef(ref, surfaceRef.current);

    return () => {
      assignRef(ref, null);
    };
  }, [ref]);

  const refractiveOptions = useMemo<RefractiveOptions>(
    () =>
      resolveRefractiveOptions({
        bounds: resolvedMode === "enhanced" ? surfaceBounds : undefined,
        allowOversizedRadius: allowOversizedRefractionRadius,
        intensity,
        radius: radiusPx,
        refraction
      }),
    [allowOversizedRefractionRadius, intensity, radiusPx, refraction, resolvedMode, surfaceBounds]
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
      data-liquid-optical-radius={
        resolvedMode === "enhanced" ? refractiveOptions.radius : undefined
      }
      data-liquid-reduced-motion={
        capabilities.prefersReducedMotion && respectReducedMotion ? "" : undefined
      }
      disabled={supportsDisabled && disabled ? true : undefined}
      onClick={handleClick}
      ref={surfaceRef}
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

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    (ref as { current: T | null }).current = value;
  }
}

function roundRectValue(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveTransformScale(transform: string) {
  if (transform === "none") {
    return 1;
  }

  const matrix = transform.match(/^matrix\(([^)]+)\)$/);
  if (matrix) {
    const values = matrix[1]?.split(/,\s*/).map(Number) ?? [];
    const scale = Math.sqrt((values[0] ?? 1) ** 2 + (values[1] ?? 0) ** 2);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  const matrix3d = transform.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3d) {
    const values = matrix3d[1]?.split(/,\s*/).map(Number) ?? [];
    const scale = Math.sqrt((values[0] ?? 1) ** 2 + (values[1] ?? 0) ** 2);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  return 1;
}
