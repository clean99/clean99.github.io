import { describe, expect, it } from "vitest";
import {
  getCarouselAxis,
  getCarouselKeyboardAction,
  getCarouselOrientationClass,
  type LiquidCarouselOrientation
} from "../src/utils/carousel";

describe("carousel utilities", () => {
  it("maps orientation to Embla axis", () => {
    expect(getCarouselAxis("horizontal")).toBe("x");
    expect(getCarouselAxis("vertical")).toBe("y");
  });

  it("maps keyboard navigation for horizontal and vertical carousels", () => {
    expect(getCarouselKeyboardAction("ArrowLeft", "horizontal")).toBe("previous");
    expect(getCarouselKeyboardAction("ArrowRight", "horizontal")).toBe("next");
    expect(getCarouselKeyboardAction("ArrowUp", "vertical")).toBe("previous");
    expect(getCarouselKeyboardAction("ArrowDown", "vertical")).toBe("next");
    expect(getCarouselKeyboardAction("Home", "horizontal")).toBeNull();
  });

  it("keeps rtl horizontal navigation physical and explicit", () => {
    expect(getCarouselKeyboardAction("ArrowLeft", "horizontal", "rtl")).toBe("next");
    expect(getCarouselKeyboardAction("ArrowRight", "horizontal", "rtl")).toBe("previous");
  });

  it("generates stable orientation classes", () => {
    const orientations: LiquidCarouselOrientation[] = ["horizontal", "vertical"];

    expect(orientations.map(getCarouselOrientationClass)).toEqual([
      "lg-carousel--horizontal",
      "lg-carousel--vertical"
    ]);
  });
});
