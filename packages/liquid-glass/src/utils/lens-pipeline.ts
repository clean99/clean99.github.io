import type { RefractiveOptions } from "../types";
import { estimateMaximumDisplacement, type OpticalSurfaceProfile } from "./optics";

export type LensPipelineStage = {
  bezelWidth: number;
  glassThickness: number;
  name: "magnification" | "displacement";
  profile: OpticalSurfaceProfile;
  refractiveIndex: number;
  scale: number;
};

export type LensPipeline = {
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

export const referenceLensDisplacementRefraction = {
  blur: 0,
  glassThickness: 88,
  bezelWidth: 18,
  refractiveIndex: 1.5,
  radius: referenceLensGeometry.radius,
  specularOpacity: 0.5,
  specularAngle: 0.8
} satisfies RefractiveOptions;

export function resolveLensReferencePipeline(): LensPipeline {
  const magnificationStage = createStage({
    bezelWidth: 0,
    glassThickness: 21.5,
    name: "magnification"
  });
  const displacementStage = createStage({
    bezelWidth: referenceLensDisplacementRefraction.bezelWidth ?? 0,
    glassThickness: referenceLensDisplacementRefraction.glassThickness ?? 0,
    name: "displacement"
  });

  return {
    displacementRefraction: referenceLensDisplacementRefraction,
    geometry: referenceLensGeometry,
    stages: [magnificationStage, displacementStage]
  };
}

function createStage({
  bezelWidth,
  glassThickness,
  name
}: {
  bezelWidth: number;
  glassThickness: number;
  name: LensPipelineStage["name"];
}): LensPipelineStage {
  const profile: OpticalSurfaceProfile = "convex-squircle";
  const refractiveIndex = 1.5;

  return {
    bezelWidth,
    glassThickness,
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
