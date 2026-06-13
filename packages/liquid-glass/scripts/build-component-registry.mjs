import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();
const check = process.argv.includes("--check");
const registryDir = path.join(root, "registry", "components");
const inventoryPath = path.join(root, "docs", "component-inventory.json");
const rootRegistryPath = path.join(root, "registry.json");
const schema = "https://ui.shadcn.com/schema/registry-item.json";
const registrySchema = "https://ui.shadcn.com/schema/registry.json";
const packageName = "@clean99/liquid-glass";
const prettierConfig = (await prettier.resolveConfig(path.join(root, "registry.json"))) ?? {};
const cssVars = {
  theme: {
    "lg-bg": "var(--lg-bg)",
    "lg-text": "var(--lg-text)",
    "lg-glass-fill": "var(--lg-glass-fill)",
    "lg-glass-border": "var(--lg-glass-border)",
    "lg-accent": "var(--lg-accent)"
  }
};

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const implemented = inventory.components.filter((component) => component.status === "implemented");
const expectedFiles = new Map();
const rootItems = [
  {
    name: "liquid-glass",
    type: "registry:ui",
    title: "Liquid Glass",
    description: "Refractive Liquid Glass React components with accessible fallbacks.",
    files: [
      {
        path: "liquid-glass.json",
        type: "registry:ui"
      }
    ]
  }
];

for (const component of implemented) {
  const slug = `liquid-${component.name}`;
  const itemPath = path.join(registryDir, `${slug}.json`);
  const shimPath = path.join(registryDir, `${slug}.tsx`);
  const itemRelativePath = path.relative(root, itemPath).replaceAll(path.sep, "/");
  const shimRelativePath = path.relative(root, shimPath).replaceAll(path.sep, "/");

  const item = {
    $schema: schema,
    name: slug,
    type: "registry:ui",
    title: splitExportName(component.export),
    description: `${component.export} package-backed registry entry for ${packageName}.`,
    dependencies: [packageName],
    devDependencies: [],
    registryDependencies: ["liquid-glass"],
    cssVars,
    files: [
      {
        path: shimRelativePath,
        type: "registry:ui",
        target: `components/liquid-glass/${slug}.tsx`
      }
    ],
    meta: {
      category: component.category,
      source: component.source,
      story: component.story,
      export: component.export
    }
  };

  const shim = `export { ${component.export} } from "${packageName}";\n`;
  expectedFiles.set(itemPath, await formatJson(item, itemPath));
  expectedFiles.set(shimPath, shim);

  rootItems.push({
    name: slug,
    type: "registry:ui",
    title: splitExportName(component.export),
    description: `${component.export} package-backed registry item.`,
    files: [
      {
        path: itemRelativePath,
        type: "registry:ui"
      }
    ]
  });
}

const rootRegistry = {
  $schema: registrySchema,
  name: "clean99-liquid-glass",
  homepage: "https://github.com/clean99/liquid-glass",
  items: rootItems
};

expectedFiles.set(rootRegistryPath, await formatJson(rootRegistry, rootRegistryPath));

if (check) {
  const errors = [];
  for (const [filePath, expected] of expectedFiles) {
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing generated registry file: ${path.relative(root, filePath)}`);
      continue;
    }
    const actual = fs.readFileSync(filePath, "utf8");
    if (actual !== expected) {
      errors.push(`Outdated generated registry file: ${path.relative(root, filePath)}`);
    }
  }

  if (fs.existsSync(registryDir)) {
    for (const file of fs.readdirSync(registryDir)) {
      const fullPath = path.join(registryDir, file);
      if (!expectedFiles.has(fullPath)) {
        errors.push(`Stale generated registry file: ${path.relative(root, fullPath)}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Component registry is out of date:\n${errors.map((error) => `- ${error}`).join("\n")}`
    );
  }

  console.log(`Validated ${implemented.length} generated component registry items.`);
  process.exit(0);
}

fs.mkdirSync(registryDir, { recursive: true });

if (fs.existsSync(registryDir)) {
  for (const file of fs.readdirSync(registryDir)) {
    const fullPath = path.join(registryDir, file);
    if (!expectedFiles.has(fullPath)) {
      fs.rmSync(fullPath);
    }
  }
}

for (const [filePath, content] of expectedFiles) {
  fs.writeFileSync(filePath, content);
}

console.log(`Generated ${implemented.length} component registry items.`);

function splitExportName(exportName) {
  return exportName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

async function formatJson(value, filePath) {
  return prettier.format(JSON.stringify(value), { ...prettierConfig, filepath: filePath });
}
