"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TablePagination } from "@/components/ui/TablePagination";
import { TextField } from "@/components/ui/TextField";
import { useProjectSelectOptions } from "@/hooks/useProjects";
import { useInvoiceList } from "@/hooks/useInvoices";
import { buildInvoicePdfUrl } from "@/lib/api/invoice.api";
import {
  DEFAULT_INVOICE_PAGE_SIZE,
  INVOICE_STATUSES,
  INVOICE_STATUS_BADGE_CLASSES,
  INVOICE_STATUS_OPTIONS,
} from "@/lib/constants/invoice.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import type { InvoiceListFilters, InvoiceStatus } from "@/types/invoice.types";

interface DraftFilters {
  projectId: string;
  status: InvoiceStatus | "";
  startDate: string;
  endDate: string;
}

const EMPTY_DRAFT_FILTERS: DraftFilters = { projectId: "", status: "", startDate: "", endDate: "" };

function formatMoney(value: number, symbol: string | undefined): string {
  const rounded = value.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `${symbol} ${rounded}` : rounded;
}

/**
 * `/invoices` — list/manage client invoices, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "table with invoices, status badges,
 * View buttons"). Restricted to SystemAdmin/ProjectAdmin at the page level
 * (`app/(dashboard)/invoices/page.tsx`) — see
 * `lib/constants/invoice.constants.ts` for the rationale. Fetches live data
 * via `useInvoiceList` (TanStack Query -> `lib/api/invoice.api.ts` ->
 * `/api/invoices` Route Handler -> the .NET backend). That Route Handler
 * itself splits by role (`isProjectScopedInvoiceManager`): `Invoice/GetMyInvoices`
 * for a `ProjectAdmin`, `Invoice/GetAllInvoices` for `SystemAdmin` — this
 * component and `useInvoiceList` are unaware of which one served the request.
 *
 * The status "chips" are computed from a second, unfiltered-by-status
 * `useInvoiceList` call (capped at 100 rows, since neither backend endpoint
 * has a dedicated "counts by status" endpoint) so the counts stay accurate
 * even while the table itself is filtered to a single status.
 *
 * Unlike the reference-data tables (`CountriesListView`, `CurrenciesListView`,
 * etc.), this table's rows are paginated server-side — `page`/`pageSize` are
 * sent straight through to the backend via `tableFilters` below — rather
 * than via `hooks/useTablePagination.ts`'s client-side slicing. Per
 * the `bugs/paginations` feature request, the Previous/Next/page-number
 * controls themselves still render through the shared
 * `components/ui/TablePagination.tsx` (`react-paginate`-backed), the same
 * component every other list view in this app uses.
 */
