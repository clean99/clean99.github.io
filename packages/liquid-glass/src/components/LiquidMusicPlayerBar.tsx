"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidMusicPlayerBarProps = HTMLAttributes<HTMLDivElement> & {
  artwork?: ReactNode;
  title?: ReactNode;
  artist?: ReactNode;
  controls?: ReactNode;
  progress?: ReactNode;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "kind">;
};

const defaultPlayerRefraction = {
  blur: 1,
  glassThickness: 92,
  bezelWidth: 20,
  refractiveIndex: 1.5,
  radius: 34,
  specularOpacity: 0.4,
  specularAngle: 0.78
};

export const LiquidMusicPlayerBar = forwardRef<HTMLDivElement, LiquidMusicPlayerBarProps>(
  function LiquidMusicPlayerBar(
    {
      artist = "Jimi Hendrix",
      artwork,
      className,
      controls,
      progress,
      surfaceProps,
      title = "Little Wing",
      ...props
    },
    ref
  ) {
    const {
      className: surfaceClassName,
      intensity = "strong",
      radius = 34,
      refraction,
      ...restSurfaceProps
    } = surfaceProps ?? {};

    return (
      <div {...props} className={cn("lg-music-player", className)} ref={ref}>
        <LiquidSurface
          {...restSurfaceProps}
          className={cn("lg-music-player__surface", surfaceClassName)}
          intensity={intensity}
          kind="pill"
          radius={radius}
          refraction={{ ...defaultPlayerRefraction, ...refraction, radius: Number(radius) || 34 }}
        >
          <span className="lg-music-player__artwork" aria-hidden="true">
            {artwork}
          </span>
          <span className="lg-music-player__meta">
            <span className="lg-music-player__title">{title}</span>
            <span className="lg-music-player__artist">{artist}</span>
          </span>
          <span className="lg-music-player__controls" aria-hidden="true">
            {controls ?? (
              <>
                <span className="lg-music-player__control lg-music-player__control--prev" />
                <span className="lg-music-player__control lg-music-player__control--play" />
                <span className="lg-music-player__control lg-music-player__control--next" />
              </>
            )}
          </span>
          <span className="lg-music-player__progress" aria-hidden="true">
            {progress ?? <span className="lg-music-player__progress-fill" />}
          </span>
        </LiquidSurface>
      </div>
    );
  }
);
