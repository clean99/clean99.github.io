import { LiquidLink, LiquidNav } from "@clean99/liquid-glass";
import { siteNavigation } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <LiquidNav
        aria-label="Primary navigation"
        className="site-nav"
        intensity="subtle"
        mode="auto"
      >
        {siteNavigation.map((item) => (
          <LiquidLink className="site-nav__link" href={item.href} key={item.href} mode="solid">
            {item.label}
          </LiquidLink>
        ))}
        <LiquidLink className="site-nav__link" href="/zh/" mode="solid">
          中文 / EN
        </LiquidLink>
      </LiquidNav>
    </header>
  );
}
