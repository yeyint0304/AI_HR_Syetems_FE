"use client";

import { useState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ResourceRoleTypeForm } from "@/components/resourceRoleTypes/ResourceRoleTypeForm";
import { TablePagination } from "@/components/ui/TablePagination";
import { useDeleteResourceRoleType, useResourceRoleTypes } from "@/hooks/useResourceRoleTypes";
import { useTablePagination } from "@/hooks/useTablePagination";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { ResourceRoleType } from "@/types/project.types";

type ModalState = { mode: "create" } | { mode: "edit"; resourceRoleType: ResourceRoleType } | null;

/**
 * `/admin/resource-role-types` — manage the "resource role" job titles (e.g.
 * "Senior Developer", "QA Engineer") used to price project assignments and
 * rate cards. Not depicted as its own Administration sidebar entry in
 * `docs/HR_System_FE_wireframe.pdf` (only Users/Currencies/Exchange
 * Rates/Rate Cards/Countries are) — this screen extends the same
 * list/modal/confirm layout convention used by those wireframed screens
 * (`components/currencies/CurrenciesListView.tsx`,
 * `components/exchangeRates/ExchangeRatesListView.tsx`) to the
 * `ResourceRoleType` domain, which the backend fully supports CRUD for (see
 * `docs/HR_System_BE.postman_collection.json`'s "Reference Data - Resource
 * Role Type" folder) and which both the Project Assignments and Rate Card
 * screens already depend on as reference data. Fetches live data via
 * `useResourceRoleTypes` (TanStack Query -> `lib/api/*.ts` -> this app's own
 * Route Handlers -> the .NET backend).
 */
export function ResourceRoleTypesListView() {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<ResourceRoleType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: resourceRoleTypes, isLoading, isError, error: loadError, refetch } = useResourceRoleTypes();
  const deleteMutation = useDeleteResourceRoleType();
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedResourceRoleTypes,
  } = useTablePagination(resourceRoleTypes ?? []);

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setDeleteError(null);
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(
          getApiErrorMessage(mutationError, "Unable to delete the resource role type. Please try again.")
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Resource Role Types</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the resource role job titles used for project assignments and rate cards.
          </p>
        </div>
        <Button type="button" onClick={() => setModalState({ mode: "create" })}>
          + Add Resource Role
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
          Loading resource role types…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Alert variant="error">
            {getApiErrorMessage(loadError, "Unable to load resource role types.")}
          </Alert>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!resourceRoleTypes || resourceRoleTypes.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No resource role types yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">List of resource role types</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Description
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedResourceRoleTypes.map((resourceRoleType) => (
                      <tr key={resourceRoleType.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{resourceRoleType.name}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {resourceRoleType.description || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setModalState({ mode: "edit", resourceRoleType })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(resourceRoleType)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                            >
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label="Resource role types pagination"
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              Resource role types are used to price project assignments and rate cards. Deleting a role
              type that is still in use is rejected by the server.
            </p>
          </div>

          <Modal
            open={modalState !== null}
            title={modalState?.mode === "edit" ? "Edit resource role type" : "Add resource role type"}
            description={
              modalState?.mode === "edit"
                ? "Update the name or description for this resource role."
                : "Create a new resource role job title."
            }
            onClose={() => setModalState(null)}
          >
            <ResourceRoleTypeForm
              mode={modalState?.mode ?? "create"}
              resourceRoleType={modalState?.mode === "edit" ? modalState.resourceRoleType : undefined}
              onSuccess={() => setModalState(null)}
              onCancel={() => setModalState(null)}
            />
          </Modal>

          <ConfirmDialog
            open={pendingDelete !== null}
            title="Delete resource role type"
            description={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
            confirmLabel="Delete"
            isConfirming={deleteMutation.isPending}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setPendingDelete(null)}
          />
        </>
      )}
    </div>
  );
}
