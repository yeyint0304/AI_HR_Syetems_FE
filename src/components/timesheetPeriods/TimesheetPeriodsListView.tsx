"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteTimesheetPeriod,
  useLockTimesheetPeriod,
  useTimesheetPeriodList,
  useUnlockTimesheetPeriod,
} from "@/hooks/useTimesheetPeriods";
import { canManageTimesheetPeriods } from "@/lib/constants/timesheetPeriod.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import type { TimesheetPeriod } from "@/types/timesheetPeriod.types";

type LockFilter = "all" | "locked" | "unlocked";

type PendingAction =
  | { type: "lock"; period: TimesheetPeriod }
  | { type: "unlock"; period: TimesheetPeriod }
  | { type: "delete"; period: TimesheetPeriod };

const FILTER_OPTIONS: { value: LockFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "locked", label: "Locked" },
  { value: "unlocked", label: "Unlocked" },
];

function toIsLockedFilter(filter: LockFilter): boolean | undefined {
  if (filter === "locked") return true;
  if (filter === "unlocked") return false;
  return undefined;
}

/**
 * `/timesheet-periods` — list/manage payroll timesheet periods (create, lock,
 * unlock, delete), per the `TimesheetPeriod` module documented in
 * `docs/HR_System_BE.postman_collection.json`. Fetches live data via
 * `useTimesheetPeriodList` (TanStack Query -> `lib/api/timesheetPeriod.api.ts`
 * -> `/api/timesheet-periods` Route Handler -> the .NET backend's
 * `TimesheetPeriod/GetAllTimesheetPeriods`).
 *
 * The wireframe (`docs/HR_File_FE_wireframe.pdf`) does not include a
 * dedicated Timesheet Period screen, so this follows the same table +
 * confirm-modal layout established by `ProjectsListView` for consistency
 * with the rest of the app's design system.
 */
export function TimesheetPeriodsListView() {
  const { user } = useAuth();
  const canManage = canManageTimesheetPeriods(user?.role);

  const [filter, setFilter] = useState<LockFilter>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: periods, isLoading, isError, error, refetch } = useTimesheetPeriodList({
    isLocked: toIsLockedFilter(filter),
  });

  const lockMutation = useLockTimesheetPeriod();
  const unlockMutation = useUnlockTimesheetPeriod();
  const deleteMutation = useDeleteTimesheetPeriod();

  const isMutating = lockMutation.isPending || unlockMutation.isPending || deleteMutation.isPending;

  const sortedPeriods = useMemo(() => {
    if (!periods) return [];
    return [...periods].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
  }, [periods]);

  function handleConfirm() {
    if (!pendingAction) return;
    setActionError(null);
    const { type, period } = pendingAction;

    const onError = (mutationError: unknown, fallback: string) => {
      setActionError(getApiErrorMessage(mutationError, fallback));
    };

    if (type === "lock") {
      lockMutation.mutate(period.id, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to lock the timesheet period. Please try again."),
      });
      return;
    }

    if (type === "unlock") {
      unlockMutation.mutate(period.id, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to unlock the timesheet period. Please try again."),
      });
      return;
    }

    deleteMutation.mutate(period.id, {
      onSuccess: () => setPendingAction(null),
      onError: (err) => onError(err, "Unable to delete the timesheet period. Please try again."),
    });
  }

  const dialogCopy: Record<PendingAction["type"], { title: string; description: string; confirmLabel: string; variant: "danger" | "primary" }> = {
    lock: {
      title: "Lock timesheet period",
      description: `Are you sure you want to lock the period "${
        pendingAction?.period ? formatPeriodRange(pendingAction.period) : ""
      }"? Users will no longer be able to submit timesheet entries for it.`,
      confirmLabel: "Lock",
      variant: "primary",
    },
    unlock: {
      title: "Unlock timesheet period",
      description: `Are you sure you want to unlock the period "${
        pendingAction?.period ? formatPeriodRange(pendingAction.period) : ""
      }"? Users will be able to submit timesheet entries for it again.`,
      confirmLabel: "Unlock",
      variant: "primary",
    },
    delete: {
      title: "Delete timesheet period",
      description: `Are you sure you want to delete the period "${
        pendingAction?.period ? formatPeriodRange(pendingAction.period) : ""
      }"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Timesheet Periods</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage payroll timesheet periods and lock/unlock entry submission.
          </p>
        </div>
        {canManage && (
          <Link
            href="/timesheet-periods/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            + New Period
          </Link>
        )}
      </div>

      <div role="group" aria-label="Filter by lock status" className="flex gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === option.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500" role="status">
            Loading timesheet periods…
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="error">
              {getApiErrorMessage(error, "Unable to load timesheet periods.")}
            </Alert>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : sortedPeriods.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {periods && periods.length > 0
              ? "No timesheet periods match this filter."
              : "No timesheet periods yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">List of timesheet periods</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Period Start
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Period End
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Locked At
                  </th>
                  {canManage && (
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPeriods.map((period) => (
                  <tr key={period.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatDisplayDate(period.periodStart)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDisplayDate(period.periodEnd)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          period.isLocked ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                        }`}
                      >
                        {period.isLocked ? "Locked" : "Unlocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDisplayDate(period.lockedAt)}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          {period.isLocked ? (
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => setPendingAction({ type: "unlock", period })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Unlock aria-hidden="true" className="h-3.5 w-3.5" />
                              Unlock
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => setPendingAction({ type: "lock", period })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                              Lock
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => setPendingAction({ type: "delete", period })}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? dialogCopy[pendingAction.type].title : ""}
        description={pendingAction ? dialogCopy[pendingAction.type].description : ""}
        confirmLabel={pendingAction ? dialogCopy[pendingAction.type].confirmLabel : "Confirm"}
        variant={pendingAction ? dialogCopy[pendingAction.type].variant : "primary"}
        isConfirming={isMutating}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function formatPeriodRange(period: TimesheetPeriod): string {
  return `${formatDisplayDate(period.periodStart)} – ${formatDisplayDate(period.periodEnd)}`;
}
