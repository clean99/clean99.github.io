import type { RefractiveOptions } from "../types";
import {
  resolveLiquidChromaticAberration,
  type LiquidChromaticAberrationSample
} from "./chromatic-aberration";
import { estimateMaximumDisplacement, type OpticalSurfaceProfile } from "./optics";

export type LensPipelineStage = {
  bezelWidth: number;
  glassThickness: number;
  mapFalloffWidth: number;
  name: "magnification" | "displacement";
  profile: OpticalSurfaceProfile;
  refractiveIndex: number;
  scale: number;
};

export type LensPipeline = {
  chromaticAberration: LiquidChromaticAberrationSample;
  displacementRefraction: RefractiveOptions;
  geometry: typeof referenceLensGeometry;
  stages: [LensPipelineStage, LensPipelineStage];
};

export const referenceLensGeometry = {
  opticalHeight: 150,
  opticalWidth: 210,
  radius: 75,
  visibleHeight: 120,
  visibleScaleY: 0.8,
  visibleWidth: 210
} as const;

export const referenceLensDisplacementFalloff = 25;

export const referenceLensDisplacementRefraction = {
  blur: 0,
  glassThickness: 88,
  magnificationGlassThickness: 21.5,
  bezelWidth: 18,
  refractiveIndex: 1.5,
  radius: referenceLensGeometry.radius,
  specularOpacity: 0.5,
  specularAngle: 0.8
} satisfies RefractiveOptions;

export function resolveLensReferencePipeline(
  refraction: Partial<RefractiveOptions> = {}
): LensPipeline {
  const displacementRefraction = {
    ...referenceLensDisplacementRefraction,
    ...refraction
  };
  const magnificationStage = createStage({
    bezelWidth: 0,
    glassThickness:
      displacementRefraction.magnificationGlassThickness ??
      referenceLensDisplacementRefraction.magnificationGlassThickness,
    mapFalloffWidth: referenceLensGeometry.radius,
    name: "magnification"
  });
  const displacementStage = createStage({
    bezelWidth: displacementRefraction.bezelWidth ?? 0,
    glassThickness: displacementRefraction.glassThickness ?? 0,
    mapFalloffWidth: referenceLensDisplacementFalloff,
    name: "displacement"
  });

  return {
    chromaticAberration: resolveLiquidChromaticAberration({
      bevelWidth: referenceLensDisplacementFalloff,
      distanceFromEdge: 0,
      intensity: displacementRefraction.chromaticAberration ?? 0,
      normalX: 1,
      normalY: 0
    }),
    displacementRefraction,
    geometry: referenceLensGeometry,
    stages: [magnificationStage, displacementStage]
  };
}

function createStage({
  bezelWidth,
  glassThickness,
  mapFalloffWidth,
  name
}: {
  bezelWidth: number;
  glassThickness: number;
  mapFalloffWidth: number;
  name: LensPipelineStage["name"];
}): LensPipelineStage {
  const profile: OpticalSurfaceProfile = "convex-squircle";
  const refractiveIndex = 1.5;

  return {
    bezelWidth,
    glassThickness,
    mapFalloffWidth,
    name,
    profile,
    refractiveIndex,
    scale: estimateMaximumDisplacement({
      bezelWidth,
      glassThickness,
      profile,
      refractiveIndex
    })
  };
}
