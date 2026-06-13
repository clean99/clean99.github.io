"use client";

import { forwardRef } from "react";
import {
  LiquidSheet,
  LiquidSheetClose,
  LiquidSheetContent,
  LiquidSheetDescription,
  LiquidSheetFooter,
  LiquidSheetHeader,
  LiquidSheetTitle,
  LiquidSheetTrigger,
  type LiquidSheetCloseProps,
  type LiquidSheetContentProps,
  type LiquidSheetDescriptionProps,
  type LiquidSheetFooterProps,
  type LiquidSheetHeaderProps,
  type LiquidSheetProps,
  type LiquidSheetTitleProps,
  type LiquidSheetTriggerProps
} from "./LiquidSheet";
import { cn } from "../utils/cn";

export type LiquidDrawerProps = LiquidSheetProps;
export type LiquidDrawerTriggerProps = LiquidSheetTriggerProps;
export type LiquidDrawerCloseProps = LiquidSheetCloseProps;
export type LiquidDrawerContentProps = LiquidSheetContentProps;
export type LiquidDrawerHeaderProps = LiquidSheetHeaderProps;
export type LiquidDrawerFooterProps = LiquidSheetFooterProps;
export type LiquidDrawerTitleProps = LiquidSheetTitleProps;
export type LiquidDrawerDescriptionProps = LiquidSheetDescriptionProps;

export const LiquidDrawer = LiquidSheet;
export const LiquidDrawerTrigger = LiquidSheetTrigger;
export const LiquidDrawerClose = LiquidSheetClose;
export const LiquidDrawerHeader = LiquidSheetHeader;
export const LiquidDrawerFooter = LiquidSheetFooter;
export const LiquidDrawerTitle = LiquidSheetTitle;
export const LiquidDrawerDescription = LiquidSheetDescription;

export const LiquidDrawerContent = forwardRef<HTMLDialogElement, LiquidDrawerContentProps>(
  function LiquidDrawerContent({ className, side = "bottom", ...props }, ref) {
    return (
      <LiquidSheetContent
        {...props}
        className={cn("lg-drawer", className)}
        data-side={side}
        ref={ref}
        side={side}
      />
    );
  }
);
