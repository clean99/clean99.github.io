import type { ReactNode } from "react";
import { LiquidProvider, type LiquidMode } from "../src";

const fontStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

const sceneBackground = {
  dark: [
    "radial-gradient(circle at 18% 18%, rgba(10, 132, 255, 0.22), transparent 28%)",
    "radial-gradient(circle at 82% 30%, rgba(48, 209, 88, 0.12), transparent 34%)",
    "linear-gradient(90deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 72px)",
    "linear-gradient(180deg, rgba(255,255,255,0.048) 0 1px, transparent 1px 72px)",
    "linear-gradient(135deg, #08111d, #101923 52%, #0d1517)"
  ].join(", "),
  light: [
    "radial-gradient(circle at 18% 18%, rgba(10, 132, 255, 0.1), transparent 30%)",
    "radial-gradient(circle at 82% 30%, rgba(48, 209, 88, 0.08), transparent 34%)",
    "linear-gradient(90deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 72px)",
    "linear-gradient(180deg, rgba(15,23,42,0.038) 0 1px, transparent 1px 72px)",
    "linear-gradient(135deg, #fbfcfd, #eef4f4 52%, #f7f8f6)"
  ].join(", ")
};

export const localOpticsImage =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 588 786">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#d9edf1"/>
      <stop offset="0.34" stop-color="#f1f4ef"/>
      <stop offset="0.58" stop-color="#ef6550"/>
      <stop offset="1" stop-color="#718f78"/>
    </linearGradient>
    <linearGradient id="stem" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#571a22"/>
      <stop offset="0.52" stop-color="#df3346"/>
      <stop offset="1" stop-color="#7b1d25"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <rect width="588" height="786" fill="url(#bg)"/>
  <g opacity="0.48" filter="url(#soft)">
    <rect x="18" y="0" width="160" height="786" fill="#f7fbfb"/>
    <rect x="386" y="0" width="70" height="786" fill="#9fb0a4"/>
    <rect x="510" y="0" width="110" height="786" fill="#637768"/>
  </g>
  <path d="M175 118 C226 184 246 312 231 454 C218 585 180 696 136 771 L80 771 C118 657 137 544 136 420 C134 286 143 182 175 118 Z" fill="url(#stem)"/>
  <path d="M180 102 C224 155 246 241 238 329 C204 291 172 247 153 198 C151 159 160 126 180 102 Z" fill="#d8d0b0"/>
  <path d="M201 142 C188 192 191 253 236 317" fill="none" stroke="#7c2f27" stroke-width="6" opacity="0.55"/>
  <g transform="translate(258 196) rotate(18)">
    <ellipse cx="76" cy="118" rx="78" ry="116" fill="#44a99f"/>
    <path d="M20 70 C58 18 122 10 164 54 C120 48 70 57 20 70 Z" fill="#77d2cc" opacity="0.8"/>
    <path d="M35 183 C82 217 141 201 168 150" fill="none" stroke="#145c5d" stroke-width="10" stroke-linecap="round" opacity="0.52"/>
    <ellipse cx="42" cy="80" rx="22" ry="26" fill="#f7f8e7"/>
    <ellipse cx="128" cy="68" rx="22" ry="26" fill="#f7f8e7"/>
    <circle cx="42" cy="80" r="11" fill="#f9c21f"/>
    <circle cx="128" cy="68" r="11" fill="#f9c21f"/>
    <circle cx="45" cy="78" r="6" fill="#20252a"/>
    <circle cx="131" cy="66" r="6" fill="#20252a"/>
    <path d="M70 94 C98 113 121 131 132 162 C100 154 74 133 70 94 Z" fill="#f0aa23"/>
  </g>
  <g fill="none" stroke="#f6a51f" stroke-width="19" stroke-linecap="round" opacity="0.96">
    <path d="M263 298 C220 318 188 354 169 402"/>
    <path d="M345 360 C371 407 377 459 360 520"/>
    <path d="M286 488 C261 539 225 574 177 598"/>
  </g>
  <g opacity="0.3" fill="#ffffff">
    <circle cx="98" cy="122" r="58"/>
    <circle cx="436" cy="154" r="86"/>
  </g>
</svg>`);

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
                top: height * 0.62,
                height: 104,
                opacity: theme === "dark" ? 0.38 : 0.22,
                transform: "rotate(-4deg)"
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "16%",
                  right: "18%",
                  top: 14,
                  height: 12,
                  borderRadius: 999,
                  background:
                    theme === "dark"
                      ? "linear-gradient(90deg, rgba(105,189,255,0.64), rgba(83,215,163,0.54))"
                      : "linear-gradient(90deg, rgba(10,132,255,0.25), rgba(48,209,88,0.22))"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "24%",
                  right: "12%",
                  top: 58,
                  height: 14,
                  borderRadius: 999,
                  background:
                    theme === "dark"
                      ? "linear-gradient(90deg, rgba(255,255,255,0.42), rgba(99,184,255,0.52))"
                      : "linear-gradient(90deg, rgba(15,23,42,0.12), rgba(10,132,255,0.2))"
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
export const longEnglishText = "Reliable frontend systems and AI-assisted engineering workflows";
export const mixedText = "许峰 / Koh Hom · Frontend Systems · AI Agents";
