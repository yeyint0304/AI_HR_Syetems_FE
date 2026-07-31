"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, Pencil, UserCheck, UserX } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TextField } from "@/components/ui/TextField";
import { TablePagination } from "@/components/ui/TablePagination";
import { Modal } from "@/components/ui/Modal";
import { EditUserForm } from "@/components/auth/EditUserForm";
import { ResetUserPasswordForm } from "@/components/auth/ResetUserPasswordForm";
import { useAuth, useUpdateUser, useUserList } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import type { UserListItem } from "@/types/auth.types";

/** Display name for a user row, matching the "First Last, falling back to @username" convention used elsewhere in this table and in the Reset password success message. */
function displayName(user: UserListItem): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.username;
}

/** Role badge colors, matching the wireframe's "System Admin=yellow, Project Admin=green, Employee=grey" convention (`docs/HR_System_FE_wireframe.pdf`, `/admin/users`) — same convention as `components/roles/RolesListView.tsx`. */
const ROLE_BADGE_CLASSES: Record<string, string> = {
  [USER_ROLES.SYSTEM_ADMIN]: "bg-amber-50 text-amber-700",
  [USER_ROLES.PROJECT_ADMIN]: "bg-green-50 text-green-700",
  [USER_ROLES.EMPLOYEE]: "bg-slate-100 text-slate-600",
};

function roleBadgeClass(roleName: string): string {
  return ROLE_BADGE_CLASSES[roleName] ?? "bg-slate-100 text-slate-600";
}