export function InvoicesListView() {
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_DRAFT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_DRAFT_FILTERS);
  const [page, setPage] = useState(1);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Scoped to "my projects" for ProjectAdmin, full catalog for SystemAdmin —
  // see `hooks/useProjects.ts#useProjectSelectOptions` — matching
  // `Invoice/GetMyInvoices`'s own project scope for a ProjectAdmin (see
  // `lib/constants/invoice.constants.ts`).
  const { data: projects, isLoading: isProjectsLoading } = useProjectSelectOptions();
  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const summaryFilters: InvoiceListFilters = useMemo(
    () => ({
      projectId: appliedFilters.projectId || undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
      pageSize: 100,
    }),
    [appliedFilters]
  );
  const { data: summary } = useInvoiceList(summaryFilters);

  const statusCounts = useMemo(() => {
    const counts: Record<InvoiceStatus, number> = { Draft: 0, Sent: 0, Paid: 0, Void: 0, Cancelled: 0 };
    for (const invoice of summary?.items ?? []) {
      counts[invoice.status] += 1;
    }
    return counts;
  }, [summary]);

  const tableFilters: InvoiceListFilters = useMemo(
    () => ({
      projectId: appliedFilters.projectId || undefined,
      status: appliedFilters.status || undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
      page,
      pageSize: DEFAULT_INVOICE_PAGE_SIZE,
    }),
    [appliedFilters, page]
  );

  const { data: invoiceList, isLoading, isError, error, isFetching, refetch } =
    useInvoiceList(tableFilters);

  function handleApplyFilters() {
    setFilterError(null);
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setFilterError("Date From must be on or before Date To.");
      return;
    }
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  function handleReset() {
    setFilterError(null);
    setDraftFilters(EMPTY_DRAFT_FILTERS);
    setAppliedFilters(EMPTY_DRAFT_FILTERS);
    setPage(1);
  }

  const totalPages = invoiceList
    ? Math.max(1, Math.ceil(invoiceList.totalCount / (invoiceList.pageSize || DEFAULT_INVOICE_PAGE_SIZE)))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and track all client invoices.</p>
        </div>
        <Link
          href="/invoices/generate"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          + Generate Invoice
        </Link>
      </div>

      <ul aria-label="Invoice counts by status" className="flex flex-wrap gap-2">
        {INVOICE_STATUSES.map((status) => (
          <li
            key={status}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${INVOICE_STATUS_BADGE_CLASSES[status]}`}
          >
            {status} <span aria-hidden="true">·</span> {statusCounts[status]}
          </li>
        ))}
      </ul>

      <form
        aria-label="Filter invoices"
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full sm:w-56">
          <SelectField
            label="Project"
            value={draftFilters.projectId}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, projectId: event.target.value }))}
            options={sortedProjects.map((project) => ({ value: project.id, label: project.name }))}
            placeholder={isProjectsLoading ? "Loading projects…" : "All Projects"}
            // "All Projects" must stay re-selectable after picking a specific
            // project — see `components/ui/SelectField.tsx`'s
            // `placeholderDisabled` doc comment.
            placeholderDisabled={false}
            disabled={isProjectsLoading}
          />
        </div>
        <div className="w-full sm:w-44">
          <SelectField
            label="Status"
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, status: event.target.value as InvoiceStatus | "" }))
            }
            options={INVOICE_STATUS_OPTIONS}
            placeholder="All Statuses"
            placeholderDisabled={false}
          />
        </div>
        <div className="w-full sm:w-40">
          <TextField
            label="Date from"
            type="date"
            value={draftFilters.startDate}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>
        <div className="w-full sm:w-40">
          <TextField
            label="Date to"
            type="date"
            value={draftFilters.endDate}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>

      {filterError && <Alert variant="error">{filterError}</Alert>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500" role="status">
            Loading invoices…
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="error">{getApiErrorMessage(error, "Unable to load invoices.")}</Alert>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : !invoiceList || invoiceList.items.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {invoiceList && invoiceList.totalCount > 0
              ? "No invoices match the selected filters."
              : "No invoices yet. Click “+ Generate Invoice” to create one."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">List of client invoices</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Invoice #</th>
                  <th scope="col" className="px-4 py-3">Project</th>
                  <th scope="col" className="px-4 py-3">Client</th>
                  <th scope="col" className="px-4 py-3">Billing Period</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Due Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceList.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-slate-700">{invoice.project.name || "—"}</p>
                      {invoice.project.code && <p className="text-xs text-slate-500">{invoice.project.code}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{invoice.clientName}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDisplayDate(invoice.billingPeriodStart)} – {formatDisplayDate(invoice.billingPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatMoney(invoice.totalAmount, invoice.currency.symbol)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGE_CLASSES[invoice.status]}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDisplayDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                          View
                        </Link>
                        <a
                          href={buildInvoicePdfUrl(invoice.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          <Download aria-hidden="true" className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceList && (
        <TablePagination
          page={invoiceList.page}
          totalPages={totalPages}
          onPageChange={setPage}
          isDisabled={isFetching}
          label="Invoices pagination"
        />
      )}
    </div>
  );
}
