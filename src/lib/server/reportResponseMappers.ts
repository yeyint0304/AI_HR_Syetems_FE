import "server-only";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import type { BackendEnvelope } from "@/lib/server/backendEnvelope";
import type {
  MonthlyCostRevenueBreakdownRow,
  MonthlyCostRevenueProject,
  MonthlyCostRevenueReport,
  ReportCurrencyRef,
  ReportProjectRef,
  ReportResourceRoleTypeRef,
  ReportUserRef,
  TimesheetReport,
  TimesheetReportItem,
  UserRolesSummaryReport,
  UserRolesSummaryRow,
} from "@/types/report.types";

/**
 * Normalizes the .NET backend's `Report/*` response shapes into the camelCase
 * DTOs this app renders, following the same convention as
 * `lib/server/timesheetEntryResponseMappers.ts`.
 *
 * `docs/HR_System_BE.postman_collection.json` includes concrete saved
 * examples for `Report/GenerateTimesheetReport`, `Report/GenerateUserRolesSummary`,
 * and `Report/GenerateMonthlyCostRevenue`, all wrapped in the standard
 * envelope: `{ StatusCode, IsSuccess, Message, Data }`. `readBackendEnvelope`
 * extracts `IsSuccess`/`StatusCode`/`Message` so Route Handlers can detect a
 * logical failure signaled at HTTP 200 and translate it into a proper HTTP
 * error response for the client.
 */

export { readBackendEnvelope, resolveEnvelopeFailure };
export type { BackendEnvelope };

function asObject(raw: unknown): Record<string, unknown> | null {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
}

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/* ------------------------------------------------------------------------ */
/* Shared reference-object mappers                                          */
/* ------------------------------------------------------------------------ */

interface RawUserRef {
  Id?: string;
  id?: string;
  FullName?: string;
  fullName?: string;
  EmployeeId?: string;
  employeeId?: string;
}

function mapUserRef(raw: unknown): ReportUserRef | null {
  const r = asObject(raw) as RawUserRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return {
    id,
    fullName: r.FullName ?? r.fullName ?? "",
    employeeId: r.EmployeeId ?? r.employeeId,
  };
}

interface RawProjectRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
}

function mapProjectRef(raw: unknown): ReportProjectRef | null {
  const r = asObject(raw) as RawProjectRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return {
    id,
    code: r.Code ?? r.code ?? "",
    name: r.Name ?? r.name ?? "",
  };
}

interface RawResourceRoleTypeRef {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
}

function mapResourceRoleTypeRef(raw: unknown): ReportResourceRoleTypeRef | null {
  const r = asObject(raw) as RawResourceRoleTypeRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return { id, name: r.Name ?? r.name ?? "" };
}

interface RawCurrencyRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Symbol?: string;
  symbol?: string;
}

function mapCurrencyRef(raw: unknown): ReportCurrencyRef | undefined {
  const r = asObject(raw) as RawCurrencyRef | null;
  if (!r) return undefined;
  const id = r.Id ?? r.id;
  if (!id) return undefined;
  return { id, code: r.Code ?? r.code ?? "", symbol: r.Symbol ?? r.symbol ?? "" };
}

/* ------------------------------------------------------------------------ */
/* Timesheet Report                                                          */
/* ------------------------------------------------------------------------ */

interface RawTimesheetReportItem {
  User?: unknown;
  user?: unknown;
  Project?: unknown;
  project?: unknown;
  EntryDate?: string;
  entryDate?: string;
  Hours?: number;
  hours?: number;
  TaskDescription?: string;
  taskDescription?: string;
  IsApproved?: boolean;
  isApproved?: boolean;
}

function mapTimesheetReportItem(raw: unknown): TimesheetReportItem | null {
  const r = asObject(raw) as RawTimesheetReportItem | null;
  if (!r) return null;
  const user = mapUserRef(r.User ?? r.user);
  const project = mapProjectRef(r.Project ?? r.project);
  if (!user || !project) return null;

  return {
    user,
    project,
    entryDate: r.EntryDate ?? r.entryDate ?? "",
    hours: asNumber(r.Hours ?? r.hours),
    taskDescription: asString(r.TaskDescription ?? r.taskDescription),
    isApproved: Boolean(r.IsApproved ?? r.isApproved ?? false),
  };
}

interface RawTimesheetReport {
  ReportGeneratedAt?: string;
  reportGeneratedAt?: string;
  StartDate?: string;
  startDate?: string;
  EndDate?: string;
  endDate?: string;
  TotalHours?: number;
  totalHours?: number;
  TotalCount?: number;
  totalCount?: number;
  Page?: number;
  page?: number;
  PageSize?: number;
  pageSize?: number;
  Items?: unknown;
  items?: unknown;
}

/** Maps `Report/GenerateTimesheetReport`'s `Data` object (already unwrapped from the envelope). */
export function mapBackendTimesheetReport(raw: unknown): TimesheetReport | null {
  const r = asObject(raw) as RawTimesheetReport | null;
  if (!r) return null;

  return {
    reportGeneratedAt: r.ReportGeneratedAt ?? r.reportGeneratedAt ?? "",
    startDate: r.StartDate ?? r.startDate ?? "",
    endDate: r.EndDate ?? r.endDate ?? "",
    totalHours: asNumber(r.TotalHours ?? r.totalHours),
    totalCount: asNumber(r.TotalCount ?? r.totalCount),
    page: asNumber(r.Page ?? r.page, 1),
    pageSize: asNumber(r.PageSize ?? r.pageSize, 0),
    items: asArray(r.Items ?? r.items)
      .map(mapTimesheetReportItem)
      .filter((item): item is TimesheetReportItem => item !== null),
  };
}

