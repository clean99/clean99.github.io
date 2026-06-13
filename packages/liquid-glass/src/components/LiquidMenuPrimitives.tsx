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
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type MutableRefObject,
  type ReactNode,
  type Ref
} from "react";
import { createPortal } from "react-dom";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";
import { resolveMenuNavigationIndex } from "../utils/menu-navigation";

export type LiquidMenuSide = "top" | "right" | "bottom" | "left";
export type LiquidMenuAlign = "start" | "center" | "end";
export type LiquidMenuAnchorPoint = { x: number; y: number } | null;

type LiquidMenuContextValue = {
  anchorPoint: LiquidMenuAnchorPoint;
  contentId: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  open: boolean;
  setAnchorPoint: (point: LiquidMenuAnchorPoint) => void;
  setContentNode: (node: HTMLElement | null) => void;
  setOpen: (open: boolean) => void;
  setTriggerNode: (node: HTMLElement | null) => void;
  triggerId: string;
  triggerRef: MutableRefObject<HTMLElement | null>;
};

const LiquidMenuContext = createContext<LiquidMenuContextValue | null>(null);

export type LiquidMenuRootProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export type LiquidMenuButtonTriggerProps = Omit<LiquidButtonProps, "aria-controls"> & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export type LiquidMenuContextTriggerProps = HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
};

export type LiquidMenuContentProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role" | "style"
> & {
  align?: LiquidMenuAlign;
  "aria-label"?: string;
  children: ReactNode;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  container?: Element | null;
  forceMount?: boolean;
  side?: LiquidMenuSide;
  sideOffset?: number;
  style?: CSSProperties;
};

export type LiquidMenuItemProps = Omit<HTMLAttributes<HTMLElement>, "onSelect"> & {
  as?: "button" | "a";
  closeOnSelect?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

export type LiquidMenuLabelProps = HTMLAttributes<HTMLDivElement>;
export type LiquidMenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

export function LiquidMenuRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open
}: LiquidMenuRootProps) {
  const contentId = useStableId("lg-menu-content");
  const triggerId = useStableId("lg-menu-trigger");
  const contentRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [anchorPoint, setAnchorPoint] = useState<LiquidMenuAnchorPoint>(null);
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
  const setContentNode = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
  }, []);
  const setTriggerNode = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const value = useMemo<LiquidMenuContextValue>(
    () => ({
      anchorPoint,
      contentId,
      contentRef,
      open: resolvedOpen,
      setAnchorPoint,
      setContentNode,
      setOpen,
      setTriggerNode,
      triggerId,
      triggerRef
    }),
    [anchorPoint, contentId, resolvedOpen, setContentNode, setOpen, setTriggerNode, triggerId]
  );

  return <LiquidMenuContext.Provider value={value}>{children}</LiquidMenuContext.Provider>;
}

export const LiquidMenuButtonTrigger = forwardRef<HTMLElement, LiquidMenuButtonTriggerProps>(
  function LiquidMenuButtonTrigger({ children, onClick, onKeyDown, ...props }, ref) {
    const context = useLiquidMenuContext("LiquidMenuButtonTrigger");

    const setRef = useCallback(
      (node: HTMLElement | null) => {
        context.setTriggerNode(node);
        assignRef(ref, node);
      },
      [context, ref]
    );

    const openFromTrigger = () => {
      context.setAnchorPoint(null);
      context.setOpen(true);
    };

    return (
      <LiquidButton
        {...props}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup="menu"
        id={context.triggerId}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            context.setAnchorPoint(null);
            context.setOpen(!context.open);
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) {
            return;
          }

          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFromTrigger();
          }
        }}
        ref={setRef}
      >
        {children}
      </LiquidButton>
    );
  }
);

export const LiquidMenuContextTrigger = forwardRef<HTMLDivElement, LiquidMenuContextTriggerProps>(
  function LiquidMenuContextTrigger(
    { children, className, disabled = false, onContextMenu, onKeyDown, tabIndex, ...props },
    ref
  ) {
    const context = useLiquidMenuContext("LiquidMenuContextTrigger");

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        context.setTriggerNode(node);
        assignRef(ref, node);
      },
      [context, ref]
    );

    const openAtPoint = (point: { x: number; y: number }) => {
      context.setAnchorPoint(point);
      context.setOpen(true);
    };

    return (
      <div
        {...props}
        aria-controls={context.contentId}
        aria-disabled={disabled ? true : undefined}
        aria-expanded={context.open}
        aria-haspopup="menu"
        className={cn("lg-context-menu__trigger", className)}
        data-disabled={disabled ? "" : undefined}
        id={context.triggerId}
        onContextMenu={(event) => {
          onContextMenu?.(event);
          if (disabled || event.defaultPrevented) {
            return;
          }
          event.preventDefault();
          openAtPoint({ x: event.pageX, y: event.pageY });
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (disabled || event.defaultPrevented) {
            return;
          }

          if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            openAtPoint({
              x: Math.round(rect.left + window.scrollX),
              y: Math.round(rect.bottom + window.scrollY + 6)
            });
          }
        }}
        ref={setRef}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
      >
        {children}
      </div>
    );
  }
);

