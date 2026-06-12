import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">{children}</main>
      <footer className="site-footer">
        <a href="/atom.xml">RSS</a>
        <a href="/sitemap.xml">Sitemap</a>
        <a href="https://github.com/clean99">GitHub</a>
      </footer>
    </>
  );
}
