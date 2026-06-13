"use client";

import {
  LiquidMenuContent,
  LiquidMenuContextTrigger,
  LiquidMenuItem,
  LiquidMenuLabel,
  LiquidMenuRoot,
  LiquidMenuSeparator,
  type LiquidMenuContentProps,
  type LiquidMenuContextTriggerProps,
  type LiquidMenuItemProps,
  type LiquidMenuLabelProps,
  type LiquidMenuRootProps,
  type LiquidMenuSeparatorProps
} from "./LiquidMenuPrimitives";

export type LiquidContextMenuProps = LiquidMenuRootProps;
export type LiquidContextMenuTriggerProps = LiquidMenuContextTriggerProps;
export type LiquidContextMenuContentProps = LiquidMenuContentProps;
export type LiquidContextMenuItemProps = LiquidMenuItemProps;
export type LiquidContextMenuLabelProps = LiquidMenuLabelProps;
export type LiquidContextMenuSeparatorProps = LiquidMenuSeparatorProps;

export const LiquidContextMenu = LiquidMenuRoot;
export const LiquidContextMenuTrigger = LiquidMenuContextTrigger;
export const LiquidContextMenuContent = LiquidMenuContent;
export const LiquidContextMenuItem = LiquidMenuItem;
export const LiquidContextMenuLabel = LiquidMenuLabel;
export const LiquidContextMenuSeparator = LiquidMenuSeparator;
