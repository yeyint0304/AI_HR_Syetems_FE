import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";
import type { InvoiceStatus } from "@/types/invoice.types";

/**
 * Roles allowed to view/manage the Invoice module (generate, edit, send, mark
 * paid, void, cancel, delete). `docs/HR_System_BE.postman_collection.json`
 * only tags every `Invoice/*` endpoint `[Auth]` (no explicit role
 * requirement documented), but invoices expose client billing details, rate
 * amounts, and per-resource hours/rates — the same class of sensitive
 * financial data that `lib/constants/report.constants.ts#REPORT_MANAGER_ROLES`
 * restricts the Cost & Revenue / Roles Summary reports to. This mirrors that
 * precedent (defense-in-depth, OWASP A01: Broken Access Control) and
 * explicitly keeps SystemAdmin enabled, per the feature requirement that the
 * Invoice module must be available to System Admin.
 */
export const INVOICE_MANAGER_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.PROJECT_ADMIN,
];

/** Returns true if the given role may view/manage invoices. */
export function canManageInvoices(role: string | null | undefined): boolean {
  if (!role) return false;
  return (INVOICE_MANAGER_ROLES as readonly string[]).includes(role);
}

/**
 * Returns true if the given role's invoice *list* must be backed by the
 * backend's project-scoped `Invoice/GetMyInvoices` rather than the org-wide
 * `Invoice/GetAllInvoices` (see `app/api/invoices/route.ts`'s `GET` handler).
 *
 * Per this app's API-integration requirement, a `ProjectAdmin` reviewing
 * invoices is powered by `GetMyInvoices` (scoped to the projects they manage,
 * mirroring `isProjectScopedTimesheetManager` in
 * `lib/constants/timesheetEntry.constants.ts`), while `SystemAdmin` — the
 * org-wide administrator role — keeps the unrestricted `GetAllInvoices`.
 * `GenerateInvoice` (invoice creation) is unaffected and remains shared by
 * both roles.
 */
export function isProjectScopedInvoiceManager(role: string | null | undefined): boolean {
  return role === USER_ROLES.PROJECT_ADMIN;
}

/** All statuses documented on `Invoice/GetAllInvoices` (`?status=`). */
export const INVOICE_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Void", "Cancelled"];

/** Filter-bar/status-chip dropdown options for `/invoices`. */
export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Paid", label: "Paid" },
  { value: "Void", label: "Void" },
  { value: "Cancelled", label: "Cancelled" },
];

/** Tailwind badge classes per status, following the same green/amber/slate palette used by `ProjectsListView`/`TimesheetPeriodsListView`. */
export const INVOICE_STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  Draft: "bg-amber-50 text-amber-700",
  Sent: "bg-blue-50 text-blue-700",
  Paid: "bg-green-50 text-green-700",
  Void: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-50 text-red-700",
};

/** Default page size for `Invoice/GetAllInvoices` (backend default is also 20, per the saved example). */
export const DEFAULT_INVOICE_PAGE_SIZE = 20;
