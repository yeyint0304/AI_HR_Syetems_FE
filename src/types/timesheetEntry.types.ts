/**
 * Shared Timesheet Entry domain types (Data Transfer Objects), following the
 * same minimal-surface convention as `types/timesheetPeriod.types.ts`: only
 * the fields the UI actually renders are exposed to client code.
 *
 * Field set is derived from the confirmed request/response examples in
 * `docs/HR_System_BE.postman_collection.json`
 * (`TimesheetEntry/GetAllTimesheetEntries`, `TimesheetEntry/CreateTimesheetEntry`,
 * `TimesheetEntry/UpdateTimesheetEntry`, `TimesheetEntry/ApproveTimesheetEntry`).
 *
 * Note: `TimesheetEntry/UpdateTimesheetEntry` only accepts `Hours` and
 * `TaskDescription` — the project/period/date of an existing entry cannot be
 * changed via the backend contract, so `UpdateTimesheetEntryRequest` only
 * exposes those two fields. Approval is a separate manager-facing workflow
 * (`TimesheetEntry/ApproveTimesheetEntry`), but editing an already-approved
 * entry is *not* blocked outright: per the saved "Update Timesheet Entry"
 * example in `docs/HR_System_BE.postman_collection.json` ("Timesheet entry
 * updated successfully. Re-approval required."), the backend itself resets
 * `IsApproved` to `false` on update — this app's `isApproved` field is used
 * to surface that re-approval requirement in the UI (`MyTimesheetView`,
 * `TimesheetHistoryView`), not to hard-block the edit.
 */

export interface TimesheetEntry {
  id: string;
  userId: string;
  userFirstName?: string;
  userLastName?: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  timesheetPeriodId: string;
  /** Date-only string, `yyyy-MM-dd` (per the backend contract: "EntryDate uses YYYY-MM-DD format"). */
  entryDate: string;
  hours: number;
  taskDescription: string;
  isApproved: boolean;
  /** ISO datetime string, set once the entry has been approved. */
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

/** Matches `TimesheetEntry/CreateTimesheetEntry`. `UserId` is never sent by the client — the backend infers it from the bearer token. */
export interface CreateTimesheetEntryRequest {
  projectId: string;
  timesheetPeriodId: string;
  /** Date-only string, `yyyy-MM-dd`. */
  entryDate: string;
  hours: number;
  taskDescription: string;
}

/** Matches `TimesheetEntry/UpdateTimesheetEntry`, which only accepts these two fields. */
export interface UpdateTimesheetEntryRequest {
  hours: number;
  taskDescription: string;
}

/** Optional filters for `TimesheetEntry/GetAllTimesheetEntries` (all query params are optional). */
export interface TimesheetEntryListFilters {
  userId?: string;
  projectId?: string;
  timesheetPeriodId?: string;
  isApproved?: boolean;
}
