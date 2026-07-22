"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  changePasswordRequest,
  createUserRequest,
  getRolesRequest,
  getUnassignedUsersRequest,
  loginRequest,
  logoutRequest,
  updateProfileRequest,
} from "@/lib/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  UpdateProfileRequest,
} from "@/types/auth.types";

/**
 * Reusable auth hooks (TanStack Query mutations + Zustand state), following
 * the `use*` naming convention. Components should never call `lib/api/auth.api`
 * directly — always go through one of these hooks so loading/error state and
 * store updates stay consistent.
 */

/** Read-only accessor for the currently known user + derived role helpers. */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  return {
    user,
    isAuthenticated: Boolean(user),
    isSystemAdmin: user?.role === USER_ROLES.SYSTEM_ADMIN,
  };
}

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: LoginRequest) => loginRequest(payload),
    onSuccess: (user) => {
      setUser(user);
      router.replace("/");
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearUser();
      router.replace("/login");
      router.refresh();
    },
  });
}

export function useUpdateProfile() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfileRequest(payload),
    onSuccess: (user) => {
      setUser(user);
      router.refresh();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changePasswordRequest(payload),
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => createUserRequest(payload),
  });
}

/** Read-only reference-data query key for the "Role" dropdown (`Create User` form). */
export const ROLES_QUERY_KEY = ["roles"] as const;

/** Read-only system-role reference data (used by the Create User "Role" dropdown). */
export function useRoles() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: getRolesRequest,
  });
}

/**
 * Read-only reference-data query key for the "User" dropdown on the Project
 * Assignments form. Exported so `useProjects.ts#useAssignResource` can
 * invalidate it once a user has been assigned — that user should stop
 * appearing as "unassigned" for the next project the caller assigns to.
 */
export const UNASSIGNED_USERS_QUERY_KEY = ["unassigned-users"] as const;

/** Read-only unassigned-user reference data (used by the Project Assignments "User" dropdown). */
export function useUnassignedUsers() {
  return useQuery({
    queryKey: UNASSIGNED_USERS_QUERY_KEY,
    queryFn: getUnassignedUsersRequest,
  });
}
