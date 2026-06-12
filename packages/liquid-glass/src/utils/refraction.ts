import type { LiquidIntensity, RefractiveOptions } from "../types";
import { clamp } from "./clamp";

export const defaultRefractionByIntensity: Record<
  LiquidIntensity,
  Omit<RefractiveOptions, "radius">
> = {
  subtle: {
    blur: 0.2,
    glassThickness: 52,
    bezelWidth: 7,
    refractiveIndex: 1.36,
    specularOpacity: 0.2,
    specularAngle: 0.85
  },
  medium: {
    blur: 0.35,
    glassThickness: 72,
    bezelWidth: 11,
    refractiveIndex: 1.44,
    specularOpacity: 0.28,
    specularAngle: 0.85
  },
  strong: {
    blur: 0.5,
    glassThickness: 88,
    bezelWidth: 14,
    refractiveIndex: 1.5,
    specularOpacity: 0.36,
    specularAngle: 0.85
  }
};

export const continuousPlateRefraction: Partial<RefractiveOptions> = {
  blur: 0.12,
  glassThickness: 34,
  bezelWidth: 3,
  refractiveIndex: 1.38,
  specularOpacity: 0.07,
  specularAngle: 0.78
};

export function resolveRefractionRadius(radius: number): number {
  return clamp(radius, 1, 96);
}

export function resolvePhysicalRefractionRadius({
  height,
  radius,
  width
}: {
  height: number;
  radius: number;
  width: number;
}): number {
  const geometryLimit = Math.min(width, height) / 2;

  if (!Number.isFinite(geometryLimit) || geometryLimit <= 0) {
    return resolveRefractionRadius(radius);
  }

  return clamp(Math.floor(Math.min(radius, geometryLimit)), 1, 96);
}

export function resolveFilterMapGeometry({
  bezelWidth = 0,
  height,
  radius,
  width
}: {
  bezelWidth?: number;
  height: number;
  radius: number;
  width: number;
}) {
  const cornerWidth = Math.max(resolveRefractionRadius(radius), Math.max(0, bezelWidth));
  const hasOverlappingSlices = cornerWidth * 2 > Math.min(width, height);

  return {
    cornerWidth,
    hasOverlappingSlices
  };
}

export function resolveRefractiveOptions({
  allowOversizedRadius = false,
  bounds,
  intensity,
  radius,
  refraction
}: {
  allowOversizedRadius?: boolean;
  bounds?: { height: number; width: number };
  intensity: LiquidIntensity;
  radius: number;
  refraction?: Partial<RefractiveOptions>;
}): RefractiveOptions {
  const requestedRadius = refraction?.radius ?? radius;

  return {
    ...defaultRefractionByIntensity[intensity],
    ...refraction,
    radius: allowOversizedRadius
      ? resolveRefractionRadius(requestedRadius)
      : bounds
        ? resolvePhysicalRefractionRadius({ ...bounds, radius: requestedRadius })
        : resolveRefractionRadius(requestedRadius)
  };
}
