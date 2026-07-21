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
 * `Auth/GetUnassignedUsers`, which only returns users with no existing
 * project assignment at all — see `app/api/auth/unassigned-users/route.ts`
 * for the caveat this implies.
 */
export interface UnassignedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string | null;
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}
