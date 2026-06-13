import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidButton,
  LiquidLens,
  LiquidNav,
  LiquidProvider,
  liquidPackageName
} from "@clean99/liquid-glass";

const meta = {
  title: "Liquid Glass/Introduction",
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" }
  },
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={8}>
      <main
        data-lg-theme="dark"
        style={{
          position: "relative",
          minHeight: "100vh",
          overflow: "hidden",
          padding: 42,
          color: "var(--lg-text)",
          background: [
            "radial-gradient(circle at 16% 14%, rgba(10,132,255,0.38), transparent 25%)",
            "radial-gradient(circle at 86% 12%, rgba(48,209,88,0.24), transparent 28%)",
            "linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 64px)",
            "linear-gradient(180deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 64px)",
            "linear-gradient(135deg, #08111d, #14202c)"
          ].join(", "),
          backgroundSize: "auto, auto, 64px 64px, 64px 64px, auto",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "18% -10% auto",
            color: "rgba(255,255,255,0.12)",
            fontSize: "5.8rem",
            fontWeight: 900,
            lineHeight: 0.95,
            whiteSpace: "nowrap",
            transform: "rotate(-7deg)"
          }}
        >
          REFRACTION FIELD · LIQUID GLASS · KOH HOM ·
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 54 }}>
          <LiquidNav aria-label="Component library navigation" intensity="strong">
            <span
              style={{
                padding: "0 0.75rem",
                color: "rgba(255,255,255,0.68)",
                textShadow: "0 1px 3px rgba(0,0,0,0.62)"
              }}
            >
              Chrome enhanced
            </span>
            <LiquidButton aria-current="page" mode="off">
              Surface
            </LiquidButton>
            <LiquidButton mode="off">Button</LiquidButton>
            <LiquidButton mode="off">Nav</LiquidButton>
            <LiquidButton mode="off">Toggle</LiquidButton>
          </LiquidNav>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 420px)",
              gap: 28,
              alignItems: "stretch",
              maxWidth: 1100,
              margin: "0 auto"
            }}
          >
            <div style={{ alignSelf: "center" }}>
              <p style={{ color: "var(--lg-text-muted)", margin: 0 }}>{liquidPackageName}</p>
              <h1 style={{ margin: "10px 0 16px", fontSize: "4.2rem", lineHeight: 0.95 }}>
                Refractive Liquid Glass for React
              </h1>
              <p
                style={{
                  maxWidth: 640,
                  color: "var(--lg-text-muted)",
                  fontSize: "1.1rem",
                  lineHeight: 1.65
                }}
              >
                Enhanced mode uses SVG displacement maps through @hashintel/refractive. Text stays
                in a clean content layer while the surface bends the high-contrast field behind it.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <LiquidButton intensity="medium" mode="fallback">
                  Read Writing
                </LiquidButton>
                <LiquidButton intensity="medium" mode="fallback">
                  View Projects
                </LiquidButton>
                <LiquidButton intensity="medium" mode="fallback">
                  Explore AI Lab
                </LiquidButton>
              </div>
            </div>
            <div
              aria-label="Liquid Glass physical acceptance sample"
              role="img"
              style={{
                position: "relative",
                minHeight: 420,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 14,
                background: [
                  "linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 44px)",
                  "linear-gradient(180deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 44px)",
                  "linear-gradient(135deg, rgba(10,132,255,0.18), rgba(48,209,88,0.16))",
                  "linear-gradient(135deg, #0b1724, #111b22)"
                ].join(", "),
                backgroundSize: "44px 44px, 44px 44px, auto, auto"
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -24,
                  top: 86,
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 58,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  transform: "rotate(-7deg)",
                  whiteSpace: "nowrap"
                }}
              >
                REFRACTION FIELD · LIQUID GLASS
              </div>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -18,
                  right: 32,
                  top: 234,
                  height: 16,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #65b8ff, #56d6a8)",
                  transform: "rotate(-7deg)"
                }}
              />
              <LiquidLens
                refraction={{
                  blur: 0,
                  glassThickness: 120,
                  bezelWidth: 18,
                  refractiveIndex: 1.5,
                  specularOpacity: 0.5
                }}
                style={{ position: "absolute", left: 36, top: 60, zIndex: 2 }}
              />
              <article
                style={{
                  position: "absolute",
                  right: 30,
                  bottom: 30,
                  width: 292,
                  color: "rgba(255,255,255,0.92)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.58)"
                }}
              >
                <strong style={{ color: "#32d96b", textTransform: "uppercase" }}>
                  Acceptance sample
                </strong>
                <h2 style={{ margin: "14px 0 12px", fontSize: "1.8rem", lineHeight: 1.1 }}>
                  Edges bend the field. Text stays crisp.
                </h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.68)", lineHeight: 1.55 }}>
                  The glass layer displaces the background only. Foreground copy remains outside the
                  filter.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </LiquidProvider>
  )
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
