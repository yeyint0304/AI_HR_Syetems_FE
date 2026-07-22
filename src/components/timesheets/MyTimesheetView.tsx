"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Lock } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { useProjectList } from "@/hooks/useProjects";
import { useTimesheetPeriodList } from "@/hooks/useTimesheetPeriods";
import {
  useCreateTimesheetEntry,
  useDeleteTimesheetEntry,
  useTimesheetEntryList,
  useUpdateTimesheetEntry,
} from "@/hooks/useTimesheetEntries";
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
} from "@/lib/validators/timesheetEntry.validators";
import {
  DEFAULT_DAILY_HOURS_WARNING_THRESHOLD,
  ENTRY_HOURS_STEP,
  MAX_ENTRY_HOURS,
  MIN_ENTRY_HOURS,
} from "@/lib/constants/timesheetEntry.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import {
  WEEKDAY_LABELS,
  addDaysToDateOnly,
  compareDateOnly,
  formatShortDate,
  formatWeekRangeLabel,
  getTodayDateOnly,
  getWeekDates,
  getWeekStart,
  isDateOnlyInRange,
} from "@/lib/utils/week";
import type { TimesheetEntry } from "@/types/timesheetEntry.types";
import type { TimesheetPeriod } from "@/types/timesheetPeriod.types";

interface MyTimesheetViewProps {
  /** The signed-in user's id, resolved server-side from the JWT cookie (see `app/(dashboard)/timesheets/page.tsx`). Never trust a client-suppliable value here. */
  currentUserId: string;
}

interface DraftCell {
  /** Raw `<input type="number">` string value — kept as a string so an empty field is distinguishable from `0`. */
  hours: string;
  taskDescription: string;
}

type PendingOperation =
  | { type: "create"; key: string; payload: ReturnType<typeof toCreatePayload> }
  | { type: "update"; key: string; id: string; payload: { hours: number; taskDescription: string } }
  | { type: "delete"; key: string; id: string };

function cellKey(projectId: string, date: string): string {
  return `${projectId}__${date}`;
}

function toCreatePayload(input: {
  projectId: string;
  timesheetPeriodId: string;
  entryDate: string;
  hours: number;
  taskDescription: string;
}) {
  return input;
}

function formatPeriodOptionLabel(period: TimesheetPeriod): string {
  const range = `${formatDisplayDate(period.periodStart)} – ${formatDisplayDate(period.periodEnd)}`;
  return period.isLocked ? `${range} (Locked)` : range;
}

/** Picks a sensible default period: one covering today, else the most recently started one. */
function resolveDefaultPeriod(periods: TimesheetPeriod[]): TimesheetPeriod | null {
  if (periods.length === 0) return null;
  const today = getTodayDateOnly();
  const current = periods.find((period) => isDateOnlyInRange(today, period.periodStart, period.periodEnd));
  if (current) return current;

  return [...periods].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))[0];
}

function resolveDefaultWeekStart(period: TimesheetPeriod): string {
  const today = getTodayDateOnly();
  const anchor = isDateOnlyInRange(today, period.periodStart, period.periodEnd) ? today : period.periodStart;
  return getWeekStart(anchor);
}

