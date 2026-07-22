"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Pencil, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useProjectList } from "@/hooks/useProjects";
import { useTimesheetPeriodList } from "@/hooks/useTimesheetPeriods";
import {
  useApproveTimesheetEntry,
  useRejectTimesheetEntry,
  useTimesheetEntryList,
  useUpdateTimesheetEntry,
} from "@/hooks/useTimesheetEntries";
import {
  timesheetHistoryFilterSchema,
  updateTimesheetEntrySchema,
} from "@/lib/validators/timesheetEntry.validators";
import {
  canManageAnyTimesheetEntry,
  ENTRY_HOURS_STEP,
  MAX_ENTRY_HOURS,
  MIN_ENTRY_HOURS,
} from "@/lib/constants/timesheetEntry.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import { compareDateOnly } from "@/lib/utils/week";
import type { TimesheetEntry } from "@/types/timesheetEntry.types";
import type { TimesheetPeriod } from "@/types/timesheetPeriod.types";

interface TimesheetHistoryViewProps {
  /** The signed-in user's id, resolved server-side from the JWT cookie (see `app/(dashboard)/timesheets/history/page.tsx`). Never trust a client-suppliable value here. */
  currentUserId: string;
}

interface HistoryFilters {
  dateFrom: string;
  dateTo: string;
  projectId: string;
}

const EMPTY_FILTERS: HistoryFilters = { dateFrom: "", dateTo: "", projectId: "" };

function sumHours(entries: TimesheetEntry[]): number {
  return entries.reduce((total, entry) => total + entry.hours, 0);
}

/**
 * `/timesheets/history` — "Timesheet History" per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "table shows all... mock entries with
 * Approved/Pending badges", 3 summary cards for total/approved/pending
 * hours, and a Date From/Date To/Project filter bar). Backed by the same
 * `TimesheetEntry` module as `MyTimesheetView`
 * (`docs/HR_System_BE.postman_collection.json`,
 * `TimesheetEntry/GetAllTimesheetEntries`/`UpdateTimesheetEntry`), scoped to
 * the signed-in user — this is a read/edit-in-place history view, not a
 * logging surface: creating/deleting entries stays on `/timesheets`.
 *
 * The backend's `GetAllTimesheetEntries` only documents `userId`/`projectId`/
 * `timesheetPeriodId`/`isApproved` query filters (no date-range param), so
 * `projectId` is sent to the API while the Date From/Date To bounds are
 * applied client-side to the fetched entries.
 *
 * Per `TS-05` ("Update Timesheet Entry" — user story backlog): an entry may
 * only be edited while it is not yet approved *and* its timesheet period is
 * not locked. Already-approved entries, and entries whose period has been
 * locked since, render as read-only "Locked" rows (mirroring the wireframe's
 * "Locked"/"Edit" action column).
 *
 * Manager approval workflow: for SystemAdmin/ProjectAdmin (`canManageAnyTimesheetEntry`),
 * this view broadens its scope from "my history" to every user's entries (the
 * backend's `GetAllTimesheetEntries` already supports this — see
 * `app/api/timesheet-entries/route.ts`) and adds a "User" column plus
 * "Approve"/"Reject" actions on pending entries, calling
 * `TimesheetEntry/ApproveTimesheetEntry` via `useApproveTimesheetEntry`. This
 * is the review/approval step `INV-01` ("Includes approved entries only" —
 * `docs/HR_System_User_Stories_Backlog.xlsx`) depends on before an entry can
 * be invoiced. There is no "unapprove" endpoint documented, so approval is
 * treated as irreversible from this UI (confirmed via `ConfirmDialog`).
 *
 * Per row, for a still-pending (`!isApproved`) entry whose period isn't
 * locked (`isEntryEditable`), the Actions column renders *every* action the
 * signed-in user is entitled to for that entry — ownership and role are
 * independent, non-exclusive gates, not an either/or choice:
 *   - **Edit** — shown whenever it's the signed-in user's *own* entry.
 *   - **Approve** / **Reject** — shown whenever the signed-in user is a
 *     manager (`canApprove`), regardless of whose entry it is — including
 *     their own. A manager who owns a still-pending, unlocked entry
 *     therefore sees Edit *and* Approve/Reject together on that row.
 *   - **Locked** — shown instead of the above whenever neither gate applies
 *     (an approved entry, a locked-period entry, or — for a non-manager —
 *     another user's entry, who never reaches this row at all since the
 *     entries query is scoped to their own `userId`).
 *
 * `isEntryEditable` gates all of the above: once a timesheet period is
 * locked, every entry inside it — regardless of whose it is — freezes to
 * "Locked", so neither Edit nor Approve/Reject can act on an entry whose
 * period has since been locked.
 *
 * Self-approval is intentionally permitted, not an oversight: this is a
 * deliberate product decision (see the `bugs/timesheet-history` feature
 * request), and it is *consistent* with the backend contract rather than a
 * new capability layered on top of it — `TimesheetEntry/ApproveTimesheetEntry`
 * is documented as `[Auth]`-only with no ownership restriction, and
 * `canManageAnyTimesheetEntry` (`lib/constants/timesheetEntry.constants.ts`)
 * already grants a SystemAdmin/ProjectAdmin authority over *any* user's
 * entries, their own included. `app/api/timesheet-entries/[id]/approve/route.ts`
 * enforces this server-side (entry-existence + already-approved checks
 * mirroring the ownership-fetch pattern in the sibling `PUT`/`DELETE`
 * routes) so the rule holds regardless of what this UI renders, not only
 * because the UI happens to show these buttons.
 *
 * "Reject" (`useRejectTimesheetEntry`) sends a pending entry back for
 * correction. The backend's Timesheet Entry module documents no dedicated
 * reject/deny endpoint, only Approve and Delete, so rejection is implemented
 * as a delete of the pending entry (see `rejectTimesheetEntryRequest` for the
 * full rationale) — the employee re-logs the time on `/timesheets` if still
 * needed. Like Approve, Reject is confirmed via `ConfirmDialog`.
 */
