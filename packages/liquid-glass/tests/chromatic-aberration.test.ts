import { describe, expect, it } from "vitest";
import { resolveLiquidChromaticAberration, resolveLiquidChromaticAberrationRamp } from "../src";

describe("liquid chromatic aberration", () => {
  it("splits red and blue symmetrically along the surface normal", () => {
    const sample = resolveLiquidChromaticAberration({
      bevelWidth: 18,
      distanceFromEdge: 0,
      intensity: 0.6,
      maxOffset: 2,
      normalX: 0,
      normalY: -1
    });

    expect(sample.active).toBe(true);
    expect(sample.amount).toBeGreaterThan(1.19);
    expect(sample.red).toEqual({ x: 0, y: -1.2 });
    expect(sample.green).toEqual({ x: 0, y: 0 });
    expect(sample.blue).toEqual({ x: 0, y: 1.2 });
  });

  it("keeps chromatic shift on the normal axis instead of inventing tangent smear", () => {
    const normal = Math.SQRT1_2;
    const tangent = { x: -normal, y: normal };
    const sample = resolveLiquidChromaticAberration({
      bevelWidth: 18,
      distanceFromEdge: 0,
      intensity: 1,
      maxOffset: 2,
      normalX: normal,
      normalY: normal
    });

    const redTangentProjection = sample.red.x * tangent.x + sample.red.y * tangent.y;
    const blueTangentProjection = sample.blue.x * tangent.x + sample.blue.y * tangent.y;

    expect(Math.abs(redTangentProjection)).toBeLessThan(0.002);
    expect(Math.abs(blueTangentProjection)).toBeLessThan(0.002);
    expect(sample.red.x).toBeCloseTo(-sample.blue.x, 3);
    expect(sample.red.y).toBeCloseTo(-sample.blue.y, 3);
  });

  it("fades monotonically from bevel edge to clean center", () => {
    const ramp = resolveLiquidChromaticAberrationRamp({
      bevelWidth: 18,
      intensity: 0.8,
      maxOffset: 2,
      normalX: 1,
      normalY: 0,
      samples: 65
    });

    for (let index = 1; index < ramp.length; index += 1) {
      expect(ramp[index]?.amount).toBeLessThanOrEqual(ramp[index - 1]?.amount ?? 0);
      expect(ramp[index]?.edgeOpacity).toBeLessThanOrEqual(ramp[index - 1]?.edgeOpacity ?? 1);
    }

    expect(ramp[0]?.amount).toBeGreaterThan(1.5);
    expect(ramp.at(-1)?.active).toBe(false);
    expect(ramp.at(-1)?.amount).toBe(0);
  });

  it("returns a clean resting sample for disabled and reduced-transparency paths", () => {
    for (const sample of [
      resolveLiquidChromaticAberration({
        bevelWidth: 18,
        disabled: true,
        distanceFromEdge: 0,
        intensity: 1,
        normalX: 1,
        normalY: 0
      }),
      resolveLiquidChromaticAberration({
        bevelWidth: 18,
        distanceFromEdge: 0,
        intensity: 1,
        normalX: 1,
        normalY: 0,
        reducedTransparency: true
      })
    ]) {
      expect(sample).toMatchObject({
        active: false,
        amount: 0,
        blue: { x: 0, y: 0 },
        green: { x: 0, y: 0 },
        red: { x: 0, y: 0 }
      });
    }
  });

  it("clamps invalid inputs to finite bounded offsets", () => {
    const sample = resolveLiquidChromaticAberration({
      bevelWidth: Number.NaN,
      distanceFromEdge: Number.NaN,
      intensity: Number.POSITIVE_INFINITY,
      maxOffset: Number.POSITIVE_INFINITY,
      normalX: 1,
      normalY: 0
    });

    expect(Object.values(sample.red).every(Number.isFinite)).toBe(true);
    expect(Object.values(sample.green).every(Number.isFinite)).toBe(true);
    expect(Object.values(sample.blue).every(Number.isFinite)).toBe(true);
    expect(sample.amount).toBeGreaterThanOrEqual(0);
    expect(sample.amount).toBeLessThanOrEqual(4);
  });

  it("rests when the normal is missing or invalid", () => {
    expect(
      resolveLiquidChromaticAberration({
        bevelWidth: 18,
        distanceFromEdge: 0,
        intensity: 1,
        normalX: 0,
        normalY: 0
      }).active
    ).toBe(false);
    expect(
      resolveLiquidChromaticAberration({
        bevelWidth: 18,
        distanceFromEdge: 0,
        intensity: 1,
        normalX: Number.NaN,
        normalY: 1
      }).active
    ).toBe(false);
  });
});
