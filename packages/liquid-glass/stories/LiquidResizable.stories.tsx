import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidResizableHandle,
  LiquidResizablePanel,
  LiquidResizablePanelGroup,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidResizable",
  component: LiquidResizablePanelGroup,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidResizablePanelGroup>;

export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={760} height={420}>
      <div style={{ display: "grid", gap: 16 }}>
        <LiquidTypography variant="h2">Resizable layout</LiquidTypography>
        <LiquidResizablePanelGroup
          aria-label="Project workspace"
          defaultLayout={{ nav: 28, editor: 72 }}
          id="workspace-horizontal"
          style={{ height: 260 }}
        >
          <LiquidResizablePanel defaultSize="28%" id="nav" minSize="18%">
            <Pane title="Navigation" body="Writing · Projects · AI Lab · About" />
          </LiquidResizablePanel>
          <LiquidResizableHandle id="nav-editor" withHandle />
          <LiquidResizablePanel defaultSize="72%" id="editor" minSize="38%">
            <Pane
              title="Editor"
              body="Long article content stays on a clear foreground layer while the split surface only frames the workspace."
            />
          </LiquidResizablePanel>
        </LiquidResizablePanelGroup>
      </div>
    </StoryFrame>
  )
};

export const Vertical: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={720} height={460}>
      <div style={{ display: "grid", gap: 16 }}>
        <LiquidTypography variant="h2">Vertical panels</LiquidTypography>
        <LiquidResizablePanelGroup
          aria-label="Release dashboard"
          defaultLayout={{ preview: 58, logs: 42 }}
          id="workspace-vertical"
          orientation="vertical"
          style={{ height: 300 }}
        >
          <LiquidResizablePanel defaultSize="58%" id="preview" minSize="32%">
            <Pane
              title="Preview"
              body="Chromium enhanced baseline, Firefox/WebKit fallback smoke."
            />
          </LiquidResizablePanel>
          <LiquidResizableHandle id="preview-logs" withHandle />
          <LiquidResizablePanel defaultSize="42%" id="logs" minSize="24%">
            <Pane title="Logs" body="lint · typecheck · unit · Storybook · visual · package" />
          </LiquidResizablePanel>
        </LiquidResizablePanelGroup>
      </div>
    </StoryFrame>
  )
};

function Pane({ body, title }: { body: string; title: string }) {
  return (
    <div style={{ display: "grid", gap: 8, height: "100%", padding: 18 }}>
      <LiquidTypography variant="h3">{title}</LiquidTypography>
      <LiquidTypography variant="muted">{body}</LiquidTypography>
    </div>
  );
}
