"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { TablePagination } from "@/components/ui/TablePagination";
import { useProjectList } from "@/hooks/useProjects";
import { useUserRolesSummary } from "@/hooks/useReports";
import { useTablePagination } from "@/hooks/useTablePagination";
import { buildUserRolesSummaryExportUrl } from "@/lib/api/report.api";
import { EXPORT_FORMAT_OPTIONS } from "@/lib/constants/report.constants";
import { userRolesSummaryFilterSchema } from "@/lib/validators/report.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { getCurrentMonthToDateRange } from "@/lib/utils/date";
import { HorizontalBarChart } from "@/components/reports/HorizontalBarChart";
import type { UserRolesSummaryFilters } from "@/types/report.types";

interface DraftFilters {
  startDate: string;
  endDate: string;
  projectId: string;
}

function toAppliedFilters(draft: DraftFilters): UserRolesSummaryFilters {
  return {
    startDate: draft.startDate,
    endDate: draft.endDate,
    projectId: draft.projectId || undefined,
  };
}

/**
 * `/reports/roles-summary` — "User Roles Summary" per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "summary table + horizontal bar chart
 * placeholder"). Backed by `Report/GenerateUserRolesSummary`/
 * `ExportUserRolesSummary` (`docs/HR_System_BE.postman_collection.json`), via
 * `/api/reports/roles-summary(/export)`. Restricted to SystemAdmin/ProjectAdmin
 * — see `lib/constants/report.constants.ts`.
 */
export function UserRolesSummaryView() {
  const defaultRange = useMemo(() => getCurrentMonthToDateRange(), []);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    projectId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<UserRolesSummaryFilters | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const { data: projects, isLoading: isProjectsLoading } = useProjectList();
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
  } = useUserRolesSummary(appliedFilters ?? { startDate: "", endDate: "" }, {
    enabled: appliedFilters !== null,
  });

  function handleApplyFilters() {
    setFilterError(null);
    const parsed = userRolesSummaryFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Check the selected date range.");
      return;
    }
    setAppliedFilters(toAppliedFilters(draftFilters));
  }

  const chartBars = useMemo(() => {
    if (!report) return [];
    return report.summary.map((row) => ({
      label: row.resourceRoleType.name,
      value: row.totalHours,
      valueLabel: `${row.totalHours}h`,
    }));
  }, [report]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedSummaryRows,
  } = useTablePagination(report?.summary ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">User Roles Summary</h1>
          <p className="mt-1 text-sm text-slate-500">Total hours grouped by user role.</p>
        </div>
        {appliedFilters && (
          <div className="flex gap-2">
            {EXPORT_FORMAT_OPTIONS.map((format) => (
              <a
                key={format.value}
                href={buildUserRolesSummaryExportUrl(appliedFilters, format.value)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {format.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <form
        aria-label="Filter user roles summary"
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full sm:w-40">
          <TextField
            label="Date from"
            type="date"
            required
            value={draftFilters.startDate}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>
        <div className="w-full sm:w-40">
          <TextField
            label="Date to"
            type="date"
            required
            value={draftFilters.endDate}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectField
            label="Project"
            value={draftFilters.projectId}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, projectId: event.target.value }))}
            options={sortedProjects.map((project) => ({ value: project.id, label: project.name }))}
            placeholder={isProjectsLoading ? "Loading projects…" : "All Projects"}
            disabled={isProjectsLoading}
          />
        </div>
        <div>
          <Button type="submit">Apply</Button>
        </div>
      </form>

      {filterError && <Alert variant="error">{filterError}</Alert>}

      {appliedFilters === null ? (
        <Alert variant="info">Select a date range and click &quot;Apply&quot; to generate the summary.</Alert>
      ) : isReportLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Generating user roles summary…
        </div>
      ) : isReportError ? (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{getApiErrorMessage(reportError, "Unable to generate the user roles summary.")}</Alert>
          <div>
            <Button type="button" variant="secondary" onClick={() => refetchReport()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !report || report.summary.length === 0 ? (
        <Alert variant="info">No timesheet data for the selected filters.</Alert>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">User roles summary</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">User Count</th>
                    <th scope="col" className="px-4 py-3">Total Hours</th>
                    <th scope="col" className="px-4 py-3">Avg Hrs / User</th>
                    <th scope="col" className="px-4 py-3">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedSummaryRows.map((row) => {
                    const avgHours = row.userCount > 0 ? row.totalHours / row.userCount : 0;
                    const percentOfTotal = report.grandTotalHours > 0 ? (row.totalHours / report.grandTotalHours) * 100 : 0;
                    return (
                      <tr key={row.resourceRoleType.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.resourceRoleType.name}</td>
                        <td className="px-4 py-3 text-slate-700">{row.userCount}</td>
                        <td className="px-4 py-3 text-slate-700">{row.totalHours}h</td>
                        <td className="px-4 py-3 text-slate-700">{avgHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-slate-700">{percentOfTotal.toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3">
                      {report.summary.reduce((total, row) => total + row.userCount, 0)}
                    </td>
                    <td className="px-4 py-3">{report.grandTotalHours}h</td>
                    <td className="px-4 py-3" colSpan={2}>
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="border-t border-slate-200 p-4">
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                label="User roles summary pagination"
              />
            </div>
          </div>

          <HorizontalBarChart title="Hours by Role" bars={chartBars} />
        </div>
      )}
    </div>
  );
}
