import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidToggle } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidToggle",
  component: LiquidToggle,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidToggle>;

export default meta;
type Story = StoryObj;

function InteractiveToggleStory() {
  const [pressed, setPressed] = useState(false);
  return (
    <StoryFrame>
      <LiquidToggle onPressedChange={setPressed} pressed={pressed}>
        {pressed ? "Dark" : "Light"}
      </LiquidToggle>
    </StoryFrame>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveToggleStory />
};

export const Disabled: Story = {
  render: () => (
    <StoryFrame>
      <LiquidToggle disabled>Disabled toggle</LiquidToggle>
    </StoryFrame>
  )
};
