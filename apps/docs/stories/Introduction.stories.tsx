import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidButton,
  LiquidCard,
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
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={3}>
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
          <LiquidNav aria-label="Component library navigation" intensity="medium">
            <span style={{ padding: "0 0.75rem", color: "var(--lg-text-muted)" }}>
              Chrome enhanced
            </span>
            <LiquidButton>Surface</LiquidButton>
            <LiquidButton>Button</LiquidButton>
            <LiquidButton>Nav</LiquidButton>
            <LiquidButton>Toggle</LiquidButton>
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
              <p style={{ maxWidth: 640, color: "var(--lg-text-muted)", fontSize: "1.1rem", lineHeight: 1.65 }}>
                Enhanced mode uses SVG displacement maps through @hashintel/refractive. Text stays in
                a clean content layer while the surface bends the high-contrast field behind it.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <LiquidButton intensity="medium" mode="fallback">Read Writing</LiquidButton>
                <LiquidButton intensity="medium" mode="fallback">View Projects</LiquidButton>
                <LiquidButton intensity="medium" mode="fallback">Explore AI Lab</LiquidButton>
              </div>
            </div>
            <LiquidCard intensity="strong">
              <article style={{ display: "grid", gap: 14 }}>
                <strong style={{ color: "var(--lg-accent-2)", textTransform: "uppercase" }}>
                  Acceptance sample
                </strong>
                <h2 style={{ margin: 0, fontSize: "1.8rem" }}>You should see bent grid lines.</h2>
                <p style={{ margin: 0, color: "var(--lg-text-muted)", lineHeight: 1.6 }}>
                  If this looks like a white translucent rectangle, the component is failing the
                  Liquid Glass target.
                </p>
              </article>
            </LiquidCard>
          </section>
        </div>
      </main>
    </LiquidProvider>
  )
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
