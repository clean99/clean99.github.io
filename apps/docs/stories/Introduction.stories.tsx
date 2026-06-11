import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { liquidPackageName } from "@clean99/liquid-glass";

const meta = {
  title: "Liquid Glass/Introduction",
  parameters: {
    layout: "centered"
  },
  render: () => (
    <section style={{ maxWidth: 520 }}>
      <p style={{ color: "#626a73", margin: 0 }}>{liquidPackageName}</p>
      <h1 style={{ margin: "8px 0 12px" }}>Refractive Liquid Glass for React</h1>
      <p style={{ lineHeight: 1.6 }}>
        Storybook scaffold for the component library. Component stories are added in the component
        milestones.
      </p>
    </section>
  )
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
