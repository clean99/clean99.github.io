"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { cn } from "../utils/cn";

export type LiquidFieldProps = HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  invalid?: boolean;
};

export type LiquidLabelProps = LabelHTMLAttributes<HTMLLabelElement>;
export type LiquidFieldDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export type LiquidFieldErrorProps = HTMLAttributes<HTMLParagraphElement>;

export type LiquidInputSurfaceProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "disabled" | "kind"
>;

export type LiquidInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children"> & {
  endAdornment?: ReactNode;
  invalid?: boolean;
  startAdornment?: ReactNode;
  surfaceProps?: LiquidInputSurfaceProps;
};

export type LiquidTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> & {
  invalid?: boolean;
  surfaceProps?: LiquidInputSurfaceProps;
};

export const LiquidField = forwardRef<HTMLDivElement, LiquidFieldProps>(function LiquidField(
  { className, disabled, invalid, ...props },
  ref
) {
  return (
    <div
      {...props}
      className={cn("lg-field", className)}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      ref={ref}
    />
  );
});

export const LiquidLabel = forwardRef<HTMLLabelElement, LiquidLabelProps>(function LiquidLabel(
  { className, ...props },
  ref
) {
  return <label {...props} className={cn("lg-field__label", className)} ref={ref} />;
});

export const LiquidFieldDescription = forwardRef<HTMLParagraphElement, LiquidFieldDescriptionProps>(
  function LiquidFieldDescription({ className, ...props }, ref) {
    return <p {...props} className={cn("lg-field__description", className)} ref={ref} />;
  }
);

export const LiquidFieldError = forwardRef<HTMLParagraphElement, LiquidFieldErrorProps>(
  function LiquidFieldError({ className, role = "alert", ...props }, ref) {
    return <p {...props} className={cn("lg-field__error", className)} ref={ref} role={role} />;
  }
);

export const LiquidInput = forwardRef<HTMLInputElement, LiquidInputProps>(function LiquidInput(
  {
    "aria-invalid": ariaInvalid,
    className,
    disabled,
    endAdornment,
    invalid = false,
    startAdornment,
    surfaceProps,
    type = "text",
    ...props
  },
  ref
) {
  const {
    className: surfaceClassName,
    intensity = "subtle",
    radius = "md",
    ...restSurfaceProps
  } = surfaceProps ?? {};

  return (
    <LiquidSurface
      {...restSurfaceProps}
      className={cn("lg-field-control lg-input-surface", surfaceClassName)}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      intensity={intensity}
      kind="panel"
      radius={radius}
    >
      {startAdornment ? (
        <span aria-hidden="true" className="lg-field-control__adornment">
          {startAdornment}
        </span>
      ) : null}
      <input
        {...props}
        aria-invalid={invalid ? true : ariaInvalid}
        className={cn("lg-input", className)}
        data-invalid={invalid ? "" : undefined}
        disabled={disabled}
        ref={ref}
        type={type}
      />
      {endAdornment ? (
        <span aria-hidden="true" className="lg-field-control__adornment">
          {endAdornment}
        </span>
      ) : null}
    </LiquidSurface>
  );
});

export const LiquidTextarea = forwardRef<HTMLTextAreaElement, LiquidTextareaProps>(
  function LiquidTextarea(
    { "aria-invalid": ariaInvalid, className, disabled, invalid = false, surfaceProps, ...props },
    ref
  ) {
    const {
      className: surfaceClassName,
      intensity = "subtle",
      radius = "md",
      ...restSurfaceProps
    } = surfaceProps ?? {};

    return (
      <LiquidSurface
        {...restSurfaceProps}
        className={cn("lg-field-control lg-textarea-surface", surfaceClassName)}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        intensity={intensity}
        kind="panel"
        radius={radius}
      >
        <textarea
          {...props}
          aria-invalid={invalid ? true : ariaInvalid}
          className={cn("lg-textarea", className)}
          data-invalid={invalid ? "" : undefined}
          disabled={disabled}
          ref={ref}
        />
      </LiquidSurface>
    );
  }
);