/* ------------------------------------------------------------------------ */
/* User Roles Summary                                                        */
/* ------------------------------------------------------------------------ */

interface RawUserRolesSummaryRow {
  ResourceRoleType?: unknown;
  resourceRoleType?: unknown;
  TotalHours?: number;
  totalHours?: number;
  UserCount?: number;
  userCount?: number;
}

function mapUserRolesSummaryRow(raw: unknown): UserRolesSummaryRow | null {
  const r = asObject(raw) as RawUserRolesSummaryRow | null;
  if (!r) return null;
  const resourceRoleType = mapResourceRoleTypeRef(r.ResourceRoleType ?? r.resourceRoleType);
  if (!resourceRoleType) return null;

  return {
    resourceRoleType,
    totalHours: asNumber(r.TotalHours ?? r.totalHours),
    userCount: asNumber(r.UserCount ?? r.userCount),
  };
}

interface RawUserRolesSummary {
  StartDate?: string;
  startDate?: string;
  EndDate?: string;
  endDate?: string;
  Summary?: unknown;
  summary?: unknown;
  GrandTotalHours?: number;
  grandTotalHours?: number;
}

/** Maps `Report/GenerateUserRolesSummary`'s `Data` object (already unwrapped from the envelope). */
export function mapBackendUserRolesSummary(raw: unknown): UserRolesSummaryReport | null {
  const r = asObject(raw) as RawUserRolesSummary | null;
  if (!r) return null;

  return {
    startDate: r.StartDate ?? r.startDate ?? "",
    endDate: r.EndDate ?? r.endDate ?? "",
    summary: asArray(r.Summary ?? r.summary)
      .map(mapUserRolesSummaryRow)
      .filter((row): row is UserRolesSummaryRow => row !== null),
    grandTotalHours: asNumber(r.GrandTotalHours ?? r.grandTotalHours),
  };
}

/* ------------------------------------------------------------------------ */
/* Monthly Cost & Revenue                                                     */
/* ------------------------------------------------------------------------ */

interface RawCostRevenueBreakdownRow {
  ResourceRoleType?: string;
  resourceRoleType?: string;
  Hours?: number;
  hours?: number;
  CostRate?: number;
  costRate?: number;
  BillingRate?: number;
  billingRate?: number;
  Cost?: number;
  cost?: number;
  Revenue?: number;
  revenue?: number;
}

function mapCostRevenueBreakdownRow(raw: unknown): MonthlyCostRevenueBreakdownRow | null {
  const r = asObject(raw) as RawCostRevenueBreakdownRow | null;
  if (!r) return null;

  return {
    resourceRoleType: asString(r.ResourceRoleType ?? r.resourceRoleType),
    hours: asNumber(r.Hours ?? r.hours),
    costRate: asNumber(r.CostRate ?? r.costRate),
    billingRate: asNumber(r.BillingRate ?? r.billingRate),
    cost: asNumber(r.Cost ?? r.cost),
    revenue: asNumber(r.Revenue ?? r.revenue),
  };
}

interface RawCostRevenueProject {
  Project?: unknown;
  project?: unknown;
  TotalHours?: number;
  totalHours?: number;
  TotalCost?: number;
  totalCost?: number;
  TotalRevenue?: number;
  totalRevenue?: number;
  Margin?: number;
  margin?: number;
  Breakdown?: unknown;
  breakdown?: unknown;
}

function mapCostRevenueProject(raw: unknown): MonthlyCostRevenueProject | null {
  const r = asObject(raw) as RawCostRevenueProject | null;
  if (!r) return null;
  const project = mapProjectRef(r.Project ?? r.project);
  if (!project) return null;

  return {
    project,
    totalHours: asNumber(r.TotalHours ?? r.totalHours),
    totalCost: asNumber(r.TotalCost ?? r.totalCost),
    totalRevenue: asNumber(r.TotalRevenue ?? r.totalRevenue),
    margin: asNumber(r.Margin ?? r.margin),
    breakdown: asArray(r.Breakdown ?? r.breakdown)
      .map(mapCostRevenueBreakdownRow)
      .filter((row): row is MonthlyCostRevenueBreakdownRow => row !== null),
  };
}

interface RawMonthlyCostRevenue {
  Year?: number;
  year?: number;
  Month?: number;
  month?: number;
  Currency?: unknown;
  currency?: unknown;
  Projects?: unknown;
  projects?: unknown;
}

/** Maps `Report/GenerateMonthlyCostRevenue`'s `Data` object (already unwrapped from the envelope). */
export function mapBackendMonthlyCostRevenue(raw: unknown): MonthlyCostRevenueReport | null {
  const r = asObject(raw) as RawMonthlyCostRevenue | null;
  if (!r) return null;

  return {
    year: asNumber(r.Year ?? r.year),
    month: asNumber(r.Month ?? r.month),
    currency: mapCurrencyRef(r.Currency ?? r.currency),
    projects: asArray(r.Projects ?? r.projects)
      .map(mapCostRevenueProject)
      .filter((project): project is MonthlyCostRevenueProject => project !== null),
  };
}
