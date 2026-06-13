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

export type LiquidAlertDialogProps = LiquidDialogProps;
export type LiquidAlertDialogTriggerProps = LiquidDialogTriggerProps;
export type LiquidAlertDialogContentProps = LiquidDialogContentProps;
export type LiquidAlertDialogHeaderProps = LiquidDialogHeaderProps;
export type LiquidAlertDialogFooterProps = LiquidDialogFooterProps;
export type LiquidAlertDialogTitleProps = LiquidDialogTitleProps;
export type LiquidAlertDialogDescriptionProps = LiquidDialogDescriptionProps;
export type LiquidAlertDialogCancelProps = LiquidDialogCloseProps;
export type LiquidAlertDialogActionProps = LiquidDialogCloseProps;

export const LiquidAlertDialog = LiquidDialog;
export const LiquidAlertDialogTrigger = LiquidDialogTrigger;
export const LiquidAlertDialogHeader = LiquidDialogHeader;
export const LiquidAlertDialogFooter = LiquidDialogFooter;
export const LiquidAlertDialogTitle = LiquidDialogTitle;
export const LiquidAlertDialogDescription = LiquidDialogDescription;

export const LiquidAlertDialogContent = forwardRef<
  HTMLDialogElement,
  LiquidAlertDialogContentProps
>(function LiquidAlertDialogContent({ className, closeOnBackdropClick = false, ...props }, ref) {
  return (
    <LiquidDialogContent
      {...props}
      className={cn("lg-alert-dialog", className)}
      closeOnBackdropClick={closeOnBackdropClick}
      ref={ref}
      role="alertdialog"
    />
  );
});

export const LiquidAlertDialogCancel = forwardRef<HTMLElement, LiquidAlertDialogCancelProps>(
  function LiquidAlertDialogCancel({ className, ...props }, ref) {
    return (
      <LiquidDialogClose
        {...props}
        className={cn("lg-alert-dialog__cancel", className)}
        ref={ref}
      />
    );
  }
);

export const LiquidAlertDialogAction = forwardRef<HTMLElement, LiquidAlertDialogActionProps>(
  function LiquidAlertDialogAction({ className, ...props }, ref) {
    return (
      <LiquidDialogClose
        {...props}
        className={cn("lg-alert-dialog__action", className)}
        ref={ref}
      />
    );
  }
);
