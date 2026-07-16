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

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}
