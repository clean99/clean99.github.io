import { sampleLiquidEdgeMask } from "./edge-mask";

export type LiquidChromaticAberrationOptions = {
  bevelWidth: number;
  disabled?: boolean;
  distanceFromEdge: number;
  intensity?: number;
  maxOffset?: number;
  normalX: number;
  normalY: number;
  reducedTransparency?: boolean;
};

export type LiquidChromaticChannelOffset = {
  x: number;
  y: number;
};

export type LiquidChromaticAberrationSample = {
  active: boolean;
  amount: number;
  blue: LiquidChromaticChannelOffset;
  edgeOpacity: number;
  green: LiquidChromaticChannelOffset;
  red: LiquidChromaticChannelOffset;
};

const restingOffset: LiquidChromaticChannelOffset = { x: 0, y: 0 };

export function resolveLiquidChromaticAberration({
  bevelWidth,
  disabled = false,
  distanceFromEdge,
  intensity = 0,
  maxOffset = 1.5,
  normalX,
  normalY,
  reducedTransparency = false
}: LiquidChromaticAberrationOptions): LiquidChromaticAberrationSample {
  if (disabled || reducedTransparency) {
    return restingSample();
  }

  const normal = normalizeVector(normalX, normalY);

  if (!normal) {
    return restingSample();
  }

  const mask = sampleLiquidEdgeMask({
    bevelWidth,
    chromaticAberration: intensity,
    distanceFromEdge
  });
  const cappedOffset = clamp(finiteOr(maxOffset, 1.5), 0, 4);
  const amount = round(mask.chromaticAberration * cappedOffset);

  if (amount <= 0) {
    return restingSample(mask.edgeOpacity);
  }

  const red = offsetAlongNormal(normal, amount);
  const blue = offsetAlongNormal(normal, -amount);

  return {
    active: true,
    amount,
    blue,
    edgeOpacity: mask.edgeOpacity,
    green: restingOffset,
    red
  };
}

export function resolveLiquidChromaticAberrationRamp({
  bevelWidth,
  intensity = 0,
  maxOffset = 1.5,
  normalX,
  normalY,
  samples = 33
}: Omit<LiquidChromaticAberrationOptions, "distanceFromEdge"> & { samples?: number }) {
  const count = Math.max(2, Math.floor(finiteOr(samples, 33)));
  const width = Math.max(0.0001, finiteOr(bevelWidth, 0));

  return Array.from({ length: count }, (_, index) =>
    resolveLiquidChromaticAberration({
      bevelWidth: width,
      distanceFromEdge: (index / (count - 1)) * width,
      intensity,
      maxOffset,
      normalX,
      normalY
    })
  );
}

function restingSample(edgeOpacity = 0): LiquidChromaticAberrationSample {
  return {
    active: false,
    amount: 0,
    blue: restingOffset,
    edgeOpacity,
    green: restingOffset,
    red: restingOffset
  };
}

function offsetAlongNormal(
  normal: LiquidChromaticChannelOffset,
  amount: number
): LiquidChromaticChannelOffset {
  return {
    x: round(normal.x * amount),
    y: round(normal.y * amount)
  };
}

function normalizeVector(x: number, y: number): LiquidChromaticChannelOffset | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const length = Math.hypot(x, y);

  if (length <= 0) {
    return null;
  }

  return {
    x: x / length,
    y: y / length
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function round(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}
