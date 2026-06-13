import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const parityPath = path.join(root, "docs", "shadcn-parity.json");
const inventoryPath = path.join(root, "docs", "component-inventory.json");
const sourceUrl = "https://ui.shadcn.com/docs/components";
const update = process.argv.includes("--update");
const timeoutMs = 20_000;

const officialComponents = await fetchOfficialComponentSlugs();
const parity = JSON.parse(fs.readFileSync(parityPath, "utf8"));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const inventoryNames = new Set(inventory.components.map((component) => component.name));

if (update) {
  const nextParity = {
    ...parity,
    source: sourceUrl,
    retrievedAt: new Date().toISOString().slice(0, 10),
    components: officialComponents
  };
  fs.writeFileSync(parityPath, `${JSON.stringify(nextParity, null, 2)}\n`);
  console.log(`Updated shadcn parity baseline with ${officialComponents.length} components.`);
  process.exit(0);
}

const errors = [];
const parityComponents = parity.components ?? [];
const missingFromParity = officialComponents.filter(
  (component) => !parityComponents.includes(component)
);
const staleInParity = parityComponents.filter(
  (component) => !officialComponents.includes(component)
);
const missingFromInventory = officialComponents.filter(
  (component) => !inventoryNames.has(component)
);

if (parity.source !== sourceUrl) {
  errors.push(`docs/shadcn-parity.json source must be ${sourceUrl}`);
}

if (missingFromParity.length > 0) {
  errors.push(
    `Missing official shadcn components in parity baseline: ${missingFromParity.join(", ")}`
  );
}

if (staleInParity.length > 0) {
  errors.push(`Stale components in parity baseline: ${staleInParity.join(", ")}`);
}

if (missingFromInventory.length > 0) {
  errors.push(
    `Missing official shadcn components in inventory: ${missingFromInventory.join(", ")}`
  );
}

if (errors.length > 0) {
  throw new Error(`shadcn parity check failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

console.log(`Validated ${officialComponents.length} official shadcn component entries.`);

async function fetchOfficialComponentSlugs() {
  const response = await fetchWithTimeout(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const slugs = [...html.matchAll(/href="\/docs\/components\/([^"#?]+)"/g)]
    .map((match) => decodeURIComponent(match[1]).split("/").filter(Boolean).at(-1) ?? "")
    .filter(Boolean)
    .filter((slug) => slug !== "components-json" && slug !== "json")
    .sort((a, b) => a.localeCompare(b));
  const uniqueSlugs = [...new Set(slugs)];

  if (uniqueSlugs.length < 50) {
    throw new Error(
      `Expected at least 50 shadcn component links from ${sourceUrl}, got ${uniqueSlugs.length}`
    );
  }

  return uniqueSlugs;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
