import type { ReactNode } from "react";
import { LiquidProvider, type LiquidMode } from "../src";

const fontStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

const sceneBackground = {
  dark: [
    "radial-gradient(circle at 18% 18%, rgba(10, 132, 255, 0.22), transparent 28%)",
    "radial-gradient(circle at 82% 30%, rgba(48, 209, 88, 0.12), transparent 34%)",
    "linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 72px)",
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 72px)",
    "linear-gradient(135deg, #08111d, #101923 52%, #0d1517)"
  ].join(", "),
  light: [
    "radial-gradient(circle at 18% 18%, rgba(10, 132, 255, 0.1), transparent 30%)",
    "radial-gradient(circle at 82% 30%, rgba(48, 209, 88, 0.08), transparent 34%)",
    "linear-gradient(90deg, rgba(15,23,42,0.055) 0 1px, transparent 1px 72px)",
    "linear-gradient(180deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 72px)",
    "linear-gradient(135deg, #fbfcfd, #eef4f4 52%, #f7f8f6)"
  ].join(", ")
};

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
          background: sceneBackground[theme],
          backgroundSize: "auto, auto, 72px 72px, 72px 72px, auto",
          fontFamily: fontStack
        }}
      >
        {field ? (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: -80,
                right: -80,
                top: height * 0.42,
                height: 96,
                opacity: theme === "dark" ? 0.48 : 0.32,
                transform: "rotate(-5deg)"
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "12%",
                  right: "28%",
                  top: 14,
                  height: 14,
                  borderRadius: 999,
                  background:
                    theme === "dark"
                      ? "linear-gradient(90deg, rgba(105,189,255,0.72), rgba(83,215,163,0.72))"
                      : "linear-gradient(90deg, rgba(10,132,255,0.34), rgba(48,209,88,0.34))"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "32%",
                  right: "10%",
                  top: 58,
                  height: 18,
                  borderRadius: 999,
                  background:
                    theme === "dark"
                      ? "linear-gradient(90deg, rgba(255,255,255,0.52), rgba(99,184,255,0.68))"
                      : "linear-gradient(90deg, rgba(15,23,42,0.16), rgba(10,132,255,0.28))"
                }}
              />
            </div>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 28,
                bottom: 28,
                color: theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.16)",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.02em",
                lineHeight: 1,
                opacity: 0.8,
                transform: "rotate(-7deg)",
                whiteSpace: "nowrap"
              }}
            >
              REFRACTION FIELD
            </div>
          </>
        ) : null}
        <div style={{ position: "relative", zIndex: 1, maxWidth: width, margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </LiquidProvider>
  );
}

export const longChineseText = "长期笔记：性能、架构、Agent、学习方法与清晰思考";
export const longEnglishText =
  "Reliable frontend systems and AI-assisted engineering workflows";
export const mixedText = "许峰 / Koh Hom · Frontend Systems · AI Agents";
