"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode
} from "react";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidInput, type LiquidInputProps } from "./LiquidField";
import { cn } from "../utils/cn";
import {
  formatSidebarSize,
  resolveSidebarState,
  resolveSidebarWidth,
  toggleSidebarOpen,
  type LiquidSidebarCollapsible
} from "../utils/sidebar";

type SidebarSetter = (open: boolean | ((open: boolean) => boolean)) => void;

type LiquidSidebarContextValue = {
  open: boolean;
  setOpen: SidebarSetter;
  toggleOpen: () => void;
};

const LiquidSidebarContext = createContext<LiquidSidebarContextValue | null>(null);

export type LiquidSidebarProviderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  storageKey?: string;
};

export type LiquidSidebarProps = HTMLAttributes<HTMLElement> & {
  collapsible?: LiquidSidebarCollapsible;
  iconWidth?: number | string;
  side?: "left" | "right";
  variant?: "floating" | "inset" | "sidebar";
  width?: number | string;
};

export type LiquidSidebarTriggerProps = Omit<LiquidButtonProps, "as"> & {
  controls?: string;
};

export type LiquidSidebarInsetProps = HTMLAttributes<HTMLElement>;
export type LiquidSidebarSectionProps = HTMLAttributes<HTMLDivElement>;
export type LiquidSidebarGroupLabelProps = HTMLAttributes<HTMLDivElement>;
export type LiquidSidebarMenuProps = HTMLAttributes<HTMLUListElement>;
export type LiquidSidebarMenuItemProps = HTMLAttributes<HTMLLIElement>;
export type LiquidSidebarMenuActionProps = ButtonHTMLAttributes<HTMLButtonElement>;
export type LiquidSidebarGroupActionProps = LiquidSidebarMenuActionProps;
export type LiquidSidebarMenuBadgeProps = HTMLAttributes<HTMLSpanElement>;
export type LiquidSidebarRailProps = ButtonHTMLAttributes<HTMLButtonElement>;
export type LiquidSidebarSeparatorProps = HTMLAttributes<HTMLHRElement>;
export type LiquidSidebarInputProps = LiquidInputProps;

export type LiquidSidebarMenuButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>,
  "disabled"
> & {
  active?: boolean;
  as?: "a" | "button";
  disabled?: boolean;
  size?: "default" | "lg" | "sm";
};

function readStoredOpen(storageKey: string | undefined, fallback: boolean) {
  if (!storageKey || typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeStoredOpen(storageKey: string | undefined, open: boolean) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(open));
  } catch {
    // localStorage can be unavailable in private contexts.
  }
}

function useSidebarContext() {
  return (
    useContext(LiquidSidebarContext) ?? {
      open: true,
      setOpen: () => undefined,
      toggleOpen: () => undefined
    }
  );
}

export function useLiquidSidebar() {
  return useSidebarContext();
}

export const LiquidSidebarProvider = forwardRef<HTMLDivElement, LiquidSidebarProviderProps>(
  function LiquidSidebarProvider(
    { children, className, defaultOpen = true, onOpenChange, open, storageKey, ...props },
    ref
  ) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(() =>
      readStoredOpen(storageKey, defaultOpen)
    );
    const resolvedOpen = open ?? uncontrolledOpen;

    const setOpen = useCallback<SidebarSetter>(
      (nextOpen) => {
        const value = typeof nextOpen === "function" ? nextOpen(resolvedOpen) : nextOpen;

        if (open === undefined) {
          setUncontrolledOpen(value);
        }

        writeStoredOpen(storageKey, value);
        onOpenChange?.(value);
      },
      [onOpenChange, open, resolvedOpen, storageKey]
    );

    const value = useMemo<LiquidSidebarContextValue>(
      () => ({
        open: resolvedOpen,
        setOpen,
        toggleOpen: () => setOpen((currentOpen) => toggleSidebarOpen(currentOpen))
      }),
      [resolvedOpen, setOpen]
    );

    return (
      <LiquidSidebarContext.Provider value={value}>
        <div
          {...props}
          className={cn("lg-sidebar-layout", className)}
          data-state={resolvedOpen ? "expanded" : "collapsed"}
          ref={ref}
        >
          {children}
        </div>
      </LiquidSidebarContext.Provider>
    );
  }
);

