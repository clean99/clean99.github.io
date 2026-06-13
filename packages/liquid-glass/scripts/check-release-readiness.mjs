import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function mustExist(relativePath) {
  if (!exists(relativePath)) {
    errors.push(`Missing required release file: ${relativePath}`);
  }
}

function mustInclude(relativePath, snippet) {
  if (!exists(relativePath)) {
    errors.push(`Missing required release file: ${relativePath}`);
    return;
  }

  if (!read(relativePath).includes(snippet)) {
    errors.push(`${relativePath} must include ${JSON.stringify(snippet)}`);
  }
}

function mustScript(packageJson, name, snippets = []) {
  const script = packageJson.scripts?.[name];
  if (!script) {
    errors.push(`package.json is missing script ${name}`);
    return;
  }

  for (const snippet of snippets) {
    if (!script.includes(snippet)) {
      errors.push(`package.json script ${name} must include ${JSON.stringify(snippet)}`);
    }
  }
}

const packageJson = readJson("package.json");
const changesetConfig = readJson(".changeset/config.json");
const isStandaloneRepository = exists(".github");

if (packageJson.name !== "@clean99/liquid-glass") {
  errors.push("package.json name must stay @clean99/liquid-glass");
}
if (packageJson.private === true) {
  errors.push("package.json must not be private for the open-source package");
}
if (packageJson.publishConfig?.access !== "public") {
  errors.push("package.json publishConfig.access must be public");
}
if (!packageJson.repository?.url?.includes("github.com/clean99/liquid-glass")) {
  errors.push("package.json repository must point at clean99/liquid-glass");
}
if (packageJson.license !== "MIT") {
  errors.push("package.json license must be MIT");
}

for (const script of [
  "build",
  "format",
  "lint",
  "typecheck",
  "test:docs",
  "test:inventory",
  "test:registry",
  "test:shadcn-parity",
  "test:unit",
  "test:components",
  "test:physics",
  "test:storybook",
  "test:e2e",
  "test:a11y",
  "test:visual",
  "test:kube-reference",
  "test:kube-reference:strict",
  "test:release-readiness",
  "test:package",
  "ci",
  "verify",
  "release"
]) {
  mustScript(packageJson, script);
}

mustScript(packageJson, "test:release-readiness", ["scripts/check-release-readiness.mjs"]);
mustScript(packageJson, "test:kube-reference:strict", ["KUBE_STRICT_INTERACTIVE=1"]);
mustScript(packageJson, "test:a11y", ["verify-storybook-a11y.mjs"]);
mustScript(packageJson, "test:e2e", ["verify-liquid-behavior.mjs"]);
mustScript(packageJson, "test:storybook", ["verify-enhanced-storybook.mjs"]);
mustScript(packageJson, "test:package", ["tests/package-exports.mjs"]);
mustScript(packageJson, "ci", ["pnpm test:release-readiness"]);
mustScript(packageJson, "verify", [
  "pnpm run ci",
  "pnpm test:visual",
  "pnpm test:kube-reference:strict",
  "pnpm pack --dry-run"
]);
mustScript(packageJson, "release", ["pnpm changeset publish"]);

if (changesetConfig.access !== "public") {
  errors.push(".changeset/config.json access must be public");
}
if (changesetConfig.baseBranch !== "main") {
  errors.push(".changeset/config.json baseBranch must be main");
}

const packageRequiredFiles = [
  "README.md",
  "LICENSE",
  "ATTRIBUTIONS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "docs/open-source-release.md",
  "docs/testing.md",
  "docs/component-inventory.md",
  "examples/README.md",
  "registry.json",
  "liquid-glass.json"
];

const standaloneRequiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/visual.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/release.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/dependabot.yml",
  ".github/CODEOWNERS"
];

for (const file of packageRequiredFiles) {
  mustExist(file);
}

if (isStandaloneRepository) {
  for (const file of standaloneRequiredFiles) {
    mustExist(file);
  }
}

if (isStandaloneRepository) {
  mustInclude(".github/workflows/ci.yml", "pnpm test:release-readiness");
  mustInclude(".github/workflows/ci.yml", "pnpm test:a11y");
  mustInclude(".github/workflows/ci.yml", "pnpm test:e2e");
  mustInclude(".github/workflows/visual.yml", "pnpm test:kube-reference");
  mustInclude(".github/workflows/release.yml", "pnpm verify");
  mustInclude(".github/workflows/release.yml", "NPM_TOKEN");
  mustInclude(".github/workflows/pages.yml", "actions/deploy-pages");
}
mustInclude("docs/open-source-release.md", "pnpm test:release-readiness");
mustInclude("docs/open-source-release.md", "pnpm test:kube-reference:strict");
mustInclude("docs/open-source-release.md", "pnpm pack --dry-run");

if (errors.length > 0) {
  throw new Error(
    `Release readiness check failed:\n${errors.map((error) => `- ${error}`).join("\n")}`
  );
}

console.log("Validated release readiness gates, workflows, docs, registry, and publish metadata.");
