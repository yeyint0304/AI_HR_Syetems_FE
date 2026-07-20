import { apiClient } from "@/lib/api/axiosInstance";
import type {
  MonthlyCostRevenueFilters,
  MonthlyCostRevenueReport,
  ReportExportFormat,
  TimesheetReport,
  TimesheetReportFilters,
  UserRolesSummaryFilters,
  UserRolesSummaryReport,
} from "@/types/report.types";

/**
 * Report domain repository, per the layering convention documented in
 * `lib/api/project.api.ts`: every HTTP call for the Reporting feature goes
 * through this module (which talks to this app's own `/api/reports/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 *
 * The `Export*` endpoints return a binary file rather than JSON, so they are
 * not wrapped as an `apiClient` call here — a browser-native navigation
 * (`<a href="...">`) is the simplest, most accessible way to trigger a file
 * download while still sending the httpOnly auth cookie automatically for a
 * same-origin request. `buildTimesheetReportExportUrl` and its siblings below
 * only build that URL; they perform no I/O themselves.
 */

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/* ------------------------------------------------------------------------ */
/* Timesheet Report                                                          */
/* ------------------------------------------------------------------------ */

export async function getTimesheetReportRequest(
  filters: TimesheetReportFilters
): Promise<TimesheetReport> {
  const { data } = await apiClient.get<{ data: TimesheetReport }>("/reports/timesheet", {
    params: filters,
  });
  return data.data;
}

export function buildTimesheetReportExportUrl(
  filters: TimesheetReportFilters,
  format: ReportExportFormat
): string {
  return `/api/reports/timesheet/export${toQueryString({ ...filters, format })}`;
}

/* ------------------------------------------------------------------------ */
/* User Roles Summary                                                        */
/* ------------------------------------------------------------------------ */

export async function getUserRolesSummaryRequest(
  filters: UserRolesSummaryFilters
): Promise<UserRolesSummaryReport> {
  const { data } = await apiClient.get<{ data: UserRolesSummaryReport }>("/reports/roles-summary", {
    params: filters,
  });
  return data.data;
}

export function buildUserRolesSummaryExportUrl(
  filters: UserRolesSummaryFilters,
  format: ReportExportFormat
): string {
  return `/api/reports/roles-summary/export${toQueryString({ ...filters, format })}`;
}

/* ------------------------------------------------------------------------ */
/* Monthly Cost & Revenue                                                     */
/* ------------------------------------------------------------------------ */

export async function getMonthlyCostRevenueRequest(
  filters: MonthlyCostRevenueFilters
): Promise<MonthlyCostRevenueReport> {
  const { data } = await apiClient.get<{ data: MonthlyCostRevenueReport }>("/reports/cost-revenue", {
    params: filters,
  });
  return data.data;
}

export function buildMonthlyCostRevenueExportUrl(
  filters: MonthlyCostRevenueFilters,
  format: ReportExportFormat
): string {
  return `/api/reports/cost-revenue/export${toQueryString({ ...filters, format })}`;
}
