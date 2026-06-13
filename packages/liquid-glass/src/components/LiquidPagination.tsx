"use client";

import { forwardRef, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type LiquidPaginationProps = HTMLAttributes<HTMLElement> & {
  "aria-label"?: string;
};
export type LiquidPaginationListProps = HTMLAttributes<HTMLUListElement>;
export type LiquidPaginationItemProps = HTMLAttributes<HTMLLIElement>;
export type LiquidPaginationLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  isActive?: boolean;
};
export type LiquidPaginationPreviousProps = LiquidPaginationLinkProps & {
  children?: ReactNode;
};
export type LiquidPaginationNextProps = LiquidPaginationLinkProps & {
  children?: ReactNode;
};
export type LiquidPaginationEllipsisProps = HTMLAttributes<HTMLSpanElement>;

export const LiquidPagination = forwardRef<HTMLElement, LiquidPaginationProps>(
  function LiquidPagination({ "aria-label": ariaLabel = "Pagination", className, ...props }, ref) {
    return (
      <nav {...props} aria-label={ariaLabel} className={cn("lg-pagination", className)} ref={ref} />
    );
  }
);

export const LiquidPaginationList = forwardRef<HTMLUListElement, LiquidPaginationListProps>(
  function LiquidPaginationList({ className, ...props }, ref) {
    return <ul {...props} className={cn("lg-pagination__list", className)} ref={ref} />;
  }
);

export const LiquidPaginationItem = forwardRef<HTMLLIElement, LiquidPaginationItemProps>(
  function LiquidPaginationItem({ className, ...props }, ref) {
    return <li {...props} className={cn("lg-pagination__item", className)} ref={ref} />;
  }
);

export const LiquidPaginationLink = forwardRef<HTMLAnchorElement, LiquidPaginationLinkProps>(
  function LiquidPaginationLink(
    { "aria-disabled": ariaDisabled, className, isActive = false, tabIndex, ...props },
    ref
  ) {
    const disabled = ariaDisabled === true || ariaDisabled === "true";

    return (
      <a
        {...props}
        aria-current={isActive ? "page" : undefined}
        aria-disabled={disabled ? true : undefined}
        className={cn("lg-pagination__link", className)}
        data-active={isActive ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        ref={ref}
        tabIndex={disabled ? -1 : tabIndex}
      />
    );
  }
);

export const LiquidPaginationPrevious = forwardRef<
  HTMLAnchorElement,
  LiquidPaginationPreviousProps
>(function LiquidPaginationPrevious({ children = "Previous", className, ...props }, ref) {
  return (
    <LiquidPaginationLink
      {...props}
      className={cn("lg-pagination__link--edge", className)}
      ref={ref}
    >
      <span aria-hidden="true">‹</span>
      <span>{children}</span>
    </LiquidPaginationLink>
  );
});

export const LiquidPaginationNext = forwardRef<HTMLAnchorElement, LiquidPaginationNextProps>(
  function LiquidPaginationNext({ children = "Next", className, ...props }, ref) {
    return (
      <LiquidPaginationLink
        {...props}
        className={cn("lg-pagination__link--edge", className)}
        ref={ref}
      >
        <span>{children}</span>
        <span aria-hidden="true">›</span>
      </LiquidPaginationLink>
    );
  }
);

export const LiquidPaginationEllipsis = forwardRef<HTMLSpanElement, LiquidPaginationEllipsisProps>(
  function LiquidPaginationEllipsis({ className, ...props }, ref) {
    return (
      <span
        {...props}
        aria-hidden="true"
        className={cn("lg-pagination__ellipsis", className)}
        ref={ref}
      >
        …
      </span>
    );
  }
);
