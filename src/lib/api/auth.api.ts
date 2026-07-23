import { apiClient } from "@/lib/api/axiosInstance";
import type {
  AuthUser,
  ChangePasswordRequest,
  CreateUserRequest,
  CreateUserResult,
  LoginRequest,
  Role,
  UnassignedUserListParams,
  UnassignedUserPage,
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

/** Read-only reference data backing the "Role" select box on the Create User form. */
export async function getRolesRequest(): Promise<Role[]> {
  const { data } = await apiClient.get<{ data: Role[] }>("/auth/roles");
  return data.data;
}

/**
 * Read-only, searchable + scroll-paginated reference data backing the "User"
 * combobox on the Project Assignments form
 * (`components/ui/SearchableSelectField.tsx`,
 * `hooks/useAuth.ts#useUnassignedUsersInfinite`). Proxies through this app's
 * own `/api/auth/unassigned-users` Route Handler, which in turn calls the
 * backend's `Auth/GetUserList` endpoint (see
 * `app/api/auth/unassigned-users/route.ts`).
 */
export async function getUnassignedUsersRequest(
  params: UnassignedUserListParams = {}
): Promise<UnassignedUserPage> {
  const { data } = await apiClient.get<{ data: UnassignedUserPage }>("/auth/unassigned-users", {
    params,
  });
  return data.data;
}
