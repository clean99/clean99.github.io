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
            "linear-gradient(135deg, #fff, #f5f6f4), repeating-linear-gradient(60deg, rgba(255,255,255,0.82) 0 3px, transparent 3px 18px)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          style={{
            position: "relative",
            width: 706,
            height: 312,
            overflow: "hidden",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: 10,
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(180deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(135deg, #f8fafc, #e7eeef)",
            backgroundSize: "32px 32px, 32px 32px, auto"
          }}
        >
          <LiquidSearchBox
            aria-label="Search docs"
            surfaceProps={{
              style: {
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
              }
            }}
          />
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
