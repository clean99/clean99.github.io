import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidButton,
  LiquidDialog,
  LiquidDialogClose,
  LiquidDialogContent,
  LiquidDialogDescription,
  LiquidDialogFooter,
  LiquidDialogHeader,
  LiquidDialogTitle,
  LiquidDialogTrigger,
  LiquidField,
  LiquidInput,
  LiquidLabel
} from "../src";
import { longChineseText, longEnglishText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidDialog",
  component: LiquidDialog,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidDialog>;

export default meta;
type Story = StoryObj;

function ExampleDialog({ mode = "enhanced" }: { mode?: "enhanced" | "fallback" | "solid" }) {
  return (
    <LiquidDialog>
      <LiquidDialogTrigger>Open dialog</LiquidDialogTrigger>
      <LiquidDialogContent mode={mode}>
        <LiquidDialogHeader>
          <LiquidDialogTitle>Share article</LiquidDialogTitle>
          <LiquidDialogDescription>
            Copy a stable link without distorting the title or action labels.
          </LiquidDialogDescription>
        </LiquidDialogHeader>
        <p style={{ margin: 0, color: "var(--lg-text-muted)", lineHeight: 1.55 }}>
          The surface is glass. The content remains clear foreground UI.
        </p>
        <LiquidDialogFooter>
          <LiquidDialogClose mode="solid">Cancel</LiquidDialogClose>
          <LiquidButton>Copy link</LiquidButton>
        </LiquidDialogFooter>
      </LiquidDialogContent>
    </LiquidDialog>
  );
}

function ControlledOpenDialog() {
  const [open, setOpen] = useState(true);

  return (
    <LiquidDialog onOpenChange={setOpen} open={open}>
      <LiquidDialogTrigger>Open controlled dialog</LiquidDialogTrigger>
      <LiquidDialogContent>
        <LiquidDialogHeader>
          <LiquidDialogTitle>Controlled state</LiquidDialogTitle>
          <LiquidDialogDescription>
            The parent owns the state and receives native close/cancel requests.
          </LiquidDialogDescription>
        </LiquidDialogHeader>
        <LiquidDialogFooter>
          <LiquidDialogClose>Close</LiquidDialogClose>
        </LiquidDialogFooter>
      </LiquidDialogContent>
    </LiquidDialog>
  );
}

export const LightMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" field={false} width={520} height={320}>
      <ExampleDialog />
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={520} height={340}>
      <ExampleDialog />
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={320}>
      <ExampleDialog mode="fallback" />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="dark" field={false} width={520} height={320}>
      <ExampleDialog mode="solid" />
    </StoryFrame>
  )
};

export const ControlledOpen: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={560} height={380}>
      <ControlledOpenDialog />
    </StoryFrame>
  )
};

export const LongMixedText: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={520} height={360}>
      <LiquidDialog defaultOpen>
        <LiquidDialogContent mode="fallback">
          <LiquidDialogHeader>
            <LiquidDialogTitle>{longChineseText}</LiquidDialogTitle>
            <LiquidDialogDescription>{longEnglishText}</LiquidDialogDescription>
          </LiquidDialogHeader>
          <LiquidDialogFooter>
            <LiquidDialogClose>关闭 / Close</LiquidDialogClose>
          </LiquidDialogFooter>
        </LiquidDialogContent>
      </LiquidDialog>
    </StoryFrame>
  )
};

export const BlogRealisticExample: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={620} height={420}>
      <LiquidDialog defaultOpen>
        <LiquidDialogContent>
          <LiquidDialogHeader>
            <LiquidDialogTitle>Subscribe to writing notes</LiquidDialogTitle>
            <LiquidDialogDescription>
              Receive long-form notes on performance, architecture, and agents.
            </LiquidDialogDescription>
          </LiquidDialogHeader>
          <LiquidField>
            <LiquidLabel htmlFor="dialog-email">Email</LiquidLabel>
            <LiquidInput id="dialog-email" placeholder="koh@example.com" />
          </LiquidField>
          <LiquidDialogFooter>
            <LiquidDialogClose mode="solid">Cancel</LiquidDialogClose>
            <LiquidButton>Subscribe</LiquidButton>
          </LiquidDialogFooter>
        </LiquidDialogContent>
      </LiquidDialog>
    </StoryFrame>
  )
};
