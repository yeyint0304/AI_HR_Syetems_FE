import "server-only";
import type {
  Role,
  UnassignedUser,
  UnassignedUserPage,
  UserListItem,
  UserListPage,
} from "@/types/auth.types";
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

interface RawUserListItem extends RawUnassignedUser {
  RoleName?: string;
  roleName?: string;
  CountryId?: string | null;
  countryId?: string | null;
  CountryCode?: string | null;
  countryCode?: string | null;
  CountryName?: string | null;
  countryName?: string | null;
  IsActive?: boolean;
  isActive?: boolean;
}

/**
 * Maps a single backend `Auth/GetUserList` item into the fuller `UserListItem`
 * shape the `/admin/users` list page renders (role/country/status), unlike
 * `mapBackendUnassignedUser` above (which only keeps the fields a combobox
 * option label needs). Returns `null` if the minimum required fields are
 * missing.
 */
export function mapBackendUserListItem(raw: unknown): UserListItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawUserListItem;
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
    roleName: r.RoleName ?? r.roleName ?? "—",
    countryId: r.CountryId ?? r.countryId ?? null,
    countryCode: r.CountryCode ?? r.countryCode ?? null,
    countryName: r.CountryName ?? r.countryName ?? null,
    // The saved "Get User List" example in
    // `docs/HR_System_BE.postman_collection.json` omits `IsActive` entirely
    // (unlike "Search Users", which includes it) — default to active rather
    // than rendering every user as inactive when the field is simply absent.
    isActive: Boolean(r.IsActive ?? r.isActive ?? true),
  };
}

/**
 * Maps `Auth/GetUserList`'s response into a paginated `UserListPage`, backing
 * the `/admin/users` list page. Tolerates the same two response shapes as
 * `mapBackendUnassignedUserPage` above (a bare `Data` array vs. the live
 * backend's `Data: { TotalCount, PageNo, PageSize, Items: [...] }` envelope).
 */
export function mapBackendUserListPage(
  raw: unknown,
  requestedPage: number,
  requestedPageSize: number
): UserListPage {
  const envelope = readBackendEnvelope(raw);
  const payload = envelope.isSuccess ? envelope.data : raw;

  const items = extractArray(payload)
    .map(mapBackendUserListItem)
    .filter((user): user is UserListItem => user !== null);

  const r = (typeof payload === "object" && payload !== null ? payload : {}) as RawUnassignedUserPage;
  const page = asFiniteNumber(r.PageNo ?? r.pageNo ?? r.Page ?? r.page, requestedPage);
  const pageSize = asFiniteNumber(r.PageSize ?? r.pageSize, requestedPageSize);
  const totalCountRaw = r.TotalCount ?? r.totalCount;
  const isPaginatedShape = typeof totalCountRaw === "number";
  const totalCount = isPaginatedShape ? totalCountRaw : items.length;

  return {
    items,
    page,
    pageSize,
    totalCount,
    hasMore: isPaginatedShape && items.length > 0 && page * pageSize < totalCount,
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

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

interface RawUnassignedUserPage {
  TotalCount?: number;
  totalCount?: number;
  PageNo?: number;
  pageNo?: number;
  Page?: number;
  page?: number;
  PageSize?: number;
  pageSize?: number;
}

/**
 * Maps `Auth/GetUserList`'s response into a paginated `UnassignedUserPage`,
 * backing the scroll-paginated "User" combobox
 * (`hooks/useAuth.ts#useUnassignedUsersInfinite`). Tolerates both response
 * shapes seen for this endpoint (see `mapBackendUnassignedUserList`'s doc
 * comment): a bare `Data` array (per the saved Postman example — treated as
 * the complete result set, so `hasMore` is `false`) and the live backend's
 * actual `Data: { TotalCount, PageNo, PageSize, Items: [...] }` envelope
 * (`hasMore` derived from `page * pageSize < totalCount`).
 *
 * `requestedPage`/`requestedPageSize` are used as fallbacks when the
 * backend's response doesn't echo them back explicitly.
 */
export function mapBackendUnassignedUserPage(
  raw: unknown,
  requestedPage: number,
  requestedPageSize: number
): UnassignedUserPage {
  const envelope = readBackendEnvelope(raw);
  const payload = envelope.isSuccess ? envelope.data : raw;

  const items = extractArray(payload)
    .map(mapBackendUnassignedUser)
    .filter((user): user is UnassignedUser => user !== null);

  const r = (typeof payload === "object" && payload !== null ? payload : {}) as RawUnassignedUserPage;
  const page = asFiniteNumber(r.PageNo ?? r.pageNo ?? r.Page ?? r.page, requestedPage);
  const pageSize = asFiniteNumber(r.PageSize ?? r.pageSize, requestedPageSize);
  const totalCountRaw = r.TotalCount ?? r.totalCount;
  const isPaginatedShape = typeof totalCountRaw === "number";
  const totalCount = isPaginatedShape ? totalCountRaw : items.length;

  return {
    items,
    page,
    pageSize,
    totalCount,
    hasMore: isPaginatedShape && items.length > 0 && page * pageSize < totalCount,
  };
}
