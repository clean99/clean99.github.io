"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactNode
} from "react";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";
import {
  clearLiquidToasts,
  createLiquidToast,
  dismissLiquidToast,
  getLiquidToastSnapshot,
  subscribeLiquidToasts,
  type LiquidToastInput,
  type LiquidToastRecord,
  type LiquidToastVariant
} from "../utils/toast-store";

export type { LiquidToastInput, LiquidToastRecord, LiquidToastVariant } from "../utils/toast-store";

export type LiquidToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type LiquidToastProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "kind" | "role" | "title"
> & {
  action?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  role?: "status" | "alert";
  title?: ReactNode;
  variant?: LiquidToastVariant;
};

export type LiquidToastCloseProps = LiquidButtonProps;

export type LiquidToasterProps = HTMLAttributes<HTMLOListElement> & {
  closeButton?: boolean;
  limit?: number;
  position?: LiquidToastPosition;
};

export type LiquidToastApi = {
  clear: () => void;
  danger: (input: Omit<LiquidToastInput, "variant">) => string;
  dismiss: (id: string) => void;
  info: (input: Omit<LiquidToastInput, "variant">) => string;
  show: (input: LiquidToastInput) => string;
  success: (input: Omit<LiquidToastInput, "variant">) => string;
  warning: (input: Omit<LiquidToastInput, "variant">) => string;
};

export const liquidToast: LiquidToastApi = {
  clear: clearLiquidToasts,
  danger: (input) => createLiquidToast({ ...input, variant: "danger" }),
  dismiss: dismissLiquidToast,
  info: (input) => createLiquidToast({ ...input, variant: "info" }),
  show: createLiquidToast,
  success: (input) => createLiquidToast({ ...input, variant: "success" }),
  warning: (input) => createLiquidToast({ ...input, variant: "warning" })
};

export const LiquidToast = forwardRef<HTMLElement, LiquidToastProps>(function LiquidToast(
  {
    action,
    children,
    className,
    description,
    dismissible = true,
    intensity = "medium",
    onDismiss,
    radius = "lg",
    role,
    title,
    variant = "default",
    ...props
  },
  ref
) {
  const resolvedRole = role ?? (variant === "danger" || variant === "warning" ? "alert" : "status");

  return (
    <LiquidSurface
      {...props}
      as="section"
      className={cn("lg-toast", className)}
      data-variant={variant}
      intensity={intensity}
      kind="panel"
      radius={radius}
      ref={ref}
      role={resolvedRole}
    >
      <div className="lg-toast__body">
        {title ? <div className="lg-toast__title">{title}</div> : null}
        {description ? <div className="lg-toast__description">{description}</div> : null}
        {children}
      </div>
      {action ? <div className="lg-toast__action">{action}</div> : null}
      {dismissible && onDismiss ? (
        <LiquidToastClose aria-label="Dismiss notification" onClick={onDismiss}>
          ×
        </LiquidToastClose>
      ) : null}
    </LiquidSurface>
  );
});

export const LiquidToastClose = forwardRef<HTMLElement, LiquidToastCloseProps>(
  function LiquidToastClose({ className, radius = "pill", ...props }, ref) {
    return (
      <LiquidButton
        {...props}
        className={cn("lg-toast__close", className)}
        radius={radius}
        ref={ref}
      />
    );
  }
);

export const LiquidToaster = forwardRef<HTMLOListElement, LiquidToasterProps>(
  function LiquidToaster(
    { className, closeButton = true, limit = 5, position = "bottom-right", ...props },
    ref
  ) {
    const toasts = useLiquidToasts();
    const visibleToasts = useMemo(() => toasts.slice(0, limit), [limit, toasts]);

    useEffect(() => {
      const timers = visibleToasts
        .filter((toast) => Number.isFinite(toast.duration) && toast.duration > 0)
        .map((toast) =>
          window.setTimeout(() => dismissLiquidToast(toast.id), Math.max(0, toast.duration))
        );

      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [visibleToasts]);

    return (
      <ol
        {...props}
        aria-label="Notifications"
        className={cn("lg-toaster", className)}
        data-position={position}
        ref={ref}
      >
        {visibleToasts.map((toast) => (
          <li className="lg-toaster__item" key={toast.id}>
            <LiquidToast
              action={toast.action}
              description={toast.description}
              dismissible={closeButton && toast.dismissible}
              onDismiss={() => dismissLiquidToast(toast.id)}
              title={toast.title}
              variant={toast.variant}
            />
          </li>
        ))}
      </ol>
    );
  }
);

export const LiquidSonner = LiquidToaster;

export function useLiquidToasts(): LiquidToastRecord[] {
  return useSyncExternalStore(
    subscribeLiquidToasts,
    getLiquidToastSnapshot,
    getLiquidToastSnapshot
  );
}
