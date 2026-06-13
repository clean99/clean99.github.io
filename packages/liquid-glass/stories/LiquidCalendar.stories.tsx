import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { LiquidCalendar, LiquidTypography } from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidCalendar",
  component: LiquidCalendar,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidCalendar>;

export default meta;
type Story = StoryObj;

export const SingleSelection: Story = {
  render: () => <SingleSelectionExample />
};

export const RangeSelection: Story = {
  render: () => <RangeSelectionExample />
};

export const MultiMonthDark: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={820} height={560}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Planning calendar</LiquidTypography>
        <LiquidCalendar
          aria-label="Planning calendar"
          defaultMonth={new Date(2026, 5, 1)}
          mode="single"
          numberOfMonths={2}
          selected={new Date(2026, 6, 7)}
        />
      </div>
    </StoryFrame>
  )
};

function SingleSelectionExample() {
  const [selected, setSelected] = useState<Date | undefined>(new Date(2026, 5, 12));

  return (
    <StoryFrame mode="fallback" theme="light" width={520} height={520}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Release date</LiquidTypography>
        <LiquidCalendar
          aria-label="Release calendar"
          defaultMonth={new Date(2026, 5, 1)}
          mode="single"
          onSelect={setSelected}
          selected={selected}
        />
      </div>
    </StoryFrame>
  );
}

function RangeSelectionExample() {
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: new Date(2026, 5, 8),
    to: new Date(2026, 5, 12)
  });

  return (
    <StoryFrame mode="fallback" theme="light" width={560} height={540}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Sprint window</LiquidTypography>
        <LiquidCalendar
          aria-label="Sprint calendar"
          defaultMonth={new Date(2026, 5, 1)}
          mode="range"
          onSelect={setSelected}
          selected={selected}
        />
      </div>
    </StoryFrame>
  );
}