/**
 * `/timesheets` — "My Timesheets" weekly grid for logging hours per project,
 * per `docs/HR_System_FE_wireframe.pdf` (`/timesheets`: "weekly grid with
 * Mon–Sun columns, hour inputs, daily totals row, click [info] expands task
 * notes"). Backed by the `TimesheetEntry` module documented in
 * `docs/HR_System_BE.postman_collection.json`
 * (`GetAllTimesheetEntries`/`CreateTimesheetEntry`/`UpdateTimesheetEntry`/`DeleteTimesheetEntry`).
 *
 * Each grid cell (project x day) maps 1:1 to a `TimesheetEntry`. Entering
 * hours in a previously-empty cell queues a create; changing hours/notes on
 * an existing entry queues an update; clearing hours on an existing entry
 * queues a delete. All queued changes are applied together via "Save All".
 * Entries that are already `isApproved` are always rendered read-only — per
 * the wireframe's "Locked" state on `/timesheets/history` — and entries
 * outside the selected period's date range, or belonging to a locked period,
 * are also non-editable (a locked period blocks "further entries" per the
 * `TimesheetPeriod/LockTimesheetPeriod` contract description).
 *
 * Note: the backend contract has no "projects assigned to me" endpoint —
 * only `Project/GetProjectList` (all projects) and per-project assignment
 * lookups. This view therefore lists every *active* project as loggable,
 * which is a reasonable default until a user-scoped project list exists.
 *
 * Per the `bugs/timesheet-history` feature request ("In My Timesheet can
 * update date just for present day"): only the *current* calendar day
 * (`getTodayDateOnly`) is ever loggable/editable in the weekly grid, in
 * addition to the existing locked-period/approved/out-of-range checks below
 * — see `isCellLocked`. Past days become read-only once the day has passed
 * (their previously-saved hours still render, just disabled) and future days
 * cannot be logged in advance. This applies uniformly to create, update, and
 * delete (clearing hours), since all three share the same per-cell lock gate
 * and `handleSaveAll` skips locked cells outright.
 *
 * Per the same feature request ("when change the hour then open for
 * description"): typing a non-empty hours value into a cell automatically
 * expands that project's task-notes panel (the same panel the wireframe's
 * "click [info] expands task notes" affordance opens manually) — see the
 * hours `<input>`'s `onChange` in `TimesheetGrid` and `expandProjectNotes`
 * below. `taskDescription` is a required field on both
 * `createTimesheetEntrySchema` and `updateTimesheetEntrySchema`
 * (`lib/validators/timesheetEntry.validators.ts`), so surfacing the notes
 * field the moment hours are entered, rather than requiring a separate manual
 * click, prevents a "Save All" round trip failing only to discover a
 * description was required all along. The manual info-icon toggle
 * (`onToggleExpand`) still works as before for reviewing/collapsing notes.
 */
