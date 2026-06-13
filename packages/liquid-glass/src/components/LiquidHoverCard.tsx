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
  type AnchorHTMLAttributes,
  type CSSProperties,
  type ElementType,
  type MutableRefObject,
  type ReactNode,
  type Ref
} from "react";
import { createPortal } from "react-dom";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

type HoverCardSide = "top" | "right" | "bottom" | "left";

type HoverCardContextValue = {
  close: () => void;
  contentId: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  open: boolean;
  openCard: () => void;
  setContentNode: (node: HTMLElement | null) => void;
  setTriggerNode: (node: HTMLElement | null) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
};

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

export type LiquidHoverCardProps = {
  children: ReactNode;
  closeDelay?: number;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openDelay?: number;
};

export type LiquidHoverCardTriggerProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  as?: ElementType;
};

export type LiquidHoverCardContentProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role" | "style"
> & {
  children: ReactNode;
  container?: Element | null;
  forceMount?: boolean;
  side?: HoverCardSide;
  sideOffset?: number;
  style?: CSSProperties;
};

export function LiquidHoverCard({
  children,
  closeDelay = 120,
  defaultOpen = false,
  onOpenChange,
  open,
  openDelay = 180
}: LiquidHoverCardProps) {
  const contentId = useStableId("lg-hover-card");
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openCard = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => commitOpen(true), openDelay);
  }, [clearTimers, commitOpen, openDelay]);

  const close = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => commitOpen(false), closeDelay);
  }, [clearTimers, closeDelay, commitOpen]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);
  const setTriggerNode = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);
  const setContentNode = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
  }, []);

  const value = useMemo<HoverCardContextValue>(
    () => ({
      close,
      contentId,
      contentRef,
      open: resolvedOpen,
      openCard,
      setContentNode,
      setTriggerNode,
      triggerRef
    }),
    [close, contentId, openCard, resolvedOpen, setContentNode, setTriggerNode]
  );

  return <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>;
}

export const LiquidHoverCardTrigger = forwardRef<HTMLElement, LiquidHoverCardTriggerProps>(
  function LiquidHoverCardTrigger(
    { as: Component = "a", className, onBlur, onFocus, onMouseEnter, onMouseLeave, ...props },
    ref
  ) {
    const context = useHoverCardContext("LiquidHoverCardTrigger");

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
        aria-controls={context.contentId}
        aria-expanded={context.open}
        className={cn("lg-hover-card__trigger", className)}
        onBlur={composeHandler(onBlur, context.close)}
        onFocus={composeHandler(onFocus, context.openCard)}
        onMouseEnter={composeHandler(onMouseEnter, context.openCard)}
        onMouseLeave={composeHandler(onMouseLeave, context.close)}
        ref={setRef}
      />
    );
  }
);

export const LiquidHoverCardContent = forwardRef<HTMLElement, LiquidHoverCardContentProps>(
  function LiquidHoverCardContent(
    {
      children,
      className,
      container,
      forceMount = false,
      intensity = "medium",
      radius = "xl",
      side = "bottom",
      sideOffset = 10,
      style,
      ...props
    },
    ref
  ) {
    const context = useHoverCardContext("LiquidHoverCardContent");
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
        resolveHoverCardPosition(
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
        className={cn("lg-hover-card", className)}
        data-side={side}
        data-state={context.open ? "open" : "closed"}
        id={context.contentId}
        intensity={intensity}
        kind="panel"
        onMouseEnter={composeHandler(props.onMouseEnter, context.openCard)}
        onMouseLeave={composeHandler(props.onMouseLeave, context.close)}
        radius={radius}
        ref={setContentRef}
        role="dialog"
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

function useHoverCardContext(componentName: string) {
  const context = useContext(HoverCardContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidHoverCard.`);
  }
  return context;
}

function resolveHoverCardPosition(
  trigger: DOMRect,
  content: DOMRect,
  side: HoverCardSide,
  offset: number
) {
  let left = trigger.left + trigger.width / 2 - content.width / 2;
  let top = trigger.bottom + offset;

  if (side === "top") {
    top = trigger.top - content.height - offset;
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
