export type LiquidSidebarCollapsible = "offcanvas" | "icon" | "none";
export type LiquidSidebarState = "collapsed" | "expanded";

export function formatSidebarSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

export function resolveSidebarState(
  open: boolean,
  collapsible: LiquidSidebarCollapsible
): LiquidSidebarState {
  return collapsible === "none" || open ? "expanded" : "collapsed";
}

export function resolveSidebarWidth(
  open: boolean,
  collapsible: LiquidSidebarCollapsible,
  width: number | string,
  iconWidth: number | string
) {
  if (collapsible === "none" || open) {
    return formatSidebarSize(width);
  }

  if (collapsible === "icon") {
    return formatSidebarSize(iconWidth);
  }

  return "0px";
}

export function toggleSidebarOpen(open: boolean) {
  return !open;
}
