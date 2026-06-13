import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inventoryPath = path.join(root, "docs/component-inventory.json");
const parityPath = path.join(root, "docs/shadcn-parity.json");
const indexPath = path.join(root, "src/index.ts");
const registryDir = path.join(root, "registry", "components");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const parity = JSON.parse(fs.readFileSync(parityPath, "utf8"));
const indexSource = fs.readFileSync(indexPath, "utf8");
const errors = [];
const seenNames = new Set();
const seenExports = new Set();

for (const component of inventory.components) {
  if (seenNames.has(component.name)) {
    errors.push(`Duplicate component name: ${component.name}`);
  }
  seenNames.add(component.name);

  if (seenExports.has(component.export) && component.status === "implemented") {
    errors.push(`Duplicate implemented export: ${component.export}`);
  }
  seenExports.add(component.export);

  if (component.status !== "implemented") {
    continue;
  }

  if (!component.source) {
    errors.push(`${component.name}: implemented component is missing source`);
  } else {
    const sourcePath = path.join(root, component.source);
    if (!fs.existsSync(sourcePath)) {
      errors.push(`${component.name}: missing source file ${component.source}`);
    } else {
      const source = fs.readFileSync(sourcePath, "utf8");
      if (!source.includes(component.export)) {
        errors.push(`${component.name}: source file does not reference ${component.export}`);
      }
    }
  }

  if (!component.story) {
    errors.push(`${component.name}: implemented component is missing story`);
  } else {
    const storyPath = path.join(root, component.story);
    if (!fs.existsSync(storyPath)) {
      errors.push(`${component.name}: missing story file ${component.story}`);
    } else {
      const story = fs.readFileSync(storyPath, "utf8");
      if (!story.includes(component.export)) {
        errors.push(
          `${component.name}: story file does not render or document ${component.export}`
        );
      }
    }
  }

  if (!indexSource.includes(component.export)) {
    errors.push(`${component.name}: ${component.export} is not exported from src/index.ts`);
  }

  const registrySlug = `liquid-${component.name}`;
  const registryItemPath = path.join(registryDir, `${registrySlug}.json`);
  const registryShimPath = path.join(registryDir, `${registrySlug}.tsx`);
  if (!fs.existsSync(registryItemPath)) {
    errors.push(
      `${component.name}: missing registry item registry/components/${registrySlug}.json`
    );
  }
  if (!fs.existsSync(registryShimPath)) {
    errors.push(`${component.name}: missing registry shim registry/components/${registrySlug}.tsx`);
  }
}

for (const componentName of parity.components) {
  if (!seenNames.has(componentName)) {
    errors.push(`Missing shadcn parity component: ${componentName}`);
  }
}

if (errors.length > 0) {
  throw new Error(
    `Component inventory is invalid:\n${errors.map((error) => `- ${error}`).join("\n")}`
  );
}

const implemented = inventory.components.filter((component) => component.status === "implemented");
console.log(
  `Validated ${implemented.length} implemented components and ${parity.components.length} shadcn parity entries.`
);
