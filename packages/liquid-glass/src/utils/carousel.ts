export type LiquidCarouselOrientation = "horizontal" | "vertical";
export type LiquidCarouselDirection = "ltr" | "rtl";
export type LiquidCarouselKeyboardAction = "next" | "previous";

export function getCarouselAxis(orientation: LiquidCarouselOrientation) {
  return orientation === "horizontal" ? "x" : "y";
}

export function getCarouselKeyboardAction(
  key: string,
  orientation: LiquidCarouselOrientation,
  direction: LiquidCarouselDirection = "ltr"
): LiquidCarouselKeyboardAction | null {
  if (orientation === "vertical") {
    if (key === "ArrowUp") {
      return "previous";
    }

    if (key === "ArrowDown") {
      return "next";
    }

    return null;
  }

  if (key === "ArrowLeft") {
    return direction === "rtl" ? "next" : "previous";
  }

  if (key === "ArrowRight") {
    return direction === "rtl" ? "previous" : "next";
  }

  return null;
}

export function getCarouselOrientationClass(orientation: LiquidCarouselOrientation) {
  return `lg-carousel--${orientation}`;
}
