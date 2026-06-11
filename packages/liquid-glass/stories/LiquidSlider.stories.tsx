import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidProvider, LiquidSlider } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSlider",
  component: LiquidSlider,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSlider>;

export default meta;
type Story = StoryObj;

export const KubeReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <div
        data-lg-theme="light"
        style={{
          display: "grid",
          minHeight: 312,
          placeItems: "center",
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(180deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 32px), linear-gradient(135deg, #f8fafc, #e7eeef)",
          backgroundSize: "32px 32px, 32px 32px, auto",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 10,
          width: 706
        }}
      >
        <LiquidSlider aria-label="Refraction level" defaultValue={10} />
      </div>
    </LiquidProvider>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={480} height={280} field={false}>
      <LiquidSlider aria-label="Fallback slider" defaultValue={35} />
    </StoryFrame>
  )
};
