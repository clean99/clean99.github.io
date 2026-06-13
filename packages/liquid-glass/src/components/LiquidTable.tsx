"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes
} from "react";
import { cn } from "../utils/cn";

export type LiquidTableContainerProps = HTMLAttributes<HTMLDivElement>;
export type LiquidTableProps = TableHTMLAttributes<HTMLTableElement>;
export type LiquidTableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;
export type LiquidTableBodyProps = HTMLAttributes<HTMLTableSectionElement>;
export type LiquidTableFooterProps = HTMLAttributes<HTMLTableSectionElement>;
export type LiquidTableRowProps = HTMLAttributes<HTMLTableRowElement>;
export type LiquidTableHeadProps = ThHTMLAttributes<HTMLTableCellElement>;
export type LiquidTableCellProps = TdHTMLAttributes<HTMLTableCellElement>;
export type LiquidTableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;

export const LiquidTableContainer = forwardRef<HTMLDivElement, LiquidTableContainerProps>(
  function LiquidTableContainer({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-table-container", className)} ref={ref} />;
  }
);

export const LiquidTable = forwardRef<HTMLTableElement, LiquidTableProps>(function LiquidTable(
  { className, ...props },
  ref
) {
  return <table {...props} className={cn("lg-table", className)} ref={ref} />;
});

export const LiquidTableHeader = forwardRef<HTMLTableSectionElement, LiquidTableHeaderProps>(
  function LiquidTableHeader({ className, ...props }, ref) {
    return <thead {...props} className={cn("lg-table__header", className)} ref={ref} />;
  }
);

export const LiquidTableBody = forwardRef<HTMLTableSectionElement, LiquidTableBodyProps>(
  function LiquidTableBody({ className, ...props }, ref) {
    return <tbody {...props} className={cn("lg-table__body", className)} ref={ref} />;
  }
);

export const LiquidTableFooter = forwardRef<HTMLTableSectionElement, LiquidTableFooterProps>(
  function LiquidTableFooter({ className, ...props }, ref) {
    return <tfoot {...props} className={cn("lg-table__footer", className)} ref={ref} />;
  }
);

export const LiquidTableRow = forwardRef<HTMLTableRowElement, LiquidTableRowProps>(
  function LiquidTableRow({ className, ...props }, ref) {
    return <tr {...props} className={cn("lg-table__row", className)} ref={ref} />;
  }
);

export const LiquidTableHead = forwardRef<HTMLTableCellElement, LiquidTableHeadProps>(
  function LiquidTableHead({ className, scope = "col", ...props }, ref) {
    return <th {...props} className={cn("lg-table__head", className)} ref={ref} scope={scope} />;
  }
);

export const LiquidTableCell = forwardRef<HTMLTableCellElement, LiquidTableCellProps>(
  function LiquidTableCell({ className, ...props }, ref) {
    return <td {...props} className={cn("lg-table__cell", className)} ref={ref} />;
  }
);

export const LiquidTableCaption = forwardRef<HTMLTableCaptionElement, LiquidTableCaptionProps>(
  function LiquidTableCaption({ className, ...props }, ref) {
    return <caption {...props} className={cn("lg-table__caption", className)} ref={ref} />;
  }
);
