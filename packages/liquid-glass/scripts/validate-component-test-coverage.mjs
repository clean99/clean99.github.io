import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, "docs", "component-inventory.json"), "utf8")
);
const testSource = fs.readFileSync(path.join(root, "tests", "components.test.tsx"), "utf8");
const errors = [];

for (const component of inventory.components) {
  if (component.status !== "implemented") {
    continue;
  }

  const exportName = component.export;
  const occurrences = testSource.match(new RegExp(`\\b${escapeRegExp(exportName)}\\b`, "g")) ?? [];

  if (occurrences.length < 2) {
    errors.push(
      `${component.name}: ${exportName} must be imported and exercised in tests/components.test.tsx`
    );
  }
}

if (errors.length > 0) {
  throw new Error(
    `Component test coverage is incomplete:\n${errors.map((error) => `- ${error}`).join("\n")}`
  );
}

console.log(
  `Validated component test coverage for ${inventory.components.filter((component) => component.status === "implemented").length} implemented components.`
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
