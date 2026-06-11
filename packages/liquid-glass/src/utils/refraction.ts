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

export function resolveRefractionRadius(radius: number): number {
  return clamp(radius, 1, 96);
}

export function resolveRefractiveOptions({
  intensity,
  radius,
  refraction
}: {
  intensity: LiquidIntensity;
  radius: number;
  refraction?: Partial<RefractiveOptions>;
}): RefractiveOptions {
  return {
    ...defaultRefractionByIntensity[intensity],
    ...refraction,
    radius: resolveRefractionRadius(refraction?.radius ?? radius)
  };
}
