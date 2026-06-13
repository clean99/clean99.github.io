"use client";

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref
} from "react";
import { LiquidSurface, type LiquidSurfaceProps } from "./LiquidSurface";
import { useStableId } from "../hooks/use-stable-id";
import {
  filterLiquidCommandItems,
  getSelectableCommandItems,
  resolveCommandNavigationValue,
  type LiquidCommandFilter,
  type LiquidCommandItemRecord,
  type LiquidCommandNavigationDirection
} from "../utils/command";
import { cn } from "../utils/cn";

type LiquidCommandContextValue = {
  activeId: string;
  activeValue: string;
  empty: boolean;
  filter?: LiquidCommandFilter;
  inputId: string;
  listId: string;
  loop: boolean;
  query: string;
  registerItem: (item: LiquidCommandRegisteredItem) => () => void;
  rootRef: React.MutableRefObject<HTMLElement | null>;
  selectableItems: LiquidCommandRegisteredItem[];
  selectValue: (value: string) => void;
  setActiveValue: (value: string) => void;
  setQuery: (value: string) => void;
};

type LiquidCommandRegisteredItem = LiquidCommandItemRecord & {
  onSelect?: (value: string) => void;
};

const LiquidCommandContext = createContext<LiquidCommandContextValue | null>(null);

export type LiquidCommandProps = Omit<
  LiquidSurfaceProps,
  "as" | "children" | "defaultValue" | "kind" | "onChange"
> & {
  children: ReactNode;
  defaultValue?: string;
  filter?: LiquidCommandFilter;
  loop?: boolean;
  onValueChange?: (value: string) => void;
  onValueSelect?: (value: string) => void;
  value?: string;
};

export type LiquidCommandInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "onChange" | "value"
> & {
  onValueChange?: (value: string) => void;
};

export type LiquidCommandListProps = HTMLAttributes<HTMLDivElement>;
export type LiquidCommandEmptyProps = HTMLAttributes<HTMLDivElement>;
export type LiquidCommandGroupProps = HTMLAttributes<HTMLDivElement> & {
  heading?: ReactNode;
};
export type LiquidCommandSeparatorProps = HTMLAttributes<HTMLDivElement>;
export type LiquidCommandItemProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  disabled?: boolean;
  keywords?: string[];
  onSelect?: (value: string) => void;
  value?: string;
};

export const LiquidCommand = forwardRef<HTMLElement, LiquidCommandProps>(function LiquidCommand(
  {
    children,
    className,
    defaultValue = "",
    filter,
    intensity = "medium",
    loop = true,
    onValueChange,
    onValueSelect,
    radius = "xl",
    value,
    ...props
  },
  ref
) {
  const inputId = useStableId("lg-command-input");
  const listId = useStableId("lg-command-list");
  const rootRef = useRef<HTMLElement | null>(null);
  const itemMapRef = useRef(new Map<string, LiquidCommandRegisteredItem>());
  const isControlled = value !== undefined;
  const [uncontrolledQuery, setUncontrolledQuery] = useState(defaultValue);
  const query = value ?? uncontrolledQuery;
  const [items, setItems] = useState<LiquidCommandRegisteredItem[]>([]);
  const [requestedActiveValue, setRequestedActiveValue] = useState("");
  const selectableItems = useMemo(
    () => getSelectableCommandItems(items, query, filter),
    [filter, items, query]
  );
  const activeValue = selectableItems.some((item) => item.value === requestedActiveValue)
    ? requestedActiveValue
    : (selectableItems[0]?.value ?? "");
  const activeRecord = selectableItems.find((item) => item.value === activeValue);
  const activeId = activeRecord?.id ?? "";

  const setRootRef = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref]
  );

  const setQuery = useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledQuery(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange, setUncontrolledQuery]
  );

  const setActiveValue = useCallback(
    (nextValue: string) => {
      setRequestedActiveValue(nextValue);
    },
    [setRequestedActiveValue]
  );

  const selectValue = useCallback(
    (selectedValue: string) => {
      const item = itemMapRef.current.get(selectedValue);
      if (!item || item.disabled || !filterLiquidCommandItems([item], query, filter).length) {
        return;
      }

      item.onSelect?.(selectedValue);
      onValueSelect?.(selectedValue);
    },
    [filter, onValueSelect, query]
  );

  const registerItem = useCallback(
    (item: LiquidCommandRegisteredItem) => {
      itemMapRef.current.set(item.value, item);
      setItems(Array.from(itemMapRef.current.values()));

      return () => {
        const currentItem = itemMapRef.current.get(item.value);
        if (currentItem?.id === item.id) {
          itemMapRef.current.delete(item.value);
          setItems(Array.from(itemMapRef.current.values()));
        }
      };
    },
    [setItems]
  );

  const valueForContext = useMemo<LiquidCommandContextValue>(
    () => ({
      activeId,
      activeValue,
      empty: selectableItems.length === 0,
      filter,
      inputId,
      listId,
      loop,
      query,
      registerItem,
      rootRef,
      selectableItems,
      selectValue,
      setActiveValue,
      setQuery
    }),
    [
      activeId,
      activeValue,
      filter,
      inputId,
      listId,
      loop,
      query,
      registerItem,
      selectableItems,
      selectValue,
      setActiveValue,
      setQuery
    ]
  );

  return (
    <LiquidCommandContext.Provider value={valueForContext}>
      <LiquidSurface
        {...props}
        as="div"
        className={cn("lg-command", className)}
        intensity={intensity}
        kind="panel"
        radius={radius}
        ref={setRootRef}
      >
        {children}
      </LiquidSurface>
    </LiquidCommandContext.Provider>
  );
});

