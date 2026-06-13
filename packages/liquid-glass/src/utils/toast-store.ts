import type { ReactNode } from "react";

export type LiquidToastVariant = "default" | "info" | "success" | "warning" | "danger";

export type LiquidToastInput = {
  action?: ReactNode;
  description?: ReactNode;
  dismissible?: boolean;
  duration?: number;
  id?: string;
  title: ReactNode;
  variant?: LiquidToastVariant;
};

export type LiquidToastRecord = Required<
  Pick<LiquidToastInput, "dismissible" | "duration" | "id" | "variant">
> &
  Pick<LiquidToastInput, "action" | "description" | "title"> & {
    createdAt: number;
  };

type ToastListener = () => void;

const defaultToastDuration = 5000;
const listeners = new Set<ToastListener>();
let toasts: LiquidToastRecord[] = [];
let toastCounter = 0;

export function createLiquidToast(input: LiquidToastInput) {
  const toast: LiquidToastRecord = {
    createdAt: Date.now(),
    dismissible: input.dismissible ?? true,
    duration: input.duration ?? defaultToastDuration,
    id: input.id ?? `lg-toast-${++toastCounter}`,
    title: input.title,
    variant: input.variant ?? "default",
    action: input.action,
    description: input.description
  };

  toasts = [toast, ...toasts.filter((item) => item.id !== toast.id)];
  notifyToastListeners();

  return toast.id;
}

export function dismissLiquidToast(id: string) {
  const nextToasts = toasts.filter((toast) => toast.id !== id);
  if (nextToasts.length === toasts.length) {
    return;
  }

  toasts = nextToasts;
  notifyToastListeners();
}

export function clearLiquidToasts() {
  if (toasts.length === 0) {
    return;
  }

  toasts = [];
  notifyToastListeners();
}

export function getLiquidToastSnapshot() {
  return toasts;
}

export function subscribeLiquidToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyToastListeners() {
  listeners.forEach((listener) => listener());
}
