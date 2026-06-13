import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidProvider, LiquidSearchBox } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSearchBox",
  component: LiquidSearchBox,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSearchBox>;

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
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          data-lg-reference-frame="searchbox"
          style={{
            position: "relative",
            width: 706,
            height: 312,
            overflow: "hidden",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: 9.75,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), radial-gradient(120% 100% at 10% 0%, #f8fafc, #e7eeef)",
            backgroundPosition: "12px 12px, 12px 12px, 0 0",
            backgroundSize: "24px 24px, 24px 24px, 100% 100%"
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
            <LiquidSearchBox aria-label="Search docs" />
          </div>
          <label
            style={{
              position: "absolute",
              left: "50%",
              bottom: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#111",
              fontSize: 10,
              transform: "translateX(-50%)"
            }}
          >
            <input style={{ width: 12, height: 12, margin: 0 }} type="checkbox" /> Use image
            background
          </label>
        </div>
      </div>
    </LiquidProvider>
  )
};

export const FocusPhotoReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <div
        data-lg-theme="light"
        style={{
          minHeight: 360,
          padding: 40,
          background: "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,245,243,0.94))",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          data-lg-reference-frame="searchbox-focus"
          style={{
            position: "relative",
            width: 706,
            height: 312,
            overflow: "hidden",
            borderRadius: 12,
            background:
              "radial-gradient(ellipse at 18% 24%, rgba(42, 220, 72, 0.95), transparent 16%), radial-gradient(ellipse at 35% 36%, rgba(9, 105, 29, 0.9), transparent 18%), radial-gradient(ellipse at 62% 28%, rgba(52, 238, 89, 0.88), transparent 17%), radial-gradient(ellipse at 78% 58%, rgba(15, 125, 35, 0.92), transparent 18%), radial-gradient(ellipse at 48% 72%, rgba(36, 205, 68, 0.82), transparent 15%), linear-gradient(135deg, #020802 0%, #05330c 34%, #020902 68%, #0a4213 100%)",
            backgroundSize:
              "210px 120px, 240px 150px, 220px 120px, 250px 150px, 230px 130px, 100% 100%"
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
            <LiquidSearchBox aria-label="Search docs" />
          </div>
        </div>
      </div>
    </LiquidProvider>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame theme="dark" width={520} height={280}>
      <LiquidSearchBox aria-label="Search dark documentation" />
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={280}>
      <LiquidSearchBox aria-label="Search fallback documentation" />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="light" width={520} height={280}>
      <LiquidSearchBox aria-label="Search solid documentation" />
    </StoryFrame>
  )
};

export const LongPlaceholder: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={420} height={280}>
      <LiquidSearchBox
        aria-label="Search mixed language notes"
        placeholder="搜索性能、架构、Agent notes and long English labels"
      />
    </StoryFrame>
  )
};
