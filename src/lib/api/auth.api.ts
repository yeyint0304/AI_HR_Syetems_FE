import { apiClient } from "@/lib/api/axiosInstance";
import type {
  AuthUser,
  ChangePasswordRequest,
  CreateUserRequest,
  CreateUserResult,
  LoginRequest,
  ResetPasswordRequest,
  Role,
  UnassignedUserListParams,
  UnassignedUserPage,
  UpdateProfileRequest,
  UpdateUserRequest,
  UserListItem,
  UserListPage,
  UserListQueryParams,
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
 * backend's `Auth/SearchUsers` endpoint, `isAllRole`-scoped by the caller's
 * role (see `app/api/auth/unassigned-users/route.ts`).
 */
export async function getUnassignedUsersRequest(
  params: UnassignedUserListParams = {}
): Promise<UnassignedUserPage> {
  const { data } = await apiClient.get<{ data: UnassignedUserPage }>("/auth/unassigned-users", {
    params,
  });
  return data.data;
}

/**
 * Read-only, searchable + paginated reference data backing the `/admin/users`
 * "User Management" list page (`components/auth/UsersListView.tsx`). Proxies
 * through this app's own `/api/auth/users` Route Handler, which in turn
 * calls the backend's `Auth/GetUserList` endpoint (see
 * `app/api/auth/users/route.ts`).
 */
export async function getUserListRequest(params: UserListQueryParams = {}): Promise<UserListPage> {
  const { data } = await apiClient.get<{ data: UserListPage }>("/auth/users", { params });
  return data.data;
}

/**
 * Updates an existing user, backing the "Edit" action on the `/admin/users`
 * "User Management" table (`components/auth/EditUserForm.tsx`). Proxies
 * through this app's own `/api/auth/users/[id]` Route Handler, which in turn
 * calls the backend's `Auth/UpdateUser/{id}` endpoint (see
 * `app/api/auth/users/[id]/route.ts`).
 */
export async function updateUserRequest(
  id: string,
  payload: UpdateUserRequest
): Promise<UserListItem> {
  const { data } = await apiClient.put<{ data: UserListItem }>(`/auth/users/${id}`, payload);
  return data.data;
}

/**
 * Resets another user's password, backing the "Reset password" action on
 * the `/admin/users` "User Management" table
 * (`components/auth/ResetUserPasswordForm.tsx`). Proxies through this app's
 * own `/api/auth/users/[id]/reset-password` Route Handler, which in turn
 * calls the backend's `Auth/ResetPassword/{id}` endpoint (see
 * `app/api/auth/users/[id]/reset-password/route.ts`).
 */
export async function resetUserPasswordRequest(
  id: string,
  payload: ResetPasswordRequest
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>(
    `/auth/users/${id}/reset-password`,
    payload
  );
  return data;
}
