"use client";

import { useLiquidContext } from "../providers/LiquidProvider";

export function useLiquidCapabilities() {
  return useLiquidContext().capabilities;
}
