"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTimesheetPeriodRequest,
  deleteTimesheetPeriodRequest,
  getTimesheetPeriodListRequest,
  getTimesheetPeriodRequest,
  lockTimesheetPeriodRequest,
  unlockTimesheetPeriodRequest,
} from "@/lib/api/timesheetPeriod.api";
import type {
  CreateTimesheetPeriodRequest,
  TimesheetPeriodListFilters,
} from "@/types/timesheetPeriod.types";

/**
 * Timesheet Period domain hooks (TanStack Query), following the same `use*`
 * naming convention as `hooks/useProjects.ts`. Components should never call
 * `lib/api/timesheetPeriod.api` directly.
 */

const TIMESHEET_PERIODS_QUERY_KEY = ["timesheet-periods"] as const;
const timesheetPeriodQueryKey = (id: string) => ["timesheet-periods", id] as const;
const timesheetPeriodListQueryKey = (filters?: TimesheetPeriodListFilters) =>
  [...TIMESHEET_PERIODS_QUERY_KEY, filters ?? {}] as const;

export function useTimesheetPeriodList(filters?: TimesheetPeriodListFilters) {
  return useQuery({
    queryKey: timesheetPeriodListQueryKey(filters),
    queryFn: () => getTimesheetPeriodListRequest(filters),
  });
}

export function useTimesheetPeriod(id: string) {
  return useQuery({
    queryKey: timesheetPeriodQueryKey(id),
    queryFn: () => getTimesheetPeriodRequest(id),
    enabled: Boolean(id),
  });
}

export function useCreateTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTimesheetPeriodRequest) => createTimesheetPeriodRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_PERIODS_QUERY_KEY });
    },
  });
}

export function useLockTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lockTimesheetPeriodRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_PERIODS_QUERY_KEY });
    },
  });
}

export function useUnlockTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unlockTimesheetPeriodRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_PERIODS_QUERY_KEY });
    },
  });
}

export function useDeleteTimesheetPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTimesheetPeriodRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMESHEET_PERIODS_QUERY_KEY });
    },
  });
}
