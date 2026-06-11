import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidProvider, LiquidSwitch } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSwitch",
  component: LiquidSwitch,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSwitch>;

export default meta;
type Story = StoryObj;

export const KubeReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <div
        data-lg-reference-frame="switch"
        data-lg-theme="light"
        style={{
          display: "grid",
          minHeight: 312,
          placeItems: "center",
          position: "relative",
          background:
            "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), radial-gradient(120% 100% at 10% 0%, #f8fafc, #e7eeef)",
          backgroundPosition: "12px 12px, 12px 12px, 0 0",
          backgroundSize: "24px 24px, 24px 24px, 100% 100%",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 9.75,
          width: 706
        }}
      >
        <LiquidSwitch aria-label="Use image background" />
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
          <input style={{ width: 12, height: 12, margin: 0 }} type="checkbox" /> Force active
        </label>
      </div>
    </LiquidProvider>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={480} height={280} field={false}>
      <LiquidSwitch aria-label="Fallback switch" />
    </StoryFrame>
  )
};
