"use client";

import {
  LiquidMenuButtonTrigger,
  LiquidMenuContent,
  LiquidMenuItem,
  LiquidMenuLabel,
  LiquidMenuRoot,
  LiquidMenuSeparator,
  type LiquidMenuButtonTriggerProps,
  type LiquidMenuContentProps,
  type LiquidMenuItemProps,
  type LiquidMenuLabelProps,
  type LiquidMenuRootProps,
  type LiquidMenuSeparatorProps
} from "./LiquidMenuPrimitives";

export type LiquidDropdownMenuProps = LiquidMenuRootProps;
export type LiquidDropdownMenuTriggerProps = LiquidMenuButtonTriggerProps;
export type LiquidDropdownMenuContentProps = LiquidMenuContentProps;
export type LiquidDropdownMenuItemProps = LiquidMenuItemProps;
export type LiquidDropdownMenuLabelProps = LiquidMenuLabelProps;
export type LiquidDropdownMenuSeparatorProps = LiquidMenuSeparatorProps;

export const LiquidDropdownMenu = LiquidMenuRoot;
export const LiquidDropdownMenuTrigger = LiquidMenuButtonTrigger;
export const LiquidDropdownMenuContent = LiquidMenuContent;
export const LiquidDropdownMenuItem = LiquidMenuItem;
export const LiquidDropdownMenuLabel = LiquidMenuLabel;
export const LiquidDropdownMenuSeparator = LiquidMenuSeparator;
