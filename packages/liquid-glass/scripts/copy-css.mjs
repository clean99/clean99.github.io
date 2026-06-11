import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, "src/styles/tokens.css"), path.join(dist, "tokens.css"));
fs.copyFileSync(path.join(root, "src/styles/styles.css"), path.join(dist, "styles.css"));
