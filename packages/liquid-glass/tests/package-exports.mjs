import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const requiredDistFiles = ["index.js", "index.cjs", "index.d.ts", "styles.css", "tokens.css"];
const errors = [];

for (const file of requiredDistFiles) {
  const target = path.join(dist, file);
  if (!fs.existsSync(target)) {
    errors.push(`Missing package output: ${target}`);
  }
}

expectEqual(packageJson.name, "@clean99/liquid-glass", "package name");
expectEqual(
  packageJson.description,
  "Refractive Liquid Glass components for React, built on @hashintel/refractive with accessible fallbacks.",
  "package description"
);
expectEqual(packageJson.license, "MIT", "license");
expectEqual(packageJson.type, "module", "module type");
expectEqual(packageJson.main, "./dist/index.cjs", "main entry");
expectEqual(packageJson.module, "./dist/index.js", "module entry");
expectEqual(packageJson.types, "./dist/index.d.ts", "types entry");
expectEqual(packageJson.publishConfig?.access, "public", "publish access");

expectEqual(packageJson.exports?.["."]?.types, "./dist/index.d.ts", "root types export");
expectEqual(packageJson.exports?.["."]?.import, "./dist/index.js", "root import export");
expectEqual(packageJson.exports?.["."]?.require, "./dist/index.cjs", "root require export");
expectEqual(packageJson.exports?.["./styles.css"], "./dist/styles.css", "styles export");
expectEqual(packageJson.exports?.["./tokens.css"], "./dist/tokens.css", "tokens export");

expectIncludes(packageJson.sideEffects, "**/*.css", "sideEffects");
expectIncludes(packageJson.files, "dist", "package files");
expectIncludes(packageJson.files, "docs", "package files");
expectIncludes(packageJson.files, "examples", "package files");
expectIncludes(packageJson.files, "registry", "package files");
expectIncludes(packageJson.files, "liquid-glass.json", "package files");
expectIncludes(packageJson.files, "registry.json", "package files");
expectIncludes(packageJson.files, "schema", "package files");
expectIncludes(packageJson.files, "README.md", "package files");
expectIncludes(packageJson.files, "LICENSE", "package files");
expectIncludes(packageJson.files, "ATTRIBUTIONS.md", "package files");

expectPeer(packageJson, "react", "^19.0.0");
expectPeer(packageJson, "react-dom", "^19.0.0");
expectDependency(packageJson, "@hashintel/refractive");

expectFileIncludes("dist/index.d.ts", [
  "LiquidSurface",
  "LiquidProvider",
  "RefractiveOptions",
  "LiquidMode"
]);
expectFileIncludes("dist/styles.css", ["--lg-glass-fill", ".lg-surface"]);
expectFileIncludes("dist/tokens.css", ["--lg-bg", "--lg-radius-pill"]);

if (errors.length > 0) {
  throw new Error(`Package contract failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

console.log(
  `Validated package exports, metadata, dependencies, and ${requiredDistFiles.length} outputs.`
);

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    errors.push(`${label}: missing ${JSON.stringify(expected)}`);
  }
}

function expectPeer(manifest, name, expectedRange) {
  expectEqual(manifest.peerDependencies?.[name], expectedRange, `peer dependency ${name}`);
}

function expectDependency(manifest, name) {
  if (!manifest.dependencies?.[name]) {
    errors.push(`dependency ${name}: missing`);
  }
}

function expectFileIncludes(relativePath, snippets) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) {
    errors.push(`${relativePath}: missing`);
    return;
  }

  const source = fs.readFileSync(target, "utf8");
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      errors.push(`${relativePath}: missing ${JSON.stringify(snippet)}`);
    }
  }
}
