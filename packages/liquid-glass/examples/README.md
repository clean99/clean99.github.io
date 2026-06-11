# Examples

## Basic

```tsx
<LiquidProvider defaultMode="auto">
  <LiquidCard>
    <LiquidPill>Frontend Systems</LiquidPill>
    <h2>Reliable UI architecture</h2>
    <LiquidButton>Read Writing</LiquidButton>
  </LiquidCard>
</LiquidProvider>
```

## Next.js

```tsx
"use client";

import { LiquidProvider, LiquidNav, LiquidLink } from "@clean99/liquid-glass";
import "@clean99/liquid-glass/styles.css";

export function SiteNav() {
  return (
    <LiquidProvider defaultMode="auto" disableOnMobile>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink href="/">Home</LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
      </LiquidNav>
    </LiquidProvider>
  );
}
```

## Blog Nav

```tsx
<LiquidNav aria-label="Primary navigation">
  <LiquidLink href="/">Home</LiquidLink>
  <LiquidLink href="/writing/">Writing</LiquidLink>
  <LiquidLink href="/projects/">Projects</LiquidLink>
  <LiquidLink href="/ai-coding-lab/">AI Lab</LiquidLink>
  <LiquidLink href="/about/">About</LiquidLink>
</LiquidNav>
```

## Card Grid

```tsx
<div className="grid">
  {["Frontend Systems", "Performance", "AI Agents"].map((title) => (
    <LiquidCard key={title}>
      <h3>{title}</h3>
    </LiquidCard>
  ))}
</div>
```

## Fallback Only

```tsx
<LiquidProvider defaultMode="fallback">
  <LiquidButton>Readable fallback</LiquidButton>
</LiquidProvider>
```

## Reduced Motion

```tsx
<LiquidProvider respectReducedMotion>
  <LiquidToggle>Theme</LiquidToggle>
</LiquidProvider>
```

## Dark Mode

```tsx
<div data-lg-theme="dark">
  <LiquidCard>Dark material</LiquidCard>
</div>
```
