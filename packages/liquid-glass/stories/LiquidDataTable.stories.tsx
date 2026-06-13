import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidDataTable,
  type LiquidDataTableColumnDef,
  LiquidProvider,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

type ReleaseRow = {
  component: string;
  gate: string;
  owner: string;
  status: "Ready" | "Reviewing" | "Blocked";
};

const rows: ReleaseRow[] = [
  {
    component: "LiquidDataTable",
    gate: "Typed sorting, filtering, pagination",
    owner: "Design systems",
    status: "Ready"
  },
  {
    component: "LiquidResizable",
    gate: "Keyboard resize and panel persistence",
    owner: "Platform",
    status: "Ready"
  },
  {
    component: "LiquidCommand",
    gate: "Roving option focus and command filtering",
    owner: "Interaction",
    status: "Reviewing"
  },
  {
    component: "LiquidToast",
    gate: "Live-region announcements",
    owner: "Accessibility",
    status: "Ready"
  },
  {
    component: "LiquidCarousel",
    gate: "Motion policy and drag behavior",
    owner: "Experience",
    status: "Blocked"
  },
  {
    component: "LiquidDatePicker",
    gate: "Calendar semantics",
    owner: "Forms",
    status: "Reviewing"
  }
];

const columns: LiquidDataTableColumnDef<ReleaseRow>[] = [
  {
    accessorKey: "component",
    header: "Component",
    cell: ({ row }) => <strong>{row.original.component}</strong>
  },
  {
    accessorKey: "status",
    header: "Status"
  },
  {
    accessorKey: "owner",
    header: "Owner"
  },
  {
    accessorKey: "gate",
    header: "Gate",
    enableSorting: false
  }
];

const meta = {
  title: "Liquid Glass/Data Table",
  parameters: { a11y: { test: "error" } }
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const ProductReleaseTable: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={960} height={620}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography as="div" variant="h2">
          Release readiness
        </LiquidTypography>
        <LiquidDataTable
          caption="Component gates for the open-source release."
          columns={columns}
          data={rows}
          filterPlaceholder="Filter components..."
          getRowId={(row) => row.component}
          initialPageSize={5}
        />
      </div>
    </StoryFrame>
  )
};

export const DarkDenseTable: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={960} height={620}>
      <LiquidDataTable
        caption="Dense data keeps foreground text outside the refraction layer."
        columns={columns}
        data={rows}
        filterPlaceholder="Filter release gates..."
        getRowId={(row) => row.component}
        initialPageSize={5}
      />
    </StoryFrame>
  )
};

export const EmptyState: Story = {
  render: () => (
    <LiquidProvider defaultMode="solid">
      <div data-lg-theme="light" style={{ padding: 32 }}>
        <LiquidDataTable
          columns={columns}
          data={[]}
          emptyMessage="No components match this release gate."
          enableFiltering={false}
          enablePagination={false}
        />
      </div>
    </LiquidProvider>
  )
};