/** Role -> count chips shown under the page header, per the wireframe's "3 active users across all roles" + per-role count chips. */
function summarizeByRole(users: UserListItem[]): { roleName: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    counts.set(user.roleName, (counts.get(user.roleName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([roleName, count]) => ({ roleName, count }))
    .sort((a, b) => a.roleName.localeCompare(b.roleName));
}

/**
 * `/admin/users` — "User Management" list, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "table shows all... users with role
 * badges... and role count chips"). Sourced from `Auth/GetUserList`
 * (`docs/HR_System_BE.postman_collection.json`), the same endpoint
 * `GET /api/auth/unassigned-users` already calls for the Project Assignments
 * combobox — but mapped here to the fuller `UserListItem` shape
 * (role/country/status) this screen needs, via the dedicated
 * `GET /api/auth/users` Route Handler and `useUserList` hook.
 *
 * "+ Add User" links to the existing `/admin/users/new` ("Create User") page
 * rather than opening this page as a modal — that page is a fully separate,
 * already-implemented route (`app/(dashboard)/admin/users/new/page.tsx`),
 * and keeping it as its own destination avoids duplicating the (fairly
 * large) Create User form inside this list screen.
 *
 * Per-row "Edit", by contrast, *does* open a pre-filled `Modal`
 * (`components/auth/EditUserForm.tsx`) rather than navigating to a page —
 * matching the Currencies/Countries/Rate Cards Administration screens'
 * "Edit -> pre-filled modal" pattern, and necessary here since the backend
 * exposes no "get user by id" endpoint to hydrate a standalone edit page
 * with (only `Auth/GetUserList`/`Auth/SearchUsers`); the modal reuses the
 * row data this list has already fetched instead.
 *
 * "Reset password" is a second per-row action, opening its own modal
 * (`components/auth/ResetUserPasswordForm.tsx`) backed by
 * `Auth/ResetPassword/{id}` — a SystemAdmin-only escalation path for setting
 * another user's password without knowing their current one, distinct from
 * the self-service "Change password" screen (`/profile/change-password`,
 * which requires the caller's own current password).
 *
 * "Deactivate"/"Activate" is a third per-row action: a confirm-gated status
 * toggle (via the shared `ConfirmDialog`, matching
 * `components/projects/ProjectForm.tsx`'s "Deactivate project" pattern)
 * that reuses the same `useUpdateUser`/`Auth/UpdateUser/{id}` mutation
 * `EditUserForm` uses — sending the row's existing fields back unchanged
 * except `isActive` flipped, and `roleId: null` (per `Auth/UpdateUser`'s
 * saved example, meaning "keep current role"). The currently signed-in
 * user's own row disables the action — exposed both via `title` (mouse
 * users) and an `aria-describedby`-linked, visually-hidden hint (screen
 * reader users, since `title` alone isn't reliably announced) — so a
 * SystemAdmin can't lock themselves out by deactivating their own account.
 * `EditUserForm`'s "Status" field carries the same `isSelf` guard, so the
 * Edit modal can't be used as a second path to the same lockout.
 */
export function UsersListView() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [userBeingEdited, setUserBeingEdited] = useState<UserListItem | null>(null);
  const [userBeingReset, setUserBeingReset] = useState<UserListItem | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [userPendingStatusChange, setUserPendingStatusChange] = useState<UserListItem | null>(null);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);

  const {
    data: userPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useUserList({ search: debouncedSearch || undefined, page: 1, pageSize: 100 });

  const users = useMemo(() => userPage?.items ?? [], [userPage]);
  const roleSummary = useMemo(() => summarizeByRole(users), [users]);
  const { page, setPage, totalPages, pageItems: pagedUsers } = useTablePagination(users);

  const updateStatusMutation = useUpdateUser(userPendingStatusChange?.id ?? "");
  const pendingStatusChangeName = userPendingStatusChange ? displayName(userPendingStatusChange) : "";

  function handleRequestStatusChange(user: UserListItem) {
    setStatusChangeError(null);
    setUserPendingStatusChange(user);
  }

  function handleConfirmStatusChange() {
    if (!userPendingStatusChange) return;
    const target = userPendingStatusChange;
    setStatusChangeError(null);
    updateStatusMutation.mutate(
      {
        username: target.username,
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        employeeId: target.employeeId ?? undefined,
        countryId: target.countryId ?? null,
        isActive: !target.isActive,
        roleId: null,
      },
      {
        onSuccess: () => setUserPendingStatusChange(null),
        onError: (mutationError) => {
          setStatusChangeError(
            getApiErrorMessage(mutationError, "Unable to update the user's status. Please try again.")
          );
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {userPage
              ? `${userPage.totalCount} ${userPage.totalCount === 1 ? "user" : "users"} across all roles.`
              : "Manage user accounts and roles."}
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          + Add User
        </Link>
      </div>

      {resetSuccessMessage && <Alert variant="success">{resetSuccessMessage}</Alert>}
      {statusChangeError && <Alert variant="error">{statusChangeError}</Alert>}

      {roleSummary.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="User counts by role">
          {roleSummary.map((summary) => (
            <span
              key={summary.roleName}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${roleBadgeClass(
                summary.roleName
              )}`}
            >
              {summary.roleName}
              <span className="rounded-full bg-white/70 px-1.5 text-[11px] font-semibold">
                {summary.count}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="max-w-sm">
        <TextField
          label="Search users"
          type="search"
          placeholder="Search by name, username, or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading users…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">{getApiErrorMessage(error, "Unable to load users.")}</Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : users.length === 0 ? (
        <Alert variant="info">
          {searchInput ? "No users match your search." : "No users have been created yet."}
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">List of users</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Country
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUsers.map((user) => {
                  const name = displayName(user);
                  const isSelf = currentUser?.id === user.id;
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(
                            user.roleName
                          )}`}
                        >
                          {user.roleName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {user.countryCode ?? user.countryName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setUserBeingEdited(user)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetSuccessMessage(null);
                              setUserBeingReset(user);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
                            Reset password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestStatusChange(user)}
                            disabled={isSelf}
                            title={isSelf ? "You cannot deactivate your own account." : undefined}
                            aria-describedby={isSelf ? `self-status-hint-${user.id}` : undefined}
                            className={
                              user.isActive
                                ? "inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:text-slate-300"
                                : "inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:text-slate-300"
                            }
                          >
                            {user.isActive ? (
                              <UserX aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                          {isSelf && (
                            <span id={`self-status-hint-${user.id}`} className="sr-only">
                              You cannot deactivate your own account.
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} label="Users pagination" />

      <Modal
        open={userBeingEdited !== null}
        title="Edit user"
        description="Update this user's profile, role, or account status."
        onClose={() => setUserBeingEdited(null)}
      >
        {userBeingEdited && (
          <EditUserForm
            user={userBeingEdited}
            isSelf={currentUser?.id === userBeingEdited.id}
            onSuccess={() => setUserBeingEdited(null)}
            onCancel={() => setUserBeingEdited(null)}
          />
        )}
      </Modal>

      <Modal
        open={userBeingReset !== null}
        title="Reset password"
        description="Set a new password for this user without needing their current one."
        onClose={() => setUserBeingReset(null)}
      >
        {userBeingReset && (
          <ResetUserPasswordForm
            userId={userBeingReset.id}
            userLabel={displayName(userBeingReset)}
            onSuccess={() => {
              setUserBeingReset(null);
              setResetSuccessMessage(`${userBeingReset.username}'s password has been reset successfully.`);
            }}
            onCancel={() => setUserBeingReset(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={userPendingStatusChange !== null}
        title={userPendingStatusChange?.isActive ? "Deactivate user" : "Activate user"}
        description={
          userPendingStatusChange?.isActive
            ? `Are you sure you want to deactivate ${pendingStatusChangeName}? They will no longer be able to sign in.`
            : `Are you sure you want to activate ${pendingStatusChangeName}? They will regain access to sign in.`
        }
        confirmLabel={userPendingStatusChange?.isActive ? "Deactivate" : "Activate"}
        variant={userPendingStatusChange?.isActive ? "danger" : "primary"}
        isConfirming={updateStatusMutation.isPending}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setUserPendingStatusChange(null)}
      />
    </div>
  );
}