export function MyTimesheetView({ currentUserId }: MyTimesheetViewProps) {
  const {
    data: periods,
    isLoading: isPeriodsLoading,
    isError: isPeriodsError,
    error: periodsError,
    refetch: refetchPeriods,
  } = useTimesheetPeriodList();
  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjectList();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftCell>>({});
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const sortedPeriods = useMemo(() => {
    if (!periods) return [];
    return [...periods].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
  }, [periods]);

  const activeProjects = useMemo(() => (projects ?? []).filter((project) => project.isActive), [projects]);

  // Pick a default period/week once periods have loaded (once per data load; the
  // user may then freely change either via the controls below). This adjusts
  // state during rendering — React's documented pattern for deriving state
  // from data that just became available (see "Storing information from
  // previous renders" in the React docs) — rather than in a `useEffect`,
  // which would cost an extra commit-then-effect-then-re-render round trip
  // and is what `react-hooks/set-state-in-effect` flags.
  const periodsSignature = sortedPeriods.length > 0 ? sortedPeriods.map((period) => period.id).join(",") : null;
  const [initializedPeriodsSignature, setInitializedPeriodsSignature] = useState<string | null>(null);
  if (!selectedPeriodId && periodsSignature && periodsSignature !== initializedPeriodsSignature) {
    setInitializedPeriodsSignature(periodsSignature);
    const defaultPeriod = resolveDefaultPeriod(sortedPeriods);
    if (defaultPeriod) {
      setSelectedPeriodId(defaultPeriod.id);
      setWeekStart(resolveDefaultWeekStart(defaultPeriod));
    }
  }

  const selectedPeriod = useMemo(
    () => sortedPeriods.find((period) => period.id === selectedPeriodId) ?? null,
    [sortedPeriods, selectedPeriodId]
  );

  const weekDates = useMemo(() => (weekStart ? getWeekDates(weekStart) : []), [weekStart]);

  const {
    data: entries,
    isLoading: isEntriesLoading,
    isError: isEntriesError,
    error: entriesError,
  } = useTimesheetEntryList(
    { userId: currentUserId, timesheetPeriodId: selectedPeriod?.id },
    { enabled: Boolean(selectedPeriod) }
  );

  const baselineByKey = useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    for (const entry of entries ?? []) {
      map.set(cellKey(entry.projectId, entry.entryDate), entry);
    }
    return map;
  }, [entries]);

  // Rebuild the editable draft grid whenever the visible project/day set or the
  // underlying (authoritative) entries change — discarding any unsaved edits,
  // which mirrors "Save All" being the single source of truth for persistence.
  // Same render-time state-adjustment pattern as `periodsSignature` above
  // (a plain `useEffect` here would trigger `react-hooks/set-state-in-effect`).
  const draftsSignature =
    selectedPeriod && weekDates.length > 0
      ? [
          selectedPeriod.id,
          weekDates.join(","),
          activeProjects.map((project) => project.id).join(","),
          [...baselineByKey.entries()]
            .map(([key, entry]) => `${key}:${entry.hours}:${entry.taskDescription}`)
            .join("|"),
        ].join("::")
      : null;
  const [syncedDraftsSignature, setSyncedDraftsSignature] = useState<string | null>(null);
  if (draftsSignature !== syncedDraftsSignature) {
    setSyncedDraftsSignature(draftsSignature);
    if (!selectedPeriod || weekDates.length === 0) {
      setDrafts({});
    } else {
      const next: Record<string, DraftCell> = {};
      for (const project of activeProjects) {
        for (const date of weekDates) {
          const key = cellKey(project.id, date);
          const baseline = baselineByKey.get(key);
          next[key] = {
            hours: baseline ? String(baseline.hours) : "",
            taskDescription: baseline?.taskDescription ?? "",
          };
        }
      }
      setDrafts(next);
    }
    setFieldErrors({});
    setSaveError(null);
    setSaveSuccess(null);
  }

  const createMutation = useCreateTimesheetEntry();
  const updateMutation = useUpdateTimesheetEntry();
  const deleteMutation = useDeleteTimesheetEntry();
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const periodWeekStart = selectedPeriod ? getWeekStart(selectedPeriod.periodStart) : null;
  const periodWeekEnd = selectedPeriod ? getWeekStart(selectedPeriod.periodEnd) : null;
  const canGoPrevWeek = Boolean(
    weekStart && periodWeekStart && compareDateOnly(weekStart, periodWeekStart) > 0
  );
  const canGoNextWeek = Boolean(weekStart && periodWeekEnd && compareDateOnly(weekStart, periodWeekEnd) < 0);

  function goToWeek(offsetDays: number) {
    if (!weekStart) return;
    setWeekStart(addDaysToDateOnly(weekStart, offsetDays));
  }

  function updateDraft(key: string, patch: Partial<DraftCell>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } as DraftCell }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /**
   * Opens (never closes) a project's task-notes panel — used when the user
   * enters hours for one of its cells, so the description field they'll need
   * for "Save All" is already visible. Unlike `onToggleExpand` (the manual
   * info-icon button), this never collapses an already-open panel out from
   * under the user while they're mid-edit.
   */
  function expandProjectNotes(projectId: string) {
    setExpandedProjectId(projectId);
  }

  function isCellLocked(date: string, baseline: TimesheetEntry | undefined): boolean {
    if (!selectedPeriod) return true;
    if (selectedPeriod.isLocked) return true;
    if (!isDateOnlyInRange(date, selectedPeriod.periodStart, selectedPeriod.periodEnd)) return true;
    if (Boolean(baseline?.isApproved)) return true;
    // Only today's date is loggable/editable — see the component doc comment.
    return date !== getTodayDateOnly();
  }

  async function handleSaveAll() {
    if (!selectedPeriod) return;
    setSaveError(null);
    setSaveSuccess(null);

    const validationErrors: Record<string, string> = {};
    const operations: PendingOperation[] = [];

    for (const project of activeProjects) {
      for (const date of weekDates) {
        const key = cellKey(project.id, date);
        const baseline = baselineByKey.get(key);
        if (isCellLocked(date, baseline)) continue;

        const draft = drafts[key];
        if (!draft) continue;

        const trimmedHours = draft.hours.trim();
        const hoursNum = trimmedHours === "" ? 0 : Number(trimmedHours);
        const hasHours = trimmedHours !== "" && Number.isFinite(hoursNum) && hoursNum > 0;
        const taskDescription = draft.taskDescription.trim();

        if (!baseline) {
          if (!hasHours) continue;
          const parsed = createTimesheetEntrySchema.safeParse({
            projectId: project.id,
            timesheetPeriodId: selectedPeriod.id,
            entryDate: date,
            hours: hoursNum,
            taskDescription,
          });
          if (!parsed.success) {
            validationErrors[key] = parsed.error.issues[0]?.message ?? "Check this entry.";
            continue;
          }
          operations.push({ type: "create", key, payload: toCreatePayload(parsed.data) });
          continue;
        }

        if (!hasHours) {
          operations.push({ type: "delete", key, id: baseline.id });
          continue;
        }

        const isUnchanged = hoursNum === baseline.hours && taskDescription === baseline.taskDescription;
        if (isUnchanged) continue;

        const parsed = updateTimesheetEntrySchema.safeParse({ hours: hoursNum, taskDescription });
        if (!parsed.success) {
          validationErrors[key] = parsed.error.issues[0]?.message ?? "Check this entry.";
          continue;
        }
        operations.push({ type: "update", key, id: baseline.id, payload: parsed.data });
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSaveError("Please correct the highlighted entries before saving.");
      return;
    }

    setFieldErrors({});

    if (operations.length === 0) {
      setSaveSuccess("Nothing to save — no changes were made.");
      return;
    }

    let failureCount = 0;
    let firstFailureMessage = "";

    for (const operation of operations) {
      try {
        if (operation.type === "create") {
          await createMutation.mutateAsync(operation.payload);
        } else if (operation.type === "update") {
          await updateMutation.mutateAsync({ id: operation.id, payload: operation.payload });
        } else {
          await deleteMutation.mutateAsync(operation.id);
        }
      } catch (error) {
        failureCount += 1;
        if (!firstFailureMessage) {
          firstFailureMessage = getApiErrorMessage(error, "Unable to save one of the timesheet entries.");
        }
      }
    }

    if (failureCount > 0) {
      setSaveError(
        `${failureCount} ${failureCount === 1 ? "entry" : "entries"} failed to save. ${firstFailureMessage}`
      );
    } else {
      setSaveSuccess("Timesheet saved successfully.");
    }
  }

  const isInitialLoading = isPeriodsLoading || isProjectsLoading;

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
        Loading your timesheet…
      </div>
    );
  }

  if (isPeriodsError || isProjectsError) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="error">
          {getApiErrorMessage(periodsError ?? projectsError, "Unable to load your timesheet.")}
        </Alert>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              refetchPeriods();
              refetchProjects();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (sortedPeriods.length === 0) {
    return (
      <Alert variant="info">
        No timesheet periods have been set up yet. Contact your administrator before logging time.
      </Alert>
    );
  }

  if (activeProjects.length === 0) {
    return <Alert variant="info">There are no active projects available to log time against yet.</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Timesheets</h1>
          <p className="mt-1 text-sm text-slate-500">Log your daily hours per project.</p>
        </div>
        <Button type="button" onClick={handleSaveAll} isLoading={isSaving} disabled={selectedPeriod?.isLocked}>
          Save All
        </Button>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
      {selectedPeriod?.isLocked && (
        <Alert variant="info">This timesheet period is locked. Entries cannot be added or changed.</Alert>
      )}
      {selectedPeriod && !selectedPeriod.isLocked && (
        <Alert variant="info">
          You can only log or edit hours for today, {formatShortDate(getTodayDateOnly())}. Other days are read-only.
        </Alert>
      )}

      <div className="max-w-xs">
        <SelectField
          label="Timesheet period"
          value={selectedPeriodId ?? ""}
          onChange={(event) => {
            const period = sortedPeriods.find((candidate) => candidate.id === event.target.value) ?? null;
            setSelectedPeriodId(period?.id ?? null);
            if (period) setWeekStart(resolveDefaultWeekStart(period));
          }}
          options={sortedPeriods.map((period) => ({ value: period.id, label: formatPeriodOptionLabel(period) }))}
        />
      </div>

      {selectedPeriod && weekStart && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous week"
            disabled={!canGoPrevWeek}
            onClick={() => goToWeek(-7)}
            className="rounded-full border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatWeekRangeLabel(weekStart, addDaysToDateOnly(weekStart, 6))}
          </span>
          <button
            type="button"
            aria-label="Next week"
            disabled={!canGoNextWeek}
            onClick={() => goToWeek(7)}
            className="rounded-full border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {isEntriesLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading timesheet entries…
        </div>
      ) : isEntriesError ? (
        <Alert variant="error">{getApiErrorMessage(entriesError, "Unable to load your timesheet entries.")}</Alert>
      ) : selectedPeriod && weekDates.length === 7 ? (
        <TimesheetGrid
          period={selectedPeriod}
          projects={activeProjects}
          weekDates={weekDates}
          drafts={drafts}
          baselineByKey={baselineByKey}
          fieldErrors={fieldErrors}
          expandedProjectId={expandedProjectId}
          onToggleExpand={(projectId) =>
            setExpandedProjectId((current) => (current === projectId ? null : projectId))
          }
          onExpandProject={expandProjectNotes}
          onCellChange={updateDraft}
          isCellLocked={isCellLocked}
        />
      ) : null}
    </div>
  );
}

