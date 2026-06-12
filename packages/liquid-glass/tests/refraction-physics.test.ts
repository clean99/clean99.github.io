import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  estimateMaximumDisplacement,
  defaultRefractionByIntensity,
  resolveFilterMapGeometry,
  resolveLensReferencePipeline,
  resolvePhysicalRefractionRadius,
  resolveRefractiveOptions,
  resolveRefractionRadius,
  type LiquidIntensity,
  type RefractiveOptions
} from "../src";

const styles = fs.readFileSync(path.resolve("src/styles/styles.css"), "utf8");
const storyFixture = fs.readFileSync(path.resolve("stories/story-fixtures.tsx"), "utf8");
const lensSource = fs.readFileSync(path.resolve("src/components/LiquidLens.tsx"), "utf8");
const lensReferenceEngineSource = fs.readFileSync(
  path.resolve("src/engines/lens-reference-engine.tsx"),
  "utf8"
);
const lensPipelineSource = fs.readFileSync(path.resolve("src/utils/lens-pipeline.ts"), "utf8");
const surfaceSource = fs.readFileSync(path.resolve("src/components/LiquidSurface.tsx"), "utf8");

const intensities: LiquidIntensity[] = ["subtle", "medium", "strong"];
type DefaultRefractiveOptions = Omit<RefractiveOptions, "radius">;

