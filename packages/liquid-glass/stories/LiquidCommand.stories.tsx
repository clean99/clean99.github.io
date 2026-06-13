import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import {
  LiquidCombobox,
  LiquidCommand,
  LiquidCommandEmpty,
  LiquidCommandGroup,
  LiquidCommandInput,
  LiquidCommandItem,
  LiquidCommandList,
  LiquidCommandSeparator,
  LiquidTypography
} from "../src";
import { StoryFrame, longChineseText, longEnglishText, mixedText } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidCommand",
  component: LiquidCommand,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidCommand>;

export default meta;
type Story = StoryObj;

const commandItems = [
  { label: "Open Writing", value: "writing", keywords: ["posts", "articles"] },
  { label: "View Projects", value: "projects", keywords: ["work", "portfolio"] },
  { label: "Explore AI Lab", value: "ai-lab", keywords: ["agents", "automation"] },
  { label: longChineseText, value: "zh-notes", keywords: ["中文", "学习"] },
  { label: longEnglishText, value: "frontend-systems", keywords: ["performance"] },
  { disabled: true, label: "Archive locked", value: "archive" }
];

const comboboxOptions = [
  {
    description: "Long-form notes and architecture posts.",
    label: "Writing",
    value: "writing",
    keywords: ["posts", "notes"]
  },
  {
    description: "Selected engineering work from existing content.",
    label: "Projects",
    value: "projects",
    keywords: ["work"]
  },
  {
    description: "Agent and automation experiments.",
    label: "AI Lab",
    value: "ai-lab",
    keywords: ["agents"]
  },
  {
    description: "Disabled to verify skip behavior.",
    disabled: true,
    label: "Private archive",
    value: "archive"
  }
];

export const CommandPalette: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={620} height={420}>
      <div style={{ display: "grid", gap: 16 }}>
        <LiquidTypography variant="h2">Command palette</LiquidTypography>
        <LiquidCommand aria-label="Site command palette">
          <LiquidCommandInput placeholder="Search site actions" />
          <LiquidCommandList>
            <LiquidCommandEmpty>No matching action.</LiquidCommandEmpty>
            <LiquidCommandGroup heading="Navigation">
              {commandItems.slice(0, 3).map((item) => (
                <LiquidCommandItem
                  disabled={item.disabled}
                  key={item.value}
                  keywords={item.keywords}
                  value={item.value}
                >
                  {item.label}
                </LiquidCommandItem>
              ))}
            </LiquidCommandGroup>
            <LiquidCommandSeparator />
            <LiquidCommandGroup heading="Long labels">
              {commandItems.slice(3).map((item) => (
                <LiquidCommandItem
                  disabled={item.disabled}
                  key={item.value}
                  keywords={item.keywords}
                  value={item.value}
                >
                  {item.label}
                </LiquidCommandItem>
              ))}
            </LiquidCommandGroup>
          </LiquidCommandList>
        </LiquidCommand>
      </div>
    </StoryFrame>
  )
};

export const Combobox: Story = {
  render: () => <ComboboxExample />
};

function ComboboxExample() {
  const [value, setValue] = useState("writing");

  return (
    <StoryFrame mode="fallback" theme="light" width={620} height={360}>
      <div style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <LiquidTypography variant="h2">Combobox</LiquidTypography>
        <LiquidTypography variant="muted">{mixedText}</LiquidTypography>
        <LiquidCombobox
          aria-label="Choose section"
          onValueChange={setValue}
          options={comboboxOptions}
          placeholder="Choose section"
          searchPlaceholder="Search sections"
          value={value}
        />
      </div>
    </StoryFrame>
  );
}
