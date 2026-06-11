"use client";

import { useId } from "react";

export function useStableId(prefix = "lg"): string {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}
