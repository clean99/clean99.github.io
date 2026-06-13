import { clamp } from "./clamp";

export type LiquidLensPoint = {
  x: number;
  y: number;
};

export type LiquidLensSize = {
  height: number;
  width: number;
};

export type LiquidLensBounds = LiquidLensSize & {
  padding?: number;
};

export type LiquidLensDragState = {
  bounds: LiquidLensBounds;
  lens: LiquidLensSize;
  pointer: LiquidLensPoint;
  pointerStart: LiquidLensPoint;
  positionStart: LiquidLensPoint;
};

export type LiquidLensRect = LiquidLensSize & {
  left: number;
  top: number;
};

export type LiquidLensDropletOptions = {
  phase?: LiquidLensDropletPhase;
  point: LiquidLensPoint | null;
  pressed?: boolean;
  rect: LiquidLensRect;
  reducedMotion?: boolean;
};

export type LiquidLensDropletPhase = "pressed" | "dragging";

export type LiquidLensDropletResponse = {
  active: boolean;
  originX: number;
  originY: number;
  phase: LiquidLensDropletPhase | "idle";
  scaleX: number;
  scaleY: number;
  transform: string;
  translateX: number;
  translateY: number;
};

const idleDropletResponse: LiquidLensDropletResponse = {
  active: false,
  originX: 0.5,
  originY: 0.5,
  phase: "idle",
  scaleX: 1,
  scaleY: 0.8,
  transform: "scaleX(1) scaleY(0.8)",
  translateX: 0,
  translateY: 0
};

export function clampLensPosition(
  position: LiquidLensPoint,
  lens: LiquidLensSize,
  bounds: LiquidLensBounds
): LiquidLensPoint {
  const padding = Math.max(0, bounds.padding ?? 0);
  const minX = padding;
  const minY = padding;
  const maxX = Math.max(minX, bounds.width - lens.width - padding);
  const maxY = Math.max(minY, bounds.height - lens.height - padding);

  return {
    x: round(clamp(position.x, minX, maxX)),
    y: round(clamp(position.y, minY, maxY))
  };
}

export function resolveLensDragPosition({
  bounds,
  lens,
  pointer,
  pointerStart,
  positionStart
}: LiquidLensDragState): LiquidLensPoint {
  return clampLensPosition(
    {
      x: positionStart.x + pointer.x - pointerStart.x,
      y: positionStart.y + pointer.y - pointerStart.y
    },
    lens,
    bounds
  );
}

export function resolveLensDropletResponse({
  phase = "pressed",
  point,
  pressed = false,
  rect,
  reducedMotion = false
}: LiquidLensDropletOptions): LiquidLensDropletResponse {
  if (!pressed || !point || !isUsableRect(rect)) {
    return { ...idleDropletResponse };
  }

  const originX = clamp((point.x - rect.left) / rect.width, 0, 1);
  const originY = clamp((point.y - rect.top) / rect.height, 0, 1);

  if (reducedMotion) {
    return {
      ...idleDropletResponse,
      active: true,
      originX: round(originX),
      originY: round(originY),
      phase
    };
  }

  const offsetX = originX - 0.5;
  const offsetY = originY - 0.5;
  const horizontalPull = Math.abs(offsetX);
  const verticalPull = Math.abs(offsetY);
  const scaleX =
    phase === "dragging"
      ? 1.055 + horizontalPull * 0.01 + verticalPull * 0.004
      : 1.109 + horizontalPull * 0.018 + verticalPull * 0.008;
  const scaleY =
    phase === "dragging"
      ? 0.962 + verticalPull * 0.018 + horizontalPull * 0.006
      : 0.952 + verticalPull * 0.02 + horizontalPull * 0.01;

  return {
    active: true,
    originX: round(originX),
    originY: round(originY),
    phase,
    scaleX: round(scaleX),
    scaleY: round(scaleY),
    transform: `scaleX(${round(scaleX)}) scaleY(${round(scaleY)})`,
    translateX: 0,
    translateY: 0
  };
}

function isUsableRect(rect: LiquidLensRect): boolean {
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
