import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidSegmentedControl } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidSegmentedControl",
  component: LiquidSegmentedControl,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidSegmentedControl>;

export default meta;
type Story = StoryObj;

function ModesStory() {
  const [value, setValue] = useState("auto");
  return (
    <StoryFrame>
      <LiquidSegmentedControl
        aria-label="Liquid mode"
        items={[
          { label: "Auto", value: "auto" },
          { label: "Fallback", value: "fallback" },
          { label: "Solid", value: "solid" }
        ]}
        onValueChange={setValue}
        value={value}
      />
    </StoryFrame>
  );
}

export const Modes: Story = {
  render: () => <ModesStory />
};

export const ReducedMotion: Story = {
  render: () => (
    <StoryFrame mode="solid">
      <LiquidSegmentedControl
        aria-label="Motion preference"
        items={[
          { label: "Motion", value: "motion" },
          { label: "Reduced motion", value: "reduced" }
        ]}
        value="reduced"
      />
    </StoryFrame>
  )
};
