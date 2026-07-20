"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getMonthlyCostRevenueRequest,
  getTimesheetReportRequest,
  getUserRolesSummaryRequest,
} from "@/lib/api/report.api";
import type {
  MonthlyCostRevenueFilters,
  TimesheetReportFilters,
  UserRolesSummaryFilters,
} from "@/types/report.types";

/**
 * Report domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useTimesheetEntries.ts`. Components should never call
 * `lib/api/report.api` directly.
 *
 * Every report requires a mandatory filter (date range, or year/month) before
 * it can be generated, so each hook accepts an `enabled` flag — the query
 * only actually runs once the caller has validated its filter bar and
 * "applied" it (mirrors `useTimesheetEntryList(filters, { enabled })`).
 */

export function useTimesheetReport(filters: TimesheetReportFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["reports", "timesheet", filters],
    queryFn: () => getTimesheetReportRequest(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useUserRolesSummary(
  filters: UserRolesSummaryFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["reports", "roles-summary", filters],
    queryFn: () => getUserRolesSummaryRequest(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useMonthlyCostRevenue(
  filters: MonthlyCostRevenueFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["reports", "cost-revenue", filters],
    queryFn: () => getMonthlyCostRevenueRequest(filters),
    enabled: options?.enabled ?? true,
  });
}
