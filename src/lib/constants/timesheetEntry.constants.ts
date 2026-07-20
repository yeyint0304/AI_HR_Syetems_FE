import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to view/manage *any* user's timesheet entries (not just their
 * own). `docs/HR_System_BE.postman_collection.json` only tags the Timesheet
 * Entry endpoints `[Auth]` (no explicit role requirement documented) and the
 * `GetAllTimesheetEntries`/`Get...ById` examples show one user (e.g. a
 * ProjectAdmin) reading another user's entries — so the backend does allow
 * cross-user reads for privileged roles.
 *
 * For the self-service "My Timesheet" feature, the BFF Route Handlers
 * (`app/api/timesheet-entries/*`) use this to enforce ownership as a defense
 * -in-depth measure the documented contract doesn't itself guarantee (OWASP
 * A01: Broken Access Control) — a plain `User` may only ever read/edit/delete
 * their own entries; SystemAdmin/ProjectAdmin may act on any user's entries
 * (e.g. for review/approval workflows built on top of this data later).
 */
export const TIMESHEET_ENTRY_MANAGER_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.PROJECT_ADMIN,
];

/** Returns true if the given role may view/manage any user's timesheet entries. */
export function canManageAnyTimesheetEntry(role: string | null | undefined): boolean {
  if (!role) return false;
  return (TIMESHEET_ENTRY_MANAGER_ROLES as readonly string[]).includes(role);
}

/**
 * Soft, non-blocking daily-hours warning threshold shown on the "My
 * Timesheets" weekly grid (per `docs/HR_System_FE_wireframe.pdf`'s "Daily
 * total exceeds 8h" note). This is a UX nudge, not a hard validation rule —
 * the backend's per-project `MaxDailyHours` (see `types/project.types.ts`)
 * is the authoritative cap enforced server-side.
 */
export const DEFAULT_DAILY_HOURS_WARNING_THRESHOLD = 8;

/** Bounds used by both the Zod schema and the hour `<input type="number">` controls. */
export const MIN_ENTRY_HOURS = 0.25;
export const MAX_ENTRY_HOURS = 24;
export const ENTRY_HOURS_STEP = 0.25;
