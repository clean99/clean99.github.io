import type { ReactNode } from "react";
import { LiquidProvider, type LiquidMode } from "../src";

export function StoryFrame({
  children,
  mode = "enhanced",
  theme = "dark",
  width = 760,
  height = 440,
  field = true
}: {
  children: ReactNode;
  mode?: LiquidMode;
  theme?: "light" | "dark";
  width?: number;
  height?: number;
  field?: boolean;
}) {
  return (
    <LiquidProvider defaultMode={mode} disableOnMobile={false} maxEnhancedSurfaces={24}>
      <div
        data-lg-theme={theme}
        style={{
          position: "relative",
          minHeight: height,
          overflow: "hidden",
          padding: 32,
          color: "var(--lg-text)",
          background:
            theme === "dark"
              ? [
                  "radial-gradient(circle at 18% 16%, rgba(10, 132, 255, 0.34), transparent 27%)",
                  "radial-gradient(circle at 82% 18%, rgba(48, 209, 88, 0.22), transparent 30%)",
                  "linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 64px)",
                  "linear-gradient(180deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 64px)",
                  "linear-gradient(135deg, #08111d, #14202c)"
                ].join(", ")
              : [
                  "radial-gradient(circle at 18% 16%, rgba(10, 132, 255, 0.22), transparent 27%)",
                  "radial-gradient(circle at 82% 18%, rgba(48, 209, 88, 0.18), transparent 30%)",
                  "linear-gradient(90deg, rgba(12,20,30,0.18) 0 1px, transparent 1px 64px)",
                  "linear-gradient(180deg, rgba(12,20,30,0.14) 0 1px, transparent 1px 64px)",
                  "linear-gradient(135deg, #f4f8fb, #dbe8ef)"
                ].join(", "),
          backgroundSize: "auto, auto, 64px 64px, 64px 64px, auto",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        {field ? (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 88,
                left: -28,
                right: -28,
                display: "grid",
                gap: 14,
                transform: "rotate(-7deg)",
                opacity: theme === "dark" ? 0.82 : 0.74
              }}
            >
              {["REFRACTION FIELD", "KOH HOM FRONTEND SYSTEMS", "AI AGENTS PERFORMANCE"].map(
                (label, index) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      color:
                        theme === "dark" ? "rgba(255,255,255,0.58)" : "rgba(8,18,30,0.56)",
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span>{label}</span>
                    <span
                      style={{
                        flex: 1,
                        height: index === 1 ? 18 : 12,
                        minWidth: 220,
                        borderRadius: 999,
                        background:
                          index === 1
                            ? "linear-gradient(90deg, #ffffff 0 13%, transparent 13% 19%, #63b8ff 19% 38%, transparent 38% 44%, #56e2a7 44% 72%, transparent 72% 78%, #ffffff 78% 100%)"
                            : "linear-gradient(90deg, #63b8ff, #56e2a7, #ffffff)"
                      }}
                    />
                  </div>
                )
              )}
            </div>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 42,
                bottom: 28,
                width: 220,
                height: 220,
                border:
                  theme === "dark"
                    ? "2px solid rgba(255,255,255,0.22)"
                    : "2px solid rgba(8,18,30,0.2)",
                borderRadius: 999,
                boxShadow:
                  theme === "dark"
                    ? "0 0 0 42px rgba(255,255,255,0.045), inset 0 0 0 34px rgba(99,184,255,0.11)"
                    : "0 0 0 42px rgba(8,18,30,0.045), inset 0 0 0 34px rgba(10,132,255,0.1)"
              }}
            />
          </>
        ) : null}
        <div style={{ position: "relative", zIndex: 1, maxWidth: width }}>{children}</div>
      </div>
    </LiquidProvider>
  );
}

export const longChineseText = "长期笔记：性能、架构、Agent、学习方法与清晰思考";
export const longEnglishText =
  "Reliable frontend systems and AI-assisted engineering workflows";
export const mixedText = "许峰 / Koh Hom · Frontend Systems · AI Agents";
