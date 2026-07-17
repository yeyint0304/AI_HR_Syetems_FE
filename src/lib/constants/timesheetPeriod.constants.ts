import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to create/lock/unlock/delete timesheet periods.
 *
 * `docs/HR_System_BE.postman_collection.json` only tags these endpoints
 * `[Auth]` (no explicit role requirement documented), so this mirrors the
 * same precedent set by `lib/constants/project.constants.ts#PROJECT_MANAGER_ROLES`:
 * locking/unlocking a timesheet period is a system-wide administrative action
 * (it affects every user's ability to submit timesheet entries for that
 * period, not just one project), so it is restricted to SystemAdmin/ProjectAdmin.
 * Any authenticated user may still view the read-only Timesheet Periods list
 * (e.g. to check whether the period they're logging time against is locked).
 */
export const TIMESHEET_PERIOD_MANAGER_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.PROJECT_ADMIN,
];

/** Returns true if the given role may create/lock/unlock/delete timesheet periods. */
export function canManageTimesheetPeriods(role: string | null | undefined): boolean {
  if (!role) return false;
  return (TIMESHEET_PERIOD_MANAGER_ROLES as readonly string[]).includes(role);
}