describe("Liquid Glass physics contract", () => {
  it("keeps default optical parameters in a plausible glass range", () => {
    for (const intensity of intensities) {
      const options = defaultRefractionByIntensity[intensity];

      expect(options.blur).toBeGreaterThanOrEqual(0);
      expect(options.blur).toBeLessThanOrEqual(1);
      expect(options.glassThickness).toBeGreaterThan(0);
      expect(options.glassThickness).toBeLessThanOrEqual(128);
      expect(options.bezelWidth).toBeGreaterThan(0);
      expect(options.bezelWidth).toBeLessThanOrEqual(24);
      expect(options.refractiveIndex).toBeGreaterThanOrEqual(1.3);
      expect(options.refractiveIndex).toBeLessThanOrEqual(1.6);
      expect(options.specularOpacity).toBeGreaterThanOrEqual(0);
      expect(options.specularOpacity).toBeLessThanOrEqual(0.6);
      expect(options.specularAngle).toBeGreaterThanOrEqual(0);
      expect(options.specularAngle).toBeLessThanOrEqual(Math.PI / 2);
    }
  });

  it("makes optical intensity monotonic without increasing blur into frosted glass", () => {
    const values = intensities.map((intensity) => defaultRefractionByIntensity[intensity]);

    expect(isMonotonic(values, "glassThickness")).toBe(true);
    expect(isMonotonic(values, "bezelWidth")).toBe(true);
    expect(isMonotonic(values, "refractiveIndex")).toBe(true);
    expect(isMonotonic(values, "specularOpacity")).toBe(true);

    const blurDelta =
      (defaultRefractionByIntensity.strong.blur ?? 0) -
      (defaultRefractionByIntensity.subtle.blur ?? 0);
    expect(blurDelta).toBeLessThanOrEqual(0.35);
  });

  it("clamps filter radius to the bounded SVG displacement range", () => {
    expect(resolveRefractionRadius(-20)).toBe(1);
    expect(resolveRefractionRadius(18)).toBe(18);
    expect(resolveRefractionRadius(999)).toBe(96);
    expect(
      resolveRefractiveOptions({
        intensity: "strong",
        radius: 999,
        refraction: { radius: 144 }
      }).radius
    ).toBe(96);
  });

  it("does not allow optical radius to exceed the physical cap of a measured surface", () => {
    expect(resolvePhysicalRefractionRadius({ height: 54, radius: 999, width: 357 })).toBe(27);
    expect(resolvePhysicalRefractionRadius({ height: 84, radius: 96, width: 720 })).toBe(42);
  });

  it("allows explicit lens overscan without weakening the default physical cap", () => {
    expect(
      resolveRefractiveOptions({
        bounds: { height: 120, width: 210 },
        intensity: "strong",
        radius: 75
      }).radius
    ).toBe(60);

    expect(
      resolveRefractiveOptions({
        allowOversizedRadius: true,
        bounds: { height: 120, width: 210 },
        intensity: "strong",
        radius: 75
      }).radius
    ).toBe(75);
    expect(lensSource).toContain("allowOversizedRefractionRadius = true");
  });

  it("keeps the lens thickness aligned with the kube second-pass displacement scale", () => {
    const pipeline = resolveLensReferencePipeline();

    expect(pipeline.stages).toHaveLength(2);
    expect(pipeline.stages[0]).toMatchObject({
      bezelWidth: 0,
      glassThickness: 21.5,
      name: "magnification",
      refractiveIndex: 1.5
    });
    expect(pipeline.stages[0]?.scale).toBeCloseTo(24, 1);
    expect(pipeline.stages[1]).toMatchObject({
      bezelWidth: 18,
      glassThickness: 88,
      name: "displacement",
      refractiveIndex: 1.5
    });
    expect(pipeline.stages[1]?.scale).toBeCloseTo(98.24713343067756, 6);
    expect(
      estimateMaximumDisplacement({
        bezelWidth: 18,
        glassThickness: 88,
        refractiveIndex: 1.5
      })
    ).toBeCloseTo(pipeline.stages[1]?.scale ?? 0, 6);
    expect(lensPipelineSource).toContain("glassThickness: 88");
    expect(lensPipelineSource).toContain("refractiveIndex: 1.5");
    expect(lensSource).toContain("referenceLensDisplacementRefraction");
    expect(lensSource).toContain('engine = "refractive"');
    expect(lensSource).toContain('engine === "reference" ? "reference-lens" : "refractive"');
    expect(lensSource).not.toContain("defaultLensMagnificationRefraction");
    expect(lensSource).not.toContain('className="lg-lens__core"');
  });

  it("keeps the reference lens engine as a real two-pass SVG filter", () => {
    expect(lensReferenceEngineSource.match(/<feImage/g)).toHaveLength(3);
    expect(lensReferenceEngineSource.match(/<feDisplacementMap/g)).toHaveLength(2);
    expect(lensReferenceEngineSource).toContain('result="magnifying_displacement_map"');
    expect(lensReferenceEngineSource).toContain('result="displacement_map"');
    expect(lensReferenceEngineSource).toContain('result="specular_layer"');
    expect(lensReferenceEngineSource).toContain('in="SourceGraphic"');
    expect(lensReferenceEngineSource).toContain('in="blurred_source"');
    expect(lensReferenceEngineSource).toContain('values="9"');
  });

  it("keeps optical displacement estimates finite for bad sample input", () => {
    const displacement = estimateMaximumDisplacement({
      bezelWidth: Number.NaN,
      glassThickness: Number.NaN,
      refractiveIndex: Number.NaN,
      samples: Number.NaN
    });

    expect(displacement).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(displacement)).toBe(true);
  });

  it("keeps lens filter-map slices from overlapping at the overscan radius", () => {
    const lensRule = collectCssRuleBodies(styles, ".lg-lens").join("\n");

    expect(lensRule).toContain("height: 9.375rem");
    expect(lensRule).toContain("transform: scaleY(0.8)");
    expect(lensRule).toContain("transform-origin: top center");
    expect(
      resolveFilterMapGeometry({
        bezelWidth: 18,
        height: 150,
        radius: 75,
        width: 210
      }).hasOverlappingSlices
    ).toBe(false);
    expect(
      resolveFilterMapGeometry({
        bezelWidth: 18,
        height: 120,
        radius: 75,
        width: 210
      }).hasOverlappingSlices
    ).toBe(true);
  });

  it("keeps foreground content outside the displacement/filter layer", () => {
    const contentRules = collectCssRuleBodies(styles, ".lg-surface__content").join("\n");

    expect(surfaceSource).toContain('<span className="lg-surface__content">{children}</span>');
    expect(contentRules).not.toMatch(/(?:^|;)\s*-?webkit-filter\s*:/);
    expect(contentRules).not.toMatch(/(?:^|;)\s*filter\s*:/);
    expect(contentRules).not.toMatch(/(?:^|;)\s*-?webkit-backdrop-filter\s*:/);
    expect(contentRules).not.toMatch(/(?:^|;)\s*backdrop-filter\s*:/);
  });

  it("does not fake refraction by adding generated crosshatch material texture", () => {
    expect(styles).not.toContain("repeating-linear-gradient");
    expect(storyFixture).not.toContain("repeating-linear-gradient");
  });

  it("keeps nav and toolbar item filters disabled so the plate owns refraction", () => {
    expect(styles).toContain(".lg-nav .lg-surface--button");
    expect(styles).toContain(".lg-nav .lg-surface--toggle");
    expect(styles).toContain("-webkit-backdrop-filter: none !important");
    expect(styles).toContain("backdrop-filter: none !important");
  });

  it("uses material focus instead of system-blue or hard white rings", () => {
    const focusRules = [
      ...collectCssRuleBodies(styles, ".lg-surface:focus-visible"),
      ...collectCssRuleBodies(styles, ".lg-tabs__tab:focus-visible"),
      ...collectCssRuleBodies(styles, ".lg-searchbox:focus-within"),
      ...collectCssRuleBodies(styles, ".lg-field-control:focus-within")
    ].join("\n");

    expect(focusRules).not.toContain("--lg-accent");
    expect(focusRules).not.toContain("#0a84ff");
    expect(focusRules).not.toContain("0 0 0 1px");
    expect(focusRules).not.toContain("--lg-control-focus-rim");
    expect(focusRules).toContain("--lg-control-focus-fill");
    expect(focusRules).toContain("scale(");
  });

  it("models search focus as a frosted capsule growing from idle scale", () => {
    const searchboxRule = collectCssRuleBodies(styles, ".lg-searchbox").join("\n");
    const focusRule = collectCssRuleBodies(styles, ".lg-searchbox:focus-within").join("\n");
    const reducedMotionRule = collectCssRuleBodies(
      styles,
      ".lg-searchbox[data-liquid-reduced-motion]"
    ).join("\n");

    expect(searchboxRule).toContain("width: 26.25rem");
    expect(searchboxRule).toContain("max-width: 100%");
    expect(searchboxRule).toContain("height: 3.5rem");
    expect(searchboxRule).toContain("transform: scale(0.8)");
    expect(searchboxRule).toContain("transition:");
    expect(searchboxRule).toContain("transform 260ms");
    expect(focusRule).toContain("rgba(33, 34, 34, 0.52)");
    expect(focusRule).toContain("transform: scale(1)");
    expect(reducedMotionRule).toContain("transform: none");
  });
});

function isMonotonic(options: DefaultRefractiveOptions[], key: keyof DefaultRefractiveOptions) {
  return options.every((option, index) => {
    if (index === 0) {
      return true;
    }

    return Number(option[key] ?? 0) >= Number(options[index - 1]?.[key] ?? 0);
  });
}

function collectCssRuleBodies(css: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`${escapedSelector}[^{}]*\\{([^}]*)\\}`, "g");
  return Array.from(css.matchAll(matcher), (match) => match[1] ?? "");
}
