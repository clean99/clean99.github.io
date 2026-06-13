import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  LiquidButton,
  LiquidDatePicker,
  LiquidField,
  LiquidFieldDescription,
  LiquidLabel,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidDatePicker",
  component: LiquidDatePicker,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidDatePicker>;

export default meta;
type Story = StoryObj;

export const Single: Story = {
  render: () => <SingleDatePickerExample />
};

export const Range: Story = {
  render: () => <RangeDatePickerExample />
};

export const Dark: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={620} height={520}>
      <div style={{ display: "grid", gap: 18, maxWidth: 420 }}>
        <LiquidTypography variant="h2">Release window</LiquidTypography>
        <LiquidDatePicker
          aria-label="Choose dark mode release date"
          calendarProps={{ defaultMonth: new Date(2026, 5, 1) }}
          defaultValue={new Date(2026, 5, 12)}
        />
      </div>
    </StoryFrame>
  )
};

export const FormExample: Story = {
  render: () => <FormDatePickerExample />
};

function SingleDatePickerExample() {
  const [value, setValue] = useState<Date | undefined>(new Date(2026, 5, 12));

  return (
    <StoryFrame mode="fallback" theme="light" width={620} height={520}>
      <div style={{ display: "grid", gap: 18, maxWidth: 420 }}>
        <LiquidTypography variant="h2">Ship date</LiquidTypography>
        <LiquidDatePicker
          aria-label="Choose ship date"
          calendarProps={{ defaultMonth: new Date(2026, 5, 1) }}
          onValueChange={setValue}
          value={value}
        />
      </div>
    </StoryFrame>
  );
}

function RangeDatePickerExample() {
  const [value, setValue] = useState<DateRange | undefined>({
    from: new Date(2026, 5, 8),
    to: new Date(2026, 5, 12)
  });

  return (
    <StoryFrame mode="fallback" theme="light" width={640} height={540}>
      <div style={{ display: "grid", gap: 18, maxWidth: 460 }}>
        <LiquidTypography variant="h2">Sprint range</LiquidTypography>
        <LiquidDatePicker
          aria-label="Choose sprint range"
          calendarProps={{ defaultMonth: new Date(2026, 5, 1) }}
          mode="range"
          onValueChange={setValue}
          value={value}
        />
      </div>
    </StoryFrame>
  );
}

function FormDatePickerExample() {
  const [value, setValue] = useState<Date | undefined>();

  return (
    <StoryFrame mode="fallback" theme="light" width={720} height={560}>
      <form style={{ display: "grid", gap: 18, maxWidth: 460 }}>
        <LiquidTypography variant="h2">Release notes</LiquidTypography>
        <LiquidField>
          <LiquidLabel>Publish date</LiquidLabel>
          <LiquidDatePicker
            aria-label="Choose publish date"
            calendarProps={{ defaultMonth: new Date(2026, 5, 1) }}
            onValueChange={setValue}
            value={value}
          />
          <LiquidFieldDescription>
            Used for generated changelogs and visual baseline review windows.
          </LiquidFieldDescription>
        </LiquidField>
        <LiquidButton type="button">Schedule</LiquidButton>
      </form>
    </StoryFrame>
  );
}
