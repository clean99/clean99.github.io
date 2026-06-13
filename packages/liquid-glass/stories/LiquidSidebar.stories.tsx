import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidButton,
  LiquidSidebar,
  LiquidSidebarContent,
  LiquidSidebarFooter,
  LiquidSidebarGroup,
  LiquidSidebarGroupContent,
  LiquidSidebarGroupLabel,
  LiquidSidebarHeader,
  LiquidSidebarInset,
  LiquidSidebarMenu,
  LiquidSidebarMenuAction,
  LiquidSidebarMenuBadge,
  LiquidSidebarMenuButton,
  LiquidSidebarMenuItem,
  LiquidSidebarProvider,
  LiquidSidebarRail,
  LiquidSidebarSeparator,
  LiquidSidebarTrigger,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/Sidebar",
  parameters: { a11y: { test: "error" } }
} satisfies Meta;

export default meta;
type Story = StoryObj;

function SidebarExample({
  defaultOpen = true,
  variant = "sidebar"
}: {
  defaultOpen?: boolean;
  variant?: "floating" | "inset" | "sidebar";
}) {
  return (
    <LiquidSidebarProvider defaultOpen={defaultOpen} style={{ minHeight: 420 }}>
      <LiquidSidebar
        aria-label="Documentation navigation"
        collapsible="icon"
        id="docs-sidebar"
        variant={variant}
      >
        <LiquidSidebarHeader>
          <strong>Liquid Glass</strong>
          <LiquidSidebarTrigger controls="docs-sidebar">Toggle</LiquidSidebarTrigger>
        </LiquidSidebarHeader>
        <LiquidSidebarSeparator />
        <LiquidSidebarContent>
          <LiquidSidebarGroup>
            <LiquidSidebarGroupLabel>Components</LiquidSidebarGroupLabel>
            <LiquidSidebarGroupContent>
              <LiquidSidebarMenu>
                <LiquidSidebarMenuItem>
                  <LiquidSidebarMenuButton active as="a" href="#sidebar">
                    Sidebar
                  </LiquidSidebarMenuButton>
                  <LiquidSidebarMenuBadge>New</LiquidSidebarMenuBadge>
                </LiquidSidebarMenuItem>
                <LiquidSidebarMenuItem>
                  <LiquidSidebarMenuButton as="a" href="#data-table">
                    Data Table
                  </LiquidSidebarMenuButton>
                  <LiquidSidebarMenuAction aria-label="Pin data table">Pin</LiquidSidebarMenuAction>
                </LiquidSidebarMenuItem>
                <LiquidSidebarMenuItem>
                  <LiquidSidebarMenuButton as="a" href="#command">
                    Command
                  </LiquidSidebarMenuButton>
                </LiquidSidebarMenuItem>
              </LiquidSidebarMenu>
            </LiquidSidebarGroupContent>
          </LiquidSidebarGroup>
        </LiquidSidebarContent>
        <LiquidSidebarFooter>
          <LiquidButton mode="fallback">Open docs</LiquidButton>
        </LiquidSidebarFooter>
        <LiquidSidebarRail aria-label="Toggle documentation navigation rail" />
      </LiquidSidebar>
      <LiquidSidebarInset>
        <div style={{ display: "grid", gap: 14 }}>
          <LiquidTypography as="h2" variant="h2">
            Documentation shell
          </LiquidTypography>
          <LiquidTypography>
            Sidebar content uses semantic lists and clear foreground text. The panel carries a
            restrained material treatment instead of per-row refraction.
          </LiquidTypography>
        </div>
      </LiquidSidebarInset>
    </LiquidSidebarProvider>
  );
}

export const AppShell: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={980} height={520}>
      <SidebarExample />
    </StoryFrame>
  )
};

export const CollapsedIconRail: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={980} height={520}>
      <SidebarExample defaultOpen={false} />
    </StoryFrame>
  )
};

export const Floating: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={980} height={520}>
      <SidebarExample variant="floating" />
    </StoryFrame>
  )
};
