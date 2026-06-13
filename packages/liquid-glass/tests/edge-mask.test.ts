import { describe, expect, it } from "vitest";
import { sampleLiquidEdgeMask, sampleLiquidEdgeMaskRamp } from "../src";

describe("liquid edge mask", () => {
  it("keeps refraction at the edge and restores a clean center", () => {
    const edge = sampleLiquidEdgeMask({
      bevelWidth: 18,
      chromaticAberration: 0.4,
      distanceFromEdge: 0
    });
    const center = sampleLiquidEdgeMask({
      bevelWidth: 18,
      chromaticAberration: 0.4,
      distanceFromEdge: 18
    });

    expect(edge.edgeOpacity).toBeGreaterThan(0.98);
    expect(edge.refractionOpacity).toBeGreaterThan(0.96);
    expect(edge.centerOpacity).toBeLessThan(0.04);
    expect(edge.chromaticAberration).toBeGreaterThan(0.39);
    expect(center.edgeOpacity).toBeLessThan(0.02);
    expect(center.refractionOpacity).toBeLessThan(0.01);
    expect(center.centerOpacity).toBeGreaterThan(0.99);
    expect(center.chromaticAberration).toBeLessThan(0.01);
  });

  it("is monotonic from bevel to center", () => {
    const ramp = sampleLiquidEdgeMaskRamp({
      bevelWidth: 18,
      chromaticAberration: 0.35,
      samples: 65
    });

    for (let index = 1; index < ramp.length; index += 1) {
      expect(ramp[index]?.edgeOpacity).toBeLessThanOrEqual(ramp[index - 1]?.edgeOpacity ?? 1);
      expect(ramp[index]?.refractionOpacity).toBeLessThanOrEqual(
        ramp[index - 1]?.refractionOpacity ?? 1
      );
      expect(ramp[index]?.centerOpacity).toBeGreaterThanOrEqual(
        ramp[index - 1]?.centerOpacity ?? 0
      );
    }
  });

  it("stays continuous enough to avoid hard crossing seams", () => {
    const ramp = sampleLiquidEdgeMaskRamp({
      bevelWidth: 18,
      samples: 129,
      softening: 0.18
    });
    const maxStep = ramp.reduce((largest, sample, index) => {
      if (index === 0) {
        return largest;
      }

      return Math.max(largest, Math.abs(sample.edgeOpacity - (ramp[index - 1]?.edgeOpacity ?? 0)));
    }, 0);

    expect(maxStep).toBeLessThan(0.025);
  });

  it("clamps invalid inputs to finite optical weights", () => {
    const sample = sampleLiquidEdgeMask({
      bevelWidth: Number.NaN,
      chromaticAberration: Number.POSITIVE_INFINITY,
      distanceFromEdge: Number.NaN,
      softening: Number.NaN
    });

    expect(Object.values(sample).every(Number.isFinite)).toBe(true);
    expect(sample.edgeOpacity).toBeGreaterThanOrEqual(0);
    expect(sample.edgeOpacity).toBeLessThanOrEqual(1);
    expect(sample.centerOpacity).toBeGreaterThanOrEqual(0);
    expect(sample.centerOpacity).toBeLessThanOrEqual(1);
  });
});
