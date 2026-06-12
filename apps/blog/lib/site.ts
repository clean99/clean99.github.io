export const siteNavigation = [
  { href: "/", label: "Home" },
  { href: "/writing/", label: "Writing" },
  { href: "/projects/", label: "Projects" },
  { href: "/ai-coding-lab/", label: "AI Lab" },
  { href: "/about/", label: "About" }
] as const;

export const requiredStaticRoutes = [
  "/",
  "/writing/",
  "/projects/",
  "/ai-coding-lab/",
  "/About/",
  "/about/",
  "/zh/",
  "/atom.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/404.html"
] as const;