export const LiquidCommandInput = forwardRef<HTMLInputElement, LiquidCommandInputProps>(
  function LiquidCommandInput(
    { className, onKeyDown, onValueChange, placeholder = "Search", type = "search", ...props },
    ref
  ) {
    const context = useLiquidCommandContext("LiquidCommandInput");

    return (
      <div className="lg-command__search">
        <span aria-hidden="true" className="lg-command__search-icon">
          <svg className="lg-command__magnifier" fill="none" viewBox="0 0 20 20">
            <circle cx="8.65" cy="8.65" r="5.15" />
            <path d="m12.35 12.35 4.15 4.15" />
          </svg>
        </span>
        <input
          {...props}
          aria-activedescendant={context.activeId || undefined}
          aria-label={
            props["aria-label"] ?? (typeof placeholder === "string" ? placeholder : undefined)
          }
          aria-controls={context.listId}
          autoComplete="off"
          className={cn("lg-command__input", className)}
          id={context.inputId}
          onChange={(event) => {
            context.setQuery(event.currentTarget.value);
            onValueChange?.(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) {
              handleCommandInputKeyDown(event, context);
            }
          }}
          placeholder={placeholder}
          ref={ref}
          role="searchbox"
          type={type}
          value={context.query}
        />
      </div>
    );
  }
);

export const LiquidCommandList = forwardRef<HTMLDivElement, LiquidCommandListProps>(
  function LiquidCommandList({ className, ...props }, ref) {
    const context = useLiquidCommandContext("LiquidCommandList");

    return (
      <div
        {...props}
        aria-labelledby={context.inputId}
        className={cn("lg-command__list", className)}
        id={context.listId}
        ref={ref}
        role="listbox"
      />
    );
  }
);

export const LiquidCommandEmpty = forwardRef<HTMLDivElement, LiquidCommandEmptyProps>(
  function LiquidCommandEmpty({ className, ...props }, ref) {
    const context = useLiquidCommandContext("LiquidCommandEmpty");

    return (
      <div
        {...props}
        className={cn("lg-command__empty", className)}
        hidden={!context.empty}
        ref={ref}
        role="status"
      />
    );
  }
);

