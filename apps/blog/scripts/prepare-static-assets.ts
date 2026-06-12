import fs from "node:fs";
import path from "node:path";
import { getBlogPath, getRepoRoot, getSourcePath } from "../lib/paths";

const publicDir = getBlogPath("public");

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

copyDirectory(getSourcePath("img"), path.join(publicDir, "img"));
copyFile(path.join(getRepoRoot(), "themes", "minima", "source", "images", "favicon.png"), path.join(publicDir, "favicon.png"));
copyFile(path.join(getRepoRoot(), "themes", "minima", "source", "images", "thumbnail.jpg"), path.join(publicDir, "thumbnail.jpg"));

const aiLabPublicDir = path.join(publicDir, "ai-coding-lab");
fs.mkdirSync(aiLabPublicDir, { recursive: true });
copyFile(getSourcePath("ai-coding-lab", "catalog.json"), path.join(aiLabPublicDir, "catalog.json"));

function copyDirectory(source: string, target: string) {
  fs.cpSync(source, target, { recursive: true });
}

function copyFile(source: string, target: string) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