export const LiquidSidebar = forwardRef<HTMLElement, LiquidSidebarProps>(function LiquidSidebar(
  {
    className,
    collapsible = "offcanvas",
    iconWidth = "3.5rem",
    side = "left",
    style,
    variant = "sidebar",
    width = "18rem",
    ...props
  },
  ref
) {
  const { open } = useSidebarContext();
  const state = resolveSidebarState(open, collapsible);
  const resolvedWidth = resolveSidebarWidth(open, collapsible, width, iconWidth);
  const sidebarStyle = {
    "--lg-sidebar-width": formatSidebarSize(width),
    "--lg-sidebar-width-icon": formatSidebarSize(iconWidth),
    "--lg-sidebar-current-width": resolvedWidth,
    ...style
  } as CSSProperties;

  return (
    <aside
      {...props}
      className={cn("lg-sidebar", className)}
      data-collapsible={collapsible}
      data-side={side}
      data-state={state}
      data-variant={variant}
      ref={ref}
      role={props.role ?? "complementary"}
      style={sidebarStyle}
    />
  );
});

export const LiquidSidebarInset = forwardRef<HTMLElement, LiquidSidebarInsetProps>(
  function LiquidSidebarInset({ className, ...props }, ref) {
    const { open } = useSidebarContext();

    return (
      <main
        {...props}
        className={cn("lg-sidebar-inset", className)}
        data-state={open ? "expanded" : "collapsed"}
        ref={ref}
      />
    );
  }
);

export const LiquidSidebarTrigger = forwardRef<HTMLElement, LiquidSidebarTriggerProps>(
  function LiquidSidebarTrigger({ controls, onClick, ...props }, ref) {
    const { open, toggleOpen } = useSidebarContext();

    return (
      <LiquidButton
        {...props}
        aria-controls={controls}
        aria-expanded={open}
        className={cn("lg-sidebar-trigger", props.className)}
        mode={props.mode ?? "fallback"}
        onClick={(event: MouseEvent<HTMLElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            toggleOpen();
          }
        }}
        ref={ref}
      />
    );
  }
);

export const LiquidSidebarRail = forwardRef<HTMLButtonElement, LiquidSidebarRailProps>(
  function LiquidSidebarRail({ className, onClick, type = "button", ...props }, ref) {
    const { toggleOpen } = useSidebarContext();

    return (
      <button
        {...props}
        className={cn("lg-sidebar-rail", className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            toggleOpen();
          }
        }}
        ref={ref}
        type={type}
      />
    );
  }
);

