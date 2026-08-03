"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TablePagination } from "@/components/ui/TablePagination";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useProjectSelectOptions } from "@/hooks/useProjects";
import { useTimesheetReport } from "@/hooks/useReports";
import { buildTimesheetReportExportUrl } from "@/lib/api/report.api";
import {
  canManageReports,
  DEFAULT_TIMESHEET_REPORT_PAGE_SIZE,
  EXPORT_FORMAT_OPTIONS,
  isProjectScopedReportManager,
} from "@/lib/constants/report.constants";
import { timesheetReportFilterSchema } from "@/lib/validators/report.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate, getCurrentMonthToDateRange } from "@/lib/utils/date";
import type { TimesheetReportFilters } from "@/types/report.types";

interface DraftFilters {
  startDate: string;
  endDate: string;
  projectId: string;
  userId: string;
  isApproved: "" | "true" | "false";
}

const STATUS_OPTIONS = [
  { value: "true", label: "Approved" },
  { value: "false", label: "Pending" },
];

/** Narrows a raw `<select>` string value to the `isApproved` tri-state union without an unjustified type assertion. */
function toApprovedFilterValue(value: string): DraftFilters["isApproved"] {
  if (value === "true" || value === "false") return value;
  return "";
}

function toAppliedFilters(draft: DraftFilters, page: number): TimesheetReportFilters {
  return {
    startDate: draft.startDate,
    endDate: draft.endDate,
    projectId: draft.projectId || undefined,
    userId: draft.userId || undefined,
    isApproved: draft.isApproved === "" ? undefined : draft.isApproved === "true",
    page,
    pageSize: DEFAULT_TIMESHEET_REPORT_PAGE_SIZE,
  };
}

/**
 * `/reports/timesheet` — "Timesheet Report" per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "filter bar + data table with all
 * entries"). Backed by `Report/GenerateTimesheetReport`/`ExportTimesheetReport`
 * (`docs/HR_System_BE.postman_collection.json`), via
 * `/api/reports/timesheet(/export)`.
 *
 * A plain `User` is self-scoped to their own rows server-side (see
 * `app/api/reports/timesheet/route.ts`), so the "User ID" filter is only
 * rendered for `SystemAdmin` — the only role whose branch there
 * (`Report/GenerateTimesheetReport`) actually honors an arbitrary `userId`.
 * A `ProjectAdmin` is powered by the self/team-scoped
 * `Report/GenerateMyTimesheetReport` instead (see that Route Handler's
 * docblock), which documents no `userId` param, so the filter would be
 * misleading if shown to them. There is no "list all users" reference-data
 * endpoint in this codebase yet (user management is a separate,
 * not-yet-implemented Administration module — see
 * `lib/constants/navigation.constants.ts`), so this intentionally accepts a
 * raw User ID (GUID) rather than a fabricated dropdown.
 *
 * Like `InvoicesListView`, this report's rows are paginated server-side
 * (`page`/`pageSize` round-trip to `Report/GenerateTimesheetReport` via
 * `goToPage`/`appliedFilters` below) rather than via
 * `hooks/useTablePagination.ts`'s client-side slicing, but per the
 * `bugs/paginations` feature request the Previous/Next/page-number controls
 * themselves render through the same shared, `react-paginate`-backed
 * `components/ui/TablePagination.tsx` every other list view uses.
 */
