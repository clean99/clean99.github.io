"use client";

import { forwardRef, type HTMLAttributes, type ImgHTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type LiquidAvatarProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
};

export type LiquidAvatarImageProps = ImgHTMLAttributes<HTMLImageElement>;

export type LiquidAvatarFallbackProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export const LiquidAvatar = forwardRef<HTMLSpanElement, LiquidAvatarProps>(function LiquidAvatar(
  { className, size = "md", ...props },
  ref
) {
  return <span {...props} className={cn("lg-avatar", className)} data-size={size} ref={ref} />;
});

export const LiquidAvatarImage = forwardRef<HTMLImageElement, LiquidAvatarImageProps>(
  function LiquidAvatarImage({ className, ...props }, ref) {
    return <img {...props} className={cn("lg-avatar__image", className)} ref={ref} />;
  }
);

export const LiquidAvatarFallback = forwardRef<HTMLSpanElement, LiquidAvatarFallbackProps>(
  function LiquidAvatarFallback({ className, ...props }, ref) {
    return <span {...props} className={cn("lg-avatar__fallback", className)} ref={ref} />;
  }
);
