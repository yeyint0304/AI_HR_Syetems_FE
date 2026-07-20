import { apiClient } from "@/lib/api/axiosInstance";
import type {
  CreateTimesheetPeriodRequest,
  TimesheetPeriod,
  TimesheetPeriodListFilters,
} from "@/types/timesheetPeriod.types";

/**
 * Timesheet Period domain repository, per the layering convention documented
 * in `lib/api/project.api.ts`: every HTTP call for this feature goes through
 * this module (which talks to this app's own `/api/timesheet-periods/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 */

export async function getTimesheetPeriodListRequest(
  filters?: TimesheetPeriodListFilters
): Promise<TimesheetPeriod[]> {
  const { data } = await apiClient.get<{ data: TimesheetPeriod[] }>("/timesheet-periods", {
    params: filters,
  });
  return data.data;
}

export async function getTimesheetPeriodRequest(id: string): Promise<TimesheetPeriod> {
  const { data } = await apiClient.get<{ data: TimesheetPeriod }>(`/timesheet-periods/${id}`);
  return data.data;
}

export async function createTimesheetPeriodRequest(
  payload: CreateTimesheetPeriodRequest
): Promise<TimesheetPeriod> {
  const { data } = await apiClient.post<{ data: TimesheetPeriod }>("/timesheet-periods", payload);
  return data.data;
}

/**
 * Locks a timesheet period to prevent further timesheet entries against it.
 * The backend only returns `{ LockedAt }` (see `docs/HR_System_BE.postman_collection.json`),
 * so the caller should refetch the list (`useTimesheetPeriodList`'s cache invalidation
 * handles this) rather than rely on a full updated record from this call.
 */
export async function lockTimesheetPeriodRequest(id: string): Promise<void> {
  await apiClient.put(`/timesheet-periods/${id}/lock`);
}

export async function unlockTimesheetPeriodRequest(id: string): Promise<void> {
  await apiClient.put(`/timesheet-periods/${id}/unlock`);
}

export async function deleteTimesheetPeriodRequest(id: string): Promise<void> {
  await apiClient.delete(`/timesheet-periods/${id}`);
}
