import "server-only";
import type { Project, ProjectAssignment, ResourceRoleType } from "@/types/project.types";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";

/**
 * Normalizes the .NET backend's Project/Assignment/ResourceRoleType response
 * shapes into the camelCase DTOs this app renders.
 *
 * Per the saved "200 - Success" examples for `Project/GetProject`,
 * `Project/AssignResource`, etc. in
 * `docs/HR_System_BE.postman_collection.json`, single-object responses are
 * wrapped in the standard envelope (`{ StatusCode, IsSuccess, Message, Data:
 * {...} }`) — the same envelope `lib/server/timesheetPeriodResponseMappers.ts`
 * already accounted for. The single-object mappers below
 * (`mapBackendProject`/`mapBackendAssignment`/`mapBackendResourceRoleType`)
 * previously read fields from the *top level* of the response only, so they
 * always returned `null` for real backend responses (the actual fields being
 * one level deeper, under `Data`) — this made `GET /api/projects/[id]`
 * respond as if the project didn't exist / fail upstream. They now unwrap
 * that envelope via `readBackendEnvelope` first. Both PascalCase and
 * camelCase field names are still checked defensively for
 * forward-compatibility.
 *
 * `mapBackendProjectList`/`mapBackendAssignmentList` also unwrap the envelope
 * before calling `extractArray`, mirroring the fix already applied to
 * `lib/server/currencyResponseMappers.ts#mapBackendCurrencyList` and
 * `lib/server/authResponseMappers.ts#mapBackendUnassignedUserList`: if
 * `Project/GetProjectList` ever returns its `Data` in the same paginated
 * shape those endpoints do (`Data: { Items: [...], TotalCount, ... }` rather
 * than a bare array — undocumented either way, since the saved Postman
 * example for this endpoint has no response body), `extractArray(raw)` alone
 * can't see the nested array (`raw.Data` would be an object, not an array),
 * so the "Projects" list — and everywhere else `useProjectList` feeds, e.g.
 * the "Add User to Project" screen's page header and the Timesheet History
 * "Project" filter — would silently render empty. Unwrapping first still
 * tolerates a bare-array `Data` exactly as before.
 */

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

interface RawProject {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
  Description?: string | null;
  description?: string | null;
  ClientName?: string;
  clientName?: string;
  ClientEmail?: string;
  clientEmail?: string;
  StartDate?: string;
  startDate?: string;
  EndDate?: string;
  endDate?: string;
  MaxDailyHours?: number;
  maxDailyHours?: number;
  IsActive?: boolean;
  isActive?: boolean;
}

/** Maps a single backend Project object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendProject(raw: unknown): Project | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawProject;
  const id = r.Id ?? r.id;
  const code = r.Code ?? r.code;
  const name = r.Name ?? r.name;
  if (!id || !code || !name) return null;

  return {
    id,
    code,
    name,
    description: r.Description ?? r.description ?? null,
    clientName: r.ClientName ?? r.clientName ?? "",
    clientEmail: r.ClientEmail ?? r.clientEmail ?? "",
    startDate: r.StartDate ?? r.startDate ?? "",
    endDate: r.EndDate ?? r.endDate ?? "",
    maxDailyHours: r.MaxDailyHours ?? r.maxDailyHours ?? 0,
    isActive: r.IsActive ?? r.isActive ?? true,
  };
}

export function mapBackendProjectList(raw: unknown): Project[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendProject)
    .filter((project): project is Project => project !== null);
}

interface RawAssignment {
  Id?: string;
  id?: string;
  AssignmentId?: string;
  assignmentId?: string;
  UserId?: string;
  userId?: string;
  UserName?: string;
  userName?: string;
  FullName?: string;
  fullName?: string;
  FirstName?: string;
  firstName?: string;
  LastName?: string;
  lastName?: string;
  UserEmail?: string;
  userEmail?: string;
  Email?: string;
  email?: string;
  ResourceRoleTypeId?: string;
  resourceRoleTypeId?: string;
  ResourceRoleTypeName?: string;
  resourceRoleTypeName?: string;
  RoleName?: string;
  roleName?: string;
}

/**
 * Maps a single backend resource-assignment object (tolerates being passed
 * either the raw envelope or an already-unwrapped object). Returns `null` if
 * the minimum required fields are missing.
 *
 * Per the saved "200 - Success" example for `Project/GetProjectAssignments`
 * in `docs/HR_System_BE.postman_collection.json`, each item carries the
 * assignee's name as separate `FirstName`/`LastName` fields, not a combined
 * `UserName`/`FullName` field — neither of which the live payload actually
 * includes. Without this, `userName` always fell through to `undefined` and
 * `ProjectAssignmentsView`'s "Assigned Users" list rendered the raw
 * `userId` GUID in place of every assignee's name.
 */
export function mapBackendAssignment(raw: unknown): ProjectAssignment | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawAssignment;
  const id = r.Id ?? r.id ?? r.AssignmentId ?? r.assignmentId;
  const userId = r.UserId ?? r.userId;
  const resourceRoleTypeId = r.ResourceRoleTypeId ?? r.resourceRoleTypeId;
  if (!id || !userId || !resourceRoleTypeId) return null;

  const fullName = `${r.FirstName ?? r.firstName ?? ""} ${r.LastName ?? r.lastName ?? ""}`.trim();

  return {
    id,
    userId,
    userName: r.UserName ?? r.userName ?? r.FullName ?? r.fullName ?? (fullName || undefined),
    userEmail: r.UserEmail ?? r.userEmail ?? r.Email ?? r.email,
    resourceRoleTypeId,
    resourceRoleTypeName: r.ResourceRoleTypeName ?? r.resourceRoleTypeName ?? r.RoleName ?? r.roleName,
  };
}

export function mapBackendAssignmentList(raw: unknown): ProjectAssignment[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendAssignment)
    .filter((assignment): assignment is ProjectAssignment => assignment !== null);
}

interface RawResourceRoleType {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
  Description?: string | null;
  description?: string | null;
}

/** Maps a single backend ResourceRoleType object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendResourceRoleType(raw: unknown): ResourceRoleType | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawResourceRoleType;
  const id = r.Id ?? r.id;
  const name = r.Name ?? r.name;
  if (!id || !name) return null;

  return {
    id,
    name,
    description: r.Description ?? r.description ?? null,
  };
}

/**
 * Maps `ResourceRoleType/GetAllResourceRoleTypes`'s response into a flat
 * `ResourceRoleType[]`. Per the saved "200 - Success" example in
 * `docs/HR_System_BE.postman_collection.json`, this endpoint — unlike
 * `Project/GetProjectAssignments`, whose `Data` is already a bare array — is
 * *paginated*: `Data` is `{ Items: [...], TotalCount, Page, PageSize }`, not
 * an array itself. `extractArray(raw)` alone can't see that, since `raw` here
 * is the *outer* envelope and `obj.Data` is an object, not an array, so it
 * fell through to `[]` and silently emptied the "Resource role" dropdown on
 * the Project Assignments screen. Unwrapping the envelope first (same fix as
 * `lib/server/currencyResponseMappers.ts#mapBackendCurrencyList`) lets
 * `extractArray` find the nested `Items` array instead.
 */
export function mapBackendResourceRoleTypeList(raw: unknown): ResourceRoleType[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendResourceRoleType)
    .filter((roleType): roleType is ResourceRoleType => roleType !== null);
}
