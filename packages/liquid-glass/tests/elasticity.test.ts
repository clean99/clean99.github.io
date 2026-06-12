import { describe, expect, it } from "vitest";
import { distanceFromRectEdge, resolveLiquidElasticResponse } from "../src";

const rect = {
  height: 60,
  left: 100,
  top: 100,
  width: 180
};

describe("liquid elastic response", () => {
  it("rests when the pointer is outside the activation zone", () => {
    expect(
      resolveLiquidElasticResponse({
        pointer: { x: 500, y: 500 },
        rect
      })
    ).toMatchObject({
      active: false,
      fade: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0
    });
  });

  it("activates at the edge and fades out with distance", () => {
    const edge = resolveLiquidElasticResponse({
      pointer: { x: 280, y: 130 },
      rect
    });
    const near = resolveLiquidElasticResponse({
      pointer: { x: 340, y: 130 },
      rect
    });

    expect(distanceFromRectEdge({ x: 280, y: 130 }, rect)).toBe(0);
    expect(distanceFromRectEdge({ x: 340, y: 130 }, rect)).toBe(60);
    expect(edge.active).toBe(true);
    expect(edge.fade).toBe(1);
    expect(near.active).toBe(true);
    expect(near.fade).toBeLessThan(edge.fade);
    expect(near.fade).toBeGreaterThan(0);
  });

  it("stretches toward the dominant pointer axis", () => {
    const horizontal = resolveLiquidElasticResponse({
      elasticity: 0.3,
      pointer: { x: 280, y: 130 },
      rect
    });
    const vertical = resolveLiquidElasticResponse({
      elasticity: 0.3,
      pointer: { x: 190, y: 100 },
      rect
    });

    expect(horizontal.scaleX).toBeGreaterThan(1);
    expect(horizontal.scaleX).toBeGreaterThan(horizontal.scaleY);
    expect(horizontal.translateX).toBeGreaterThan(0);
    expect(vertical.scaleY).toBeGreaterThan(1);
    expect(vertical.scaleY).toBeGreaterThan(vertical.scaleX);
    expect(vertical.translateY).toBeLessThan(0);
  });

  it("caps translation and scale so the surface does not tear", () => {
    const response = resolveLiquidElasticResponse({
      activationDistance: 1_000,
      elasticity: 4,
      maxScaleDelta: 0.04,
      maxTranslate: 8,
      pointer: { x: 1_000, y: 1_000 },
      rect
    });

    expect(Math.abs(response.translateX)).toBeLessThanOrEqual(8);
    expect(Math.abs(response.translateY)).toBeLessThanOrEqual(8);
    expect(response.scaleX).toBeLessThanOrEqual(1.04);
    expect(response.scaleY).toBeLessThanOrEqual(1.04);
    expect(response.scaleX).toBeGreaterThanOrEqual(0.96);
    expect(response.scaleY).toBeGreaterThanOrEqual(0.96);
  });

  it("returns isolated resting responses", () => {
    const first = resolveLiquidElasticResponse({
      pointer: { x: 500, y: 500 },
      rect
    });
    const second = resolveLiquidElasticResponse({
      pointer: { x: 500, y: 500 },
      rect
    });

    expect(first).not.toBe(second);
  });

  it("rests for reduced motion, disabled state, and invalid geometry", () => {
    expect(
      resolveLiquidElasticResponse({
        pointer: { x: 180, y: 130 },
        rect,
        reducedMotion: true
      }).active
    ).toBe(false);
    expect(
      resolveLiquidElasticResponse({
        disabled: true,
        pointer: { x: 180, y: 130 },
        rect
      }).active
    ).toBe(false);
    expect(
      resolveLiquidElasticResponse({
        pointer: { x: 180, y: 130 },
        rect: { ...rect, width: 0 }
      }).active
    ).toBe(false);
  });
});
