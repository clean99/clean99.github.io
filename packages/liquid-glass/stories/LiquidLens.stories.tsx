import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidLens, LiquidProvider } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidLens",
  component: LiquidLens,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidLens>;

export default meta;
type Story = StoryObj;

export const KubeReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <div
        data-lg-theme="light"
        style={{
          minHeight: 360,
          padding: 40,
          background:
            "linear-gradient(135deg, #fff, #f5f6f4), repeating-linear-gradient(60deg, rgba(255,255,255,0.82) 0 3px, transparent 3px 18px)",
          color: "#000",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          style={{
            position: "relative",
            width: 706,
            height: 280,
            overflow: "hidden",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10
          }}
        >
          <div style={{ position: "absolute", top: 54, left: 34, width: 354 }}>
            <p
              style={{
                margin: 0,
                color: "#dc2626",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.25em",
                textTransform: "uppercase"
              }}
            >
              Optics Study
            </p>
            <h2
              style={{
                margin: "16px 0 0",
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 0.95
              }}
            >
              Liquid Glass<span style={{ color: "rgba(0,0,0,0.4)" }}>-</span>Precision Lens
            </h2>
          </div>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 108,
              left: 34,
              width: 336,
              height: 7,
              background: "rgba(0,0,0,0.42)"
            }}
          />
          <LiquidLens
            refraction={{
              blur: 0,
              glassThickness: 120,
              bezelWidth: 18,
              refractiveIndex: 1.5,
              specularOpacity: 0.5,
              specularAngle: 0.8
            }}
            style={{ position: "absolute", top: 34, left: 20, zIndex: 3 }}
          />
        </div>
      </div>
    </LiquidProvider>
  )
};

export const DarkRefractionField: Story = {
  render: () => (
    <StoryFrame theme="dark" width={520} height={320}>
      <div style={{ position: "relative", minHeight: 220 }}>
        <LiquidLens style={{ position: "absolute", top: 52, left: 72 }} />
      </div>
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={300}>
      <LiquidLens />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="light" width={520} height={300}>
      <LiquidLens />
    </StoryFrame>
  )
};

export const ReducedMotion: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" width={520} height={300}>
      <LiquidLens data-liquid-reduced-motion="" />
    </StoryFrame>
  )
};
