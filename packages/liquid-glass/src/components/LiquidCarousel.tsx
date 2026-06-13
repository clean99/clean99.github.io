"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import { LiquidIconButton, type LiquidIconButtonProps } from "./LiquidIconButton";
import { cn } from "../utils/cn";
import {
  getCarouselAxis,
  getCarouselKeyboardAction,
  getCarouselOrientationClass,
  type LiquidCarouselDirection,
  type LiquidCarouselOrientation
} from "../utils/carousel";

export type LiquidCarouselApi = EmblaCarouselType;
export type LiquidCarouselOptions = EmblaOptionsType;
export type LiquidCarouselPlugin = EmblaPluginType;

type LiquidCarouselContextValue = {
  api: EmblaCarouselType | undefined;
  canScrollNext: boolean;
  canScrollPrev: boolean;
  direction: LiquidCarouselDirection;
  orientation: LiquidCarouselOrientation;
  scrollNext: () => void;
  scrollPrev: () => void;
  viewportRef: ReturnType<typeof useEmblaCarousel>[0];
};

const LiquidCarouselContext = createContext<LiquidCarouselContextValue | null>(null);

export type LiquidCarouselProps = HTMLAttributes<HTMLDivElement> & {
  direction?: LiquidCarouselDirection;
  onApiChange?: (api: LiquidCarouselApi) => void;
  opts?: LiquidCarouselOptions;
  orientation?: LiquidCarouselOrientation;
  plugins?: LiquidCarouselPlugin[];
  setApi?: (api: LiquidCarouselApi) => void;
};

export type LiquidCarouselContentProps = HTMLAttributes<HTMLDivElement>;
export type LiquidCarouselItemProps = HTMLAttributes<HTMLDivElement>;
export type LiquidCarouselControlProps = Omit<LiquidIconButtonProps, "aria-label" | "children"> & {
  "aria-label"?: string;
  children?: ReactNode;
};
export type LiquidCarouselViewportProps = HTMLAttributes<HTMLDivElement>;
type LiquidCarouselControlInternalProps = Omit<LiquidIconButtonProps, "children"> & {
  children: ReactNode;
};

function useCarouselContext() {
  const context = useContext(LiquidCarouselContext);

  if (!context) {
    throw new Error("LiquidCarousel components must be used inside <LiquidCarousel />");
  }

  return context;
}

export function useLiquidCarousel() {
  return useCarouselContext();
}

export const LiquidCarousel = forwardRef<HTMLDivElement, LiquidCarouselProps>(
  function LiquidCarousel(
    {
      children,
      className,
      direction = "ltr",
      onApiChange,
      onKeyDown,
      opts,
      orientation = "horizontal",
      plugins,
      role = "region",
      setApi,
      ...props
    },
    ref
  ) {
    const [viewportRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: getCarouselAxis(orientation),
        direction
      },
      plugins
    );
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const updateScrollState = useCallback((nextApi: EmblaCarouselType) => {
      setCanScrollPrev(nextApi.canScrollPrev());
      setCanScrollNext(nextApi.canScrollNext());
    }, []);

    const scrollPrev = useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = useCallback(() => {
      api?.scrollNext();
    }, [api]);

    useEffect(() => {
      if (!api) {
        return;
      }

      setApi?.(api);
      onApiChange?.(api);

      let cancelled = false;
      const syncScrollState = () => {
        if (!cancelled) {
          updateScrollState(api);
        }
      };

      queueMicrotask(syncScrollState);
      api.on("reInit", syncScrollState);
      api.on("select", syncScrollState);

      return () => {
        cancelled = true;
        api.off("reInit", syncScrollState);
        api.off("select", syncScrollState);
      };
    }, [api, onApiChange, setApi, updateScrollState]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (event.defaultPrevented) {
        return;
      }

      const action = getCarouselKeyboardAction(event.key, orientation, direction);

      if (!action) {
        return;
      }

      event.preventDefault();
      if (action === "previous") {
        scrollPrev();
      } else {
        scrollNext();
      }
    };

    return (
      <LiquidCarouselContext.Provider
        value={{
          api,
          canScrollNext,
          canScrollPrev,
          direction,
          orientation,
          scrollNext,
          scrollPrev,
          viewportRef
        }}
      >
        <div
          {...props}
          aria-roledescription={props["aria-roledescription"] ?? "carousel"}
          className={cn("lg-carousel", getCarouselOrientationClass(orientation), className)}
          data-orientation={orientation}
          dir={direction}
          onKeyDown={handleKeyDown}
          ref={ref}
          role={role}
        >
          {children}
        </div>
      </LiquidCarouselContext.Provider>
    );
  }
);

export const LiquidCarouselContent = forwardRef<HTMLDivElement, LiquidCarouselContentProps>(
  function LiquidCarouselContent({ className, ...props }, ref) {
    const { orientation, viewportRef } = useCarouselContext();

    return (
      <div className="lg-carousel__viewport" ref={viewportRef}>
        <div
          {...props}
          className={cn("lg-carousel__content", className)}
          data-orientation={orientation}
          ref={ref}
        />
      </div>
    );
  }
);

export const LiquidCarouselItem = forwardRef<HTMLDivElement, LiquidCarouselItemProps>(
  function LiquidCarouselItem({ className, role = "group", ...props }, ref) {
    const { orientation } = useCarouselContext();

    return (
      <div
        {...props}
        aria-roledescription={props["aria-roledescription"] ?? "slide"}
        className={cn("lg-carousel__item", className)}
        data-orientation={orientation}
        ref={ref}
        role={role}
      />
    );
  }
);

export const LiquidCarouselPrevious = forwardRef<HTMLButtonElement, LiquidCarouselControlProps>(
  function LiquidCarouselPrevious(
    { "aria-label": ariaLabel = "Previous slide", children, className, onClick, ...props },
    ref
  ) {
    const { canScrollPrev, scrollPrev } = useCarouselContext();

    return (
      <LiquidCarouselControl
        {...props}
        aria-label={ariaLabel}
        className={cn("lg-carousel__control lg-carousel__control--previous", className)}
        disabled={props.disabled ?? !canScrollPrev}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            scrollPrev();
          }
        }}
        ref={ref}
      >
        {children ?? "‹"}
      </LiquidCarouselControl>
    );
  }
);

export const LiquidCarouselNext = forwardRef<HTMLButtonElement, LiquidCarouselControlProps>(
  function LiquidCarouselNext(
    { "aria-label": ariaLabel = "Next slide", children, className, onClick, ...props },
    ref
  ) {
    const { canScrollNext, scrollNext } = useCarouselContext();

    return (
      <LiquidCarouselControl
        {...props}
        aria-label={ariaLabel}
        className={cn("lg-carousel__control lg-carousel__control--next", className)}
        disabled={props.disabled ?? !canScrollNext}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            scrollNext();
          }
        }}
        ref={ref}
      >
        {children ?? "›"}
      </LiquidCarouselControl>
    );
  }
);

const LiquidCarouselControl = forwardRef<HTMLElement, LiquidCarouselControlInternalProps>(
  function LiquidCarouselControl({ className, children, ...props }, ref) {
    return (
      <LiquidIconButton
        {...props}
        className={cn("lg-carousel__button", className)}
        mode={props.mode ?? "fallback"}
        ref={ref}
      >
        {children}
      </LiquidIconButton>
    );
  }
);
