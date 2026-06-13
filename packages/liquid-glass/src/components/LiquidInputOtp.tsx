"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent
} from "react";
import { useStableId } from "../hooks/use-stable-id";
import { cn } from "../utils/cn";

const defaultOtpLength = 6;

export type LiquidInputOtpProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  autoComplete?: string;
  defaultValue?: string;
  disabled?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  invalid?: boolean;
  length?: number;
  name?: string;
  onValueChange?: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  value?: string;
};

export const LiquidInputOtp = forwardRef<HTMLDivElement, LiquidInputOtpProps>(
  function LiquidInputOtp(
    {
      "aria-label": ariaLabel = "One-time password",
      "aria-labelledby": ariaLabelledBy,
      autoComplete = "one-time-code",
      className,
      defaultValue = "",
      disabled = false,
      inputMode = "numeric",
      invalid = false,
      length = defaultOtpLength,
      name,
      onValueChange,
      pattern,
      placeholder = "",
      role = "group",
      value,
      ...props
    },
    ref
  ) {
    const inputCount = normalizeLength(length);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      clampOtpValue(defaultValue, inputCount)
    );
    const currentValue = clampOtpValue(isControlled ? value : uncontrolledValue, inputCount);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const baseId = useStableId("lg-input-otp");

    useEffect(() => {
      inputRefs.current.length = inputCount;
      if (!isControlled) {
        setUncontrolledValue((current) => clampOtpValue(current, inputCount));
      }
    }, [inputCount, isControlled]);

    const setValueAt = useCallback(
      (index: number, text: string) => {
        const nextCharacters = splitOtpValue(currentValue, inputCount);
        const pastedCharacters = parseOtpCharacters(text);

        if (pastedCharacters.length === 0) {
          nextCharacters[index] = "";
        } else {
          pastedCharacters.forEach((character, offset) => {
            const nextIndex = index + offset;
            if (nextIndex < inputCount) {
              nextCharacters[nextIndex] = character;
            }
          });
        }

        const nextValue = nextCharacters.join("");
        if (!isControlled) {
          setUncontrolledValue(nextValue);
        }
        if (nextValue !== currentValue) {
          onValueChange?.(nextValue);
        }

        const focusIndex =
          pastedCharacters.length > 1
            ? Math.min(index + pastedCharacters.length, inputCount - 1)
            : index + 1;
        if (pastedCharacters.length > 0) {
          focusInput(inputRefs.current, focusIndex);
        }
      },
      [currentValue, inputCount, isControlled, onValueChange]
    );

    const handlePaste = useCallback(
      (index: number, event: ClipboardEvent<HTMLInputElement>) => {
        const text =
          event.clipboardData.getData("text/plain") || event.clipboardData.getData("text");
        if (!text) {
          return;
        }

        event.preventDefault();
        setValueAt(index, text);
      },
      [setValueAt]
    );

    const handleKeyDown = useCallback(
      (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          focusInput(inputRefs.current, index - 1);
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          focusInput(inputRefs.current, index + 1);
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          focusInput(inputRefs.current, 0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          focusInput(inputRefs.current, inputCount - 1);
          return;
        }

        if (event.key !== "Backspace") {
          return;
        }

        event.preventDefault();
        const nextCharacters = splitOtpValue(currentValue, inputCount);
        const targetIndex = nextCharacters[index] ? index : Math.max(index - 1, 0);
        nextCharacters[targetIndex] = "";
        const nextValue = nextCharacters.join("");

        if (!isControlled) {
          setUncontrolledValue(nextValue);
        }
        if (nextValue !== currentValue) {
          onValueChange?.(nextValue);
        }
        focusInput(inputRefs.current, targetIndex);
      },
      [currentValue, inputCount, isControlled, onValueChange]
    );

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
      event.currentTarget.select();
    };

    const characters = splitOtpValue(currentValue, inputCount);

    return (
      <div
        {...props}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-invalid={invalid ? true : props["aria-invalid"]}
        aria-labelledby={ariaLabelledBy}
        className={cn("lg-input-otp", className)}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        ref={ref}
        role={role}
      >
        {name ? <input name={name} type="hidden" value={currentValue} /> : null}
        {characters.map((character, index) => (
          <input
            aria-invalid={invalid ? true : undefined}
            aria-label={`${ariaLabel} digit ${index + 1} of ${inputCount}`}
            autoComplete={index === 0 ? autoComplete : "off"}
            className="lg-input-otp__field"
            data-invalid={invalid ? "" : undefined}
            disabled={disabled}
            id={`${baseId}-${index}`}
            inputMode={inputMode}
            key={index}
            maxLength={inputCount}
            onChange={(event) => setValueAt(index, event.currentTarget.value)}
            onFocus={handleFocus}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            pattern={pattern}
            placeholder={placeholder}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            type="text"
            value={character}
          />
        ))}
      </div>
    );
  }
);

function normalizeLength(length: number) {
  return Math.max(1, Math.floor(Number.isFinite(length) ? length : defaultOtpLength));
}

function clampOtpValue(value: string | undefined, length: number) {
  return parseOtpCharacters(value ?? "")
    .slice(0, length)
    .join("");
}

function splitOtpValue(value: string, length: number) {
  const characters = parseOtpCharacters(value).slice(0, length);
  return Array.from({ length }, (_, index) => characters[index] ?? "");
}

function parseOtpCharacters(value: string) {
  return Array.from(value.replace(/\s/g, ""));
}

function focusInput(inputs: Array<HTMLInputElement | null>, index: number) {
  const target = inputs[Math.max(0, Math.min(index, inputs.length - 1))];
  target?.focus();
  target?.select();
}
