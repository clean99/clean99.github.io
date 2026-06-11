import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidButton } from "../src";
import { longChineseText, longEnglishText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidButton",
  component: LiquidButton,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidButton>;

export default meta;
type Story = StoryObj;

export const LightMode: Story = {
  render: () => (
    <StoryFrame>
      <LiquidButton>Read Writing</LiquidButton>
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame theme="dark">
      <LiquidButton>View Projects</LiquidButton>
    </StoryFrame>
  )
};

export const Disabled: Story = {
  render: () => (
    <StoryFrame>
      <LiquidButton disabled>Disabled action</LiquidButton>
    </StoryFrame>
  )
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const button = canvasElement.querySelector("button");
    button?.focus();
  },
  render: () => (
    <StoryFrame>
      <LiquidButton>Keyboard focus</LiquidButton>
    </StoryFrame>
  )
};

export const LongLabels: Story = {
  render: () => (
    <StoryFrame width={380}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <LiquidButton>{longChineseText}</LiquidButton>
        <LiquidButton>{longEnglishText}</LiquidButton>
      </div>
    </StoryFrame>
  )
};
