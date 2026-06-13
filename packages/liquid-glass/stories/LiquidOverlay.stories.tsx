import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidAlertDialog,
  LiquidAlertDialogAction,
  LiquidAlertDialogCancel,
  LiquidAlertDialogContent,
  LiquidAlertDialogDescription,
  LiquidAlertDialogFooter,
  LiquidAlertDialogHeader,
  LiquidAlertDialogTitle,
  LiquidAlertDialogTrigger,
  LiquidContextMenu,
  LiquidContextMenuContent,
  LiquidContextMenuItem,
  LiquidContextMenuLabel,
  LiquidContextMenuSeparator,
  LiquidContextMenuTrigger,
  LiquidCollapsible,
  LiquidCollapsibleContent,
  LiquidCollapsibleTrigger,
  LiquidDropdownMenu,
  LiquidDropdownMenuContent,
  LiquidDropdownMenuItem,
  LiquidDropdownMenuLabel,
  LiquidDropdownMenuSeparator,
  LiquidDropdownMenuTrigger,
  LiquidDrawer,
  LiquidDrawerClose,
  LiquidDrawerContent,
  LiquidDrawerDescription,
  LiquidDrawerFooter,
  LiquidDrawerHeader,
  LiquidDrawerTitle,
  LiquidDrawerTrigger,
  LiquidHoverCard,
  LiquidHoverCardContent,
  LiquidHoverCardTrigger,
  LiquidMenubar,
  LiquidPopover,
  LiquidPopoverClose,
  LiquidPopoverContent,
  LiquidPopoverTrigger,
  LiquidSheet,
  LiquidSheetClose,
  LiquidSheetContent,
  LiquidSheetDescription,
  LiquidSheetFooter,
  LiquidSheetHeader,
  LiquidSheetTitle,
  LiquidSheetTrigger,
  LiquidTooltip,
  LiquidTooltipContent,
  LiquidTooltipTrigger,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/Overlay Primitives",
  parameters: { a11y: { test: "error" } }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Light: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={680}>
      <OverlayExample />
    </StoryFrame>
  )
};

export const Dark: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={680}>
      <OverlayExample />
    </StoryFrame>
  )
};

