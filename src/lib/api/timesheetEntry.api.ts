import { apiClient } from "@/lib/api/axiosInstance";
import type {
  CreateTimesheetEntryRequest,
  TimesheetEntry,
  TimesheetEntryListFilters,
  UpdateTimesheetEntryRequest,
} from "@/types/timesheetEntry.types";

/**
 * Timesheet Entry domain repository, per the layering convention documented
 * in `lib/api/timesheetPeriod.api.ts`: every HTTP call for this feature goes
 * through this module (which talks to this app's own `/api/timesheet-entries/*`
 * Route Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 */

export async function getTimesheetEntryListRequest(
  filters?: TimesheetEntryListFilters
): Promise<TimesheetEntry[]> {
  const { data } = await apiClient.get<{ data: TimesheetEntry[] }>("/timesheet-entries", {
    params: filters,
  });
  return data.data;
}

export async function getTimesheetEntryRequest(id: string): Promise<TimesheetEntry> {
  const { data } = await apiClient.get<{ data: TimesheetEntry }>(`/timesheet-entries/${id}`);
  return data.data;
}

export async function createTimesheetEntryRequest(
  payload: CreateTimesheetEntryRequest
): Promise<TimesheetEntry> {
  const { data } = await apiClient.post<{ data: TimesheetEntry }>("/timesheet-entries", payload);
  return data.data;
}

/**
 * Updates an existing entry's `hours`/`taskDescription`. The backend's
 * `TimesheetEntry/UpdateTimesheetEntry` returns no updated record (`Data: null`),
 * so the caller should refetch the list (`useUpdateTimesheetEntry`'s cache
 * invalidation handles this) rather than rely on a return value here.
 */
export async function updateTimesheetEntryRequest(
  id: string,
  payload: UpdateTimesheetEntryRequest
): Promise<void> {
  await apiClient.put(`/timesheet-entries/${id}`, payload);
}

export async function deleteTimesheetEntryRequest(id: string): Promise<void> {
  await apiClient.delete(`/timesheet-entries/${id}`);
}

/**
 * Approves a pending timesheet entry (`TimesheetEntry/ApproveTimesheetEntry`).
 * Restricted server-side to SystemAdmin/ProjectAdmin (see
 * `app/api/timesheet-entries/[id]/approve/route.ts`). The backend's saved
 * success example only returns `{ Id, IsApproved, ApprovedAt, ApprovedBy }`,
 * so — same as `updateTimesheetEntryRequest` above — the caller should
 * refetch the list (`useApproveTimesheetEntry`'s cache invalidation handles
 * this) rather than rely on a return value here.
 */
export async function approveTimesheetEntryRequest(id: string): Promise<void> {
  await apiClient.put(`/timesheet-entries/${id}/approve`);
}

/**
 * Rejects a pending timesheet entry, for the same manager-facing review
 * workflow as `approveTimesheetEntryRequest` above. The backend's Timesheet
 * Entry module (`docs/HR_System_BE.postman_collection.json`) documents no
 * dedicated "reject"/"deny" endpoint — only `ApproveTimesheetEntry` and
 * `DeleteTimesheetEntry` — so rejecting a pending entry is implemented as a
 * delete: this hits the same `/timesheet-entries/{id}` Route Handler the
 * self-service "My Timesheet" delete flow uses (`deleteTimesheetEntryRequest`
 * above), whose ownership check already permits SystemAdmin/ProjectAdmin to
 * act on any user's entry and blocks already-approved ones with a 409 (see
 * `app/api/timesheet-entries/[id]/route.ts`). Kept as its own named export
 * (rather than callers reusing `deleteTimesheetEntryRequest` directly) so the
 * "reject" intent is explicit at the call site and isolated from the
 * self-service delete flow, and so a future dedicated backend endpoint could
 * be swapped in here without touching `TimesheetHistoryView`.
 */
export async function rejectTimesheetEntryRequest(id: string): Promise<void> {
  await apiClient.delete(`/timesheet-entries/${id}`);
}
