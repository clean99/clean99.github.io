"use client";

import Link from "next/link";
import { LiquidNav, LiquidProvider } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function NextLiquidNavExample() {
  return (
    <LiquidProvider defaultMode="auto" disableOnMobile>
      <LiquidNav aria-label="Primary navigation">
        <Link href="/">Home</Link>
        <Link href="/writing/">Writing</Link>
        <Link href="/projects/">Projects</Link>
      </LiquidNav>
    </LiquidProvider>
  );
}
