"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidAlertVariant = "default" | "info" | "success" | "warning" | "danger";

export type LiquidAlertProps = Omit<LiquidSurfaceProps, "as" | "children" | "kind" | "role"> & {
  children: React.ReactNode;
  role?: "alert" | "status" | "note";
  variant?: LiquidAlertVariant;
};

export type LiquidAlertTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4" | "h5" | "h6";
};

export type LiquidAlertDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const LiquidAlert = forwardRef<HTMLElement, LiquidAlertProps>(function LiquidAlert(
  {
    children,
    className,
    intensity = "subtle",
    radius = "lg",
    role = "status",
    variant = "default",
    ...props
  },
  ref
) {
  return (
    <LiquidSurface
      {...props}
      as="section"
      className={cn("lg-alert", className)}
      data-variant={variant}
      intensity={intensity}
      kind="panel"
      radius={radius}
      ref={ref}
      role={role}
    >
      {children}
    </LiquidSurface>
  );
});

export const LiquidAlertTitle = forwardRef<HTMLHeadingElement, LiquidAlertTitleProps>(
  function LiquidAlertTitle({ as: Component = "h3", className, ...props }, ref) {
    return <Component {...props} className={cn("lg-alert__title", className)} ref={ref} />;
  }
);

export const LiquidAlertDescription = forwardRef<HTMLParagraphElement, LiquidAlertDescriptionProps>(
  function LiquidAlertDescription({ className, ...props }, ref) {
    return <p {...props} className={cn("lg-alert__description", className)} ref={ref} />;
  }
);
