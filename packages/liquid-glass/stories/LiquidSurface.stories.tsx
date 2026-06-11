import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidSurface } from "../src";
import { longChineseText, longEnglishText, mixedText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSurface",
  component: LiquidSurface,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSurface>;

export default meta;
type Story = StoryObj;

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
