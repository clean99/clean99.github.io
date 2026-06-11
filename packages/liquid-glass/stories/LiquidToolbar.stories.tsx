import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidButton, LiquidIconButton, LiquidToolbar } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidToolbar",
  component: LiquidToolbar,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidToolbar>;

export default meta;
type Story = StoryObj;

export const ArticleToolbar: Story = {
  render: () => (
    <StoryFrame>
      <LiquidToolbar aria-label="Article tools">
        <LiquidIconButton aria-label="Back to top">↑</LiquidIconButton>
        <LiquidButton>Copy link</LiquidButton>
        <LiquidButton>Share</LiquidButton>
      </LiquidToolbar>
    </StoryFrame>
  )
};

export const DenseDark: Story = {
  render: () => (
    <StoryFrame theme="dark" width={360}>
      <LiquidToolbar aria-label="Dense article tools">
        <LiquidIconButton aria-label="Previous">←</LiquidIconButton>
        <LiquidIconButton aria-label="Next">→</LiquidIconButton>
        <LiquidIconButton aria-label="Copy">⧉</LiquidIconButton>
      </LiquidToolbar>
    </StoryFrame>
  )
};
