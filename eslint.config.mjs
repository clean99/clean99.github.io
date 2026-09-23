import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".astro/**",
      ".cache/**",
      ".lighthouseci/**",
      ".playwright-mcp/**",
      "coverage/**",
      "data/**",
      "dist/**",
      "lighthouse-reports/**",
      "node_modules/**",
      "openspec/**",
      "output/**",
      "playwright-report/**",
      "public/**",
      "sketches/**",
      "test-results/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{ts,tsx,astro}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // `const { style: _style, ...rest } = props` is the idiom for dropping a
      // key; `_`-prefixed names are deliberate placeholders.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    // Astro templates mix server frontmatter with markup, so browser and node
    // globals both apply; `Astro` itself is a framework global.
    files: ["**/*.astro"],
    languageOptions: {
      globals: {
        Astro: "readonly"
      }
    },
    rules: {
      // Every `<script>` in these pages is bundled and type-checked by Astro.
      "astro/no-set-html-directive": "off"
    }
  },
  {
    // Node scripts: the site build, the social-growth tooling, and plain tests.
    files: ["**/*.mjs", "**/*.cjs", "test/**/*.mjs", "tools/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    },
    rules: {
      // Tools print their own reports and often destructure a key purely to
      // drop it from the copy, so placeholder bindings are intentional.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    files: ["tests/**/*.ts", "test/**/*.mjs"],
    rules: {
      // Fixture-heavy tests narrow with non-null assertions on purpose.
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  }
];