function OverlayExample() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <LiquidTypography variant="h2">Overlay primitives</LiquidTypography>
      <LiquidTypography variant="lead">
        Popovers and sheets use clear foreground content over a controlled material shell.
      </LiquidTypography>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <LiquidPopover>
          <LiquidPopoverTrigger>Open popover</LiquidPopoverTrigger>
          <LiquidPopoverContent align="start">
            <LiquidTypography variant="h3">Release channel</LiquidTypography>
            <LiquidTypography variant="muted">
              Enhanced refraction is capped by surface budget and browser capability.
            </LiquidTypography>
            <LiquidPopoverClose>Done</LiquidPopoverClose>
          </LiquidPopoverContent>
        </LiquidPopover>

        <LiquidTooltip delayDuration={0}>
          <LiquidTooltipTrigger>Hover tooltip</LiquidTooltipTrigger>
          <LiquidTooltipContent>Small help text, not a hard outline.</LiquidTooltipContent>
        </LiquidTooltip>

        <LiquidHoverCard openDelay={0}>
          <LiquidHoverCardTrigger href="#">Hover card</LiquidHoverCardTrigger>
          <LiquidHoverCardContent>
            <LiquidTypography variant="h3">Frontend systems</LiquidTypography>
            <LiquidTypography variant="muted">
              Dense, readable, and backed by deterministic behavior tests.
            </LiquidTypography>
          </LiquidHoverCardContent>
        </LiquidHoverCard>

        <LiquidSheet>
          <LiquidSheetTrigger>Open sheet</LiquidSheetTrigger>
          <LiquidSheetContent side="right">
            <LiquidSheetHeader>
              <LiquidSheetTitle>Project settings</LiquidSheetTitle>
              <LiquidSheetDescription>
                Sheet content uses dialog semantics with a side-mounted material surface.
              </LiquidSheetDescription>
            </LiquidSheetHeader>
            <LiquidTypography variant="p">
              Use sheets for focused editing. Long article content should stay outside glass.
            </LiquidTypography>
            <LiquidSheetFooter>
              <LiquidSheetClose>Close</LiquidSheetClose>
            </LiquidSheetFooter>
          </LiquidSheetContent>
        </LiquidSheet>

        <LiquidDrawer>
          <LiquidDrawerTrigger>Open drawer</LiquidDrawerTrigger>
          <LiquidDrawerContent side="bottom">
            <LiquidDrawerHeader>
              <LiquidDrawerTitle>Release drawer</LiquidDrawerTitle>
              <LiquidDrawerDescription>
                Drawer defaults to a bottom sheet so mobile ergonomics stay sane.
              </LiquidDrawerDescription>
            </LiquidDrawerHeader>
            <LiquidTypography variant="p">
              Use drawers for short, focused decisions. They reuse sheet semantics instead of a
              separate overlay model.
            </LiquidTypography>
            <LiquidDrawerFooter>
              <LiquidDrawerClose>Done</LiquidDrawerClose>
            </LiquidDrawerFooter>
          </LiquidDrawerContent>
        </LiquidDrawer>

        <LiquidAlertDialog>
          <LiquidAlertDialogTrigger>Delete snapshot</LiquidAlertDialogTrigger>
          <LiquidAlertDialogContent mode="fallback">
            <LiquidAlertDialogHeader>
              <LiquidAlertDialogTitle>Delete visual baseline?</LiquidAlertDialogTitle>
              <LiquidAlertDialogDescription>
                This action changes the reference snapshot used by CI. Keep a reviewable diff.
              </LiquidAlertDialogDescription>
            </LiquidAlertDialogHeader>
            <LiquidAlertDialogFooter>
              <LiquidAlertDialogCancel>Cancel</LiquidAlertDialogCancel>
              <LiquidAlertDialogAction>Delete</LiquidAlertDialogAction>
            </LiquidAlertDialogFooter>
          </LiquidAlertDialogContent>
        </LiquidAlertDialog>

        <LiquidDropdownMenu>
          <LiquidDropdownMenuTrigger>Actions</LiquidDropdownMenuTrigger>
          <LiquidDropdownMenuContent aria-label="Release actions" align="start">
            <LiquidDropdownMenuLabel>Release</LiquidDropdownMenuLabel>
            <LiquidDropdownMenuItem>Copy link</LiquidDropdownMenuItem>
            <LiquidDropdownMenuItem>Open report</LiquidDropdownMenuItem>
            <LiquidDropdownMenuSeparator />
            <LiquidDropdownMenuItem disabled>Archive locked</LiquidDropdownMenuItem>
          </LiquidDropdownMenuContent>
        </LiquidDropdownMenu>
      </div>

      <LiquidMenubar
        aria-label="Project navigation"
        menus={[
          {
            label: "File",
            value: "file",
            items: [
              { label: "New note", value: "new-note" },
              { label: "Export", value: "export" }
            ]
          },
          {
            label: "View",
            value: "view",
            items: [
              { label: "Command center", value: "command-center" },
              { label: "Toggle sidebar", value: "toggle-sidebar" }
            ]
          }
        ]}
      />

      <LiquidContextMenu>
        <LiquidContextMenuTrigger>
          <div
            style={{
              border: "1px dashed color-mix(in srgb, var(--lg-text), transparent 72%)",
              borderRadius: 18,
              padding: "1rem",
              color: "var(--lg-text-muted)"
            }}
          >
            Right click or press Shift+F10 for context actions.
          </div>
        </LiquidContextMenuTrigger>
        <LiquidContextMenuContent aria-label="Block actions">
          <LiquidContextMenuLabel>Block</LiquidContextMenuLabel>
          <LiquidContextMenuItem>Copy block link</LiquidContextMenuItem>
          <LiquidContextMenuItem>Duplicate</LiquidContextMenuItem>
          <LiquidContextMenuSeparator />
          <LiquidContextMenuItem disabled>Delete locked</LiquidContextMenuItem>
        </LiquidContextMenuContent>
      </LiquidContextMenu>

      <LiquidCollapsible defaultOpen>
        <LiquidCollapsibleTrigger>Toggle implementation notes</LiquidCollapsibleTrigger>
        <LiquidCollapsibleContent>
          <LiquidTypography variant="p">
            Collapsible content is a labelled region. Trigger state is exposed with aria-expanded
            and aria-controls.
          </LiquidTypography>
        </LiquidCollapsibleContent>
      </LiquidCollapsible>
    </div>
  );
}
