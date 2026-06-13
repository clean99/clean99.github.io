import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidTabs } from "../src";
import { longChineseText, longEnglishText, mixedText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidTabs",
  component: LiquidTabs,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidTabs>;

export default meta;
type Story = StoryObj;

const items = [
  {
    label: "Overview",
    value: "overview",
    content: "A continuous refractive plate with clear foreground tab labels."
  },
  {
    label: "API",
    value: "api",
    content: "Controlled and uncontrolled tabs share one item data model."
  },
  {
    label: "Testing",
    value: "testing",
    content: "Arrow keys, Home, End, focus-visible, and disabled states are covered."
  }
];

function ControlledTabs() {
  const [value, setValue] = useState("overview");
  return (
    <LiquidTabs
      aria-label="Component sections"
      items={items}
      onValueChange={setValue}
      value={value}
    />
  );
}

export const LightMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" field={false}>
      <ControlledTabs />
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark">
      <ControlledTabs />
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark">
      <LiquidTabs aria-label="Fallback component sections" items={items} />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="light" field={false}>
      <LiquidTabs aria-label="Solid component sections" items={items} />
    </StoryFrame>
  )
};

export const ManualActivation: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark">
      <LiquidTabs activationMode="manual" aria-label="Manual activation sections" items={items} />
    </StoryFrame>
  )
};

export const Vertical: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620}>
      <LiquidTabs
        aria-label="Vertical documentation sections"
        orientation="vertical"
        items={[
          { label: "Install", value: "install", content: "pnpm add @clean99/liquid-glass" },
          { label: "Tokens", value: "tokens", content: "Import tokens and styles separately." },
          { label: "A11y", value: "a11y", content: "Native tab semantics stay intact." }
        ]}
      />
    </StoryFrame>
  )
};

export const Disabled: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark">
      <LiquidTabs
        aria-label="Disabled tab example"
        items={[
          { label: "Ready", value: "ready", content: "Ready panel" },
          { label: "Disabled", value: "disabled", content: "Disabled panel", disabled: true },
          { label: "Live", value: "live", content: "Live panel" }
        ]}
      />
    </StoryFrame>
  )
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('[role="tab"]')?.focus();
  },
  render: () => (
    <StoryFrame mode="enhanced" theme="dark">
      <LiquidTabs aria-label="Focused tabs" items={items} />
    </StoryFrame>
  )
};

export const LongMixedLabels: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={430} field={false}>
      <LiquidTabs
        aria-label="Long label tabs"
        items={[
          { label: longChineseText, value: "zh", content: longChineseText },
          { label: longEnglishText, value: "en", content: longEnglishText },
          { label: mixedText, value: "mixed", content: mixedText }
        ]}
      />
    </StoryFrame>
  )
};

export const DenseBlogExample: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={720} height={320}>
      <LiquidTabs
        aria-label="Blog writing filters"
        items={[
          { label: "Performance", value: "performance", content: "Performance notes" },
          { label: "Reliability", value: "reliability", content: "Reliability notes" },
          { label: "Agents", value: "agents", content: "Agent workflow notes" },
          { label: "Learning", value: "learning", content: "Learning notes" }
        ]}
      />
    </StoryFrame>
  )
};

export const HighContrast: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="dark" field={false}>
      <div style={{ filter: "contrast(1.2)" }}>
        <LiquidTabs aria-label="High contrast tabs" items={items} />
      </div>
    </StoryFrame>
  )
};
