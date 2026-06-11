import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const styles = fs.readFileSync(path.resolve("src/styles/styles.css"), "utf8");
const tokens = fs.readFileSync(path.resolve("src/styles/tokens.css"), "utf8");

describe("CSS contracts", () => {
  it("defines visible focus, dark mode, and reduced transparency behavior", () => {
    expect(styles).toContain(".lg-surface:focus-visible");
    expect(styles).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(tokens).toContain("@media (prefers-color-scheme: dark)");
  });

  it("exports required design tokens", () => {
    for (const token of [
      "--lg-bg",
      "--lg-bg-2",
      "--lg-text",
      "--lg-text-muted",
      "--lg-surface",
      "--lg-surface-strong",
      "--lg-glass-fill",
      "--lg-glass-fill-strong",
      "--lg-glass-border",
      "--lg-glass-highlight",
      "--lg-glass-edge",
      "--lg-glass-shadow",
      "--lg-accent",
      "--lg-accent-2",
      "--lg-radius-sm",
      "--lg-radius-md",
      "--lg-radius-lg",
      "--lg-radius-xl",
      "--lg-radius-pill",
      "--lg-ease-apple"
    ]) {
      expect(tokens).toContain(token);
    }
  });
});
