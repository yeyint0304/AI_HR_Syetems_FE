"use client";

import { Fragment, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MonthYearPicker } from "@/components/ui/MonthYearPicker";
import { SelectField } from "@/components/ui/SelectField";
import { TablePagination } from "@/components/ui/TablePagination";
import { useProjectSelectOptions } from "@/hooks/useProjects";
import { useMonthlyCostRevenue } from "@/hooks/useReports";
import { useTablePagination } from "@/hooks/useTablePagination";
import { buildMonthlyCostRevenueExportUrl } from "@/lib/api/report.api";
import { EXPORT_FORMAT_OPTIONS, MAX_REPORT_YEAR, MIN_REPORT_YEAR } from "@/lib/constants/report.constants";
import { monthlyCostRevenueFilterSchema } from "@/lib/validators/report.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { HorizontalBarChart } from "@/components/reports/HorizontalBarChart";
import type { MonthlyCostRevenueFilters } from "@/types/report.types";

interface DraftFilters {
  /** Year/month bound to the `MonthYearPicker` calendar filter. */
  year: number;
  month: number;
  projectId: string;
}

function getDefaultYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatMoney(value: number, symbol: string | undefined): string {
  const rounded = value.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `${symbol} ${rounded}` : rounded;
}

/**
 * `/reports/cost-revenue` — "Cost & Revenue Report" per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "KPI cards + cost/revenue table + chart
 * placeholder"). Backed by `Report/GenerateMonthlyCostRevenue`/
 * `ExportMonthlyCostRevenue` (`docs/HR_System_BE.postman_collection.json`),
 * via `/api/reports/cost-revenue(/export)`. Restricted to
 * SystemAdmin/ProjectAdmin — see `lib/constants/report.constants.ts`.
 *
 * The backend's `Breakdown` rows are aggregated per resource-role-type (not
 * per individual resource) and there is no `currencyId` reference-data
 * dropdown implemented yet (Administration > Currencies is a separate,
 * not-yet-implemented module), so the "output currency" filter is omitted —
 * the report renders in whatever currency the backend returns by default.
 */
