import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidButton, LiquidToast, LiquidToaster, liquidToast } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidToast",
  component: LiquidToast,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidToast>;

export default meta;
type Story = StoryObj;

export const Standalone: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={280}>
      <LiquidToast
        action={<LiquidButton>View</LiquidButton>}
        description="All checks finished without critical accessibility errors."
        title="CI gate passed"
        variant="success"
      />
    </StoryFrame>
  )
};

export const ToasterQueue: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={620} height={380}>
      <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
        <LiquidButton
          onClick={() =>
            liquidToast.info({
              title: "Reference check queued",
              description: "Kube pixel gates run against stable Storybook output.",
              duration: 8000
            })
          }
        >
          Create toast
        </LiquidButton>
        <LiquidButton
          onClick={() =>
            liquidToast.warning({
              title: "Visual baseline changed",
              description: "Review the diff before updating snapshots.",
              duration: 8000
            })
          }
        >
          Create warning
        </LiquidButton>
      </div>
      <LiquidToaster position="bottom-right" />
    </StoryFrame>
  )
};
