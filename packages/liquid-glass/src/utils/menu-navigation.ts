export type LiquidMenuNavigationDirection = "first" | "last" | "next" | "previous";

export function getEnabledMenuItemIndexes(disabledItems: readonly boolean[]) {
  return disabledItems.reduce<number[]>((indexes, disabled, index) => {
    if (!disabled) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

export function resolveMenuNavigationIndex(
  disabledItems: readonly boolean[],
  currentIndex: number,
  direction: LiquidMenuNavigationDirection
) {
  const enabledIndexes = getEnabledMenuItemIndexes(disabledItems);
  if (enabledIndexes.length === 0) {
    return -1;
  }

  if (direction === "first") {
    return enabledIndexes[0] ?? -1;
  }

  if (direction === "last") {
    return enabledIndexes[enabledIndexes.length - 1] ?? -1;
  }

  const enabledPosition = enabledIndexes.indexOf(currentIndex);
  const fallbackPosition = direction === "next" ? -1 : 0;
  const resolvedPosition = enabledPosition >= 0 ? enabledPosition : fallbackPosition;
  const offset = direction === "next" ? 1 : -1;
  const nextPosition = (resolvedPosition + offset + enabledIndexes.length) % enabledIndexes.length;

  return enabledIndexes[nextPosition] ?? -1;
}
