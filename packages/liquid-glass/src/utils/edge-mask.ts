export type LiquidEdgeMaskOptions = {
  bevelWidth: number;
  chromaticAberration?: number;
  distanceFromEdge: number;
  softening?: number;
};

export type LiquidEdgeMaskSample = {
  centerOpacity: number;
  chromaticAberration: number;
  edgeOpacity: number;
  refractionOpacity: number;
};

export function sampleLiquidEdgeMask({
  bevelWidth,
  chromaticAberration = 0,
  distanceFromEdge,
  softening = 0.18
}: LiquidEdgeMaskOptions): LiquidEdgeMaskSample {
  const normalizedBevel = Math.max(0.0001, finiteOr(bevelWidth, 0));
  const normalizedDistance = Math.max(0, finiteOr(distanceFromEdge, normalizedBevel));
  const normalizedSoftening = clamp01(finiteOr(softening, 0.18));
  const progress = clamp01(normalizedDistance / normalizedBevel);
  const softenedProgress = smootherstep(
    clamp01(progress * (1 + normalizedSoftening) - normalizedSoftening * 0.5)
  );
  const edgeOpacity = clamp01(1 - softenedProgress);
  const refractionOpacity = edgeOpacity * edgeOpacity;

  return {
    centerOpacity: clamp01(1 - refractionOpacity),
    chromaticAberration: clamp01(finiteOr(chromaticAberration, 0)) * edgeOpacity,
    edgeOpacity,
    refractionOpacity
  };
}

export function sampleLiquidEdgeMaskRamp({
  bevelWidth,
  chromaticAberration = 0,
  samples = 33,
  softening = 0.18
}: Omit<LiquidEdgeMaskOptions, "distanceFromEdge"> & { samples?: number }) {
  const count = Math.max(2, Math.floor(finiteOr(samples, 33)));
  const width = Math.max(0.0001, finiteOr(bevelWidth, 0));

  return Array.from({ length: count }, (_, index) =>
    sampleLiquidEdgeMask({
      bevelWidth: width,
      chromaticAberration,
      distanceFromEdge: (index / (count - 1)) * width,
      softening
    })
  );
}

function smootherstep(x: number) {
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}
