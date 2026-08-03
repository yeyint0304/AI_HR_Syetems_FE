import "server-only";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";

/**
 * Server-only lookup of every user's *system* role (`SystemAdmin`/
 * `ProjectAdmin`/`Employee` — see `lib/constants/auth.constants.ts#USER_ROLES`),
 * distinct from a project's per-assignment `ResourceRoleTypeName` (e.g.
 * "Senior Developer") that `lib/server/projectResponseMappers.ts` maps.
 *
 * Backs the fix for the `feature/user-deactivate` request "System Admin and
 * Project Admin cannot approve or reject their own timesheet... a System
 * Admin's timesheet can only be approved by other System Admins": knowing
 * whether a given timesheet entry's owner is a `SystemAdmin` requires
 * resolving their system role, which `TimesheetEntry/GetAllTimesheetEntries`/
 * `GetProjectAdminTimesheetSummary` never return (see
 * `types/timesheetEntry.types.ts`).
 *
 * `docs/HR_System_BE.postman_collection.json` documents no "get user(s) by
 * id" endpoint, so this instead calls `Auth/SearchUsers?isAllRole=true` — the
 * only endpoint confirmed (by that collection's own saved example request)
 * to return users of *every* role regardless of the caller's own role: the
 * saved "Search Users" request's own bearer token decodes to a `ProjectAdmin`
 * caller, yet it passes `isAllRole=true`, which only makes sense if a
 * ProjectAdmin is allowed to see every role's users through this endpoint
 * (unlike `Auth/GetUserList`, which this app's own `GET /api/auth/users`
 * Route Handler already restricts to SystemAdmin — see that route's doc
 * comment). A single generously-sized page is fetched rather than paging
 * through the full result set, which is an acceptable simplification for
 * this app's small internal user directory (mirrors
 * `hooks/useAuth.ts#useUnassignedUsersInfinite`'s own defensive bound on how
 * many pages it will ever fetch).
 */
const USER_ROLE_DIRECTORY_PAGE_SIZE = 500;

export interface UserRoleDirectoryEntry {
  userId: string;
  roleName: string;
}

interface RawDirectoryUser {
  UserId?: string;
  userId?: string;
  Id?: string;
  id?: string;
  RoleName?: string;
  roleName?: string;
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.Items)) return obj.Items;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.Data)) return obj.Data;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

function mapDirectoryEntry(raw: unknown): UserRoleDirectoryEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawDirectoryUser;
  const userId = r.UserId ?? r.userId ?? r.Id ?? r.id;
  const roleName = r.RoleName ?? r.roleName;
  if (!userId || !roleName) return null;
  return { userId, roleName };
}

/** Fetches the full `{ userId, roleName }` directory (see this module's doc comment). */
export async function fetchUserRoleDirectory(accessToken: string): Promise<UserRoleDirectoryEntry[]> {
  const response = await backendApiClient.get("/Auth/SearchUsers", {
    params: { isAllRole: true, page: 1, pageSize: USER_ROLE_DIRECTORY_PAGE_SIZE },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const envelope = readBackendEnvelope(response.data);
  const payload = envelope.isSuccess ? envelope.data : response.data;

  return extractArray(payload)
    .map(mapDirectoryEntry)
    .filter((entry): entry is UserRoleDirectoryEntry => entry !== null);
}

/** Resolves a single user's system role name, or `undefined` if not found in the directory. */
export async function getUserRoleName(userId: string, accessToken: string): Promise<string | undefined> {
  const directory = await fetchUserRoleDirectory(accessToken);
  return directory.find((entry) => entry.userId === userId)?.roleName;
}
