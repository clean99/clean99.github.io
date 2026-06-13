import {
  referenceLensGeometry,
  resolveLensReferencePipeline,
  type LensPipelineStage
} from "./lens-pipeline";

export type LiquidPixelMap = {
  data: Uint8ClampedArray;
  height: number;
  pixelRatio: number;
  width: number;
};

export type LiquidCapsuleFieldSample = {
  distanceFromEdge: number;
  normalX: number;
  normalY: number;
};

export type LiquidLensPixelMapOptions = {
  geometry?: typeof referenceLensGeometry;
  pixelRatio?: number;
};

export type LiquidLensFilterPixelMaps = {
  displacement: LiquidPixelMap;
  magnification: LiquidPixelMap;
  specular: LiquidPixelMap;
};

export function createLensFilterPixelMaps(
  options: LiquidLensPixelMapOptions = {}
): LiquidLensFilterPixelMaps {
  const pipeline = resolveLensReferencePipeline();
  const [, displacementStage] = pipeline.stages;
  const pixelRatio = options.pixelRatio;

  return {
    displacement: createLensDisplacementPixelMap(displacementStage, {
      ...options,
      pixelRatio: pixelRatio ?? 2
    }),
    magnification: createLensMagnificationPixelMap({
      ...options,
      pixelRatio: pixelRatio ?? 1
    }),
    specular: createLensSpecularPixelMap({
      ...options,
      pixelRatio: pixelRatio ?? 2
    })
  };
}

export function createLensMagnificationPixelMap({
  geometry = referenceLensGeometry,
  pixelRatio = 1
}: LiquidLensPixelMapOptions = {}): LiquidPixelMap {
  const resolvedPixelRatio = resolvePixelRatio(pixelRatio);
  const width = geometry.opticalWidth * resolvedPixelRatio;
  const height = geometry.opticalHeight * resolvedPixelRatio;
  const data = new Uint8ClampedArray(width * height * 4);
  const centerX = width / 2;
  const centerY = height / 2;
  const normalizer = Math.max(centerX, centerY);

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const red = 128 + ((centerX - px) / normalizer) * 127;
      const green = 128 + ((centerY - py) / normalizer) * 127;

      writeRgba(data, index, red, green, 0, 255);
    }
  }

  return {
    data,
    height,
    pixelRatio: resolvedPixelRatio,
    width
  };
}

export function createLensDisplacementPixelMap(
  stage: LensPipelineStage,
  { geometry = referenceLensGeometry, pixelRatio = 3 }: LiquidLensPixelMapOptions = {}
): LiquidPixelMap {
  const resolvedPixelRatio = resolvePixelRatio(pixelRatio);
  const width = geometry.opticalWidth * resolvedPixelRatio;
  const height = geometry.opticalHeight * resolvedPixelRatio;
  const data = new Uint8ClampedArray(width * height * 4);
  const effectiveBezelWidth = stage.mapFalloffWidth;
  const falloffPower = 4.8;
  const maxChannelMagnitude = 127;

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const x = (px + 0.5) / resolvedPixelRatio;
      const y = (py + 0.5) / resolvedPixelRatio;
      const sample = sampleCapsuleField(x, y, geometry);

      if (!sample || sample.distanceFromEdge > effectiveBezelWidth || effectiveBezelWidth <= 0) {
        writeRgba(data, index, 128, 128, 0, 255);
        continue;
      }

      const edgeProgress = clamp01(1 - sample.distanceFromEdge / effectiveBezelWidth);
      const channelMagnitude = Math.pow(edgeProgress, falloffPower) * maxChannelMagnitude;
      const red = 128 - sample.normalX * channelMagnitude;
      const green = 128 - sample.normalY * channelMagnitude;

      writeRgba(data, index, red, green, 0, 255);
    }
  }

  return {
    data,
    height,
    pixelRatio: resolvedPixelRatio,
    width
  };
}

export function createLensSpecularPixelMap({
  geometry = referenceLensGeometry,
  pixelRatio = 3
}: LiquidLensPixelMapOptions = {}): LiquidPixelMap {
  const resolvedPixelRatio = resolvePixelRatio(pixelRatio);
  const width = geometry.opticalWidth * resolvedPixelRatio;
  const height = geometry.opticalHeight * resolvedPixelRatio;
  const data = new Uint8ClampedArray(width * height * 4);
  const peakDistance = 0.95;
  const endDistance = 1.95;
  const axisPower = 2.5;

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const x = (px + 0.5) / resolvedPixelRatio;
      const y = (py + 0.5) / resolvedPixelRatio;
      const sample = sampleCapsuleField(x, y, geometry);

      if (!sample) {
        writeRgba(data, index, 0, 0, 0, 0);
        continue;
      }

      const coverage = sampleSpecularCoverage(sample.distanceFromEdge, peakDistance, endDistance);

      if (coverage <= 0) {
        writeRgba(data, index, 0, 0, 0, 0);
        continue;
      }

      const normalAxis = Math.max(Math.abs(sample.normalX), Math.abs(sample.normalY));
      const diagonalFalloff = Math.pow(normalAxis, axisPower);
      const verticalNormal = Math.abs(sample.normalY);
      const alpha = coverage * diagonalFalloff * (64 + 155 * verticalNormal);
      const gray = diagonalFalloff * (108 + 80 * verticalNormal);

      writeRgba(data, index, gray, gray, gray, alpha);
    }
  }

  return {
    data,
    height,
    pixelRatio: resolvedPixelRatio,
    width
  };
}

function sampleSpecularCoverage(
  distanceFromEdge: number,
  peakDistance: number,
  endDistance: number
) {
  if (distanceFromEdge <= 0 || distanceFromEdge >= endDistance) {
    return 0;
  }

  if (distanceFromEdge <= peakDistance) {
    return clamp01(distanceFromEdge / peakDistance);
  }

  return clamp01((endDistance - distanceFromEdge) / (endDistance - peakDistance));
}

export function sampleCapsuleField(
  x: number,
  y: number,
  geometry: typeof referenceLensGeometry = referenceLensGeometry
): LiquidCapsuleFieldSample | null {
  const centerY = geometry.opticalHeight / 2;
  const leftCenterX = geometry.radius;
  const rightCenterX = geometry.opticalWidth - geometry.radius;

  if (x < leftCenterX) {
    return sampleCircleCap(x - leftCenterX, y - centerY, geometry.radius);
  }

  if (x > rightCenterX) {
    return sampleCircleCap(x - rightCenterX, y - centerY, geometry.radius);
  }

  const distanceToTop = y;
  const distanceToBottom = geometry.opticalHeight - y;
  const usesTop = distanceToTop <= distanceToBottom;

  return {
    distanceFromEdge: Math.max(0, usesTop ? distanceToTop : distanceToBottom),
    normalX: 0,
    normalY: usesTop ? -1 : 1
  };
}

function sampleCircleCap(dx: number, dy: number, radius: number): LiquidCapsuleFieldSample | null {
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length <= 0 || length > radius) {
    return null;
  }

  return {
    distanceFromEdge: Math.max(0, radius - length),
    normalX: dx / length,
    normalY: dy / length
  };
}

function writeRgba(
  data: Uint8ClampedArray,
  index: number,
  r: number,
  g: number,
  b: number,
  a: number
) {
  data[index] = clampByte(r);
  data[index + 1] = clampByte(g);
  data[index + 2] = clampByte(b);
  data[index + 3] = clampByte(a);
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(Number.isFinite(value) ? value : 0)));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function resolvePixelRatio(pixelRatio: number) {
  return Math.max(1, Math.floor(Number.isFinite(pixelRatio) ? pixelRatio : 3));
}
