import "server-only";
import type { Project, ProjectAssignment, ResourceRoleType } from "@/types/project.types";

/**
 * Normalizes the .NET backend's Project/Assignment/ResourceRoleType response
 * shapes into the camelCase DTOs this app renders. Neither the exact field
 * casing nor the list-wrapper shape has been verified against a live payload
 * in this environment — `docs/HR_System_BE.postman_collection.json` has no
 * saved example responses — so both PascalCase and camelCase field names,
 * and several common list-wrapper shapes, are checked defensively, mirroring
 * the existing `lib/server/tokenUtils.ts#extractTokens` and
 * `lib/server/normalizeBackendError.ts` conventions. Adjust the `Raw*`
 * interfaces below once a real payload from the .NET backend is available.
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

/** Maps a single backend Project object. Returns `null` if the minimum required fields are missing. */
export function mapBackendProject(raw: unknown): Project | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawProject;
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
  return extractArray(raw)
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

/** Maps a single backend resource-assignment object. Returns `null` if the minimum required fields are missing. */
export function mapBackendAssignment(raw: unknown): ProjectAssignment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawAssignment;
  const id = r.Id ?? r.id ?? r.AssignmentId ?? r.assignmentId;
  const userId = r.UserId ?? r.userId;
  const resourceRoleTypeId = r.ResourceRoleTypeId ?? r.resourceRoleTypeId;
  if (!id || !userId || !resourceRoleTypeId) return null;

  return {
    id,
    userId,
    userName: r.UserName ?? r.userName ?? r.FullName ?? r.fullName,
    userEmail: r.UserEmail ?? r.userEmail ?? r.Email ?? r.email,
    resourceRoleTypeId,
    resourceRoleTypeName: r.ResourceRoleTypeName ?? r.resourceRoleTypeName ?? r.RoleName ?? r.roleName,
  };
}

export function mapBackendAssignmentList(raw: unknown): ProjectAssignment[] {
  return extractArray(raw)
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

/** Maps a single backend ResourceRoleType object. Returns `null` if the minimum required fields are missing. */
export function mapBackendResourceRoleType(raw: unknown): ResourceRoleType | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawResourceRoleType;
  const id = r.Id ?? r.id;
  const name = r.Name ?? r.name;
  if (!id || !name) return null;

  return {
    id,
    name,
    description: r.Description ?? r.description ?? null,
  };
}

export function mapBackendResourceRoleTypeList(raw: unknown): ResourceRoleType[] {
  return extractArray(raw)
    .map(mapBackendResourceRoleType)
    .filter((roleType): roleType is ResourceRoleType => roleType !== null);
}
