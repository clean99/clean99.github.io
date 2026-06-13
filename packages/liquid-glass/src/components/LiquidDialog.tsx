"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref
} from "react";
import { createPortal } from "react-dom";
import { LiquidButton, type LiquidButtonProps } from "./LiquidButton";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

type DialogContextValue = {
  contentId: string;
  descriptionId: string;
  hasDescription: boolean;
  modal: boolean;
  open: boolean;
  setHasDescription: (hasDescription: boolean) => void;
  setOpen: (open: boolean) => void;
  titleId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export type LiquidDialogProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export type LiquidDialogTriggerProps = Omit<LiquidButtonProps, "aria-controls"> & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export type LiquidDialogContentProps = Omit<LiquidSurfaceProps, "as" | "children" | "kind"> & {
  children: ReactNode;
  closeOnBackdropClick?: boolean;
  container?: Element | null;
  forceMount?: boolean;
};

export type LiquidDialogHeaderProps = HTMLAttributes<HTMLDivElement>;
export type LiquidDialogFooterProps = HTMLAttributes<HTMLDivElement>;

export type LiquidDialogTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4";
};

export type LiquidDialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export type LiquidDialogCloseProps = LiquidButtonProps & {
  onClick?: MouseEventHandler<HTMLElement>;
};

export function LiquidDialog({
  children,
  defaultOpen = false,
  modal = true,
  onOpenChange,
  open
}: LiquidDialogProps) {
  const contentId = useStableId("lg-dialog-content");
  const titleId = useStableId("lg-dialog-title");
  const descriptionId = useStableId("lg-dialog-description");
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [hasDescription, setHasDescription] = useState(false);
  const resolvedOpen = open ?? uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const value = useMemo<DialogContextValue>(
    () => ({
      contentId,
      descriptionId,
      hasDescription,
      modal,
      open: resolvedOpen,
      setHasDescription,
      setOpen,
      titleId
    }),
    [contentId, descriptionId, hasDescription, modal, resolvedOpen, setOpen, titleId]
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export const LiquidDialogTrigger = forwardRef<HTMLElement, LiquidDialogTriggerProps>(
  function LiquidDialogTrigger({ children, onClick, ...props }, ref) {
    const context = useDialogContext("LiquidDialogTrigger");

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        context.setOpen(true);
      }
    };

    return (
      <LiquidButton
        {...props}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup="dialog"
        onClick={handleClick}
        ref={ref}
      >
        {children}
      </LiquidButton>
    );
  }
);

export const LiquidDialogContent = forwardRef<HTMLDialogElement, LiquidDialogContentProps>(
  function LiquidDialogContent(
    {
      children,
      className,
      closeOnBackdropClick = true,
      container,
      forceMount = false,
      intensity = "medium",
      radius = "xl",
      ...props
    },
    ref
  ) {
    const context = useDialogContext("LiquidDialogContent");
    const { contentId, descriptionId, hasDescription, modal, open, setOpen, titleId } = context;
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      if (open && !dialog.open) {
        if (modal && typeof dialog.showModal === "function") {
          dialog.showModal();
        } else if (typeof dialog.show === "function") {
          dialog.show();
        }

        if (!dialog.open) {
          dialog.setAttribute("open", "");
        }
        return;
      }

      if (!open && dialog.open) {
        if (typeof dialog.close === "function") {
          dialog.close();
        }

        if (dialog.open) {
          dialog.removeAttribute("open");
        }
      }
    }, [modal, open]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) {
        return undefined;
      }

      const handleClose = () => {
        if (open) {
          setOpen(false);
        }
      };
      const handleCancel = () => {
        if (open) {
          setOpen(false);
        }
      };

      dialog.addEventListener("close", handleClose);
      dialog.addEventListener("cancel", handleCancel);

      return () => {
        dialog.removeEventListener("close", handleClose);
        dialog.removeEventListener("cancel", handleCancel);
      };
    }, [open, setOpen]);

    const setDialogRef = useCallback(
      (node: HTMLElement | null) => {
        const dialog = node as HTMLDialogElement | null;
        dialogRef.current = dialog;
        assignRef(ref, dialog);
      },
      [ref]
    );

    if (typeof document === "undefined" || (!forceMount && !open)) {
      return null;
    }

    const target = container ?? document.body;

    return createPortal(
      <LiquidSurface
        {...props}
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal={modal ? true : undefined}
        as="dialog"
        className={cn("lg-dialog", className)}
        data-state={open ? "open" : "closed"}
        id={contentId}
        intensity={intensity}
        kind="panel"
        onClick={(event) => {
          props.onClick?.(event);
          if (
            closeOnBackdropClick &&
            !event.defaultPrevented &&
            event.target === event.currentTarget
          ) {
            setOpen(false);
          }
        }}
        radius={radius}
        ref={setDialogRef as Ref<HTMLElement>}
      >
        {children}
      </LiquidSurface>,
      target
    );
  }
);

export const LiquidDialogHeader = forwardRef<HTMLDivElement, LiquidDialogHeaderProps>(
  function LiquidDialogHeader({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-dialog__header", className)} ref={ref} />;
  }
);

export const LiquidDialogFooter = forwardRef<HTMLDivElement, LiquidDialogFooterProps>(
  function LiquidDialogFooter({ className, ...props }, ref) {
    return <div {...props} className={cn("lg-dialog__footer", className)} ref={ref} />;
  }
);

export const LiquidDialogTitle = forwardRef<HTMLHeadingElement, LiquidDialogTitleProps>(
  function LiquidDialogTitle({ as: Component = "h2", className, id, ...props }, ref) {
    const context = useDialogContext("LiquidDialogTitle");

    return (
      <Component
        {...props}
        className={cn("lg-dialog__title", className)}
        id={id ?? context.titleId}
        ref={ref}
      />
    );
  }
);

export const LiquidDialogDescription = forwardRef<
  HTMLParagraphElement,
  LiquidDialogDescriptionProps
>(function LiquidDialogDescription({ className, id, ...props }, ref) {
  const context = useDialogContext("LiquidDialogDescription");
  const { setHasDescription } = context;

  useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      {...props}
      className={cn("lg-dialog__description", className)}
      id={id ?? context.descriptionId}
      ref={ref}
    />
  );
});

export const LiquidDialogClose = forwardRef<HTMLElement, LiquidDialogCloseProps>(
  function LiquidDialogClose({ children = "Close", onClick, ...props }, ref) {
    const context = useDialogContext("LiquidDialogClose");

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        context.setOpen(false);
      }
    };

    return (
      <LiquidButton {...props} onClick={handleClick} ref={ref}>
        {children}
      </LiquidButton>
    );
  }
);

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidDialog.`);
  }
  return context;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  ref.current = value;
}
