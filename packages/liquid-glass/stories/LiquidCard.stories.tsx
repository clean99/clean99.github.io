import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidCard, LiquidPill } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidCard",
  component: LiquidCard,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidCard>;

export default meta;
type Story = StoryObj;

export const BlogRealistic: Story = {
  render: () => (
    <StoryFrame mode="fallback">
      <LiquidCard>
        <article style={{ display: "grid", gap: 12 }}>
          <LiquidPill>Frontend Systems</LiquidPill>
          <h3 style={{ margin: 0 }}>Workspace V2 Tab System</h3>
          <p style={{ margin: 0, color: "var(--lg-text-muted)", lineHeight: 1.6 }}>
            A production note about tab architecture, persistence, and reliability.
          </p>
        </article>
      </LiquidCard>
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame theme="dark">
      <LiquidCard>
        <strong>Dark card</strong>
      </LiquidCard>
    </StoryFrame>
  )
};

export const DenseLayout: Story = {
  render: () => (
    <StoryFrame width={640}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {["Performance", "Reliability", "Agents", "Learning"].map((item) => (
          <LiquidCard key={item}>
            <strong>{item}</strong>
          </LiquidCard>
        ))}
      </div>
    </StoryFrame>
  )
};
