import "server-only";
import type {
  ProjectAdminTimesheetSummary,
  TimesheetEntry,
  TimesheetEntryPage,
  TimesheetProjectSummary,
} from "@/types/timesheetEntry.types";
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

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

interface RawTimesheetEntryPageMeta {
  TotalCount?: number;
  totalCount?: number;
  TotalPages?: number;
  totalPages?: number;
  PageNo?: number;
  pageNo?: number;
  Page?: number;
  page?: number;
  PageSize?: number;
  pageSize?: number;
}

/**
 * Maps `TimesheetEntry/GetAllTimesheetEntries`'s `Data` object (already
 * unwrapped from the envelope) into a `TimesheetEntryPage` — the `Items`
 * array (via `mapBackendTimesheetEntryList`) plus pagination metadata
 * (`TotalCount`/`TotalPages`/`PageNo`/`PageSize`, per the saved example in
 * `docs/HR_System_BE.postman_collection.json`). `requestedPage`/
 * `requestedPageSize` back-fill the metadata whenever the backend omits it,
 * mirroring `lib/server/authResponseMappers.ts#mapBackendUnassignedUserPage`.
 * Added for `feature/timesheets-pagination` — see
 * `app/api/timesheet-entries/route.ts`.
 */
export function mapBackendTimesheetEntryPage(
  raw: unknown,
  requestedPage: number,
  requestedPageSize: number
): TimesheetEntryPage {
  const items = mapBackendTimesheetEntryList(raw);
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as RawTimesheetEntryPageMeta;
  const page = asFiniteNumber(r.PageNo ?? r.pageNo ?? r.Page ?? r.page, requestedPage);
  const pageSize = asFiniteNumber(r.PageSize ?? r.pageSize, requestedPageSize);
  const totalCount = asFiniteNumber(r.TotalCount ?? r.totalCount, items.length);
  const totalPages = asFiniteNumber(
    r.TotalPages ?? r.totalPages,
    Math.max(1, Math.ceil(totalCount / (pageSize || requestedPageSize || 1)))
  );

  return { items, totalCount, page, pageSize, totalPages };
}

interface RawTimesheetProjectSummary {
  ProjectId?: string;
  projectId?: string;
  ProjectCode?: string;
  projectCode?: string;
  ProjectName?: string;
  projectName?: string;
  TotalHours?: number;
  totalHours?: number;
  ApprovedHours?: number;
  approvedHours?: number;
  PendingHours?: number;
  pendingHours?: number;
}

function mapBackendProjectSummary(raw: unknown): TimesheetProjectSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawTimesheetProjectSummary;
  const projectId = r.ProjectId ?? r.projectId;
  if (!projectId) return null;

  return {
    projectId,
    projectCode: r.ProjectCode ?? r.projectCode,
    projectName: r.ProjectName ?? r.projectName,
    totalHours: r.TotalHours ?? r.totalHours ?? 0,
    approvedHours: r.ApprovedHours ?? r.approvedHours ?? 0,
    pendingHours: r.PendingHours ?? r.pendingHours ?? 0,
  };
}

interface RawProjectAdminTimesheetSummary {
  TotalHours?: number;
  totalHours?: number;
  ApprovedHours?: number;
  approvedHours?: number;
  PendingHours?: number;
  pendingHours?: number;
  ProjectSummaries?: unknown[];
  projectSummaries?: unknown[];
  Entries?: unknown[];
  entries?: unknown[];
  Items?: unknown[];
  items?: unknown[];
  TotalCount?: number;
  totalCount?: number;
  TotalPages?: number;
  totalPages?: number;
  PageNo?: number;
  pageNo?: number;
  Page?: number;
  page?: number;
  PageSize?: number;
  pageSize?: number;
}

/**
 * Maps `TimesheetEntry/GetProjectAdminTimesheetSummary`'s response object
 * (already unwrapped from the `Data` envelope) — unlike
 * `mapBackendTimesheetEntryList`, `raw` here is a single object (not an
 * array), with `ProjectSummaries`/`Entries` array fields nested inside it,
 * per the saved example in `docs/HR_System_BE.postman_collection.json`.
 *
 * The saved example's entry list actually comes back under `Items` (sibling
 * to `TotalCount`/`TotalPages`/`PageNo`/`PageSize`, the same paginated-list
 * shape `GetAllTimesheetEntries` uses) rather than `Entries` — both keys are
 * checked (`Entries` first, for any deployment that does return it) so
 * neither shape silently maps to an empty list. `requestedPage`/
 * `requestedPageSize` back-fill the pagination metadata when the backend
 * response omits it, mirroring `mapBackendTimesheetEntryPage` above — added
 * for `feature/timesheets-pagination` so a `ProjectAdmin`'s "Timesheet
 * History" table paginates server-side too (see
 * `app/api/timesheet-entries/project-admin-summary/route.ts`).
 */
export function mapBackendProjectAdminTimesheetSummary(
  raw: unknown,
  requestedPage: number,
  requestedPageSize: number
): ProjectAdminTimesheetSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawProjectAdminTimesheetSummary;

  const projectSummaries = (r.ProjectSummaries ?? r.projectSummaries ?? [])
    .map(mapBackendProjectSummary)
    .filter((summary): summary is TimesheetProjectSummary => summary !== null);

  const entries = (r.Entries ?? r.entries ?? r.Items ?? r.items ?? [])
    .map(mapBackendTimesheetEntry)
    .filter((entry): entry is TimesheetEntry => entry !== null);

  const page = asFiniteNumber(r.PageNo ?? r.pageNo ?? r.Page ?? r.page, requestedPage);
  const pageSize = asFiniteNumber(r.PageSize ?? r.pageSize, requestedPageSize);
  const totalCount = asFiniteNumber(r.TotalCount ?? r.totalCount, entries.length);
  const totalPages = asFiniteNumber(
    r.TotalPages ?? r.totalPages,
    Math.max(1, Math.ceil(totalCount / (pageSize || requestedPageSize || 1)))
  );

  return {
    totalHours: r.TotalHours ?? r.totalHours ?? 0,
    approvedHours: r.ApprovedHours ?? r.approvedHours ?? 0,
    pendingHours: r.PendingHours ?? r.pendingHours ?? 0,
    projectSummaries,
    entries,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
