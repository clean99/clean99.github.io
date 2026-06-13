export type OpticalSurfaceProfile = "convex-circle" | "convex-squircle" | "concave" | "lip";

export type DisplacementEstimateOptions = {
  bezelWidth: number;
  glassThickness: number;
  profile?: OpticalSurfaceProfile;
  refractiveIndex?: number;
  samples?: number;
};

export function sampleOpticalSurface(profile: OpticalSurfaceProfile, distanceFromEdge: number) {
  const x = clamp01(distanceFromEdge);

  switch (profile) {
    case "convex-circle":
      return convexCircle(x);
    case "convex-squircle":
      return convexSquircle(x);
    case "concave":
      return 1 - convexCircle(x);
    case "lip":
      return mix(convexSquircle(x * 2), 1 - convexCircle(x) + 0.1, smootherstep(x));
  }
}

export function estimateMaximumDisplacement({
  bezelWidth,
  glassThickness,
  profile = "convex-squircle",
  refractiveIndex = 1.5,
  samples = 128
}: DisplacementEstimateOptions) {
  return Math.max(
    ...calculateDisplacementMagnitudes({
      bezelWidth,
      glassThickness,
      profile,
      refractiveIndex,
      samples
    }).map(Math.abs)
  );
}

export function calculateDisplacementMagnitudes({
  bezelWidth,
  glassThickness,
  profile = "convex-squircle",
  refractiveIndex = 1.5,
  samples = 128
}: DisplacementEstimateOptions) {
  const ambientToMaterialRatio = 1 / Math.max(1.0001, finiteOr(refractiveIndex, 1.5));
  const sampleCount = Math.max(2, Math.floor(finiteOr(samples, 128)));
  const normalizedBezelWidth = finiteOr(bezelWidth, 0);
  const normalizedGlassThickness = finiteOr(glassThickness, 0);

  return Array.from({ length: sampleCount }, (_, index) => {
    const x = index / sampleCount;
    const height = sampleOpticalSurface(profile, x);
    const epsilon = x < 1 ? 0.0001 : -0.0001;
    const derivative = (sampleOpticalSurface(profile, x + epsilon) - height) / epsilon;
    const normalLength = Math.sqrt(derivative * derivative + 1);
    const normalX = -derivative / normalLength;
    const normalY = -1 / normalLength;
    const refracted = refractOrthogonalRay({
      ambientToMaterialRatio,
      normalX,
      normalY
    });

    if (!refracted) {
      return 0;
    }

    const opticalDepth = height * normalizedBezelWidth + normalizedGlassThickness;
    return refracted.x * (opticalDepth / refracted.y);
  });
}

function refractOrthogonalRay({
  ambientToMaterialRatio,
  normalX,
  normalY
}: {
  ambientToMaterialRatio: number;
  normalX: number;
  normalY: number;
}) {
  const radicand = 1 - ambientToMaterialRatio * ambientToMaterialRatio * (1 - normalY * normalY);

  if (radicand < 0) {
    return null;
  }

  const root = Math.sqrt(radicand);
  const projectedNormal = ambientToMaterialRatio * normalY + root;

  return {
    x: -projectedNormal * normalX,
    y: ambientToMaterialRatio - projectedNormal * normalY
  };
}

function convexCircle(x: number) {
  return Math.sqrt(1 - (1 - x) ** 2);
}

function convexSquircle(x: number) {
  return (1 - (1 - x) ** 4) ** (1 / 4);
}

function smootherstep(x: number) {
  return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
}

function mix(a: number, b: number, amount: number) {
  return a * (1 - amount) + b * amount;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finiteOr(value, 0)));
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}
