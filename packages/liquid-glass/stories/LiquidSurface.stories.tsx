import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidLens, LiquidProvider, LiquidSearchBox, LiquidSurface } from "../src";
import { longChineseText, longEnglishText, mixedText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSurface",
  component: LiquidSurface,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSurface>;

export default meta;
type Story = StoryObj;

export const KubeAlignedEnhanced: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={8}>
      <div
        data-lg-theme="light"
        style={{
          position: "relative",
          minHeight: 640,
          overflow: "hidden",
          padding: "72px 0",
          color: "#131316",
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.05) 0 1px, transparent 1px 48px), linear-gradient(180deg, rgba(15,23,42,0.04) 0 1px, transparent 1px 48px), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,245,243,0.94))",
          backgroundSize: "48px 48px, 48px 48px, auto",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          style={{
            width: 706,
            margin: "0 auto",
            display: "grid",
            gap: 24
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              width: 706,
              height: 460,
              background: "#fff",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: 10
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 33,
                  left: 33,
                  width: 354,
                  height: 393,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  paddingTop: 12,
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: "#dc2626"
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 30,
                      height: 1,
                      background: "currentColor",
                      opacity: 0.55
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase"
                    }}
                  >
                    Optics Study
                  </span>
                </div>
                <h2
                  style={{
                    margin: "16px 0 0",
                    color: "#000",
                    fontSize: 54,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 0.95
                  }}
                >
                  Liquid Glass
                  <span style={{ color: "rgba(0,0,0,0.4)" }}>—</span>
                  Precision Lens
                </h2>
                <div
                  style={{
                    marginTop: 18,
                    color: "rgba(0,0,0,0.7)",
                    display: "grid",
                    gap: 12,
                    fontSize: 16,
                    lineHeight: 1.55
                  }}
                >
                  <p style={{ margin: 0 }}>Drag the capsule to bend the page.</p>
                  <p style={{ margin: 0 }}>
                    The rounded bezel pushes pixels along the edge and leaves the content layer
                    crisp.
                  </p>
                  <p style={{ margin: 0, color: "rgba(0,0,0,0.6)" }}>
                    Strong edges make the bend snap.
                  </p>
                </div>
              </div>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 33,
                  left: 419,
                  width: 294,
                  height: 393,
                  overflow: "hidden",
                  borderRadius: 7,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.1)"
                }}
              >
                <img
                  alt=""
                  src="https://images.unsplash.com/photo-1579380656108-f98e4df8ea62?q=80&w=800&auto=format&fit=crop"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: 6,
                    color: "rgba(117, 107, 154, 0.72)",
                    fontSize: 9,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase"
                  }}
                >
                  Photo: Stephanie LeBlanc / Unsplash
                </span>
              </div>
            </div>
            <LiquidLens
              aria-hidden="true"
              refraction={{
                blur: 0,
                glassThickness: 120,
                bezelWidth: 18,
                refractiveIndex: 1.5,
                radius: 75,
                specularOpacity: 0.5,
                specularAngle: 0.8
              }}
              style={{
                position: "absolute",
                top: 34,
                left: 20,
                width: 210,
                height: 120,
                padding: 0,
                background: "transparent",
                borderRadius: 75,
                boxShadow:
                  "0 4px 9px rgba(0, 0, 0, 0.16), inset 0 2px 24px rgba(0, 0, 0, 0.2), inset 0 -2px 24px rgba(255, 255, 255, 0.2)",
                zIndex: 5
              }}
            />
          </div>
        </div>
      </div>
    </LiquidProvider>
  )
};

export const KubeSearchboxEnhanced: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={8}>
      <div
        data-lg-theme="light"
        style={{
          position: "relative",
          minHeight: 460,
          overflow: "hidden",
          padding: "72px 0",
          color: "#131316",
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.05) 0 1px, transparent 1px 48px), linear-gradient(180deg, rgba(15,23,42,0.04) 0 1px, transparent 1px 48px), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,245,243,0.94))",
          backgroundSize: "48px 48px, 48px 48px, auto",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          style={{
            position: "relative",
            width: 706,
            height: 312,
            margin: "0 auto",
            overflow: "hidden",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: 10,
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(180deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(135deg, #f8fafc, #e7eeef)",
            backgroundSize: "32px 32px, 32px 32px, auto"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)"
            }}
          >
            <LiquidSearchBox
              aria-label="Search"
              surfaceProps={{
                refraction: {
                  blur: 1,
                  glassThickness: 84,
                  bezelWidth: 12,
                  refractiveIndex: 1.42,
                  radius: 28,
                  specularOpacity: 0.2
                },
                style: {
                  width: 336,
                  height: 45,
                  padding: "0 20px",
                  color: "rgba(0,0,0,0.7)",
                  borderRadius: 28,
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.16)"
                }
              }}
            />
          </div>
        </div>
      </div>
    </LiquidProvider>
  )
};

export const LightFallback: Story = {
  render: () => (
    <StoryFrame mode="fallback">
      <LiquidSurface kind="panel">{mixedText}</LiquidSurface>
    </StoryFrame>
  )
};

export const DarkFallback: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark">
      <LiquidSurface kind="panel">{mixedText}</LiquidSurface>
    </StoryFrame>
  )
};

export const EnhancedMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced">
      <LiquidSurface intensity="medium" kind="panel">
        Enhanced Chrome-only surface
      </LiquidSurface>
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid">
      <LiquidSurface kind="panel">Reduced transparency solid material</LiquidSurface>
    </StoryFrame>
  )
};

export const LongText: Story = {
  render: () => (
    <StoryFrame mode="fallback" width={420}>
      <LiquidSurface kind="panel">
        {longChineseText} · {longEnglishText}
      </LiquidSurface>
    </StoryFrame>
  )
};
