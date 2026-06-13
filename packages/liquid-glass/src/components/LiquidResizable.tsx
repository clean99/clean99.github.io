"use client";

import { forwardRef, type ReactNode } from "react";
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps
} from "react-resizable-panels";
import { cn } from "../utils/cn";

export type LiquidResizablePanelGroupProps = GroupProps;
export type LiquidResizablePanelProps = PanelProps;
export type LiquidResizableHandleProps = SeparatorProps & {
  withHandle?: boolean;
};

export const LiquidResizablePanelGroup = forwardRef<HTMLDivElement, LiquidResizablePanelGroupProps>(
  function LiquidResizablePanelGroup(
    { className, orientation = "horizontal", role = "group", ...props },
    ref
  ) {
    return (
      <Group
        {...props}
        className={cn("lg-resizable", className)}
        elementRef={ref}
        orientation={orientation}
        role={role}
      />
    );
  }
);

export const LiquidResizable = LiquidResizablePanelGroup;

export const LiquidResizablePanel = forwardRef<HTMLDivElement, LiquidResizablePanelProps>(
  function LiquidResizablePanel({ className, ...props }, ref) {
    return <Panel {...props} className={cn("lg-resizable__panel", className)} elementRef={ref} />;
  }
);

export const LiquidResizableHandle = forwardRef<HTMLDivElement, LiquidResizableHandleProps>(
  function LiquidResizableHandle({ children, className, withHandle = false, ...props }, ref) {
    return (
      <Separator {...props} className={cn("lg-resizable__handle", className)} elementRef={ref}>
        {withHandle ? <LiquidResizableHandleGrip>{children}</LiquidResizableHandleGrip> : children}
      </Separator>
    );
  }
);

function LiquidResizableHandleGrip({ children }: { children?: ReactNode }) {
  return (
    <span aria-hidden="true" className="lg-resizable__handle-grip">
      {children ?? (
        <>
          <span />
          <span />
        </>
      )}
    </span>
  );
}
