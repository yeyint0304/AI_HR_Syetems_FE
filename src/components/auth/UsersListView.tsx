"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { TablePagination } from "@/components/ui/TablePagination";
import { useUserList } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import type { UserListItem } from "@/types/auth.types";

/** Role badge colors, matching the wireframe's "System Admin=yellow, Project Admin=green, Assigned User=grey" convention (`docs/HR_System_FE_wireframe.pdf`, `/admin/users`). */
const ROLE_BADGE_CLASSES: Record<string, string> = {
  [USER_ROLES.SYSTEM_ADMIN]: "bg-amber-50 text-amber-700",
  [USER_ROLES.PROJECT_ADMIN]: "bg-green-50 text-green-700",
  [USER_ROLES.USER]: "bg-slate-100 text-slate-600",
  [USER_ROLES.GUEST]: "bg-slate-100 text-slate-600",
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
 */
export function UsersListView() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedUsers.map((user) => {
                  const name = `${user.firstName} ${user.lastName}`.trim() || user.username;
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} label="Users pagination" />
    </div>
  );
}
