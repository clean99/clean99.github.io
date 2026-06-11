import type { ReactNode } from "react";
import { LiquidProvider, type LiquidMode } from "../src";

export function StoryFrame({
  children,
  mode = "fallback",
  theme = "light",
  width = 760
}: {
  children: ReactNode;
  mode?: LiquidMode;
  theme?: "light" | "dark";
  width?: number;
}) {
  return (
    <LiquidProvider defaultMode={mode} disableOnMobile={false} maxEnhancedSurfaces={12}>
      <div
        data-lg-theme={theme}
        style={{
          minHeight: 280,
          padding: 32,
          color: "var(--lg-text)",
          background:
            theme === "dark"
              ? "linear-gradient(135deg, #0f1115, #1f2937 46%, #111827)"
              : "linear-gradient(135deg, #f7f8fb, #d9ecff 44%, #f8fff6)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div style={{ maxWidth: width }}>{children}</div>
      </div>
    </LiquidProvider>
  );
}

export const longChineseText = "长期笔记：性能、架构、Agent、学习方法与清晰思考";
export const longEnglishText =
  "Reliable frontend systems and AI-assisted engineering workflows";
export const mixedText = "许峰 / Koh Hom · Frontend Systems · AI Agents";
