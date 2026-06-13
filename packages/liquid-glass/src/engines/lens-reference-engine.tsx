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
import { resolveLensReferencePipeline } from "../utils/lens-pipeline";
import { createLensFilterPixelMaps, type LiquidPixelMap } from "../utils/displacement-map";

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
    const pipeline = resolveLensReferencePipeline(refraction);

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
  const chromaticAmount = pipeline.chromaticAberration.amount;

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
          {pipeline.chromaticAberration.active ? (
            <>
              <feDisplacementMap
                in="blurred_source"
                in2="displacement_map"
                result="red_displaced"
                scale={displacementStage.scale + chromaticAmount}
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="red_displaced"
                result="red_channel"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
              />
              <feColorMatrix
                in="displaced"
                result="green_channel"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
              />
              <feDisplacementMap
                in="blurred_source"
                in2="displacement_map"
                result="blue_displaced"
                scale={Math.max(0, displacementStage.scale - chromaticAmount)}
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="blue_displaced"
                result="blue_channel"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
              />
              <feBlend in="green_channel" in2="blue_channel" mode="screen" result="green_blue" />
              <feBlend in="red_channel" in2="green_blue" mode="screen" result="displaced" />
            </>
          ) : null}
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
  const maps = createLensFilterPixelMaps();

  return {
    displacement: createPixelMapDataUrl(maps.displacement),
    magnification: createPixelMapDataUrl(maps.magnification),
    specular: createPixelMapDataUrl(maps.specular)
  };
}

function createPixelMapDataUrl(map: LiquidPixelMap) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return emptyPngDataUrl();
  }

  canvas.width = map.width;
  canvas.height = map.height;
  const image = context.createImageData(map.width, map.height);
  image.data.set(map.data);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function emptyPngDataUrl() {
  return "data:image/png;base64,iVBORw0KGgo=";
}
