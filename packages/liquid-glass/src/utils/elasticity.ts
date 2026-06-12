import { clamp } from "./clamp";

export type LiquidElasticPoint = {
  x: number;
  y: number;
};

export type LiquidElasticRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type LiquidElasticOptions = {
  activationDistance?: number;
  disabled?: boolean;
  elasticity?: number;
  maxScaleDelta?: number;
  maxTranslate?: number;
  pointer?: LiquidElasticPoint | null;
  rect: LiquidElasticRect;
  reducedMotion?: boolean;
};

export type LiquidElasticResponse = {
  active: boolean;
  fade: number;
  scaleX: number;
  scaleY: number;
  transform: string;
  translateX: number;
  translateY: number;
};

function restingResponse(): LiquidElasticResponse {
  return {
    active: false,
    fade: 0,
    scaleX: 1,
    scaleY: 1,
    transform: restingTransform,
    translateX: 0,
    translateY: 0
  };
}

const restingTransform: LiquidElasticResponse["transform"] =
  "translate3d(0px, 0px, 0) scaleX(1) scaleY(1)";

export function resolveLiquidElasticResponse({
  activationDistance = 200,
  disabled = false,
  elasticity = 0.15,
  maxScaleDelta = 0.08,
  maxTranslate = 16,
  pointer,
  rect,
  reducedMotion = false
}: LiquidElasticOptions): LiquidElasticResponse {
  if (
    disabled ||
    reducedMotion ||
    !pointer ||
    !isUsableRect(rect) ||
    activationDistance <= 0 ||
    elasticity <= 0
  ) {
    return restingResponse();
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = pointer.x - centerX;
  const deltaY = pointer.y - centerY;
  const centerDistance = Math.hypot(deltaX, deltaY);
  const edgeDistance = distanceFromRectEdge(pointer, rect);

  if (edgeDistance > activationDistance) {
    return restingResponse();
  }

  const fade = clamp(1 - edgeDistance / activationDistance, 0, 1);
  const normalizedX = centerDistance > 0 ? deltaX / centerDistance : 0;
  const normalizedY = centerDistance > 0 ? deltaY / centerDistance : 0;
  const size = Math.max(rect.width, rect.height);
  const stretch = Math.min(centerDistance / size, 1) * elasticity * fade;
  const scaleLimit = Math.max(0, maxScaleDelta);
  const scaleDelta = clamp(stretch * 0.3, 0, scaleLimit);
  const crossDelta = clamp(stretch * 0.15, 0, scaleLimit / 2);
  const scaleX = clamp(
    1 + Math.abs(normalizedX) * scaleDelta - Math.abs(normalizedY) * crossDelta,
    1 - scaleLimit,
    1 + scaleLimit
  );
  const scaleY = clamp(
    1 + Math.abs(normalizedY) * scaleDelta - Math.abs(normalizedX) * crossDelta,
    1 - scaleLimit,
    1 + scaleLimit
  );
  const translateX = clamp(deltaX * elasticity * 0.1 * fade, -maxTranslate, maxTranslate);
  const translateY = clamp(deltaY * elasticity * 0.1 * fade, -maxTranslate, maxTranslate);

  return {
    active: true,
    fade,
    scaleX,
    scaleY,
    transform: `translate3d(${round(translateX)}px, ${round(translateY)}px, 0) scaleX(${round(scaleX)}) scaleY(${round(scaleY)})`,
    translateX,
    translateY
  };
}

export function distanceFromRectEdge(point: LiquidElasticPoint, rect: LiquidElasticRect): number {
  if (!isUsableRect(rect)) {
    return Number.POSITIVE_INFINITY;
  }

  const outsideX = Math.max(rect.left - point.x, 0, point.x - (rect.left + rect.width));
  const outsideY = Math.max(rect.top - point.y, 0, point.y - (rect.top + rect.height));

  return Math.hypot(outsideX, outsideY);
}

function isUsableRect(rect: LiquidElasticRect): boolean {
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