interface TimesheetGridProps {
  period: TimesheetPeriod;
  projects: { id: string; code: string; name: string; clientName: string }[];
  weekDates: string[];
  drafts: Record<string, DraftCell>;
  baselineByKey: Map<string, TimesheetEntry>;
  fieldErrors: Record<string, string>;
  expandedProjectId: string | null;
  onToggleExpand: (projectId: string) => void;
  /** Opens (never toggles closed) a project's task-notes panel — see `expandProjectNotes` in `MyTimesheetView`. */
  onExpandProject: (projectId: string) => void;
  onCellChange: (key: string, patch: Partial<DraftCell>) => void;
  isCellLocked: (date: string, baseline: TimesheetEntry | undefined) => boolean;
}

function TimesheetGrid({
  period,
  projects,
  weekDates,
  drafts,
  baselineByKey,
  fieldErrors,
  expandedProjectId,
  onToggleExpand,
  onExpandProject,
  onCellChange,
  isCellLocked,
}: TimesheetGridProps) {
  const dailyTotals = weekDates.map((date) =>
    projects.reduce((sum, project) => {
      const draft = drafts[cellKey(project.id, date)];
      const hours = draft ? Number(draft.hours) : NaN;
      return sum + (Number.isFinite(hours) ? hours : 0);
    }, 0)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Weekly timesheet grid</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Project
              </th>
              {weekDates.map((date, index) => (
                <th key={date} scope="col" className="px-2 py-3 text-center">
                  <span className="block">{WEEKDAY_LABELS[index]}</span>
                  <span className="block font-normal normal-case text-slate-400">{formatShortDate(date)}</span>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project) => {
              const rowTotal = weekDates.reduce((sum, date) => {
                const draft = drafts[cellKey(project.id, date)];
                const hours = draft ? Number(draft.hours) : NaN;
                return sum + (Number.isFinite(hours) ? hours : 0);
              }, 0);

              return (
                <Fragment key={project.id}>
                  <tr>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(project.id)}
                          aria-expanded={expandedProjectId === project.id}
                          aria-label={`${expandedProjectId === project.id ? "Hide" : "Show"} task notes for ${project.name}`}
                          className="mt-0.5 shrink-0 rounded text-slate-400 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          <Info aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{project.name}</p>
                          <p className="truncate text-xs text-slate-500">{project.clientName}</p>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date) => {
                      const key = cellKey(project.id, date);
                      const baseline = baselineByKey.get(key);
                      const draft = drafts[key];
                      const locked = isCellLocked(date, baseline);
                      const inRange = isDateOnlyInRange(date, period.periodStart, period.periodEnd);
                      const error = fieldErrors[key];

                      if (!inRange) {
                        return (
                          <td key={date} className="px-2 py-3 text-center text-slate-300">
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={date} className="px-2 py-3 align-top">
                          <label htmlFor={`hours-${key}`} className="sr-only">
                            {project.name} hours on {formatShortDate(date)}
                          </label>
                          <div className="flex flex-col items-center gap-1">
                            {baseline?.isApproved ? (
                              <span
                                title="Approved — locked"
                                className="flex items-center gap-1 text-xs font-medium text-green-700"
                              >
                                <Lock aria-hidden="true" className="h-3 w-3" />
                                {baseline.hours}h
                              </span>
                            ) : (
                              <input
                                id={`hours-${key}`}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={MAX_ENTRY_HOURS}
                                step={ENTRY_HOURS_STEP}
                                value={draft?.hours ?? ""}
                                disabled={locked}
                                aria-invalid={Boolean(error) || undefined}
                                aria-describedby={error ? `${key}-error` : undefined}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  onCellChange(key, { hours: value });
                                  // Auto-open this project's task-notes panel the moment
                                  // hours are entered, so the (required) description field
                                  // is immediately visible — see the component doc comment.
                                  if (value.trim() !== "") {
                                    onExpandProject(project.id);
                                  }
                                }}
                                className={`w-16 rounded-md border px-2 py-1.5 text-center text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
                                  error ? "border-red-400" : "border-slate-300"
                                }`}
                              />
                            )}
                            {error && (
                              <p id={`${key}-error`} role="alert" className="text-[10px] font-medium text-red-600">
                                {error}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{rowTotal}h</td>
                  </tr>
                  {expandedProjectId === project.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={weekDates.length + 2} className="px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Task notes — {project.name}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
                          {weekDates.map((date) => {
                            const key = cellKey(project.id, date);
                            const baseline = baselineByKey.get(key);
                            const draft = drafts[key];
                            const locked = isCellLocked(date, baseline);
                            const inRange = isDateOnlyInRange(date, period.periodStart, period.periodEnd);
                            if (!inRange) return null;

                            return (
                              <div key={key} className="flex flex-col gap-1">
                                <label htmlFor={`notes-${key}`} className="text-[11px] font-medium text-slate-500">
                                  {formatShortDate(date)}
                                </label>
                                <textarea
                                  id={`notes-${key}`}
                                  rows={2}
                                  disabled={locked}
                                  value={draft?.taskDescription ?? ""}
                                  onChange={(event) => onCellChange(key, { taskDescription: event.target.value })}
                                  placeholder="What did you work on?"
                                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <td className="px-4 py-3">Daily total</td>
              {dailyTotals.map((total, index) => (
                <td key={weekDates[index]} className="px-2 py-3 text-center">
                  <span className={total > DEFAULT_DAILY_HOURS_WARNING_THRESHOLD ? "text-amber-600" : undefined}>
                    {total}h
                  </span>
                </td>
              ))}
              <td className="px-4 py-3 text-right">{dailyTotals.reduce((sum, total) => sum + total, 0)}h</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {dailyTotals.some((total) => total > DEFAULT_DAILY_HOURS_WARNING_THRESHOLD) && (
        <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Daily total exceeds {DEFAULT_DAILY_HOURS_WARNING_THRESHOLD}h on one or more days.
        </p>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        Clear an hours field and Save All to remove that entry. Hours must be between {MIN_ENTRY_HOURS} and{" "}
        {MAX_ENTRY_HOURS}.
      </p>
    </div>
  );
}
