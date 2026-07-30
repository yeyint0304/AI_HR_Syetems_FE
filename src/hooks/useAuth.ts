"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  changePasswordRequest,
  createUserRequest,
  getRolesRequest,
  getUnassignedUsersRequest,
  getUserListRequest,
  loginRequest,
  logoutRequest,
  resetUserPasswordRequest,
  updateProfileRequest,
  updateUserRequest,
} from "@/lib/api/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { USER_ROLES, UNASSIGNED_USERS_PAGE_SIZE } from "@/lib/constants/auth.constants";
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  ResetPasswordRequest,
  UnassignedUserPage,
  UpdateProfileRequest,
  UpdateUserRequest,
  UserListQueryParams,
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

/**
 * `Auth/UpdateProfile` never reissues the JWT (see
 * `app/api/auth/profile/route.ts`'s doc comment), so a server round-trip
 * (`router.refresh()`) would only ever re-decode the *old* token and could
 * even clobber this optimistic update back to stale data via
 * `AuthStoreHydrator`. Instead, the authoritative updated `AuthUser` the
 * backend just returned is written straight into the Zustand store — the
 * single source of truth `components/layout/DashboardShell.tsx` reads from —
 * so the Sidebar/Topbar name/role update immediately, without waiting on (or
 * being reverted by) a server refresh.
 */
export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfileRequest(payload),
    onSuccess: (user) => {
      setUser(user);
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

/**
 * Safety cap on how many backend pages `useUnassignedUsersInfinite` will
 * fetch for a single search, regardless of what the backend reports via
 * `hasMore`. `Auth/GetUserList` documents no `page`/`pageSize` query
 * parameters at all (see `app/api/auth/unassigned-users/route.ts`), so a
 * backend deployment that silently ignores `page` could otherwise cause an
 * unbounded fetch loop as the user scrolls (each "next page" request
 * returning the same first page over and over, with `hasMore` never
 * resolving to `false`). Combined with the duplicate-page detection in
 * `getNextPageParam` below, this guarantees scrolling always terminates.
 */
const MAX_UNASSIGNED_USERS_PAGES = 25;

/**
 * Scroll-paginated, searchable "User" reference data for the Project
 * Assignments "Add User to Project" combobox
 * (`components/ui/SearchableSelectField.tsx`). One additional backend page
 * is fetched per scroll-to-bottom via the returned `fetchNextPage`; changing
 * `search` starts an independent, separately cached paginated query (see the
 * query key below), so switching search terms doesn't mix stale pages from a
 * previous search into the option list.
 */
export function useUnassignedUsersInfinite(search: string) {
  return useInfiniteQuery({
    queryKey: [...UNASSIGNED_USERS_QUERY_KEY, { search }] as const,
    queryFn: ({ pageParam }) =>
      getUnassignedUsersRequest({
        search: search || undefined,
        page: pageParam,
        pageSize: UNASSIGNED_USERS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: UnassignedUserPage, allPages: UnassignedUserPage[]) => {
      if (!lastPage.hasMore) return undefined;
      if (allPages.length >= MAX_UNASSIGNED_USERS_PAGES) return undefined;

      // Duplicate-page guard: if every user on the "next" page was already
      // seen on an earlier page, the backend isn't actually advancing
      // (e.g. it ignored the `page` param) — stop rather than looping.
      const seenIds = new Set(
        allPages.slice(0, -1).flatMap((page) => page.items.map((user) => user.id))
      );
      const hasNewUsers = lastPage.items.some((user) => !seenIds.has(user.id));
      if (!hasNewUsers) return undefined;

      return lastPage.page + 1;
    },
  });
}

/**
 * Read-only reference-data query key for the `/admin/users` "User
 * Management" list page (`components/auth/UsersListView.tsx`).
 */
export const USER_LIST_QUERY_KEY = ["user-list"] as const;

/**
 * Paginated, searchable user list backing `/admin/users` — the full "User
 * Management" screen (role/country/status per row), distinct from
 * `useUnassignedUsersInfinite` above (which only backs the Project
 * Assignments combobox's minimal option labels).
 */
export function useUserList(params: UserListQueryParams = {}) {
  return useQuery({
    queryKey: [...USER_LIST_QUERY_KEY, params] as const,
    queryFn: () => getUserListRequest(params),
  });
}

/**
 * Updates an existing user (the `/admin/users` "Edit" action,
 * `components/auth/EditUserForm.tsx`). Invalidates every cached
 * `useUserList` page/search variant on success so the list reflects the
 * change immediately, matching `useUpdateCountry`/`useUpdateCurrency`'s
 * invalidation pattern.
 */
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => updateUserRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_LIST_QUERY_KEY });
    },
  });
}

/**
 * Resets another user's password (the `/admin/users` "Reset password"
 * action, `components/auth/ResetUserPasswordForm.tsx`) — a SystemAdmin-only
 * escalation path distinct from `useChangePassword` (which requires knowing
 * the *current* password and only ever changes the caller's own), backed by
 * `Auth/ResetPassword/{id}` (`docs/HR_System_BE.postman_collection.json`).
 * No cache invalidation is needed: resetting a password doesn't change any
 * field `useUserList` renders.
 */
export function useResetUserPassword(userId: string) {
  return useMutation({
    mutationFn: (payload: ResetPasswordRequest) => resetUserPasswordRequest(userId, payload),
  });
}
