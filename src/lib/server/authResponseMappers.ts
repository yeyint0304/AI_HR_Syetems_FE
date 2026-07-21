import "server-only";
import type { Role, UnassignedUser } from "@/types/auth.types";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import type { BackendEnvelope } from "@/lib/server/backendEnvelope";

/**
 * Normalizes the .NET backend's `Auth/GetRoles` / `Auth/GetUserList`
 * response shapes into the camelCase DTOs this app renders, following the
 * same envelope-unwrapping convention as `lib/server/projectResponseMappers.ts`
 * / `lib/server/timesheetPeriodResponseMappers.ts`.
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

interface RawRole {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
  Description?: string | null;
  description?: string | null;
}

/** Maps a single backend Role object (already unwrapped from the `Data` envelope). Returns `null` if the minimum required fields are missing. */
export function mapBackendRole(raw: unknown): Role | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawRole;
  const id = r.Id ?? r.id;
  const name = r.Name ?? r.name;
  if (!id || !name) return null;

  return {
    id,
    name,
    description: r.Description ?? r.description ?? null,
  };
}

/** Maps a backend Role list (`Auth/GetRoles`, already unwrapped from the `Data` envelope). */
export function mapBackendRoleList(raw: unknown): Role[] {
  return extractArray(raw)
    .map(mapBackendRole)
    .filter((role): role is Role => role !== null);
}

interface RawUnassignedUser {
  UserId?: string;
  userId?: string;
  Id?: string;
  id?: string;
  Username?: string;
  username?: string;
  Email?: string;
  email?: string;
  FirstName?: string;
  firstName?: string;
  LastName?: string;
  lastName?: string;
  EmployeeId?: string | null;
  employeeId?: string | null;
}

/** Maps a single backend UnassignedUser object (already unwrapped from the `Data` envelope). Returns `null` if the minimum required fields are missing. */
export function mapBackendUnassignedUser(raw: unknown): UnassignedUser | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawUnassignedUser;
  const id = r.UserId ?? r.userId ?? r.Id ?? r.id;
  const username = r.Username ?? r.username;
  const email = r.Email ?? r.email;
  if (!id || !username || !email) return null;

  return {
    id,
    username,
    email,
    firstName: r.FirstName ?? r.firstName ?? "",
    lastName: r.LastName ?? r.lastName ?? "",
    employeeId: r.EmployeeId ?? r.employeeId ?? null,
  };
}

/**
 * Maps `Auth/GetUserList`'s response into a flat `UnassignedUser[]`.
 *
 * The saved "200 - Success" example in
 * `docs/HR_System_BE.postman_collection.json` shows `Data` as a bare array,
 * but the live backend actually returns it *paginated* —
 * `Data: { TotalCount, PageNo, PageSize, Items: [...] }` — the same shape
 * `mapBackendResourceRoleTypeList`/`mapBackendCurrencyList` already handle
 * for their own endpoints. `extractArray(raw)` alone can't see the nested
 * array here, since `raw` is the *outer* envelope and `obj.Data` is an
 * object, not an array, so it silently fell through to `[]` — every user
 * looked "already assigned" and the "Add User to Project" select on the
 * Project Assignments screen always rendered empty. Unwrapping the envelope
 * first lets `extractArray` find the nested `Items` array instead, while
 * still tolerating the flat-array shape the docs describe (`extractArray`
 * returns the array as-is when it's passed one directly).
 */
export function mapBackendUnassignedUserList(raw: unknown): UnassignedUser[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendUnassignedUser)
    .filter((user): user is UnassignedUser => user !== null);
}