export function TimesheetHistoryView({ currentUserId }: TimesheetHistoryViewProps) {
  const { user } = useAuth();
  const canApprove = canManageAnyTimesheetEntry(user?.role);

  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [pendingApproveEntry, setPendingApproveEntry] = useState<TimesheetEntry | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [pendingRejectEntry, setPendingRejectEntry] = useState<TimesheetEntry | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjectList();
  const {
    data: periods,
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    error: periodsError,
    refetch: refetchPeriods,
  } = useTimesheetPeriodList();
  const {
    data: entries,
    isLoading: isEntriesLoading,
    isError: isEntriesError,
    error: entriesError,
    refetch: refetchEntries,
  } = useTimesheetEntryList({
    // Managers review/approve every user's entries here; a plain `User` is
    // always scoped to their own (matching the ownership rules enforced
    // server-side in `app/api/timesheet-entries/route.ts`).
    userId: canApprove ? undefined : currentUserId,
    projectId: appliedFilters.projectId || undefined,
  });

  const updateMutation = useUpdateTimesheetEntry();
  const approveMutation = useApproveTimesheetEntry();
  const rejectMutation = useRejectTimesheetEntry();

  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const periodById = useMemo(() => {
    const map = new Map<string, TimesheetPeriod>();
    for (const period of periods ?? []) map.set(period.id, period);
    return map;
  }, [periods]);

  const visibleEntries = useMemo(() => {
    if (!entries) return [];
    return [...entries]
      .filter((entry) => {
        if (appliedFilters.dateFrom && compareDateOnly(entry.entryDate, appliedFilters.dateFrom) < 0) {
          return false;
        }
        if (appliedFilters.dateTo && compareDateOnly(entry.entryDate, appliedFilters.dateTo) > 0) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          compareDateOnly(a.entryDate, b.entryDate) ||
          (a.projectName ?? "").localeCompare(b.projectName ?? "")
      );
  }, [entries, appliedFilters]);

  const totalHours = useMemo(() => sumHours(visibleEntries), [visibleEntries]);
  const approvedHours = useMemo(
    () => sumHours(visibleEntries.filter((entry) => entry.isApproved)),
    [visibleEntries]
  );
  const pendingHours = useMemo(
    () => sumHours(visibleEntries.filter((entry) => !entry.isApproved)),
    [visibleEntries]
  );

  // Shared by both the owner's Edit action and a manager's Approve/Reject
  // actions below (see the component doc comment) so a locked period always
  // reads as "Locked", no matter who is looking at the entry or which of the
  // two actions would otherwise apply.
  function isEntryEditable(entry: TimesheetEntry): boolean {
    if (entry.isApproved) return false;
    // Defense-in-depth: if the owning period can't be resolved (still loading,
    // or missing from the list for any reason) treat the entry as locked
    // rather than optimistically allowing an edit whose lock status we can't
    // actually confirm.
    const period = periodById.get(entry.timesheetPeriodId);
    return Boolean(period && !period.isLocked);
  }

  function isOwnEntry(entry: TimesheetEntry): boolean {
    return entry.userId === currentUserId;
  }

  function formatEntryUserName(entry: TimesheetEntry): string {
    const name = `${entry.userFirstName ?? ""} ${entry.userLastName ?? ""}`.trim();
    return name || "—";
  }

  async function handleConfirmApprove() {
    if (!pendingApproveEntry) return;
    setApproveError(null);
    try {
      await approveMutation.mutateAsync(pendingApproveEntry.id);
      setPendingApproveEntry(null);
      setSaveSuccess("Timesheet entry approved successfully.");
    } catch (error) {
      setPendingApproveEntry(null);
      setApproveError(getApiErrorMessage(error, "Unable to approve this timesheet entry. Please try again."));
    }
  }

  async function handleConfirmReject() {
    if (!pendingRejectEntry) return;
    setRejectError(null);
    try {
      await rejectMutation.mutateAsync(pendingRejectEntry.id);
      setPendingRejectEntry(null);
      setSaveSuccess("Timesheet entry rejected.");
    } catch (error) {
      setPendingRejectEntry(null);
      setRejectError(getApiErrorMessage(error, "Unable to reject this timesheet entry. Please try again."));
    }
  }

  function handleApplyFilters() {
    setFilterError(null);
    const parsed = timesheetHistoryFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Check the selected date range.");
      return;
    }
    setAppliedFilters(draftFilters);
  }

  function startEdit(entry: TimesheetEntry) {
    setEditingEntryId(entry.id);
    setEditHours(String(entry.hours));
    setEditTaskDescription(entry.taskDescription);
    setEditError(null);
    setSaveSuccess(null);
  }

  function cancelEdit() {
    setEditingEntryId(null);
    setEditError(null);
  }

  async function handleSaveEdit(entry: TimesheetEntry) {
    setEditError(null);

    const trimmedHours = editHours.trim();
    const hoursNum = trimmedHours === "" ? NaN : Number(trimmedHours);
    const parsed = updateTimesheetEntrySchema.safeParse({
      hours: hoursNum,
      taskDescription: editTaskDescription,
    });
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.");
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: entry.id, payload: parsed.data });
      setEditingEntryId(null);
      setSaveSuccess("Timesheet entry updated successfully.");
    } catch (error) {
      setEditError(getApiErrorMessage(error, "Unable to update this timesheet entry. Please try again."));
    }
  }

  const isInitialLoading = isProjectsLoading || isPeriodsLoading;

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
        Loading timesheet history…
      </div>
    );
  }

  if (isProjectsError || isPeriodsError) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="error">
          {getApiErrorMessage(projectsError ?? periodsError, "Unable to load your timesheet history.")}
        </Alert>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              refetchProjects();
              refetchPeriods();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Timesheet History</h1>
        <p className="mt-1 text-sm text-slate-500">
          {canApprove
            ? "Review, approve, or reject timesheet entries across all users."
            : "View all past timesheet entries."}
        </p>
      </div>

      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
      {approveError && <Alert variant="error">{approveError}</Alert>}
      {rejectError && <Alert variant="error">{rejectError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total hours logged</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalHours}h</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Approved hours</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{approvedHours}h</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending approval</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pendingHours}h</p>
        </div>
      </div>

      <form
        aria-label="Filter timesheet history"
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full sm:w-40">
          <TextField
            label="Date from"
            type="date"
            value={draftFilters.dateFrom}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
          />
        </div>
        <div className="w-full sm:w-40">
          <TextField
            label="Date to"
            type="date"
            value={draftFilters.dateTo}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectField
            label="Project"
            value={draftFilters.projectId}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, projectId: event.target.value }))}
            options={sortedProjects.map((project) => ({ value: project.id, label: project.name }))}
            placeholder="All Projects"
          />
        </div>
        <div>
          <Button type="submit">Filter</Button>
        </div>
      </form>

      {filterError && <Alert variant="error">{filterError}</Alert>}

      {isEntriesLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading timesheet entries…
        </div>
      ) : isEntriesError ? (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{getApiErrorMessage(entriesError, "Unable to load your timesheet entries.")}</Alert>
          <div>
            <Button type="button" variant="secondary" onClick={() => refetchEntries()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !entries || entries.length === 0 ? (
        <Alert variant="info">You have no timesheet entries yet.</Alert>
      ) : visibleEntries.length === 0 ? (
        <Alert variant="info">No entries match the selected filters.</Alert>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Timesheet entry history</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Date
                  </th>
                  {canApprove && (
                    <th scope="col" className="px-4 py-3">
                      User
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Hours
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Task Description
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const isEditing = editingEntryId === entry.id;
                  const editable = isEntryEditable(entry);
                  const own = isOwnEntry(entry);

                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 align-top text-slate-500">{formatDisplayDate(entry.entryDate)}</td>
                      {canApprove && (
                        <td className="px-4 py-3 align-top text-slate-700">{formatEntryUserName(entry)}</td>
                      )}
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-900">{entry.projectName ?? "—"}</p>
                        {entry.projectCode && <p className="text-xs text-slate-500">{entry.projectCode}</p>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <>
                            <label htmlFor={`history-hours-${entry.id}`} className="sr-only">
                              Hours for {entry.projectName ?? "this entry"} on {formatDisplayDate(entry.entryDate)}
                            </label>
                            <input
                              id={`history-hours-${entry.id}`}
                              type="number"
                              inputMode="decimal"
                              min={MIN_ENTRY_HOURS}
                              max={MAX_ENTRY_HOURS}
                              step={ENTRY_HOURS_STEP}
                              value={editHours}
                              onChange={(event) => setEditHours(event.target.value)}
                              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </>
                        ) : (
                          <span className="text-slate-700">{entry.hours}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <>
                            <label htmlFor={`history-task-${entry.id}`} className="sr-only">
                              Task description for {entry.projectName ?? "this entry"} on{" "}
                              {formatDisplayDate(entry.entryDate)}
                            </label>
                            <textarea
                              id={`history-task-${entry.id}`}
                              rows={2}
                              value={editTaskDescription}
                              onChange={(event) => setEditTaskDescription(event.target.value)}
                              className="w-full min-w-[200px] rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </>
                        ) : (
                          <span className="text-slate-700">{entry.taskDescription}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.isApproved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {entry.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={cancelEdit}
                              disabled={updateMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleSaveEdit(entry)}
                              isLoading={updateMutation.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        ) : editable && (own || canApprove) ? (
                          <div className="flex flex-wrap justify-end gap-3">
                            {own && (
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                className="inline-flex items-center gap-1 rounded text-xs font-medium text-blue-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                              >
                                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}
                            {canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPendingApproveEntry(entry)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded text-xs font-medium text-green-700 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                >
                                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingRejectEntry(entry)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                >
                                  <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                            Locked
                          </span>
                        )}
                        {isEditing && editError && (
                          <p role="alert" className="mt-2 text-right text-xs font-medium text-red-600">
                            {editError}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingApproveEntry !== null}
        title="Approve timesheet entry"
        description={
          pendingApproveEntry
            ? `Approve ${formatEntryUserName(pendingApproveEntry)}'s ${pendingApproveEntry.hours}h entry on ${formatDisplayDate(
                pendingApproveEntry.entryDate
              )}? This cannot be undone.`
            : ""
        }
        confirmLabel="Approve"
        variant="primary"
        isConfirming={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        onCancel={() => setPendingApproveEntry(null)}
      />

      <ConfirmDialog
        open={pendingRejectEntry !== null}
        title="Reject timesheet entry"
        description={
          pendingRejectEntry
            ? `Reject ${formatEntryUserName(pendingRejectEntry)}'s ${pendingRejectEntry.hours}h entry on ${formatDisplayDate(
                pendingRejectEntry.entryDate
              )}? The entry will be removed and cannot be recovered — they will need to re-log this time if it was worked.`
            : ""
        }
        confirmLabel="Reject"
        variant="danger"
        isConfirming={rejectMutation.isPending}
        onConfirm={handleConfirmReject}
        onCancel={() => setPendingRejectEntry(null)}
      />
    </div>
  );
}
