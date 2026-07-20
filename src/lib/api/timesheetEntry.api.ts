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
