"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TablePagination } from "@/components/ui/TablePagination";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteProject, useProjectList } from "@/hooks/useProjects";
import { useTablePagination } from "@/hooks/useTablePagination";
import { canManageProjects } from "@/lib/constants/project.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";
import type { Project } from "@/types/project.types";

function matchesSearch(project: Project, term: string): boolean {
  if (!term) return true;
  const haystack = `${project.code} ${project.name} ${project.clientName}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

/**
 * `/projects` — list/search/manage client projects, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`). Fetches live data via `useProjectList`
 * (TanStack Query -> `lib/api/project.api.ts` -> `/api/projects` Route
 * Handler -> the .NET backend's `Project/GetProjectList`).
 */
export function ProjectsListView() {
  const { user } = useAuth();
  const canManage = canManageProjects(user?.role);

  const [search, setSearch] = useState("");
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: projects, isLoading, isError, error, refetch } = useProjectList();
  const deleteProjectMutation = useDeleteProject();

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((project) => matchesSearch(project, search));
  }, [projects, search]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedProjects,
  } = useTablePagination(filteredProjects);

  function handleDeleteConfirm() {
    if (!projectPendingDelete) return;
    setDeleteError(null);
    deleteProjectMutation.mutate(projectPendingDelete.id, {
      onSuccess: () => setProjectPendingDelete(null),
      onError: (mutationError) => {
        setDeleteError(
          getApiErrorMessage(mutationError, "Unable to delete the project. Please try again.")
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all client projects and assignments.</p>
        </div>
        {canManage && (
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            + New Project
          </Link>
        )}
      </div>

      <div className="max-w-sm">
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <input
          id="project-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, code, or client..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500" role="status">
            Loading projects…
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="error">{getApiErrorMessage(error, "Unable to load projects.")}</Alert>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {projects && projects.length > 0 ? "No projects match your search." : "No projects yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">List of client projects</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Project Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Start Date
                  </th>
                  <th scope="col" className="px-4 py-3">
                    End Date
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  {canManage && (
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{project.code}</td>
                    <td className="px-4 py-3 text-slate-700">{project.name}</td>
                    <td className="px-4 py-3 text-slate-700">{project.clientName}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDisplayDate(project.startDate)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDisplayDate(project.endDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {project.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/projects/${project.id}/assignments`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
                            Assign
                          </Link>
                          <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setProjectPendingDelete(project)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} label="Projects pagination" />

      <ConfirmDialog
        open={projectPendingDelete !== null}
        title="Delete project"
        description={`Are you sure you want to delete "${projectPendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isConfirming={deleteProjectMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setProjectPendingDelete(null)}
      />
    </div>
  );
}
