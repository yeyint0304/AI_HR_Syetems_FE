"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveTimesheetEntryRequest,
  createTimesheetEntryRequest,
  deleteTimesheetEntryRequest,
  getProjectAdminTimesheetSummaryRequest,
  getTimesheetEntryListRequest,
  getTimesheetEntryPageRequest,
  getTimesheetEntryRequest,
  getTimesheetEntryUserRolesRequest,
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

/**
 * Server-paginated counterpart to `useTimesheetEntryList`, per the
 * `feature/timesheets-pagination` request. Used only by
 * `TimesheetHistoryView`'s `SystemAdmin`/plain-`Employee` branch — see
 * `getTimesheetEntryPageRequest`'s doc comment for why this is a separate
 * function/hook rather than changing `useTimesheetEntryList`'s return shape.
 * Keyed under the same `"timesheet-entries"` prefix so
 * `useApproveTimesheetEntry`/`useRejectTimesheetEntry`/`useUpdateTimesheetEntry`'s
 * shared `invalidateQueries({ queryKey: TIMESHEET_ENTRIES_QUERY_KEY })` also
 * refetches this page after a mutation, exactly like every other query below.
 */
export function useTimesheetEntryPage(
  filters?: TimesheetEntryListFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...timesheetEntryListQueryKey(filters), "page"] as const,
    queryFn: () => getTimesheetEntryPageRequest(filters),
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

const USER_ROLES_QUERY_KEY = [...TIMESHEET_ENTRIES_QUERY_KEY, "user-roles"] as const;

/**
 * Every user's system role, backing `TimesheetHistoryView`'s Approve/Reject
 * button gating for the "a SystemAdmin's entry can only be approved by
 * another SystemAdmin" rule (see `getTimesheetEntryUserRolesRequest`).
 * `enabled` should only be `true` for a `ProjectAdmin` viewer — a
 * `SystemAdmin`'s own Approve/Reject authority never depends on this data
 * (see `lib/server/timesheetEntryAuthorization.ts#canApproverActOnEntry`),
 * and a plain Employee never sees Approve/Reject at all.
 */
export function useTimesheetEntryUserRoles(enabled: boolean) {
  return useQuery({
    queryKey: USER_ROLES_QUERY_KEY,
    queryFn: getTimesheetEntryUserRolesRequest,
    enabled,
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
