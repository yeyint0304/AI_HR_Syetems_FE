import { apiClient } from "@/lib/api/axiosInstance";
import type {
  AuthUser,
  ChangePasswordRequest,
  CreateUserRequest,
  CreateUserResult,
  LoginRequest,
  UpdateProfileRequest,
} from "@/types/auth.types";

/**
 * Auth domain repository (one file per backend domain, per the layering
 * convention). Every HTTP call for Login/Logout/RefreshToken/UpdateProfile/
 * ChangePassword/CreateUser goes through this module — components never call
 * axios/fetch directly.
 */

export async function loginRequest(payload: LoginRequest): Promise<AuthUser> {
  const { data } = await apiClient.post<{ user: AuthUser }>("/auth/login", payload);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function updateProfileRequest(payload: UpdateProfileRequest): Promise<AuthUser> {
  const { data } = await apiClient.put<{ user: AuthUser }>("/auth/profile", payload);
  return data.user;
}

export async function changePasswordRequest(
  payload: ChangePasswordRequest
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>("/auth/change-password", payload);
  return data;
}

export async function createUserRequest(
  payload: CreateUserRequest
): Promise<CreateUserResult> {
  const { data } = await apiClient.post<{ data: CreateUserResult }>("/auth/users", payload);
  return data.data;
}