export const LiquidMenuContent = forwardRef<HTMLElement, LiquidMenuContentProps>(
  function LiquidMenuContent(
    {
      align = "start",
      children,
      className,
      closeOnEscape = true,
      closeOnInteractOutside = true,
      container,
      forceMount = false,
      intensity = "medium",
      radius = "lg",
      side = "bottom",
      sideOffset = 8,
      style,
      ...props
    },
    ref
  ) {
    const context = useLiquidMenuContext("LiquidMenuContent");
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

      const update = () => {
        const content = context.contentRef.current;
        if (!content) {
          return;
        }

        if (context.anchorPoint) {
          setPosition(resolvePointPosition(context.anchorPoint, content.getBoundingClientRect()));
          return;
        }

        const trigger = context.triggerRef.current;
        if (!trigger) {
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
    }, [
      align,
      context.anchorPoint,
      context.contentRef,
      context.open,
      context.triggerRef,
      side,
      sideOffset
    ]);

    useEffect(() => {
      if (!context.open) {
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        focusMenuItem(context.contentRef.current, -1, "next");
      });

      return () => window.cancelAnimationFrame(frame);
    }, [context.contentRef, context.open]);

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
    const ariaLabel = props["aria-label"];

    return createPortal(
      <LiquidSurface
        {...props}
        aria-labelledby={ariaLabel ? undefined : context.triggerId}
        as="div"
        className={cn("lg-menu", className)}
        data-align={align}
        data-side={side}
        data-state={context.open ? "open" : "closed"}
        id={context.contentId}
        intensity={intensity}
        kind="panel"
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          props.onKeyDown?.(event);
          if (event.defaultPrevented) {
            return;
          }

          if (event.key === "Escape" && closeOnEscape) {
            event.preventDefault();
            context.setOpen(false);
            context.triggerRef.current?.focus();
            return;
          }

          handleMenuKeyDown(event, event.currentTarget);
        }}
        radius={radius}
        ref={setContentRef}
        role="menu"
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

export const LiquidMenuItem = forwardRef<HTMLElement, LiquidMenuItemProps>(function LiquidMenuItem(
  {
    as: Component = "button",
    children,
    className,
    closeOnSelect = true,
    disabled = false,
    href,
    onClick,
    ...props
  },
  ref
) {
  const context = useLiquidMenuContext("LiquidMenuItem");

  return (
    <Component
      {...props}
      aria-disabled={disabled ? true : undefined}
      className={cn("lg-menu__item", className)}
      data-disabled={disabled ? "" : undefined}
      disabled={Component === "button" ? disabled : undefined}
      href={Component === "a" && !disabled ? href : undefined}
      onClick={(event: MouseEvent<HTMLElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
        if (!event.defaultPrevented && closeOnSelect) {
          context.setOpen(false);
          context.triggerRef.current?.focus();
        }
      }}
      ref={ref as Ref<HTMLButtonElement> & Ref<HTMLAnchorElement>}
      role="menuitem"
      tabIndex={disabled ? -1 : -1}
      type={Component === "button" ? "button" : undefined}
    >
      {children}
    </Component>
  );
});

export const LiquidMenuLabel = forwardRef<HTMLDivElement, LiquidMenuLabelProps>(
  function LiquidMenuLabel({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-menu__label", className)} ref={ref} />;
  }
);

export const LiquidMenuSeparator = forwardRef<HTMLDivElement, LiquidMenuSeparatorProps>(
  function LiquidMenuSeparator({ className, ...props }, ref) {
    return (
      <div
        {...props}
        aria-orientation="horizontal"
        className={cn("lg-menu__separator", className)}
        ref={ref}
        role="separator"
      />
    );
  }
);

export function useLiquidMenuContext(componentName: string) {
  const context = useContext(LiquidMenuContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside a Liquid menu root.`);
  }
  return context;
}

export function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>, container: HTMLElement) {
  const activeIndex = getMenuItems(container).findIndex((item) => item === document.activeElement);
  const direction =
    event.key === "ArrowDown"
      ? "next"
      : event.key === "ArrowUp"
        ? "previous"
        : event.key === "Home"
          ? "first"
          : event.key === "End"
            ? "last"
            : null;

  if (!direction) {
    return;
  }

  event.preventDefault();
  focusMenuItem(container, activeIndex, direction);
}

export function focusMenuItem(
  container: HTMLElement | null,
  currentIndex: number,
  direction: "first" | "last" | "next" | "previous"
) {
  const items = getMenuItems(container);
  const disabledItems = items.map((item) => item.getAttribute("aria-disabled") === "true");
  const nextIndex = resolveMenuNavigationIndex(disabledItems, currentIndex, direction);
  items[nextIndex]?.focus();
}

function getMenuItems(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function resolveFloatingPosition(
  trigger: DOMRect,
  content: DOMRect,
  side: LiquidMenuSide,
  align: LiquidMenuAlign,
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

function resolvePointPosition(point: { x: number; y: number }, content: DOMRect) {
  const maxLeft = window.scrollX + window.innerWidth - content.width - 8;
  const maxTop = window.scrollY + window.innerHeight - content.height - 8;

  return {
    left: Math.max(8, Math.min(Math.round(point.x), Math.round(maxLeft))),
    top: Math.max(8, Math.min(Math.round(point.y), Math.round(maxTop)))
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
