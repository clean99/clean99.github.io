import { describe, expect, it } from "vitest";
import {
  getBrowserCapabilities,
  readStoredLiquidMode,
  resolvePhysicalRefractionRadius,
  resolveRefractiveOptions,
  resolveRefractionRadius,
  resolveLiquidMode,
  shouldUseEnhancedLiquidGlass,
  type BrowserCapabilityEnvironment
} from "../src";

const chromeEnvironment: BrowserCapabilityEnvironment = {
  cssSupports: () => true,
  matchMedia: () => ({ matches: false }),
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  userAgentDataBrands: [{ brand: "Chromium", version: "145" }],
  platform: "MacIntel",
  maxTouchPoints: 0,
  innerWidth: 1440,
  hardwareConcurrency: 10,
  deviceMemory: 8
};

describe("browser capability detection", () => {
  it("allows enhanced mode only when Chromium and SVG backdrop filters are available", () => {
    const capabilities = getBrowserCapabilities(chromeEnvironment);

    expect(capabilities.isChromium).toBe(true);
    expect(capabilities.supportsBackdropFilter).toBe(true);
    expect(capabilities.supportsSvgBackdropFilter).toBe(true);
    expect(shouldUseEnhancedLiquidGlass(capabilities)).toBe(true);
  });

  it("does not allow enhanced mode in Safari even if blur fallback exists", () => {
    const capabilities = getBrowserCapabilities({
      ...chromeEnvironment,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      userAgentDataBrands: [],
      cssSupports: (property, value) =>
        property.includes("backdrop-filter") && value.includes("blur")
    });

    expect(capabilities.isSafari).toBe(true);
    expect(capabilities.supportsBackdropFilter).toBe(true);
    expect(capabilities.supportsSvgBackdropFilter).toBe(false);
    expect(shouldUseEnhancedLiquidGlass(capabilities)).toBe(false);
  });

  it("keeps iOS browsers on fallback because they run through WebKit", () => {
    const capabilities = getBrowserCapabilities({
      ...chromeEnvironment,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/145.0.0.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5
    });

    expect(capabilities.isIOS).toBe(true);
    expect(shouldUseEnhancedLiquidGlass(capabilities)).toBe(false);
  });
});

describe("resolveLiquidMode", () => {
  it("resolves auto to enhanced when capabilities are good", () => {
    expect(
      resolveLiquidMode({
        capabilities: getBrowserCapabilities(chromeEnvironment),
        maxEnhancedSurfaces: 4,
        enhancedSurfaceCount: 0
      })
    ).toBe("enhanced");
  });

  it("falls back when the enhanced surface budget is exhausted", () => {
    expect(
      resolveLiquidMode({
        requestedMode: "enhanced",
        capabilities: getBrowserCapabilities(chromeEnvironment),
        maxEnhancedSurfaces: 1,
        enhancedSurfaceCount: 1
      })
    ).toBe("fallback");
  });

  it("uses solid mode when reduced transparency is requested", () => {
    expect(
      resolveLiquidMode({
        requestedMode: "enhanced",
        capabilities: getBrowserCapabilities({
          ...chromeEnvironment,
          matchMedia: (query) => ({ matches: query.includes("reduced-transparency") })
        })
      })
    ).toBe("solid");
  });

  it("reads localStorage override values defensively", () => {
    const storage = {
      getItem: (key: string) => (key === "clean99-liquid-glass-mode" ? "fallback" : null)
    } as Storage;

    expect(readStoredLiquidMode(storage)).toBe("fallback");
  });
});

describe("refraction option resolution", () => {
  it("keeps visual pill radius from becoming an unsafe filter radius", () => {
    expect(resolveRefractionRadius(999)).toBe(96);
    expect(resolveRefractionRadius(18)).toBe(18);
  });

  it("keeps optical radius inside the measured surface geometry", () => {
    expect(resolvePhysicalRefractionRadius({ height: 54, radius: 999, width: 357 })).toBe(27);
    expect(resolvePhysicalRefractionRadius({ height: 84, radius: 999, width: 720 })).toBe(42);
    expect(resolvePhysicalRefractionRadius({ height: 45, radius: 28, width: 336 })).toBe(22);
  });

  it("lets explicit refraction options override intensity defaults", () => {
    expect(
      resolveRefractiveOptions({
        intensity: "strong",
        radius: 999,
        refraction: { glassThickness: 128, radius: 144 }
      })
    ).toMatchObject({
      glassThickness: 128,
      radius: 96
    });
  });

  it("applies physical bounds when resolving measured refractive options", () => {
    expect(
      resolveRefractiveOptions({
        bounds: { height: 54, width: 357 },
        intensity: "subtle",
        radius: 999
      }).radius
    ).toBe(27);
  });
});
