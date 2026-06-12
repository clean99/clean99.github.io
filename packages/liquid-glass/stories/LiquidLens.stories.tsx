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
            "linear-gradient(90deg, rgba(15,23,42,0.055) 0 1px, transparent 1px 48px), linear-gradient(180deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 48px), linear-gradient(135deg, #fff, #f5f6f4)",
          backgroundSize: "48px 48px, 48px 48px, auto",
          color: "#000",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          data-lg-reference-frame="magnifying-glass"
          style={{
            position: "relative",
            width: 706,
            height: 460,
            boxSizing: "border-box",
            overflow: "hidden",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 12
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 34,
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#dc2626",
                height: 22
              }}
            >
              <span style={{ width: 40, height: 2, background: "currentColor" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.25em",
                  lineHeight: "22px",
                  textTransform: "uppercase"
                }}
              >
                Optics Study
              </span>
            </div>
            <h3
              style={{
                position: "absolute",
                top: 81,
                left: 34,
                width: 354,
                margin: 0,
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 0.95
              }}
            >
              Liquid&nbsp;Glass<span style={{ color: "rgba(0,0,0,0.4)" }}>—</span>
              Precision&nbsp;Lens
            </h3>
          </div>
          <LiquidLens
            refraction={{
              blur: 0,
              glassThickness: 88,
              bezelWidth: 18,
              refractiveIndex: 1.5,
              specularOpacity: 0.5,
              specularAngle: 0.8
            }}
            style={{ position: "absolute", top: 36, left: 20, zIndex: 3 }}
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
