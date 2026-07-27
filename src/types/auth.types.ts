/**
 * Shared Auth domain types. These are intentionally minimal Data Transfer
 * Objects (DTOs) — only the fields the UI actually needs are exposed to the
 * client, per the Next.js DTO guidance (see node_modules/next/dist/docs
 * /01-app/02-guides/authentication.md#using-data-transfer-objects-dto).
 */
import type { UserRole } from "@/lib/constants/auth.constants";

/** Non-sensitive user profile derived from JWT claims, safe to render in the UI. */
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole | string;
  countryId?: string | null;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  countryId?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  countryId?: string | null;
  roleId: string;
}

export interface CreateUserResult {
  id: string;
}

/**
 * Payload for `PUT /api/auth/users/{id}` (backend `Auth/UpdateUser/{id}`),
 * backing the "Edit" action on the `/admin/users` "User Management" table
 * (`docs/HR_System_FE_wireframe.pdf`: "/admin/users — ... Actions: Edit").
 * Unlike `CreateUserRequest`, there is no `password` field — `Auth/UpdateUser`
 * does not accept one (see `docs/HR_System_BE.postman_collection.json`'s
 * saved "Update User" request body). `roleId` is optional/nullable: the
 * backend's saved example sends `"RoleId": null` to mean "keep the user's
 * current role" — since `Auth/GetUserList` (this screen's data source) only
 * ever returns the role's *name*, not its id, `EditUserForm` defaults this to
 * "keep current role" rather than guessing an id from the name.
 */
export interface UpdateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  countryId?: string | null;
  isActive: boolean;
  roleId?: string | null;
}

/**
 * Reference data backing the "Role" dropdown on the Create User screen
 * (`Auth/CreateUser` requires a `RoleId`). Sourced from `Auth/GetRoles` per
 * `docs/HR_System_BE.postman_collection.json` — distinct from
 * `types/project.types.ts`'s `ResourceRoleType` (a project's per-assignment
 * job title, e.g. "Senior Developer"), which is a separate backend domain.
 */
export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Reference data backing the "User" dropdown on the Project Assignments
 * screen (`Project/AssignResource` requires a `UserId`). Sourced from
 * `Auth/GetUserList` (the endpoint's actual path per
 * `docs/HR_System_BE.postman_collection.json` — there is no
 * `Auth/GetUnassignedUsers` route on the backend), which only returns users
 * with no existing project assignment at all — see
 * `app/api/auth/unassigned-users/route.ts` for the caveat this implies.
 */
export interface UnassignedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
}

/**
 * Query params for `GET /api/auth/unassigned-users`, backing the searchable,
 * scroll-paginated "User" combobox on the Project Assignments screen
 * (`components/ui/SearchableSelectField.tsx` +
 * `hooks/useAuth.ts#useUnassignedUsersInfinite`). See
 * `app/api/auth/unassigned-users/route.ts` for how these are applied against
 * `Auth/GetUserList`, which — unlike `Country/GetAllCountries` and friends —
 * documents no query parameters at all in
 * `docs/HR_System_BE.postman_collection.json`.
 */
export interface UnassignedUserListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** One page of `UnassignedUser` results, as returned by `GET /api/auth/unassigned-users`. */
export interface UnassignedUserPage {
  items: UnassignedUser[];
  page: number;
  pageSize: number;
  totalCount: number;
  /** Whether a next page is worth requesting (`page * pageSize < totalCount`, at minimum). */
  hasMore: boolean;
}

/**
 * A single row on the `/admin/users` "User Management" screen
 * (`docs/HR_System_FE_wireframe.pdf`: "table shows all... users with role
 * badges... and role count chips"). Sourced from the same `Auth/GetUserList`
 * endpoint as `UnassignedUser` above, but exposing the additional
 * role/country/status fields that endpoint's full (unfiltered) response
 * includes and the user-list screen needs — `UnassignedUser` deliberately
 * stays minimal since it only backs a combobox's option label.
 */
export interface UserListItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  roleName: string;
  countryId?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  /** `Auth/GetUserList`'s saved example omits this field — defaults to `true` (active) when absent, per `lib/server/authResponseMappers.ts`. */
  isActive: boolean;
}

/** Query params for `GET /api/auth/users`, backing the `/admin/users` list page. */
export interface UserListQueryParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** One page of `UserListItem` results, as returned by `GET /api/auth/users`. */
export interface UserListPage {
  items: UserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}
