"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type Row,
  type SortingState
} from "@tanstack/react-table";
import {
  forwardRef,
  useId,
  useMemo,
  useState,
  type AriaAttributes,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref
} from "react";
import { LiquidButton } from "./LiquidButton";
import { LiquidInput } from "./LiquidField";
import { LiquidNativeSelect } from "./LiquidNativeSelect";
import {
  LiquidTable,
  LiquidTableBody,
  LiquidTableCaption,
  LiquidTableCell,
  LiquidTableContainer,
  LiquidTableHead,
  LiquidTableHeader,
  LiquidTableRow
} from "./LiquidTable";
import { cn } from "../utils/cn";

export type LiquidDataTableColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue>;

export type LiquidDataTableProps<TData> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  caption?: ReactNode;
  columns: LiquidDataTableColumnDef<TData, unknown>[];
  data: TData[];
  emptyMessage?: ReactNode;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  filterLabel?: string;
  filterPlaceholder?: string;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

const defaultPageSizeOptions = [5, 10, 20, 50];

function getHeaderSort(header: {
  column: { getIsSorted: () => false | "asc" | "desc" };
}): AriaAttributes["aria-sort"] {
  const sort = header.column.getIsSorted();

  if (sort === "asc") {
    return "ascending";
  }

  if (sort === "desc") {
    return "descending";
  }

  return "none";
}

function getSortIndicator(sort: false | "asc" | "desc") {
  if (sort === "asc") {
    return "↑";
  }

  if (sort === "desc") {
    return "↓";
  }

  return "↕";
}

function LiquidDataTableInner<TData>(
  {
    caption,
    className,
    columns,
    data,
    emptyMessage = "No results.",
    enableFiltering = true,
    enablePagination = true,
    enableSorting = true,
    filterLabel = "Filter table rows",
    filterPlaceholder = "Filter rows...",
    getRowId,
    initialPageSize,
    pageSizeOptions = defaultPageSizeOptions,
    ...props
  }: LiquidDataTableProps<TData>,
  ref: ForwardedRef<HTMLDivElement>
) {
  const stablePageSizeOptions = useMemo(() => {
    const sizes = Array.from(new Set(pageSizeOptions)).filter((size) => size > 0);
    return sizes.length > 0 ? sizes : defaultPageSizeOptions;
  }, [pageSizeOptions]);
  const startingPageSize = initialPageSize ?? stablePageSizeOptions[0] ?? defaultPageSizeOptions[0];
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: startingPageSize
  });
  const filterId = useId();
  const pageSizeId = useId();

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack owns mutable row-model methods; this wrapper only renders the resolved table state.
  const table = useReactTable({
    columns,
    data,
    enableSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getRowId,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      globalFilter,
      pagination,
      sorting
    }
  });

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div {...props} className={cn("lg-data-table", className)} ref={ref}>
      {enableFiltering || enablePagination ? (
        <div className="lg-data-table__toolbar">
          {enableFiltering ? (
            <div className="lg-data-table__filter">
              <label className="lg-sr-only" htmlFor={filterId}>
                {filterLabel}
              </label>
              <LiquidInput
                id={filterId}
                onChange={(event) => {
                  table.setPageIndex(0);
                  setGlobalFilter(event.currentTarget.value);
                }}
                placeholder={filterPlaceholder}
                surfaceProps={{ className: "lg-data-table__filter-surface", radius: "pill" }}
                type="search"
                value={globalFilter}
              />
            </div>
          ) : null}

          {enablePagination ? (
            <div className="lg-data-table__density">
              <label className="lg-data-table__page-size-label" htmlFor={pageSizeId}>
                Rows
              </label>
              <LiquidNativeSelect
                id={pageSizeId}
                onChange={(event) => {
                  table.setPageSize(Number(event.currentTarget.value));
                }}
                surfaceProps={{ className: "lg-data-table__page-size-surface", radius: "pill" }}
                value={table.getState().pagination.pageSize}
              >
                {stablePageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </LiquidNativeSelect>
            </div>
          ) : null}
        </div>
      ) : null}

      <LiquidTableContainer className="lg-data-table__container">
        <LiquidTable className="lg-data-table__table">
          {caption ? <LiquidTableCaption>{caption}</LiquidTableCaption> : null}
          <LiquidTableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <LiquidTableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = enableSorting && header.column.getCanSort();

                  return (
                    <LiquidTableHead
                      aria-sort={canSort ? getHeaderSort(header) : undefined}
                      className="lg-data-table__head"
                      colSpan={header.colSpan}
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="lg-data-table__sort"
                          data-sort={sorted || "none"}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <span aria-hidden="true" className="lg-data-table__sort-indicator">
                            {getSortIndicator(sorted)}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </LiquidTableHead>
                  );
                })}
              </LiquidTableRow>
            ))}
          </LiquidTableHeader>
          <LiquidTableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <LiquidTableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <LiquidTableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </LiquidTableCell>
                  ))}
                </LiquidTableRow>
              ))
            ) : (
              <LiquidTableRow>
                <LiquidTableCell className="lg-data-table__empty" colSpan={columns.length}>
                  {emptyMessage}
                </LiquidTableCell>
              </LiquidTableRow>
            )}
          </LiquidTableBody>
        </LiquidTable>
      </LiquidTableContainer>

      {enablePagination ? (
        <div className="lg-data-table__pagination">
          <span className="lg-data-table__summary">
            {totalRows} row{totalRows === 1 ? "" : "s"}
          </span>
          <div className="lg-data-table__pager">
            <LiquidButton
              disabled={!table.getCanPreviousPage()}
              mode="fallback"
              onClick={() => table.previousPage()}
            >
              Previous
            </LiquidButton>
            <span aria-live="polite" className="lg-data-table__page">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(pageCount, 1)}
            </span>
            <LiquidButton
              disabled={!table.getCanNextPage()}
              mode="fallback"
              onClick={() => table.nextPage()}
            >
              Next
            </LiquidButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const LiquidDataTable = forwardRef(LiquidDataTableInner) as <TData>(
  props: LiquidDataTableProps<TData> & { ref?: Ref<HTMLDivElement> }
) => ReactElement | null;