export const LiquidSidebarHeader = forwardRef<HTMLDivElement, LiquidSidebarSectionProps>(
  function LiquidSidebarHeader({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-sidebar__header", className)} ref={ref} />;
  }
);

export const LiquidSidebarContent = forwardRef<HTMLDivElement, LiquidSidebarSectionProps>(
  function LiquidSidebarContent({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-sidebar__content", className)} ref={ref} />;
  }
);

export const LiquidSidebarFooter = forwardRef<HTMLDivElement, LiquidSidebarSectionProps>(
  function LiquidSidebarFooter({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-sidebar__footer", className)} ref={ref} />;
  }
);

export const LiquidSidebarGroup = forwardRef<HTMLDivElement, LiquidSidebarSectionProps>(
  function LiquidSidebarGroup({ className, ...props }, ref) {
    return <section {...props} className={cn("lg-sidebar-group", className)} ref={ref} />;
  }
);

export const LiquidSidebarGroupLabel = forwardRef<HTMLDivElement, LiquidSidebarGroupLabelProps>(
  function LiquidSidebarGroupLabel({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-sidebar-group__label", className)} ref={ref} />;
  }
);

export const LiquidSidebarGroupContent = forwardRef<HTMLDivElement, LiquidSidebarSectionProps>(
  function LiquidSidebarGroupContent({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-sidebar-group__content", className)} ref={ref} />;
  }
);

export const LiquidSidebarGroupAction = forwardRef<HTMLButtonElement, LiquidSidebarMenuActionProps>(
  function LiquidSidebarGroupAction({ className, type = "button", ...props }, ref) {
    return (
      <button
        {...props}
        className={cn("lg-sidebar-group__action", className)}
        ref={ref}
        type={type}
      />
    );
  }
);

export const LiquidSidebarInput = forwardRef<HTMLInputElement, LiquidSidebarInputProps>(
  function LiquidSidebarInput({ className, surfaceProps, ...props }, ref) {
    return (
      <LiquidInput
        {...props}
        className={cn("lg-sidebar-input", className)}
        ref={ref}
        surfaceProps={{
          ...surfaceProps,
          className: cn("lg-sidebar-input-surface", surfaceProps?.className),
          radius: surfaceProps?.radius ?? "pill"
        }}
      />
    );
  }
);

export const LiquidSidebarSeparator = forwardRef<HTMLHRElement, LiquidSidebarSeparatorProps>(
  function LiquidSidebarSeparator({ className, ...props }, ref) {
    return <hr {...props} className={cn("lg-sidebar-separator", className)} ref={ref} />;
  }
);

export const LiquidSidebarMenu = forwardRef<HTMLUListElement, LiquidSidebarMenuProps>(
  function LiquidSidebarMenu({ className, ...props }, ref) {
    return <ul {...props} className={cn("lg-sidebar-menu", className)} ref={ref} />;
  }
);

export const LiquidSidebarMenuItem = forwardRef<HTMLLIElement, LiquidSidebarMenuItemProps>(
  function LiquidSidebarMenuItem({ className, ...props }, ref) {
    return <li {...props} className={cn("lg-sidebar-menu__item", className)} ref={ref} />;
  }
);

export const LiquidSidebarMenuButton = forwardRef<HTMLElement, LiquidSidebarMenuButtonProps>(
  function LiquidSidebarMenuButton(
    {
      active = false,
      as = "button",
      className,
      disabled = false,
      size = "default",
      type = "button",
      ...props
    },
    ref
  ) {
    if (as === "a") {
      const anchorProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;

      return (
        <a
          {...anchorProps}
          aria-current={active ? "page" : undefined}
          aria-disabled={disabled ? true : undefined}
          className={cn("lg-sidebar-menu__button", className)}
          data-active={active ? "" : undefined}
          data-size={size}
          ref={ref as ForwardedRef<HTMLAnchorElement>}
          tabIndex={disabled ? -1 : anchorProps.tabIndex}
        />
      );
    }

    const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;

    return (
      <button
        {...buttonProps}
        aria-pressed={active ? true : undefined}
        className={cn("lg-sidebar-menu__button", className)}
        data-active={active ? "" : undefined}
        data-size={size}
        disabled={disabled}
        ref={ref as ForwardedRef<HTMLButtonElement>}
        type={type}
      />
    );
  }
);

export const LiquidSidebarMenuAction = forwardRef<HTMLButtonElement, LiquidSidebarMenuActionProps>(
  function LiquidSidebarMenuAction({ className, type = "button", ...props }, ref) {
    return (
      <button
        {...props}
        className={cn("lg-sidebar-menu__action", className)}
        ref={ref}
        type={type}
      />
    );
  }
);

export const LiquidSidebarMenuBadge = forwardRef<HTMLSpanElement, LiquidSidebarMenuBadgeProps>(
  function LiquidSidebarMenuBadge({ className, ...props }, ref) {
    return <span {...props} className={cn("lg-sidebar-menu__badge", className)} ref={ref} />;
  }
);
