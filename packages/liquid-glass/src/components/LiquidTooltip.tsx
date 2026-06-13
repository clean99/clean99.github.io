"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref
} from "react";
import { createPortal } from "react-dom";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipContextValue = {
  close: () => void;
  contentId: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  open: boolean;
  openTooltip: () => void;
  setContentNode: (node: HTMLElement | null) => void;
  setTriggerNode: (node: HTMLElement | null) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export type LiquidTooltipProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  delayDuration?: number;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export type LiquidTooltipTriggerProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
};

export type LiquidTooltipContentProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role" | "style"
> & {
  children: ReactNode;
  container?: Element | null;
  forceMount?: boolean;
  side?: TooltipSide;
  sideOffset?: number;
  style?: CSSProperties;
};

export function LiquidTooltip({
  children,
  defaultOpen = false,
  delayDuration = 250,
  onOpenChange,
  open
}: LiquidTooltipProps) {
  const contentId = useStableId("lg-tooltip");
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;

  const commitOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const close = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    commitOpen(false);
  }, [commitOpen]);

  const openTooltip = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
    }
    openTimer.current = setTimeout(() => commitOpen(true), delayDuration);
  }, [commitOpen, delayDuration]);

  useEffect(() => {
    return () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
      }
    };
  }, []);
  const setTriggerNode = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);
  const setContentNode = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
  }, []);

  const value = useMemo<TooltipContextValue>(
    () => ({
      close,
      contentId,
      contentRef,
      open: resolvedOpen,
      openTooltip,
      setContentNode,
      setTriggerNode,
      triggerRef
    }),
    [close, contentId, openTooltip, resolvedOpen, setContentNode, setTriggerNode]
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export const LiquidTooltipTrigger = forwardRef<HTMLElement, LiquidTooltipTriggerProps>(
  function LiquidTooltipTrigger(
    { as: Component = "button", className, onBlur, onFocus, onMouseEnter, onMouseLeave, ...props },
    ref
  ) {
    const context = useTooltipContext("LiquidTooltipTrigger");

    const setRef = useCallback(
      (node: HTMLElement | null) => {
        context.setTriggerNode(node);
        assignRef(ref, node);
      },
      [context, ref]
    );

    return (
      <Component
        {...props}
        aria-describedby={context.open ? context.contentId : undefined}
        className={cn("lg-tooltip__trigger", className)}
        onBlur={composeHandler(onBlur, context.close)}
        onFocus={composeHandler(onFocus, context.openTooltip)}
        onMouseEnter={composeHandler(onMouseEnter, context.openTooltip)}
        onMouseLeave={composeHandler(onMouseLeave, context.close)}
        ref={setRef}
        type={Component === "button" ? "button" : undefined}
      />
    );
  }
);

export const LiquidTooltipContent = forwardRef<HTMLElement, LiquidTooltipContentProps>(
  function LiquidTooltipContent(
    {
      children,
      className,
      container,
      forceMount = false,
      intensity = "subtle",
      radius = "pill",
      side = "top",
      sideOffset = 8,
      style,
      ...props
    },
    ref
  ) {
    const context = useTooltipContext("LiquidTooltipContent");
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

    const setContentRef = useCallback(
      (node: HTMLElement | null) => {
        context.setContentNode(node);
        assignRef(ref, node);
      },
      [context, ref]
    );

    useIsomorphicLayoutEffect(() => {
      if (!context.open) {
        return;
      }
      const trigger = context.triggerRef.current;
      const content = context.contentRef.current;
      if (!trigger || !content) {
        return;
      }
      setPosition(
        resolveTooltipPosition(
          trigger.getBoundingClientRect(),
          content.getBoundingClientRect(),
          side,
          sideOffset
        )
      );
    }, [context.contentRef, context.open, context.triggerRef, side, sideOffset]);

    if (typeof document === "undefined" || (!forceMount && !context.open)) {
      return null;
    }

    return createPortal(
      <LiquidSurface
        {...props}
        as="div"
        className={cn("lg-tooltip", className)}
        data-side={side}
        data-state={context.open ? "open" : "closed"}
        id={context.contentId}
        intensity={intensity}
        kind="pill"
        radius={radius}
        ref={setContentRef}
        role="tooltip"
        style={{
          left: position?.left ?? -10000,
          top: position?.top ?? -10000,
          ...style
        }}
      >
        {children}
      </LiquidSurface>,
      container ?? document.body
    );
  }
);

function useTooltipContext(componentName: string) {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidTooltip.`);
  }
  return context;
}

function resolveTooltipPosition(
  trigger: DOMRect,
  content: DOMRect,
  side: TooltipSide,
  offset: number
) {
  let left = trigger.left + trigger.width / 2 - content.width / 2;
  let top = trigger.top - content.height - offset;

  if (side === "bottom") {
    top = trigger.bottom + offset;
  } else if (side === "left") {
    left = trigger.left - content.width - offset;
    top = trigger.top + trigger.height / 2 - content.height / 2;
  } else if (side === "right") {
    left = trigger.right + offset;
    top = trigger.top + trigger.height / 2 - content.height / 2;
  }

  return {
    left: Math.max(8, Math.round(left + window.scrollX)),
    top: Math.max(8, Math.round(top + window.scrollY))
  };
}

function composeHandler<T extends { defaultPrevented?: boolean }>(
  handler: ((event: T) => void) | undefined,
  next: () => void
) {
  return (event: T) => {
    handler?.(event);
    if (!event.defaultPrevented) {
      next();
    }
  };
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  ref.current = value;
}
