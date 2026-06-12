import { describe, expect, it } from "vitest";
import {
  clampLensPosition,
  resolveLensDragPosition,
  resolveLensDropletResponse
} from "../src";

const lens = { width: 210, height: 120 };
const bounds = { width: 706, height: 460, padding: 16 };

describe("draggable lens response", () => {
  it("clamps lens position inside the demo board", () => {
    expect(clampLensPosition({ x: -100, y: -40 }, lens, bounds)).toEqual({ x: 16, y: 16 });
    expect(clampLensPosition({ x: 800, y: 800 }, lens, bounds)).toEqual({
      x: 480,
      y: 324
    });
  });

  it("resolves drag movement from the initial pointer and position", () => {
    expect(
      resolveLensDragPosition({
        bounds,
        lens,
        pointer: { x: 190, y: 146 },
        pointerStart: { x: 100, y: 100 },
        positionStart: { x: 64, y: 48 }
      })
    ).toEqual({ x: 154, y: 94 });
  });

  it("models a pressed lens as a local water-drop stretch", () => {
    const response = resolveLensDropletResponse({
      pressed: true,
      point: { x: 260, y: 155 },
      rect: { left: 100, top: 100, width: 210, height: 120 }
    });

    expect(response.active).toBe(true);
    expect(response.originX).toBeGreaterThan(0.5);
    expect(response.originY).toBeLessThan(0.5);
    expect(response.scaleX).toBeGreaterThan(1.04);
    expect(response.scaleY).toBeLessThan(1);
    expect(response.transform).toContain("scaleX");
  });

  it("keeps pressed feedback visible but removes motion when requested", () => {
    const response = resolveLensDropletResponse({
      pressed: true,
      point: { x: 260, y: 155 },
      rect: { left: 100, top: 100, width: 210, height: 120 },
      reducedMotion: true
    });

    expect(response.active).toBe(true);
    expect(response.scaleX).toBe(1);
    expect(response.scaleY).toBe(1);
    expect(response.translateX).toBe(0);
    expect(response.translateY).toBe(0);
  });

  it("rests when the lens is not pressed or geometry is invalid", () => {
    expect(
      resolveLensDropletResponse({
        pressed: false,
        point: { x: 260, y: 155 },
        rect: { left: 100, top: 100, width: 210, height: 120 }
      }).active
    ).toBe(false);
    expect(
      resolveLensDropletResponse({
        pressed: true,
        point: { x: 260, y: 155 },
        rect: { left: 100, top: 100, width: 0, height: 120 }
      }).active
    ).toBe(false);
  });
});
