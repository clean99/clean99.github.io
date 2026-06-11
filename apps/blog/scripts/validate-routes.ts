import { requiredStaticRoutes, siteNavigation } from "../lib/site";

const navTargets: Set<string> = new Set(siteNavigation.map((item) => item.href));

if (navTargets.has("/interviewers/")) {
  throw new Error("/interviewers/ must not be a primary navigation target");
}

for (const route of requiredStaticRoutes) {
  if (!route.startsWith("/")) {
    throw new Error(`Route must be absolute: ${route}`);
  }
}

console.log(`Validated ${requiredStaticRoutes.length} planned static routes.`);
