"use client";

import {
  createElement,
  forwardRef,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode
} from "react";
import type { LiquidEngineProps } from "./engine-props";
import {
  referenceLensGeometry,
  resolveLensReferencePipeline,
  type LensPipelineStage
} from "../utils/lens-pipeline";
import { calculateDisplacementMagnitudes } from "../utils/optics";

type LensHostProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  type?: string;
};

type LensFilterMaps = {
  displacement: string;
  magnification: string;
  specular: string;
};

const LensHost = forwardRef<HTMLElement, LensHostProps>(function LensHost(
  { as: Component = "div", children, ...props },
  ref
) {
  return createElement(Component, { ...props, ref }, children);
});

export const LensReferenceEngine = forwardRef<HTMLElement, LiquidEngineProps>(
  function LensReferenceEngine({ children, refraction, style, ...props }, ref) {
    const reactId = useId();
    const filterId = `lg-lens-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const [maps, setMaps] = useState<LensFilterMaps | null>(null);
    const pipeline = resolveLensReferencePipeline();

    useEffect(() => {
      let isMounted = true;
      queueMicrotask(() => {
        if (isMounted) {
          setMaps(createLensFilterMaps());
        }
      });

      return () => {
        isMounted = false;
      };
    }, []);

    if (!refraction) {
      return (
        <LensHost {...props} ref={ref} style={style}>
          {children}
        </LensHost>
      );
    }

    const hostStyle = {
      ...style,
      ...(maps
        ? {
            WebkitBackdropFilter: `url(#${filterId})`,
            backdropFilter: `url(#${filterId})`
          }
        : undefined),
      borderRadius: refraction.radius
    } as CSSProperties;

    return (
      <>
        {maps ? <LensFilterDefs filterId={filterId} maps={maps} pipeline={pipeline} /> : null}
        <LensHost {...props} ref={ref} style={hostStyle}>
          {children}
        </LensHost>
      </>
    );
  }
);

