import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidButton, LiquidLink, LiquidNav, LiquidToggle } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidNav",
  component: LiquidNav,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidNav>;

export default meta;
type Story = StoryObj;

export const BlogNavigationLight: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" field={false}>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink aria-current="page" href="/">
          Home
        </LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
        <LiquidLink href="/projects/">Projects</LiquidLink>
        <LiquidLink href="/ai-coding-lab/">AI Lab</LiquidLink>
        <LiquidLink href="/about/">About</LiquidLink>
        <LiquidButton>中文 / EN</LiquidButton>
        <LiquidToggle aria-label="Theme toggle">Theme</LiquidToggle>
      </LiquidNav>
    </StoryFrame>
  )
};

export const BlogNavigationDark: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" field={false}>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink aria-current="page" href="/">
          Home
        </LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
        <LiquidLink href="/projects/">Projects</LiquidLink>
        <LiquidLink href="/ai-coding-lab/">AI Lab</LiquidLink>
      </LiquidNav>
    </StoryFrame>
  )
};

export const SmallViewport: Story = {
  render: () => (
    <StoryFrame mode="solid" width={320}>
      <LiquidNav aria-label="Primary navigation">
        <LiquidLink href="/">Home</LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
        <LiquidLink href="/projects/">Projects</LiquidLink>
      </LiquidNav>
    </StoryFrame>
  )
};

export const AppleLikeTabs: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" width={520} height={260} field={false}>
      <LiquidNav aria-label="Section tabs">
        <LiquidLink aria-current="page" href="/">
          Home
        </LiquidLink>
        <LiquidLink href="/writing/">Writing</LiquidLink>
        <LiquidLink href="/projects/">Projects</LiquidLink>
        <LiquidLink href="/ai-coding-lab/">AI Lab</LiquidLink>
      </LiquidNav>
    </StoryFrame>
  )
};
