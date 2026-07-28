"use client";

import { useEffect, useRef } from "react";
import ReactPaginate from "react-paginate";

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Accessible name for the `<nav>` landmark, e.g. "Currencies pagination". */
  label: string;
  isDisabled?: boolean;
}

/**
 * Numbered pagination control (Previous / page numbers / Next), backed by
 * `react-paginate` (`https://github.com/AdeleD/react-paginate`). Renders
 * nothing when there's only one page, so tables with a handful of rows are
 * unaffected.
 *
 * Per the `bugs/paginations` feature request ("add pagination UI to all
 * tables where pagination is currently missing... using react-paginate"),
 * this is the single, shared pagination control every reference-data table
 * and list view in this app renders (see `hooks/useTablePagination.ts`'s doc
 * comment for the full list) — updating this one file upgrades every
 * consumer at once rather than hand-rolling Previous/Next markup per view.
 *
 * `react-paginate`'s `<PaginationBoxView>` unconditionally renders its own
 * `<ul role="navigation" aria-label="Pagination">` internally — that's
 * hardcoded in `PaginationBoxView.js` and isn't overridable via any v8 prop.
 * Left as-is, that produces two nested `navigation` landmarks per control
 * (this component's own outer `<nav aria-label={label}>` plus
 * react-paginate's inner `<ul>`), and `role="navigation"` on a `<ul>` also
 * strips its implicit `list` role — which in turn strips its `<li>`
 * children's implicit `listitem` role (a real `axe`/`jest-axe` violation,
 * confirmed against `56b41b1`'s QA history). Since props can't fix this, a
 * `ref` + `useEffect` strips the inner `<ul>`'s `role`/`aria-label`
 * attributes right after mount: that collapses the control back down to a
 * single landmark (this component's own outer `<nav>`, named with the
 * caller-supplied, table-specific `label` — e.g. "Currencies pagination",
 * matching every other accessible-name convention in this app) and restores
 * native list/listitem semantics for screen readers. React's reconciler
 * never re-applies `role`/`aria-label` to that `<ul>` on subsequent
 * `ReactPaginate` re-renders (its own JSX output for those two props is
 * identical every render, so there's nothing for the diff to re-commit),
 * so the manual removal sticks across page changes.
 *
 * `previousAriaLabel`/`nextAriaLabel` are set to the exact same text as the
 * visible `previousLabel`/`nextLabel` ("Previous"/"Next") — ARIA's
 * accessible-name computation prefers `aria-label` over visible text content,
 * so leaving `react-paginate`'s defaults ("Previous page"/"Next page") would
 * make the *visible* button read "Previous"/"Next" while its *accessible*
 * name silently differed. Keeping them identical keeps sighted and
 * assistive-technology users looking at the exact same label.
 *
 * `react-paginate` renders Previous/Next/page controls as `<a role="button">`
 * elements (not native `<button>`s), each carrying `aria-disabled` rather
 * than the native `disabled` attribute — assert against `aria-disabled`
 * rather than jest-dom's `toBeDisabled()` (which only recognizes real form
 * controls) when testing this component.
 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
  label,
  isDisabled = false,
}: TablePaginationProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nestedNav = listContainerRef.current?.querySelector('ul[role="navigation"]');
    if (!nestedNav) return;
    nestedNav.removeAttribute("role");
    nestedNav.removeAttribute("aria-label");
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div
        ref={listContainerRef}
        aria-disabled={isDisabled || undefined}
        className={isDisabled ? "pointer-events-none opacity-60" : undefined}
      >
        <ReactPaginate
          pageCount={totalPages}
          forcePage={page - 1}
          onPageChange={(selected) => {
            if (isDisabled) return;
            onPageChange(selected.selected + 1);
          }}
          previousLabel="Previous"
          nextLabel="Next"
          previousAriaLabel="Previous"
          nextAriaLabel="Next"
          breakLabel="…"
          pageRangeDisplayed={2}
          marginPagesDisplayed={1}
          renderOnZeroPageCount={null}
          containerClassName="flex flex-wrap items-center gap-1"
          pageClassName="inline-flex"
          pageLinkClassName="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          activeLinkClassName="!bg-blue-600 !text-white hover:!bg-blue-600"
          previousClassName="inline-flex"
          nextClassName="inline-flex"
          previousLinkClassName="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          nextLinkClassName="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          disabledClassName="pointer-events-none"
          disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-white"
          breakClassName="inline-flex"
          breakLinkClassName="inline-flex h-8 items-center px-1 text-sm text-slate-400"
        />
      </div>
    </nav>
  );
}