function LensFilterDefs({
  filterId,
  maps,
  pipeline
}: {
  filterId: string;
  maps: LensFilterMaps;
  pipeline: ReturnType<typeof resolveLensReferencePipeline>;
}) {
  const [magnificationStage, displacementStage] = pipeline.stages;
  const { opticalHeight, opticalWidth } = pipeline.geometry;

  return (
    <svg aria-hidden="true" colorInterpolationFilters="sRGB" style={{ display: "none" }}>
      <defs>
        <filter id={filterId}>
          <feImage
            height={opticalHeight}
            href={maps.magnification}
            result="magnifying_displacement_map"
            width={opticalWidth}
            x="0"
            y="0"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="magnifying_displacement_map"
            result="magnified_source"
            scale={magnificationStage.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur in="magnified_source" result="blurred_source" stdDeviation="0" />
          <feImage
            height={opticalHeight}
            href={maps.displacement}
            result="displacement_map"
            width={opticalWidth}
            x="0"
            y="0"
          />
          <feDisplacementMap
            in="blurred_source"
            in2="displacement_map"
            result="displaced"
            scale={displacementStage.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feColorMatrix in="displaced" result="displaced_saturated" type="saturate" values="9" />
          <feImage
            height={opticalHeight}
            href={maps.specular}
            result="specular_layer"
            width={opticalWidth}
            x="0"
            y="0"
          />
          <feComposite
            in="displaced_saturated"
            in2="specular_layer"
            operator="in"
            result="specular_saturated"
          />
          <feComponentTransfer in="specular_layer" result="specular_faded">
            <feFuncA slope="0.5" type="linear" />
          </feComponentTransfer>
          <feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation" />
          <feBlend in="specular_faded" in2="withSaturation" mode="normal" />
        </filter>
      </defs>
    </svg>
  );
}

function createLensFilterMaps(): LensFilterMaps {
  const pipeline = resolveLensReferencePipeline();
  const [magnificationStage, displacementStage] = pipeline.stages;

  return {
    displacement: createDisplacementMapDataUrl(displacementStage),
    magnification: createDisplacementMapDataUrl(magnificationStage),
    specular: createSpecularMapDataUrl()
  };
}

function createDisplacementMapDataUrl(stage: LensPipelineStage) {
  const { opticalHeight, opticalWidth, radius } = referenceLensGeometry;
  const pixelRatio = 3;
  const width = opticalWidth * pixelRatio;
  const height = opticalHeight * pixelRatio;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return emptyPngDataUrl();
  }

  canvas.width = width;
  canvas.height = height;
  const image = context.createImageData(width, height);
  const magnitudes = calculateDisplacementMagnitudes({
    bezelWidth: stage.bezelWidth,
    glassThickness: stage.glassThickness,
    profile: stage.profile,
    refractiveIndex: stage.refractiveIndex
  });
  const maxMagnitude = Math.max(...magnitudes.map(Math.abs));
  const effectiveBezelWidth = stage.bezelWidth > 0 ? stage.bezelWidth : radius;

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const x = (px + 0.5) / pixelRatio;
      const y = (py + 0.5) / pixelRatio;
      const sample = sampleCapsuleField(x, y);

      if (!sample || sample.distanceFromEdge > effectiveBezelWidth || maxMagnitude <= 0) {
        writeRgba(image.data, index, 128, 128, 128, 255);
        continue;
      }

      const progress = Math.max(0, Math.min(1, sample.distanceFromEdge / effectiveBezelWidth));
      const magnitudeIndex = Math.min(
        magnitudes.length - 1,
        Math.max(0, Math.round(progress * (magnitudes.length - 1)))
      );
      const normalizedMagnitude = (magnitudes[magnitudeIndex] ?? 0) / maxMagnitude;
      const red = 128 - sample.normalX * normalizedMagnitude * 127;
      const green = 128 - sample.normalY * normalizedMagnitude * 127;

      writeRgba(image.data, index, red, green, 128, 255);
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function createSpecularMapDataUrl() {
  const { opticalHeight, opticalWidth } = referenceLensGeometry;
  const pixelRatio = 3;
  const width = opticalWidth * pixelRatio;
  const height = opticalHeight * pixelRatio;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return emptyPngDataUrl();
  }

  canvas.width = width;
  canvas.height = height;
  const image = context.createImageData(width, height);
  const lightX = Math.cos(0.8);
  const lightY = Math.sin(0.8);

  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const index = (py * width + px) * 4;
      const x = (px + 0.5) / pixelRatio;
      const y = (py + 0.5) / pixelRatio;
      const sample = sampleCapsuleField(x, y);

      if (!sample) {
        writeRgba(image.data, index, 0, 0, 0, 0);
        continue;
      }

      const edgeStrength = Math.max(0, 1 - sample.distanceFromEdge / 18);
      const directional = Math.abs(sample.normalX * lightX + sample.normalY * lightY);
      const alpha = 255 * edgeStrength * edgeStrength * directional;
      writeRgba(image.data, index, 255, 255, 255, alpha);
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function sampleCapsuleField(x: number, y: number) {
  const { opticalHeight, opticalWidth, radius } = referenceLensGeometry;
  const centerY = opticalHeight / 2;
  const leftCenterX = radius;
  const rightCenterX = opticalWidth - radius;

  if (x < leftCenterX) {
    return sampleCircleCap(x - leftCenterX, y - centerY, radius);
  }

  if (x > rightCenterX) {
    return sampleCircleCap(x - rightCenterX, y - centerY, radius);
  }

  const distanceToTop = y;
  const distanceToBottom = opticalHeight - y;
  const usesTop = distanceToTop <= distanceToBottom;

  return {
    distanceFromEdge: Math.max(0, usesTop ? distanceToTop : distanceToBottom),
    normalX: 0,
    normalY: usesTop ? -1 : 1
  };
}

function sampleCircleCap(dx: number, dy: number, radius: number) {
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length <= 0 || length > radius) {
    return null;
  }

  return {
    distanceFromEdge: Math.max(0, radius - length),
    normalX: dx / length,
    normalY: dy / length
  };
}

function writeRgba(data: Uint8ClampedArray, index: number, r: number, g: number, b: number, a: number) {
  data[index] = clampByte(r);
  data[index + 1] = clampByte(g);
  data[index + 2] = clampByte(b);
  data[index + 3] = clampByte(a);
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(Number.isFinite(value) ? value : 0)));
}

function emptyPngDataUrl() {
  return "data:image/png;base64,iVBORw0KGgo=";
}
