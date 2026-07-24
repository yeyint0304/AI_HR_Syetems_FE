"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TablePagination } from "@/components/ui/TablePagination";
import { useRoles } from "@/hooks/useAuth";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

/** Badge colors matching the wireframe's role-badge convention (`components/auth/UsersListView.tsx`): SystemAdmin=yellow, ProjectAdmin=green, Employee=grey. */
const ROLE_BADGE_CLASSES: Record<string, string> = {
  SystemAdmin: "bg-amber-50 text-amber-700",
  ProjectAdmin: "bg-green-50 text-green-700",
  Employee: "bg-slate-100 text-slate-600",
};

/**
 * `/admin/roles` — read-only view of the system roles used for
 * authentication/authorization (backs the "Role" dropdown on the Create User
 * screen). Unlike Currency/Country/Resource Role Type, the backend exposes
 * no `CreateRole`/`UpdateRole`/`DeleteRole` endpoint — only
 * `Auth/GetRoles` (see `docs/HR_System_BE.postman_collection.json`) — so
 * this screen has no "+ Add Role" action or per-row Edit/Delete, unlike the
 * other Administration screens; roles are seeded/fixed by the backend.
 * Fetches live data via `useRoles` (`hooks/useAuth.ts`, already used by
 * `CreateUserForm`), which calls this app's own SystemAdmin-gated
 * `GET /api/auth/roles` Route Handler.
 */
export function RolesListView() {
  const { data: roles, isLoading, isError, error: loadError, refetch } = useRoles();
  const { page, setPage, totalPages, pageItems: pagedRoles } = useTablePagination(roles ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          System roles used for authentication and access control across the app.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading roles…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">{getApiErrorMessage(loadError, "Unable to load roles.")}</Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!roles || roles.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No roles found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of system roles</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedRoles.map((role) => (
                      <tr key={role.id}>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              ROLE_BADGE_CLASSES[role.name] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {role.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{role.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} label="Roles pagination" />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Roles are fixed by the system and assigned to users on the Create User screen
              (Administration &gt; Users). They cannot be added, edited, or removed here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
