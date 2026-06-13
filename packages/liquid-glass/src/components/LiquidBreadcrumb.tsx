"use client";

import { forwardRef, type AnchorHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type LiquidBreadcrumbProps = HTMLAttributes<HTMLElement> & {
  "aria-label"?: string;
};

export type LiquidBreadcrumbListProps = HTMLAttributes<HTMLOListElement>;
export type LiquidBreadcrumbItemProps = HTMLAttributes<HTMLLIElement>;
export type LiquidBreadcrumbLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;
export type LiquidBreadcrumbPageProps = HTMLAttributes<HTMLSpanElement>;
export type LiquidBreadcrumbSeparatorProps = HTMLAttributes<HTMLSpanElement>;

export const LiquidBreadcrumb = forwardRef<HTMLElement, LiquidBreadcrumbProps>(
  function LiquidBreadcrumb({ "aria-label": ariaLabel = "Breadcrumb", className, ...props }, ref) {
    return (
      <nav {...props} aria-label={ariaLabel} className={cn("lg-breadcrumb", className)} ref={ref} />
    );
  }
);

export const LiquidBreadcrumbList = forwardRef<HTMLOListElement, LiquidBreadcrumbListProps>(
  function LiquidBreadcrumbList({ className, ...props }, ref) {
    return <ol {...props} className={cn("lg-breadcrumb__list", className)} ref={ref} />;
  }
);

export const LiquidBreadcrumbItem = forwardRef<HTMLLIElement, LiquidBreadcrumbItemProps>(
  function LiquidBreadcrumbItem({ className, ...props }, ref) {
    return <li {...props} className={cn("lg-breadcrumb__item", className)} ref={ref} />;
  }
);

export const LiquidBreadcrumbLink = forwardRef<HTMLAnchorElement, LiquidBreadcrumbLinkProps>(
  function LiquidBreadcrumbLink({ className, ...props }, ref) {
    return <a {...props} className={cn("lg-breadcrumb__link", className)} ref={ref} />;
  }
);

export const LiquidBreadcrumbPage = forwardRef<HTMLSpanElement, LiquidBreadcrumbPageProps>(
  function LiquidBreadcrumbPage({ className, ...props }, ref) {
    return (
      <span
        {...props}
        aria-current="page"
        className={cn("lg-breadcrumb__page", className)}
        ref={ref}
      />
    );
  }
);

export const LiquidBreadcrumbSeparator = forwardRef<
  HTMLSpanElement,
  LiquidBreadcrumbSeparatorProps
>(function LiquidBreadcrumbSeparator({ children = "/", className, ...props }, ref) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn("lg-breadcrumb__separator", className)}
      ref={ref}
    >
      {children}
    </span>
  );
});
