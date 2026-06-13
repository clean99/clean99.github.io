export type LiquidCommandNavigationDirection = "first" | "last" | "next" | "previous";

export type LiquidCommandItemRecord = {
  disabled?: boolean;
  id: string;
  keywords?: readonly string[];
  searchText: string;
  value: string;
};

export type LiquidCommandFilter = (item: LiquidCommandItemRecord, query: string) => boolean;

export function normalizeCommandText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getCommandSearchText(
  item: Pick<LiquidCommandItemRecord, "keywords" | "searchText" | "value">
) {
  return normalizeCommandText([item.value, item.searchText, ...(item.keywords ?? [])].join(" "));
}

export function filterLiquidCommandItems<T extends LiquidCommandItemRecord>(
  items: readonly T[],
  query: string,
  filter?: LiquidCommandFilter
) {
  const normalizedQuery = normalizeCommandText(query);
  if (!normalizedQuery) {
    return items.slice();
  }

  return items.filter((item) =>
    filter ? filter(item, normalizedQuery) : getCommandSearchText(item).includes(normalizedQuery)
  );
}

export function getSelectableCommandItems<T extends LiquidCommandItemRecord>(
  items: readonly T[],
  query: string,
  filter?: LiquidCommandFilter
) {
  return filterLiquidCommandItems(items, query, filter).filter((item) => !item.disabled);
}

export function resolveCommandNavigationValue(
  items: readonly LiquidCommandItemRecord[],
  currentValue: string,
  direction: LiquidCommandNavigationDirection,
  loop = true
) {
  if (items.length === 0) {
    return "";
  }

  if (direction === "first") {
    return items[0]?.value ?? "";
  }

  if (direction === "last") {
    return items[items.length - 1]?.value ?? "";
  }

  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.value === currentValue)
  );
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = currentIndex + offset;

  if (loop) {
    return items[(nextIndex + items.length) % items.length]?.value ?? "";
  }

  return items[Math.max(0, Math.min(nextIndex, items.length - 1))]?.value ?? "";
}
