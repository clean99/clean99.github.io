import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const required = ["index.js", "index.cjs", "index.d.ts", "styles.css", "tokens.css"];

for (const file of required) {
  const target = path.join(dist, file);
  if (!fs.existsSync(target)) {
    throw new Error(`Missing package output: ${target}`);
  }
}

console.log(`Validated ${required.length} package outputs.`);
