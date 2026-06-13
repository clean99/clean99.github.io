"use client";

import { LiquidLink, LiquidNav, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function BlogNavExample() {
  return (
    <LiquidProvider defaultMode="auto" disableOnMobile maxEnhancedSurfaces={2}>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink href="/">Home</LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
        <LiquidLink href="/projects/">Projects</LiquidLink>
        <LiquidLink href="/ai-coding-lab/">AI Lab</LiquidLink>
        <LiquidLink href="/about/">About</LiquidLink>
      </LiquidNav>
    </LiquidProvider>
  );
}
