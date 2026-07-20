/**
 * Shared Timesheet Period domain types (Data Transfer Objects), following the
 * same minimal-surface convention as `types/project.types.ts`: only the
 * fields the UI actually renders are exposed to client code.
 *
 * Field set is derived from the confirmed request/response examples in
 * `docs/HR_System_BE.postman_collection.json`
 * (`TimesheetPeriod/GetAllTimesheetPeriods`, `TimesheetPeriod/CreateTimesheetPeriod`,
 * `TimesheetPeriod/LockTimesheetPeriod`, `TimesheetPeriod/UnlockTimesheetPeriod`).
 * Unlike the Project feature, the backend only exposes Create/Lock/Unlock/Delete
 * for Timesheet Periods — there is no Update endpoint, so no `UpdateTimesheetPeriodRequest`
 * type is defined here.
 */

export interface TimesheetPeriod {
  id: string;
  /** Date-only string, `yyyy-MM-dd` (per the backend contract: "Dates use YYYY-MM-DD format"). */
  periodStart: string;
  /** Date-only string, `yyyy-MM-dd`. */
  periodEnd: string;
  isLocked: boolean;
  /** ISO datetime string, set once the period has been locked. */
  lockedAt?: string | null;
  lockedBy?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateTimesheetPeriodRequest {
  /** Date-only string, `yyyy-MM-dd`. */
  periodStart: string;
  /** Date-only string, `yyyy-MM-dd`. */
  periodEnd: string;
}

/** Optional filters for `TimesheetPeriod/GetAllTimesheetPeriods` (all query params are optional). */
export interface TimesheetPeriodListFilters {
  isLocked?: boolean;
  year?: number;
  month?: number;
}
