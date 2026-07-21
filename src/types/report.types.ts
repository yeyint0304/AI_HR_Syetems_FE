/**
 * Shared Report domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/timesheetEntry.types.ts` /
 * `types/project.types.ts`: only the fields the UI actually renders are
 * exposed to client code.
 *
 * Field set is derived from the confirmed request/response examples in
 * `docs/HR_System_BE.postman_collection.json` for the `Report` module
 * (`Report/GenerateTimesheetReport`, `Report/GenerateUserRolesSummary`,
 * `Report/GenerateMonthlyCostRevenue`, and their `Export*` counterparts).
 */

/** Lightweight user reference embedded in report rows — never the full `AuthUser`/profile DTO. */
export interface ReportUserRef {
  id: string;
  fullName: string;
  employeeId?: string;
}

/** Lightweight project reference embedded in report rows. */
export interface ReportProjectRef {
  id: string;
  code: string;
  name: string;
}

/** Lightweight resource-role-type reference embedded in the User Roles Summary report. */
export interface ReportResourceRoleTypeRef {
  id: string;
  name: string;
}

/** Lightweight currency reference embedded in the Monthly Cost & Revenue report. */
export interface ReportCurrencyRef {
  id: string;
  code: string;
  symbol: string;
}

/** Export formats documented on `Report/Export*` (backend supports xlsx or csv — NOT pdf, despite the early wireframe mock labelling the button "Export PDF"). */
export type ReportExportFormat = "xlsx" | "csv";

/* ------------------------------------------------------------------------ */
/* Timesheet Report — `Report/GenerateTimesheetReport` / `ExportTimesheetReport` */
/* ------------------------------------------------------------------------ */

export interface TimesheetReportItem {
  user: ReportUserRef;
  project: ReportProjectRef;
  /** Date-only string, `yyyy-MM-dd`. */
  entryDate: string;
  hours: number;
  taskDescription: string;
  isApproved: boolean;
}

export interface TimesheetReport {
  /** ISO datetime string of when the backend generated the report. */
  reportGeneratedAt: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalCount: number;
  page: number;
  pageSize: number;
  items: TimesheetReportItem[];
}

/** Matches the query params documented on `Report/GenerateTimesheetReport`. `startDate`/`endDate` are required. */
export interface TimesheetReportFilters {
  startDate: string;
  endDate: string;
  projectId?: string;
  userId?: string;
  isApproved?: boolean;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------------ */
/* User Roles Summary — `Report/GenerateUserRolesSummary` / `ExportUserRolesSummary` */
/* ------------------------------------------------------------------------ */

export interface UserRolesSummaryRow {
  resourceRoleType: ReportResourceRoleTypeRef;
  totalHours: number;
  userCount: number;
}

export interface UserRolesSummaryReport {
  startDate: string;
  endDate: string;
  summary: UserRolesSummaryRow[];
  grandTotalHours: number;
}

/** Matches the query params documented on `Report/GenerateUserRolesSummary`. `startDate`/`endDate` are required. */
export interface UserRolesSummaryFilters {
  startDate: string;
  endDate: string;
  projectId?: string;
}

/* ------------------------------------------------------------------------ */
/* Monthly Cost & Revenue — `Report/GenerateMonthlyCostRevenue` / `ExportMonthlyCostRevenue` */
/* ------------------------------------------------------------------------ */

/**
 * Note: unlike `UserRolesSummaryRow`, the backend's saved example for this
 * endpoint returns `ResourceRoleType` as a plain display string inside each
 * `Breakdown` row (not a `{ Id, Name }` reference object) — mapped as-is here.
 */
export interface MonthlyCostRevenueBreakdownRow {
  resourceRoleType: string;
  hours: number;
  costRate: number;
  billingRate: number;
  cost: number;
  revenue: number;
}

export interface MonthlyCostRevenueProject {
  project: ReportProjectRef;
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  margin: number;
  breakdown: MonthlyCostRevenueBreakdownRow[];
}

export interface MonthlyCostRevenueReport {
  year: number;
  month: number;
  currency?: ReportCurrencyRef;
  projects: MonthlyCostRevenueProject[];
}

/** Matches the query params documented on `Report/GenerateMonthlyCostRevenue`. `year`/`month` are required. */
export interface MonthlyCostRevenueFilters {
  year: number;
  month: number;
  projectId?: string;
  currencyId?: string;
}
