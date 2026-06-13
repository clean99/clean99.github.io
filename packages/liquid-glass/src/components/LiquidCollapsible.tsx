"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode
} from "react";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

type CollapsibleContextValue = {
  contentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export type LiquidCollapsibleProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export type LiquidCollapsibleTriggerProps = LiquidButtonProps & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export type LiquidCollapsibleContentProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role"
> & {
  children: ReactNode;
  forceMount?: boolean;
};

export function LiquidCollapsible({
  children,
  className,
  defaultOpen = false,
  onOpenChange,
  open,
  ...props
}: LiquidCollapsibleProps) {
  const contentId = useStableId("lg-collapsible-content");
  const triggerId = useStableId("lg-collapsible-trigger");
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

  const value = useMemo<CollapsibleContextValue>(
    () => ({ contentId, open: resolvedOpen, setOpen, triggerId }),
    [contentId, resolvedOpen, setOpen, triggerId]
  );

  return (
    <CollapsibleContext.Provider value={value}>
      <div
        {...props}
        className={cn("lg-collapsible", className)}
        data-state={resolvedOpen ? "open" : "closed"}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export const LiquidCollapsibleTrigger = forwardRef<HTMLElement, LiquidCollapsibleTriggerProps>(
  function LiquidCollapsibleTrigger({ children, onClick, ...props }, ref) {
    const context = useCollapsibleContext("LiquidCollapsibleTrigger");

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
        id={context.triggerId}
        onClick={handleClick}
        ref={ref}
      >
        {children}
      </LiquidButton>
    );
  }
);

export const LiquidCollapsibleContent = forwardRef<HTMLElement, LiquidCollapsibleContentProps>(
  function LiquidCollapsibleContent(
    { children, className, forceMount = false, intensity = "subtle", radius = "lg", ...props },
    ref
  ) {
    const context = useCollapsibleContext("LiquidCollapsibleContent");

    if (!forceMount && !context.open) {
      return null;
    }

    return (
      <LiquidSurface
        {...props}
        aria-labelledby={context.triggerId}
        as="section"
        className={cn("lg-collapsible__content", className)}
        data-state={context.open ? "open" : "closed"}
        hidden={!context.open}
        id={context.contentId}
        intensity={intensity}
        kind="panel"
        radius={radius}
        ref={ref}
      >
        {children}
      </LiquidSurface>
    );
  }
);

function useCollapsibleContext(componentName: string) {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidCollapsible.`);
  }
  return context;
}
