import { siteNavigation } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav aria-label="Primary navigation" className="site-nav">
        {siteNavigation.map((item) => (
          <a className="site-nav__link" href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
        <a className="site-nav__link" href="/zh/">
          中文 / EN
        </a>
      </nav>
    </header>
  );
}
