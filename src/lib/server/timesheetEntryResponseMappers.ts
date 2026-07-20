import "server-only";
import type { TimesheetEntry } from "@/types/timesheetEntry.types";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import type { BackendEnvelope } from "@/lib/server/backendEnvelope";

/**
 * Normalizes the .NET backend's Timesheet Entry response shape into the
 * camelCase DTO this app renders, following the same convention as
 * `lib/server/timesheetPeriodResponseMappers.ts`.
 *
 * `docs/HR_System_BE.postman_collection.json` includes concrete saved
 * examples for every Timesheet Entry endpoint, all wrapped in the same
 * envelope: `{ StatusCode, IsSuccess, Message, Data }`. `readBackendEnvelope`
 * extracts `IsSuccess`/`StatusCode`/`Message` so Route Handlers can detect a
 * logical failure signaled at HTTP 200 and translate it into a proper HTTP
 * error response for the client.
 */

export { readBackendEnvelope, resolveEnvelopeFailure };
export type { BackendEnvelope };

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.Data)) return obj.Data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.Items)) return obj.Items;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

interface RawTimesheetEntry {
  Id?: string;
  id?: string;
  UserId?: string;
  userId?: string;
  UserFirstName?: string;
  userFirstName?: string;
  UserLastName?: string;
  userLastName?: string;
  ProjectId?: string;
  projectId?: string;
  ProjectCode?: string;
  projectCode?: string;
  ProjectName?: string;
  projectName?: string;
  TimesheetPeriodId?: string;
  timesheetPeriodId?: string;
  EntryDate?: string;
  entryDate?: string;
  Hours?: number;
  hours?: number;
  TaskDescription?: string;
  taskDescription?: string;
  IsApproved?: boolean;
  isApproved?: boolean;
  ApprovedAt?: string | null;
  approvedAt?: string | null;
  ApprovedBy?: string | null;
  approvedBy?: string | null;
  CreatedAt?: string;
  createdAt?: string;
  UpdatedAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Maps a single backend Timesheet Entry object (already unwrapped from the
 * `Data` envelope, e.g. via `readBackendEnvelope(response.data).data`).
 * Returns `null` if the minimum required fields are missing.
 */
export function mapBackendTimesheetEntry(raw: unknown): TimesheetEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawTimesheetEntry;
  const id = r.Id ?? r.id;
  const userId = r.UserId ?? r.userId;
  const projectId = r.ProjectId ?? r.projectId;
  const timesheetPeriodId = r.TimesheetPeriodId ?? r.timesheetPeriodId;
  const entryDate = r.EntryDate ?? r.entryDate;
  if (!id || !userId || !projectId || !timesheetPeriodId || !entryDate) return null;

  return {
    id,
    userId,
    userFirstName: r.UserFirstName ?? r.userFirstName,
    userLastName: r.UserLastName ?? r.userLastName,
    projectId,
    projectCode: r.ProjectCode ?? r.projectCode,
    projectName: r.ProjectName ?? r.projectName,
    timesheetPeriodId,
    entryDate,
    hours: r.Hours ?? r.hours ?? 0,
    taskDescription: r.TaskDescription ?? r.taskDescription ?? "",
    isApproved: r.IsApproved ?? r.isApproved ?? false,
    approvedAt: r.ApprovedAt ?? r.approvedAt ?? null,
    approvedBy: r.ApprovedBy ?? r.approvedBy ?? null,
    createdAt: r.CreatedAt ?? r.createdAt,
    updatedAt: r.UpdatedAt ?? r.updatedAt ?? null,
  };
}

/** Maps a backend Timesheet Entry list (already unwrapped from the `Data` envelope). */
export function mapBackendTimesheetEntryList(raw: unknown): TimesheetEntry[] {
  return extractArray(raw)
    .map(mapBackendTimesheetEntry)
    .filter((entry): entry is TimesheetEntry => entry !== null);
}
