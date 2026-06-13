"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { handleMenuKeyDown } from "./LiquidMenuPrimitives";
import { cn } from "../utils/cn";
import { resolveMenuNavigationIndex } from "../utils/menu-navigation";

export type LiquidMenubarItem = {
  disabled?: boolean;
  href?: string;
  label: ReactNode;
  onSelect?: () => void;
  value: string;
};

export type LiquidMenubarMenu = {
  disabled?: boolean;
  items: LiquidMenubarItem[];
  label: ReactNode;
  value: string;
};

export type LiquidMenubarProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  "aria-label": string;
  defaultValue?: string;
  menus: LiquidMenubarMenu[];
  onOpenValueChange?: (value: string | null) => void;
  openValue?: string | null;
  surfaceProps?: Omit<LiquidSurfaceProps, "as" | "children" | "kind" | "role">;
};

export const LiquidMenubar = forwardRef<HTMLDivElement, LiquidMenubarProps>(function LiquidMenubar(
  {
    "aria-label": ariaLabel,
    className,
    defaultValue = null,
    menus,
    onOpenValueChange,
    openValue,
    surfaceProps,
    ...props
  },
  ref
) {
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isControlled = openValue !== undefined;
  const [uncontrolledOpenValue, setUncontrolledOpenValue] = useState<string | null>(defaultValue);
  const resolvedOpenValue = openValue ?? uncontrolledOpenValue;
  const openMenu = menus.find((menu) => menu.value === resolvedOpenValue && !menu.disabled);
  const openIndex = menus.findIndex((menu) => menu.value === resolvedOpenValue);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const disabledMenus = useMemo(() => menus.map((menu) => Boolean(menu.disabled)), [menus]);
  const { className: surfaceClassName, radius = "pill", ...restSurfaceProps } = surfaceProps ?? {};

  const setOpenValue = useCallback(
    (nextValue: string | null) => {
      if (!isControlled) {
        setUncontrolledOpenValue(nextValue);
      }
      onOpenValueChange?.(nextValue);
    },
    [isControlled, onOpenValueChange]
  );

  const updatePosition = useCallback(() => {
    if (!openMenu || openIndex < 0) {
      return;
    }

    const trigger = triggerRefs.current[openIndex];
    const content = contentRef.current;
    if (!trigger || !content) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.round(
        Math.min(
          triggerRect.left + window.scrollX,
          window.scrollX + window.innerWidth - contentRect.width - 8
        )
      )
    );
    const top = Math.max(8, Math.round(triggerRect.bottom + window.scrollY + 8));
    setPosition({ left, top });
  }, [openIndex, openMenu]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openMenu, updatePosition]);

  useEffect(() => {
    if (!openMenu) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !contentRef.current?.contains(target) &&
        !triggerRefs.current.some((trigger) => trigger?.contains(target))
      ) {
        setOpenValue(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu, setOpenValue]);

  const focusTrigger = (index: number) => {
    triggerRefs.current[index]?.focus();
  };

  const handleTriggerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    menu: LiquidMenubarMenu,
    index: number
  ) => {
    const direction =
      event.key === "ArrowRight"
        ? "next"
        : event.key === "ArrowLeft"
          ? "previous"
          : event.key === "Home"
            ? "first"
            : event.key === "End"
              ? "last"
              : null;

    if (direction) {
      event.preventDefault();
      const nextIndex = resolveMenuNavigationIndex(disabledMenus, index, direction);
      if (nextIndex >= 0) {
        focusTrigger(nextIndex);
        if (openMenu) {
          setOpenValue(menus[nextIndex]?.value ?? null);
        }
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!menu.disabled) {
        setOpenValue(menu.value);
      }
    }
  };

  return (
    <>
      <div {...props} className={cn("lg-menubar", className)} ref={ref}>
        <LiquidSurface
          {...restSurfaceProps}
          aria-label={ariaLabel}
          as="div"
          className={cn("lg-menubar__list", surfaceClassName)}
          kind="panel"
          radius={radius}
          role="menubar"
        >
          {menus.map((menu, index) => (
            <button
              aria-disabled={menu.disabled ? true : undefined}
              aria-expanded={openMenu?.value === menu.value}
              aria-haspopup="menu"
              className="lg-menubar__trigger"
              data-state={openMenu?.value === menu.value ? "open" : "closed"}
              disabled={menu.disabled}
              key={menu.value}
              onClick={() => {
                if (!menu.disabled) {
                  setOpenValue(openMenu?.value === menu.value ? null : menu.value);
                }
              }}
              onKeyDown={(event) => handleTriggerKeyDown(event, menu, index)}
              ref={(node) => {
                triggerRefs.current[index] = node;
              }}
              role="menuitem"
              tabIndex={menu.disabled ? -1 : 0}
              type="button"
            >
              {menu.label}
            </button>
          ))}
        </LiquidSurface>
      </div>
      {typeof document !== "undefined" && openMenu
        ? createPortal(
            <LiquidSurface
              as="div"
              className="lg-menu lg-menubar__menu"
              data-state="open"
              intensity="medium"
              kind="panel"
              onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpenValue(null);
                  focusTrigger(openIndex);
                  return;
                }

                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  const nextIndex = resolveMenuNavigationIndex(
                    disabledMenus,
                    openIndex,
                    event.key === "ArrowRight" ? "next" : "previous"
                  );
                  if (nextIndex >= 0) {
                    setOpenValue(menus[nextIndex]?.value ?? null);
                    focusTrigger(nextIndex);
                  }
                  return;
                }

                handleMenuKeyDown(event, event.currentTarget);
              }}
              radius="lg"
              ref={contentRef}
              role="menu"
              style={{
                left: position?.left ?? -10000,
                top: position?.top ?? -10000
              }}
            >
              {openMenu.items.map((item) => (
                <LiquidMenubarMenuItem
                  disabled={item.disabled}
                  href={item.href}
                  key={item.value}
                  onSelect={() => {
                    item.onSelect?.();
                    setOpenValue(null);
                    focusTrigger(openIndex);
                  }}
                >
                  {item.label}
                </LiquidMenubarMenuItem>
              ))}
            </LiquidSurface>,
            document.body
          )
        : null}
    </>
  );
});

type LiquidMenubarMenuItemProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>,
  "onSelect"
> & {
  disabled?: boolean;
  href?: string;
  onSelect?: () => void;
};

function LiquidMenubarMenuItem({
  children,
  disabled = false,
  href,
  onClick,
  onSelect,
  ...props
}: LiquidMenubarMenuItemProps) {
  const Component = href ? "a" : "button";

  return (
    <Component
      {...props}
      aria-disabled={disabled ? true : undefined}
      className="lg-menu__item"
      data-disabled={disabled ? "" : undefined}
      disabled={Component === "button" ? disabled : undefined}
      href={Component === "a" && !disabled ? href : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
        if (!event.defaultPrevented) {
          onSelect?.();
        }
      }}
      role="menuitem"
      tabIndex={disabled ? -1 : -1}
      type={Component === "button" ? "button" : undefined}
    >
      {children}
    </Component>
  );
}