export function TimesheetReportView() {
  const { user } = useAuth();
  // Only SystemAdmin's branch (`Report/GenerateTimesheetReport`) honors an
  // arbitrary `userId` filter — a ProjectAdmin is powered by the self/team
  // -scoped `Report/GenerateMyTimesheetReport` instead (see this component's
  // doc comment), so the filter is hidden for them.
  const canFilterByUser = canManageReports(user?.role) && !isProjectScopedReportManager(user?.role);

  const defaultRange = useMemo(() => getCurrentMonthToDateRange(), []);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    projectId: "",
    userId: "",
    isApproved: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<TimesheetReportFilters | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Scoped to "my projects" for ProjectAdmin/Employee, full catalog for
  // SystemAdmin — see `hooks/useProjects.ts#useProjectSelectOptions` — so the
  // Project filter never offers a project outside what
  // `Report/GenerateMyTimesheetReport`/`Report/GenerateTimesheetReport`
  // actually covers for the signed-in role.
  const { data: projects, isLoading: isProjectsLoading } = useProjectSelectOptions();
  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const {
    data: report,
    isLoading: isReportLoading,
    isFetching: isReportFetching,
    isError: isReportError,
    error: reportError,
    refetch: refetchReport,
  } = useTimesheetReport(appliedFilters ?? { startDate: "", endDate: "" }, {
    enabled: appliedFilters !== null,
  });

  function handleApplyFilters() {
    setFilterError(null);
    const parsed = timesheetReportFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Check the selected filters.");
      return;
    }
    if (draftFilters.userId && !/^[0-9a-fA-F-]{36}$/.test(draftFilters.userId)) {
      setFilterError("User ID must be a valid GUID.");
      return;
    }
    setAppliedFilters(toAppliedFilters(draftFilters, 1));
  }

  function handleReset() {
    setFilterError(null);
    setDraftFilters({
      startDate: defaultRange.startDate,
      endDate: defaultRange.endDate,
      projectId: "",
      userId: "",
      isApproved: "",
    });
    setAppliedFilters(null);
  }

  function goToPage(nextPage: number) {
    if (!appliedFilters) return;
    setAppliedFilters({ ...appliedFilters, page: nextPage });
  }

  const totalPages = report ? Math.max(1, Math.ceil(report.totalCount / (report.pageSize || DEFAULT_TIMESHEET_REPORT_PAGE_SIZE))) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Timesheet Report</h1>
          <p className="mt-1 text-sm text-slate-500">Detailed entries by project, user, and date.</p>
        </div>
        {appliedFilters && (
          <div className="flex gap-2">
            {EXPORT_FORMAT_OPTIONS.map((format) => (
              <a
                key={format.value}
                href={buildTimesheetReportExportUrl(appliedFilters, format.value)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {format.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <form
        aria-label="Filter timesheet report"
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
            // "All Projects" is a real, re-selectable filter value, not just an
            // initial hint — without this, `SelectField`'s default `disabled`
            // placeholder becomes permanently unreachable once a specific
            // project is chosen (see `components/ui/SelectField.tsx`'s
            // `placeholderDisabled` doc comment).
            placeholderDisabled={false}
            disabled={isProjectsLoading}
          />
        </div>
        <div className="w-full sm:w-44">
          <SelectField
            label="Status"
            value={draftFilters.isApproved}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, isApproved: toApprovedFilterValue(event.target.value) }))
            }
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            placeholderDisabled={false}
          />
        </div>
        {canFilterByUser && (
          <div className="w-full sm:w-56">
            <TextField
              label="User ID (optional)"
              placeholder="Leave blank for all users"
              hint="Paste a user's GUID to scope the report to one person."
              value={draftFilters.userId}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, userId: event.target.value }))}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>

      {filterError && <Alert variant="error">{filterError}</Alert>}

      {appliedFilters === null ? (
        <Alert variant="info">Select a date range and click &quot;Apply Filters&quot; to generate the report.</Alert>
      ) : isReportLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Generating timesheet report…
        </div>
      ) : isReportError ? (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{getApiErrorMessage(reportError, "Unable to generate the timesheet report.")}</Alert>
          <div>
            <Button type="button" variant="secondary" onClick={() => refetchReport()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !report || report.items.length === 0 ? (
        <Alert variant="info">No timesheet entries match the selected filters.</Alert>
      ) : (
        <>
          <p className="text-sm text-slate-500" aria-live="polite">
            Showing {report.items.length} of {report.totalCount} entries · Total hours:{" "}
            <span className="font-semibold text-slate-900">{report.totalHours}h</span>
            {isReportFetching && <span className="ml-2 text-xs text-slate-400">Refreshing…</span>}
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Timesheet report entries</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Project</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Hours</th>
                    <th scope="col" className="px-4 py-3">Task Description</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.items.map((item, index) => (
                    <tr key={`${item.user.id}-${item.project.id}-${item.entryDate}-${index}`}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{item.user.fullName || "—"}</p>
                        {item.user.employeeId && <p className="text-xs text-slate-500">{item.user.employeeId}</p>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{item.project.name || "—"}</p>
                        {item.project.code && <p className="text-xs text-slate-500">{item.project.code}</p>}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500">{formatDisplayDate(item.entryDate)}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{item.hours}h</td>
                      <td className="px-4 py-3 align-top text-slate-700">{item.taskDescription}</td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.isApproved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TablePagination
            page={report.page}
            totalPages={totalPages}
            onPageChange={goToPage}
            isDisabled={isReportFetching}
            label="Timesheet report pagination"
          />
        </>
      )}
    </div>
  );
}