export const LiquidCommandGroup = forwardRef<HTMLDivElement, LiquidCommandGroupProps>(
  function LiquidCommandGroup({ children, className, heading, ...props }, ref) {
    const headingId = useStableId("lg-command-group");

    return (
      <div
        {...props}
        aria-labelledby={heading ? headingId : undefined}
        className={cn("lg-command__group", className)}
        ref={ref}
        role="group"
      >
        {heading ? (
          <div className="lg-command__group-heading" id={headingId}>
            {heading}
          </div>
        ) : null}
        {children}
      </div>
    );
  }
);

export const LiquidCommandSeparator = forwardRef<HTMLDivElement, LiquidCommandSeparatorProps>(
  function LiquidCommandSeparator({ className, ...props }, ref) {
    return (
      <div
        {...props}
        aria-orientation="horizontal"
        className={cn("lg-command__separator", className)}
        ref={ref}
        role="separator"
      />
    );
  }
);

export const LiquidCommandItem = forwardRef<HTMLDivElement, LiquidCommandItemProps>(
  function LiquidCommandItem(
    {
      children,
      className,
      disabled = false,
      keywords,
      onClick,
      onMouseMove,
      onSelect,
      value,
      ...props
    },
    ref
  ) {
    const context = useLiquidCommandContext("LiquidCommandItem");
    const { filter, query, registerItem } = context;
    const id = useStableId("lg-command-item");
    const inferredValue = value ?? getNodeText(children);
    const searchText = getNodeText(children);
    const visible =
      filterLiquidCommandItems(
        [
          {
            disabled,
            id,
            keywords,
            searchText,
            value: inferredValue
          }
        ],
        query,
        filter
      ).length > 0;
    const selected = context.activeValue === inferredValue;

    useEffect(
      () =>
        registerItem({
          disabled,
          id,
          keywords,
          onSelect,
          searchText,
          value: inferredValue
        }),
      [disabled, id, inferredValue, keywords, onSelect, registerItem, searchText]
    );

    if (!visible) {
      return null;
    }

    return (
      <div
        {...props}
        aria-disabled={disabled ? true : undefined}
        aria-selected={selected}
        className={cn("lg-command__item", className)}
        data-disabled={disabled ? "" : undefined}
        data-liquid-command-value={inferredValue}
        data-selected={selected ? "" : undefined}
        id={id}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          onClick?.(event);
          if (!event.defaultPrevented) {
            context.selectValue(inferredValue);
          }
        }}
        onMouseMove={(event) => {
          onMouseMove?.(event);
          if (!disabled && !event.defaultPrevented) {
            context.setActiveValue(inferredValue);
          }
        }}
        ref={ref}
        role="option"
      >
        {children}
      </div>
    );
  }
);

function handleCommandInputKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  context: LiquidCommandContextValue
) {
  const direction = getCommandDirectionFromKey(event.key);
  if (direction) {
    event.preventDefault();
    const nextValue = resolveCommandNavigationValue(
      context.selectableItems,
      context.activeValue,
      direction,
      context.loop
    );
    const nextItem = context.selectableItems.find((item) => item.value === nextValue);
    if (nextItem) {
      context.setActiveValue(nextValue);
      window.requestAnimationFrame(() => {
        document.getElementById(nextItem.id)?.scrollIntoView({ block: "nearest" });
      });
    }
    return;
  }

  if (event.key === "Enter" && context.activeValue) {
    event.preventDefault();
    context.selectValue(context.activeValue);
  }
}

function getCommandDirectionFromKey(key: string): LiquidCommandNavigationDirection | null {
  if (key === "ArrowDown") {
    return "next";
  }
  if (key === "ArrowUp") {
    return "previous";
  }
  if (key === "Home") {
    return "first";
  }
  if (key === "End") {
    return "last";
  }
  return null;
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join(" ");
  }

  if (isValidElement(node)) {
    return getNodeText((node.props as { children?: ReactNode }).children);
  }

  const children = Children.toArray(node);
  return children.map(getNodeText).join(" ");
}

function useLiquidCommandContext(componentName: string) {
  const context = useContext(LiquidCommandContext);
  if (!context) {
    throw new Error(`${componentName} must be used inside LiquidCommand.`);
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
