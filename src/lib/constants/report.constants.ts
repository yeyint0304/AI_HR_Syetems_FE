import { BarChart3, DollarSign, FileText, type LucideIcon } from "lucide-react";
import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";
import type { ReportExportFormat } from "@/types/report.types";

/**
 * Roles allowed to view the "User Roles Summary" and "Cost & Revenue" reports.
 * `docs/HR_System_BE.postman_collection.json` only tags every `Report/*`
 * endpoint `[Auth]` (no explicit role requirement documented), but these two
 * reports expose aggregate billing rates, cost, revenue and margin figures —
 * sensitive business/financial data that a plain `User` has no legitimate
 * need to see. Restricting them to SystemAdmin/ProjectAdmin here is a
 * defense-in-depth measure (OWASP A01: Broken Access Control), consistent
 * with `PROJECT_MANAGER_ROLES` (`lib/constants/project.constants.ts`).
 *
 * The Timesheet Report has no such restriction — any authenticated user may
 * view it, but is self-scoped to their own `userId` unless they hold one of
 * these roles (mirroring `TIMESHEET_ENTRY_MANAGER_ROLES` in
 * `lib/constants/timesheetEntry.constants.ts`).
 */
export const REPORT_MANAGER_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.PROJECT_ADMIN,
];

/** Returns true if the given role may view the Roles Summary / Cost & Revenue reports, or query another user's Timesheet Report rows. */
export function canManageReports(role: string | null | undefined): boolean {
  if (!role) return false;
  return (REPORT_MANAGER_ROLES as readonly string[]).includes(role);
}

/**
 * Returns true if the given role's Timesheet/User Roles Summary/Cost &
 * Revenue reports must be backed by the backend's self-scoped
 * `Report/GenerateMy*`/`Report/ExportMy*` endpoints rather than the org-wide
 * `Report/Generate*`/`Report/Export*` ones (see the Route Handlers under
 * `app/api/reports/`).
 *
 * Per this app's API-integration requirement, a `ProjectAdmin` reviewing any
 * of the three reports is powered by the `My*` variant (scoped to the
 * projects/team they manage), while `SystemAdmin` — the org-wide
 * administrator role — keeps the unrestricted `Generate*`/`Export*`
 * endpoints, mirroring `isProjectScopedTimesheetManager`
 * (`lib/constants/timesheetEntry.constants.ts`) and
 * `isProjectScopedInvoiceManager` (`lib/constants/invoice.constants.ts`).
 */
export function isProjectScopedReportManager(role: string | null | undefined): boolean {
  return role === USER_ROLES.PROJECT_ADMIN;
}

export interface ReportHubItem {
  key: "timesheet" | "roles-summary" | "cost-revenue";
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tags: string[];
  /** When true, the card/route is restricted to `REPORT_MANAGER_ROLES`. */
  managerOnly: boolean;
}

/** `/reports` hub cards, per the wireframe (`docs/HR_System_FE_wireframe.pdf`: "hub with 3 clickable report cards"). */
export const REPORT_HUB_ITEMS: ReportHubItem[] = [
  {
    key: "timesheet",
    title: "Timesheet Report",
    description: "View detailed timesheet entries by project, user, and date range.",
    href: "/reports/timesheet",
    icon: FileText,
    tags: ["Hours", "Projects", "Users"],
    managerOnly: false,
  },
  {
    key: "roles-summary",
    title: "User Roles Summary",
    description: "Summarize total hours grouped by user role. Understand capacity and utilization at a glance.",
    href: "/reports/roles-summary",
    icon: BarChart3,
    tags: ["Roles", "Utilization", "Hours"],
    managerOnly: true,
  },
  {
    key: "cost-revenue",
    title: "Cost & Revenue Report",
    description: "Monthly breakdown of project costs and revenues using rate cards. Compare across projects.",
    href: "/reports/cost-revenue",
    icon: DollarSign,
    tags: ["Cost", "Revenue", "Rate Cards"],
    managerOnly: true,
  },
];

/** Export format options rendered as the "Export ..." buttons on every report screen. */
export const EXPORT_FORMAT_OPTIONS: { value: ReportExportFormat; label: string }[] = [
  { value: "xlsx", label: "Export XLSX" },
  { value: "csv", label: "Export CSV" },
];

/** Default page size for `Report/GenerateTimesheetReport` (backend default is also 100). */
export const DEFAULT_TIMESHEET_REPORT_PAGE_SIZE = 100;

/** Bounds for the Year/Month selects on the Cost & Revenue report filter bar. */
export const MIN_REPORT_YEAR = 2000;
export const MAX_REPORT_YEAR = 2100;

export const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
