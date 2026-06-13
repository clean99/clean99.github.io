import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidAccordion, type LiquidAccordionValue } from "../src";
import { longChineseText, longEnglishText, mixedText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidAccordion",
  component: LiquidAccordion,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidAccordion>;

export default meta;
type Story = StoryObj;

const items = [
  {
    title: "Why keep text outside the refraction layer?",
    value: "foreground",
    content:
      "Liquid Glass should bend the page behind the surface. Product text stays sharp in the foreground layer."
  },
  {
    title: "When does enhanced mode run?",
    value: "enhanced",
    content:
      "Enhanced refraction is reserved for capable Chromium surfaces. Other browsers keep the same layout with fallback material."
  },
  {
    title: "How is keyboard behavior handled?",
    value: "keyboard",
    content:
      "Triggers are native buttons with aria-expanded, region panels, and Arrow/Home/End focus movement."
  }
];

function ControlledAccordion() {
  const [value, setValue] = useState<LiquidAccordionValue>("foreground");

  return <LiquidAccordion items={items} onValueChange={setValue} value={value} />;
}

export const LightMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" field={false} width={620}>
      <ControlledAccordion />
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620}>
      <ControlledAccordion />
    </StoryFrame>
  )
};

export const EnhancedMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620}>
      <LiquidAccordion defaultValue="enhanced" items={items} />
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={620}>
      <LiquidAccordion defaultValue="foreground" items={items} />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="light" field={false} width={620}>
      <LiquidAccordion defaultValue="keyboard" items={items} />
    </StoryFrame>
  )
};

export const MultipleOpen: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={660}>
      <LiquidAccordion defaultValue={["foreground", "keyboard"]} items={items} type="multiple" />
    </StoryFrame>
  )
};

export const Disabled: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620}>
      <LiquidAccordion
        defaultValue="available"
        items={[
          { title: "Available section", value: "available", content: "This item can be opened." },
          {
            title: "Disabled section",
            value: "disabled",
            content: "This content is intentionally unavailable.",
            disabled: true
          }
        ]}
      />
    </StoryFrame>
  )
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    canvasElement.querySelector<HTMLButtonElement>(".lg-accordion__trigger")?.focus();
  },
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620}>
      <LiquidAccordion defaultValue="foreground" items={items} />
    </StoryFrame>
  )
};

export const LongChineseText: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={460}>
      <LiquidAccordion
        defaultValue="zh"
        items={[{ title: longChineseText, value: "zh", content: longChineseText }]}
      />
    </StoryFrame>
  )
};

export const LongEnglishText: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={460}>
      <LiquidAccordion
        defaultValue="en"
        items={[{ title: longEnglishText, value: "en", content: longEnglishText }]}
      />
    </StoryFrame>
  )
};

export const MixedChineseEnglish: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={460}>
      <LiquidAccordion
        defaultValue="mixed"
        items={[{ title: mixedText, value: "mixed", content: mixedText }]}
      />
    </StoryFrame>
  )
};

export const SmallViewport: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={326} height={420}>
      <LiquidAccordion defaultValue="foreground" items={items} />
    </StoryFrame>
  )
};

export const ReducedMotion: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="dark" field={false} width={620}>
      <LiquidAccordion defaultValue="keyboard" items={items} />
    </StoryFrame>
  )
};

export const HighContrast: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="dark" field={false} width={620}>
      <div style={{ filter: "contrast(1.2)" }}>
        <LiquidAccordion defaultValue="foreground" items={items} />
      </div>
    </StoryFrame>
  )
};

export const DenseBlogExample: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={720} height={420}>
      <LiquidAccordion
        defaultValue={["performance", "agents"]}
        items={[
          {
            title: "Performance & Reliability",
            value: "performance",
            content:
              "Operational notes on UI latency, bundle discipline, hydration safety, and visual regression gates."
          },
          {
            title: "AI Agents & Automation",
            value: "agents",
            content:
              "Long-form experiments around agent workflows, review loops, and reproducible engineering output."
          },
          {
            title: "Learning & Clear Thinking",
            value: "learning",
            content:
              "Writing that turns ambiguous engineering problems into smaller verifiable decisions."
          }
        ]}
        type="multiple"
      />
    </StoryFrame>
  )
};
