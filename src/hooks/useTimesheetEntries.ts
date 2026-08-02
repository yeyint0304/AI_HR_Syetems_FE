"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveTimesheetEntryRequest,
  createTimesheetEntryRequest,
  deleteTimesheetEntryRequest,
  getProjectAdminTimesheetSummaryRequest,
  getTimesheetEntryListRequest,
  getTimesheetEntryRequest,
  rejectTimesheetEntryRequest,
  updateTimesheetEntryRequest,
} from "@/lib/api/timesheetEntry.api";
import type {
  CreateTimesheetEntryRequest,
  ProjectAdminTimesheetSummaryFilters,
  TimesheetEntryListFilters,
  UpdateTimesheetEntryRequest,
} from "@/types/timesheetEntry.types";

/**
 * Timesheet Entry domain hooks (TanStack Query), following the same `use*`
 * naming convention as `hooks/useTimesheetPeriods.ts`. Components should
 * never call `lib/api/timesheetEntry.api` directly.
 */

const TIMESHEET_ENTRIES_QUERY_KEY = ["timesheet-entries"] as const;
const timesheetEntryQueryKey = (id: string) => ["timesheet-entries", id] as const;
const timesheetEntryListQueryKey = (filters?: TimesheetEntryListFilters) =>
  [...TIMESHEET_ENTRIES_QUERY_KEY, filters ?? {}] as const;

export function useTimesheetEntryList(
  filters?: TimesheetEntryListFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: timesheetEntryListQueryKey(filters),
    queryFn: () => getTimesheetEntryListRequest(filters),
    enabled: options?.enabled ?? true,
  });
}

const projectAdminTimesheetSummaryQueryKey = (filters?: ProjectAdminTimesheetSummaryFilters) =>
  [...TIMESHEET_ENTRIES_QUERY_KEY, "project-admin-summary", filters ?? {}] as const;

/**
 * `ProjectAdmin`-facing counterpart to `useTimesheetEntryList` — backed by
 * `TimesheetEntry/GetProjectAdminTimesheetSummary` (via
 * `getProjectAdminTimesheetSummaryRequest`) rather than
 * `GetAllTimesheetEntries`. Used by `TimesheetHistoryView` only while the
 * signed-in user is a `ProjectAdmin`; `SystemAdmin`/a plain `User` keep using
 * `useTimesheetEntryList`.
 */
export function useProjectAdminTimesheetSummary(
  filters?: ProjectAdminTimesheetSummaryFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: projectAdminTimesheetSummaryQueryKey(filters),
    queryFn: () => getProjectAdminTimesheetSummaryRequest(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useTimesheetEntry(id: string) {
  return useQuery({
    queryKey: timesheetEntryQueryKey(id),
    queryFn: () => getTimesheetEntryRequest(id),
    enabled: Boolean(id),
  });
}

export function useCreateTimesheetEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTimesheetEntryRequest) => createTimesheetEntryRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY });
    },
  });
}

export function useUpdateTimesheetEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTimesheetEntryRequest }) =>
      updateTimesheetEntryRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY });
    },
  });
}

export function useDeleteTimesheetEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimesheetEntryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY });
    },
  });
}

/**
 * Approves a pending timesheet entry. Restricted server-side to
 * SystemAdmin/ProjectAdmin (`canManageAnyTimesheetEntry`) — see
 * `app/api/timesheet-entries/[id]/approve/route.ts`. Used by
 * `TimesheetHistoryView` for the manager-facing approval workflow.
 */
export function useApproveTimesheetEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveTimesheetEntryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY });
    },
  });
}

/**
 * Rejects a pending timesheet entry. Restricted server-side to
 * SystemAdmin/ProjectAdmin (`canManageAnyTimesheetEntry`) — see
 * `rejectTimesheetEntryRequest` for why this maps onto the same
 * `DELETE /api/timesheet-entries/[id]` Route Handler as the self-service
 * delete flow. Used by `TimesheetHistoryView` alongside
 * `useApproveTimesheetEntry` for the manager-facing review workflow.
 */
export function useRejectTimesheetEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectTimesheetEntryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY });
    },
  });
}
