"use client";

import { useEffect, useState } from "react";
import { shouldReduceTransparency } from "../utils/support";

export function usePrefersReducedTransparency(): boolean {
  const [reducedTransparency, setReducedTransparency] = useState(() => shouldReduceTransparency());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const update = () => setReducedTransparency(media.matches || shouldReduceTransparency());
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return reducedTransparency;
}