export function CostRevenueReportView() {
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    ...getDefaultYearMonth(),
    projectId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<MonthlyCostRevenueFilters | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Scoped to "my projects" for ProjectAdmin, full catalog for SystemAdmin —
  // see `hooks/useProjects.ts#useProjectSelectOptions` — so the Project
  // filter never offers a project outside what
  // `Report/GenerateMonthlyCostRevenue` actually covers for the signed-in
  // role. This report is restricted to SystemAdmin/ProjectAdmin (see this
  // component's doc comment), so `Employee` never reaches this branch.
  const { data: projects, isLoading: isProjectsLoading } = useProjectSelectOptions();
  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const {
    data: report,
    isLoading: isReportLoading,
    isError: isReportError,
    error: reportError,
    refetch: refetchReport,
  } = useMonthlyCostRevenue(appliedFilters ?? { year: 0, month: 0 }, {
    enabled: appliedFilters !== null,
  });

  function handleApplyFilters() {
    setFilterError(null);

    const parsed = monthlyCostRevenueFilterSchema.safeParse({
      year: draftFilters.year,
      month: draftFilters.month,
      projectId: draftFilters.projectId || undefined,
    });
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Select a valid month.");
      return;
    }
    setAppliedFilters(parsed.data);
  }

  const totals = useMemo(() => {
    if (!report) return { hours: 0, cost: 0, revenue: 0 };
    return report.projects.reduce(
      (acc, project) => ({
        hours: acc.hours + project.totalHours,
        cost: acc.cost + project.totalCost,
        revenue: acc.revenue + project.totalRevenue,
      }),
      { hours: 0, cost: 0, revenue: 0 }
    );
  }, [report]);

  const marginPercent = totals.revenue > 0 ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0;
  const currencySymbol = report?.currency?.symbol;

  const chartBars = useMemo(() => {
    if (!report) return [];
    return report.projects.flatMap((project) => [
      {
        label: `${project.project.name} — Cost`,
        value: project.totalCost,
        valueLabel: formatMoney(project.totalCost, currencySymbol),
      },
      {
        label: `${project.project.name} — Revenue`,
        value: project.totalRevenue,
        valueLabel: formatMoney(project.totalRevenue, currencySymbol),
      },
    ]);
  }, [report, currencySymbol]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedProjects,
  } = useTablePagination(report?.projects ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cost &amp; Revenue Report</h1>
          <p className="mt-1 text-sm text-slate-500">Monthly project cost and revenue using rate cards.</p>
        </div>
        {appliedFilters && (
          <div className="flex gap-2">
            {EXPORT_FORMAT_OPTIONS.map((format) => (
              <a
                key={format.value}
                href={buildMonthlyCostRevenueExportUrl(appliedFilters, format.value)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {format.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <form
        aria-label="Filter cost & revenue report"
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full sm:w-48">
          <MonthYearPicker
            id="cost-revenue-month"
            label="Month"
            year={draftFilters.year}
            month={draftFilters.month}
            onChange={(year, month) => setDraftFilters((prev) => ({ ...prev, year, month }))}
            minYear={MIN_REPORT_YEAR}
            maxYear={MAX_REPORT_YEAR}
          />
        </div>
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
        <div>
          <Button type="submit">Apply</Button>
        </div>
      </form>

      {filterError && <Alert variant="error">{filterError}</Alert>}

      {appliedFilters === null ? (
        <Alert variant="info">Select a month and click &quot;Apply&quot; to generate the report.</Alert>
      ) : isReportLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Generating cost &amp; revenue report…
        </div>
      ) : isReportError ? (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{getApiErrorMessage(reportError, "Unable to generate the cost & revenue report.")}</Alert>
          <div>
            <Button type="button" variant="secondary" onClick={() => refetchReport()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !report || report.projects.length === 0 ? (
        <Alert variant="info">No cost/revenue data for the selected month.</Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Hours</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.hours}h</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Cost</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{formatMoney(totals.cost, currencySymbol)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{formatMoney(totals.revenue, currencySymbol)}</p>
              <p className="mt-1 text-xs text-slate-500">Margin {marginPercent.toFixed(0)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <caption className="sr-only">Cost and revenue breakdown by project and role</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Project</th>
                      <th scope="col" className="px-4 py-3">Role</th>
                      <th scope="col" className="px-4 py-3">Hours</th>
                      <th scope="col" className="px-4 py-3">Cost Rate</th>
                      <th scope="col" className="px-4 py-3">Billing Rate</th>
                      <th scope="col" className="px-4 py-3">Cost</th>
                      <th scope="col" className="px-4 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedProjects.map((project) => (
                      <Fragment key={project.project.id}>
                        {project.breakdown.map((row, index) => (
                          <tr key={`${project.project.id}-${row.resourceRoleType}-${index}`}>
                            <td className="px-4 py-3 align-top">
                              {index === 0 && (
                                <>
                                  <p className="font-medium text-slate-900">{project.project.name}</p>
                                  {project.project.code && (
                                    <p className="text-xs text-slate-500">{project.project.code}</p>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">{row.resourceRoleType}</td>
                            <td className="px-4 py-3 align-top text-slate-700">{row.hours}h</td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              {formatMoney(row.costRate, currencySymbol)}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              {formatMoney(row.billingRate, currencySymbol)}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              {formatMoney(row.cost, currencySymbol)}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              {formatMoney(row.revenue, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold text-slate-900">
                          <td className="px-4 py-2" colSpan={2}>
                            {project.project.code} Subtotal
                          </td>
                          <td className="px-4 py-2">{project.totalHours}h</td>
                          <td className="px-4 py-2" colSpan={2} />
                          <td className="px-4 py-2">{formatMoney(project.totalCost, currencySymbol)}</td>
                          <td className="px-4 py-2">{formatMoney(project.totalRevenue, currencySymbol)}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-100 font-semibold text-slate-900">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3">{totals.hours}h</td>
                      <td className="px-4 py-3" colSpan={2} />
                      <td className="px-4 py-3">{formatMoney(totals.cost, currencySymbol)}</td>
                      <td className="px-4 py-3">{formatMoney(totals.revenue, currencySymbol)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="border-t border-slate-200 p-4">
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  label="Cost and revenue breakdown pagination"
                />
              </div>
            </div>

            <HorizontalBarChart title="Cost vs Revenue" bars={chartBars} />
          </div>
        </>
      )}
    </div>
  );
}
