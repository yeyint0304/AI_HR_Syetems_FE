import { z } from "zod";
import { MAX_REPORT_YEAR, MIN_REPORT_YEAR } from "@/lib/constants/report.constants";

/**
 * Shared Zod schemas for the Reporting feature. Used both client-side
 * (validating each report's filter bar before triggering a fetch) and
 * server-side (Route Handlers re-validate the incoming `URLSearchParams` —
 * never trust client-side validation alone), per the same convention as
 * `lib/validators/timesheetEntry.validators.ts`.
 */

/** Matches the backend's documented `YYYY-MM-DD` date-only format for report date-range params. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateOnlyField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .regex(DATE_ONLY_PATTERN, `${label} must use the YYYY-MM-DD date format.`);

/* ------------------------------------------------------------------------ */
/* Timesheet Report                                                          */
/* ------------------------------------------------------------------------ */

/** Client-side filter-bar schema for `/reports/timesheet`. Select/optional fields are plain strings — empty string means "not set". */
export const timesheetReportFilterSchema = z
  .object({
    startDate: dateOnlyField("Date From"),
    endDate: dateOnlyField("Date To"),
    projectId: z.string().optional(),
    userId: z.string().optional(),
    isApproved: z.enum(["", "true", "false"]).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "Date From must be on or before Date To.",
    path: ["endDate"],
  });
export type TimesheetReportFilterValues = z.infer<typeof timesheetReportFilterSchema>;

/**
 * Server-side query schema for `GET /api/reports/timesheet` and
 * `GET /api/reports/timesheet/export`, matching the params documented on
 * `Report/GenerateTimesheetReport`/`Report/ExportTimesheetReport`.
 */
export const timesheetReportQuerySchema = z
  .object({
    startDate: z.string().regex(DATE_ONLY_PATTERN, "startDate must use the YYYY-MM-DD format."),
    endDate: z.string().regex(DATE_ONLY_PATTERN, "endDate must use the YYYY-MM-DD format."),
    projectId: z.uuid("projectId must be a valid GUID.").optional(),
    userId: z.uuid("userId must be a valid GUID.").optional(),
    isApproved: z.enum(["true", "false"]).optional(),
    page: z.coerce.number("page must be a number.").int().min(1).optional(),
    pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(500).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate.",
    path: ["endDate"],
  });
export type TimesheetReportQuery = z.infer<typeof timesheetReportQuerySchema>;

/* ------------------------------------------------------------------------ */
/* User Roles Summary                                                        */
/* ------------------------------------------------------------------------ */

export const userRolesSummaryFilterSchema = z
  .object({
    startDate: dateOnlyField("Date From"),
    endDate: dateOnlyField("Date To"),
    projectId: z.string().optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "Date From must be on or before Date To.",
    path: ["endDate"],
  });
export type UserRolesSummaryFilterValues = z.infer<typeof userRolesSummaryFilterSchema>;

export const userRolesSummaryQuerySchema = z
  .object({
    startDate: z.string().regex(DATE_ONLY_PATTERN, "startDate must use the YYYY-MM-DD format."),
    endDate: z.string().regex(DATE_ONLY_PATTERN, "endDate must use the YYYY-MM-DD format."),
    projectId: z.uuid("projectId must be a valid GUID.").optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be on or before endDate.",
    path: ["endDate"],
  });
export type UserRolesSummaryQuery = z.infer<typeof userRolesSummaryQuerySchema>;

/* ------------------------------------------------------------------------ */
/* Monthly Cost & Revenue                                                     */
/* ------------------------------------------------------------------------ */

export const monthlyCostRevenueFilterSchema = z.object({
  year: z.coerce
    .number("Year must be a number.")
    .int("Year must be a whole number.")
    .min(MIN_REPORT_YEAR, `Year must be ${MIN_REPORT_YEAR} or later.`)
    .max(MAX_REPORT_YEAR, `Year must be ${MAX_REPORT_YEAR} or earlier.`),
  month: z.coerce
    .number("Month must be a number.")
    .int("Month must be a whole number.")
    .min(1, "Month must be between 1 and 12.")
    .max(12, "Month must be between 1 and 12."),
  projectId: z.string().optional(),
  currencyId: z.string().optional(),
});
export type MonthlyCostRevenueFilterValues = z.infer<typeof monthlyCostRevenueFilterSchema>;

export const monthlyCostRevenueQuerySchema = z.object({
  year: z.coerce.number("year must be a number.").int().min(MIN_REPORT_YEAR).max(MAX_REPORT_YEAR),
  month: z.coerce.number("month must be a number.").int().min(1).max(12),
  projectId: z.uuid("projectId must be a valid GUID.").optional(),
  currencyId: z.uuid("currencyId must be a valid GUID.").optional(),
});
export type MonthlyCostRevenueQuery = z.infer<typeof monthlyCostRevenueQuerySchema>;

/* ------------------------------------------------------------------------ */
/* Export format (shared by all three `Export*` endpoints)                   */
/* ------------------------------------------------------------------------ */

export const reportExportFormatSchema = z.enum(["xlsx", "csv"]);
export type ReportExportFormatValue = z.infer<typeof reportExportFormatSchema>;
