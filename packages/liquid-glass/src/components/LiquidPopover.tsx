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
  type KeyboardEvent,
  type MutableRefObject,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref
} from "react";
import { createPortal } from "react-dom";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

type PopoverSide = "top" | "right" | "bottom" | "left";
type PopoverAlign = "start" | "center" | "end";

type FloatingPosition = {
  left: number;
  top: number;
};

type PopoverContextValue = {
  contentId: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  open: boolean;
  setContentNode: (node: HTMLElement | null) => void;
  setOpen: (open: boolean) => void;
  setTriggerNode: (node: HTMLElement | null) => void;
  triggerId: string;
  triggerRef: MutableRefObject<HTMLElement | null>;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

export type LiquidPopoverProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export type LiquidPopoverTriggerProps = Omit<LiquidButtonProps, "aria-controls"> & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export type LiquidPopoverContentProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role" | "style"
> & {
  align?: PopoverAlign;
  children: ReactNode;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  container?: Element | null;
  forceMount?: boolean;
  side?: PopoverSide;
  sideOffset?: number;
  style?: CSSProperties;
};

export type LiquidPopoverCloseProps = LiquidButtonProps & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export function LiquidPopover({
  children,
  defaultOpen = false,
  onOpenChange,
  open
}: LiquidPopoverProps) {
  const contentId = useStableId("lg-popover-content");
  const triggerId = useStableId("lg-popover-trigger");
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );
  const setTriggerNode = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);
  const setContentNode = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
  }, []);

  const value = useMemo<PopoverContextValue>(
    () => ({
      contentId,
      contentRef,
      open: resolvedOpen,
      setContentNode,
      setOpen,
      setTriggerNode,
      triggerId,
      triggerRef
    }),
    [contentId, resolvedOpen, setContentNode, setOpen, setTriggerNode, triggerId]
  );

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export const LiquidPopoverTrigger = forwardRef<HTMLElement, LiquidPopoverTriggerProps>(
  function LiquidPopoverTrigger({ children, onClick, ...props }, ref) {
    const context = usePopoverContext("LiquidPopoverTrigger");
    const ariaHasPopup = props["aria-haspopup"] ?? "dialog";

    const setRef = useCallback(
      (node: HTMLElement | null) => {
        context.setTriggerNode(node);
        assignRef(ref, node);
      },
      [context, ref]
    );

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        context.setOpen(!context.open);
      }
    };

    return (
      <LiquidButton
        {...props}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup={ariaHasPopup}
        id={context.triggerId}
        onClick={handleClick}
        ref={setRef}
      >
        {children}
      </LiquidButton>
    );
  }
);

export const LiquidPopoverContent = forwardRef<HTMLElement, LiquidPopoverContentProps>(
  function LiquidPopoverContent(
    {
      align = "center",
      children,
      className,
      closeOnEscape = true,
      closeOnInteractOutside = true,
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
    const context = usePopoverContext("LiquidPopoverContent");
    const [position, setPosition] = useState<FloatingPosition | null>(null);

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

      const update = () => {
        const trigger = context.triggerRef.current;
        const content = context.contentRef.current;
        if (!trigger || !content) {
          return;
        }
        setPosition(
          resolveFloatingPosition(
            trigger.getBoundingClientRect(),
            content.getBoundingClientRect(),
            side,
            align,
            sideOffset
          )
        );
      };

      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);

      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [align, context.contentRef, context.open, context.triggerRef, side, sideOffset]);

    useEffect(() => {
      if (!context.open || !closeOnInteractOutside) {
        return undefined;
      }

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (
          target &&
          !context.contentRef.current?.contains(target) &&
          !context.triggerRef.current?.contains(target)
        ) {
          context.setOpen(false);
        }
      };

      document.addEventListener("pointerdown", handlePointerDown);
      return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [closeOnInteractOutside, context]);

    if (typeof document === "undefined" || (!forceMount && !context.open)) {
      return null;
    }

    const target = container ?? document.body;

    return createPortal(
      <LiquidSurface
        {...props}
        aria-labelledby={context.triggerId}
        as="div"
        className={cn("lg-popover", className)}
        data-align={align}
        data-side={side}
        data-state={context.open ? "open" : "closed"}
        id={context.contentId}
        intensity={intensity}
        kind="panel"
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          props.onKeyDown?.(event);
          if (closeOnEscape && event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            context.setOpen(false);
            context.triggerRef.current?.focus();
          }
        }}
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
      target
    );
  }
);

export const LiquidPopoverClose = forwardRef<HTMLElement, LiquidPopoverCloseProps>(
  function LiquidPopoverClose({ children = "Close", onClick, ...props }, ref) {
    const context = usePopoverContext("LiquidPopoverClose");

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        context.setOpen(false);
        context.triggerRef.current?.focus();
      }
    };

    return (
      <LiquidButton {...props} onClick={handleClick} ref={ref}>
        {children}
      </LiquidButton>
    );
  }
);

function usePopoverContext(componentName: string) {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidPopover.`);
  }
  return context;
}

function resolveFloatingPosition(
  trigger: DOMRect,
  content: DOMRect,
  side: PopoverSide,
  align: PopoverAlign,
  sideOffset: number
) {
  let left = trigger.left + trigger.width / 2 - content.width / 2;
  let top = trigger.bottom + sideOffset;

  if (side === "top") {
    top = trigger.top - content.height - sideOffset;
  } else if (side === "left") {
    left = trigger.left - content.width - sideOffset;
    top = trigger.top + trigger.height / 2 - content.height / 2;
  } else if (side === "right") {
    left = trigger.right + sideOffset;
    top = trigger.top + trigger.height / 2 - content.height / 2;
  }

  if (side === "top" || side === "bottom") {
    if (align === "start") {
      left = trigger.left;
    } else if (align === "end") {
      left = trigger.right - content.width;
    }
  } else if (align === "start") {
    top = trigger.top;
  } else if (align === "end") {
    top = trigger.bottom - content.height;
  }

  return {
    left: Math.max(8, Math.round(left + window.scrollX)),
    top: Math.max(8, Math.round(top + window.scrollY))
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
