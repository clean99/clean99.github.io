"use client";

import { forwardRef } from "react";
import {
  LiquidDialog,
  LiquidDialogClose,
  LiquidDialogContent,
  LiquidDialogDescription,
  LiquidDialogFooter,
  LiquidDialogHeader,
  LiquidDialogTitle,
  LiquidDialogTrigger,
  type LiquidDialogCloseProps,
  type LiquidDialogContentProps,
  type LiquidDialogDescriptionProps,
  type LiquidDialogFooterProps,
  type LiquidDialogHeaderProps,
  type LiquidDialogProps,
  type LiquidDialogTitleProps,
  type LiquidDialogTriggerProps
} from "./LiquidDialog";
import { cn } from "../utils/cn";

export type LiquidSheetProps = LiquidDialogProps;
export type LiquidSheetTriggerProps = LiquidDialogTriggerProps;
export type LiquidSheetCloseProps = LiquidDialogCloseProps;
export type LiquidSheetHeaderProps = LiquidDialogHeaderProps;
export type LiquidSheetFooterProps = LiquidDialogFooterProps;
export type LiquidSheetTitleProps = LiquidDialogTitleProps;
export type LiquidSheetDescriptionProps = LiquidDialogDescriptionProps;
export type LiquidSheetSide = "top" | "right" | "bottom" | "left";

export type LiquidSheetContentProps = LiquidDialogContentProps & {
  side?: LiquidSheetSide;
};

export const LiquidSheet = LiquidDialog;
export const LiquidSheetTrigger = LiquidDialogTrigger;
export const LiquidSheetClose = LiquidDialogClose;
export const LiquidSheetHeader = LiquidDialogHeader;
export const LiquidSheetFooter = LiquidDialogFooter;
export const LiquidSheetTitle = LiquidDialogTitle;
export const LiquidSheetDescription = LiquidDialogDescription;

export const LiquidSheetContent = forwardRef<HTMLDialogElement, LiquidSheetContentProps>(
  function LiquidSheetContent({ className, side = "right", ...props }, ref) {
    return (
      <LiquidDialogContent
        {...props}
        className={cn("lg-sheet", className)}
        data-side={side}
        ref={ref}
      />
    );
  }
);
