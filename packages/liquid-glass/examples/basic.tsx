"use client";

import { LiquidButton, LiquidCard, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function BasicLiquidGlassExample() {
  return (
    <LiquidProvider defaultMode="auto" maxEnhancedSurfaces={4}>
      <LiquidCard>
        <h2>Reliable frontend systems</h2>
        <p>Readable foreground content with a refractive material layer underneath.</p>
        <LiquidButton>Read writing</LiquidButton>
      </LiquidCard>
    </LiquidProvider>
  );
}
