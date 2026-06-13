import { describe, expect, it } from "vitest";
import {
  createLensDisplacementPixelMap,
  createLensFilterPixelMaps,
  createLensMagnificationPixelMap,
  createLensSpecularPixelMap,
  referenceLensDisplacementFalloff,
  referenceLensGeometry,
  resolveLensReferencePipeline,
  sampleCapsuleField,
  type LiquidPixelMap
} from "../src";

describe("lens displacement pixel maps", () => {
  it("creates default reference maps at the expected optical dimensions", () => {
    const maps = createLensFilterPixelMaps();

    expect(maps.magnification.pixelRatio).toBe(1);
    expect(maps.magnification.width).toBe(referenceLensGeometry.opticalWidth);
    expect(maps.magnification.height).toBe(referenceLensGeometry.opticalHeight);
    expect(maps.magnification.data).toHaveLength(
      referenceLensGeometry.opticalWidth * referenceLensGeometry.opticalHeight * 4
    );

    for (const map of [maps.displacement, maps.specular]) {
      const expectedWidth = referenceLensGeometry.opticalWidth * 2;
      const expectedHeight = referenceLensGeometry.opticalHeight * 2;

      expect(map.pixelRatio).toBe(2);
      expect(map.width).toBe(expectedWidth);
      expect(map.height).toBe(expectedHeight);
      expect(map.data).toHaveLength(expectedWidth * expectedHeight * 4);
    }
  });

  it("allows tests to force one deterministic pixel ratio for every map", () => {
    const maps = createLensFilterPixelMaps({ pixelRatio: 3 });
    const expectedWidth = referenceLensGeometry.opticalWidth * 3;
    const expectedHeight = referenceLensGeometry.opticalHeight * 3;

    for (const map of [maps.displacement, maps.magnification, maps.specular]) {
      expect(map.pixelRatio).toBe(3);
      expect(map.width).toBe(expectedWidth);
      expect(map.height).toBe(expectedHeight);
    }
  });

  it("models the Kube magnification pass as a full rectangular center-pull field", () => {
    const map = createLensMagnificationPixelMap({ pixelRatio: 1 });

    expect(rgbaAt(map, 105, 75)).toEqual([128, 128, 0, 255]);
    expect(rgbaAt(map, 0, 0)).toEqual([255, 219, 0, 255]);
    expect(rgbaAt(map, 105, 0)).toEqual([128, 219, 0, 255]);
    expect(rgbaAt(map, 1, 75)).toEqual([254, 128, 0, 255]);
    expect(rgbaAt(map, 208, 75)).toEqual([3, 128, 0, 255]);
    expect(rgbaAt(map, 105, 148)).toEqual([128, 40, 0, 255]);
    expect(rgbaAt(map, 52, 37)).toEqual([192, 174, 0, 255]);
  });

  it("keeps the displacement center neutral while bending each bevel along its normal", () => {
    const [, displacementStage] = resolveLensReferencePipeline().stages;
    const map = createLensDisplacementPixelMap(displacementStage, { pixelRatio: 2 });

    expect(rgbaAt(map, 210, 150)).toEqual([128, 128, 0, 255]);

    const top = rgbaAt(map, 210, 1);
    const bottom = rgbaAt(map, 210, 299);
    const left = rgbaAt(map, 1, 150);
    const right = rgbaAt(map, 419, 150);

    expect(top[1]).toBeGreaterThan(128);
    expect(bottom[1]).toBeLessThan(128);
    expect(left[0]).toBeGreaterThan(128);
    expect(right[0]).toBeLessThan(128);
    expect(rgbaAt(map, 52, 150)).toEqual([128, 128, 0, 255]);
    expect(rgbaAt(map, 210, 52)).toEqual([128, 128, 0, 255]);
  });

  it("keeps spatial falloff separate from physical bevel scale", () => {
    const [magnificationStage, displacementStage] = resolveLensReferencePipeline().stages;

    expect(magnificationStage.mapFalloffWidth).toBe(referenceLensGeometry.radius);
    expect(displacementStage.mapFalloffWidth).toBe(referenceLensDisplacementFalloff);
    expect(displacementStage.mapFalloffWidth).toBeLessThan(referenceLensGeometry.radius);
    expect(displacementStage.bezelWidth).toBe(18);
  });

  it("keeps points outside the capsule transparent in the specular map", () => {
    const map = createLensSpecularPixelMap({ pixelRatio: 2 });

    expect(rgbaAt(map, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(rgbaAt(map, 210, 150)).toEqual([0, 0, 0, 0]);
    expect(rgbaAt(map, 4, 150)).toEqual([0, 0, 0, 0]);

    const sideRim = rgbaAt(map, 1, 150);
    const topRim = rgbaAt(map, 210, 1);
    const bottomRim = rgbaAt(map, 210, 298);

    expect(countNonTransparentPixels(map)).toBeGreaterThan(4000);
    expect(countNonTransparentPixels(map)).toBeLessThan(5000);
    expect(topRim[0]).toBeLessThan(220);
    expect(sideRim[0]).toBeLessThan(topRim[0]);
    expect(sideRim[3]).toBeLessThan(topRim[3]);
    expect(bottomRim[3]).toBe(topRim[3]);
  });

  it("samples the capsule field with finite normals and no outside false positives", () => {
    const top = sampleCapsuleField(105, 1);
    const left = sampleCapsuleField(1, 75);

    expect(sampleCapsuleField(0, 0)).toBeNull();
    expect(top).toMatchObject({
      distanceFromEdge: 1,
      normalX: 0,
      normalY: -1
    });
    expect(left?.normalX).toBeLessThan(0);
    expect(left?.normalY).toBeCloseTo(0, 6);
    expect(Number.isFinite(left?.distanceFromEdge)).toBe(true);
  });

  it("clamps invalid pixel ratios to deterministic integer maps", () => {
    const [, displacementStage] = resolveLensReferencePipeline().stages;
    const map = createLensDisplacementPixelMap(displacementStage, { pixelRatio: Number.NaN });

    expect(map.pixelRatio).toBe(3);
    expect(map.width).toBe(referenceLensGeometry.opticalWidth * 3);
    expect(map.height).toBe(referenceLensGeometry.opticalHeight * 3);
  });
});

function rgbaAt(map: LiquidPixelMap, x: number, y: number) {
  const index = (y * map.width + x) * 4;

  return [map.data[index], map.data[index + 1], map.data[index + 2], map.data[index + 3]];
}

function countNonTransparentPixels(map: LiquidPixelMap) {
  let count = 0;

  for (let index = 3; index < map.data.length; index += 4) {
    if ((map.data[index] ?? 0) > 0) {
      count += 1;
    }
  }

  return count;
}
