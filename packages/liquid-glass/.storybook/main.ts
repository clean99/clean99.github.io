import type { StorybookConfig } from "@storybook/nextjs-vite";
import type { Plugin, UserConfig } from "vite";

function stripStorybookClientDirectives(): Plugin {
  return {
    name: "liquid-glass-storybook-client-directives",
    enforce: "pre",
    transform(code, id) {
      const isModule = /\.[cm]?[jt]sx?(?:\?.*)?$/.test(id);
      const isLocalSource = id.includes("/src/");
      const isKnownClientDependency = id.includes("/react-resizable-panels/");

      if (!isModule || (!isLocalSource && !isKnownClientDependency)) {
        return null;
      }

      const nextCode = code.replace(/^(?:\s*["']use client["'];\s*)+/, "");
      if (nextCode === code) {
        return null;
      }

      return {
        code: nextCode,
        map: null
      };
    }
  };
}

function suppressUseClientDirectiveWarnings(config: UserConfig): UserConfig {
  const previousOnWarn = config.build?.rollupOptions?.onwarn;

  return {
    ...config,
    plugins: [...(config.plugins ?? []), stripStorybookClientDirectives()],
    build: {
      ...config.build,
      rollupOptions: {
        ...config.build?.rollupOptions,
        onwarn(warning, warn) {
          if (
            warning.code === "MODULE_LEVEL_DIRECTIVE" &&
            warning.message.includes('"use client"')
          ) {
            return;
          }

          if (previousOnWarn) {
            previousOnWarn(warning, warn);
            return;
          }

          warn(warning);
        }
      }
    }
  };
}

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {}
  },
  staticDirs: [],
  viteFinal(config) {
    return suppressUseClientDirectiveWarnings(config);
  }
};

export default config;
