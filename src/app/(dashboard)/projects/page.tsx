"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteProject, getProjectList } from "@/lib/api/projects";
import { ApiError } from "@/lib/apiClient";
import { Project } from "@/types/project";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon, UserRoundPlusIcon } from "@/components/icons";

type LoadState = "loading" | "loaded" | "error";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getProjectList();
      setProjects(data);
      setLoadState("loaded");
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Unable to load projects.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // This is a standard fetch-on-mount data-loading effect: `fetchProjects`
    // only ever sets state from its own `.then`/`.catch` continuation (i.e.
    // after the request settles), never synchronously during this render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, state is set asynchronously after the request settles
    void fetchProjects();
  }, [fetchProjects]);

  function retryLoadProjects() {
    setLoadState("loading");
    setLoadError(null);
    void fetchProjects();
  }

  const activeCount = useMemo(
    () => projects.filter((project) => project.isActive).length,
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(needle) ||
        project.code.toLowerCase().includes(needle) ||
        (project.clientName ?? "").toLowerCase().includes(needle),
    );
  }, [projects, search]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(pendingDelete.id);
      setProjects((prev) => prev.filter((project) => project.id !== pendingDelete.id));
      showToast("Project deleted successfully!", "success");
      setPendingDelete(null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to delete project.";
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {loadState === "loaded"
              ? `${activeCount} active project${activeCount === 1 ? "" : "s"}`
              : "Manage all client projects and assignments."}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          New project
        </Link>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <input
          id="project-search"
          type="search"
          placeholder="Search by name, code, or client…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={loadState !== "loaded"}
          className="w-full rounded-md border border-black/15 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-white/20"
        />
      </div>

      {loadState === "loading" && (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading projects…
        </p>
      )}

      {loadState === "error" && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
        >
          <p>{loadError}</p>
          <button
            type="button"
            onClick={retryLoadProjects}
            className="self-start rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === "loaded" && (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/[0.04]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Code
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Start date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  End date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                    {project.code}
                  </td>
                  <td className="px-4 py-3">{project.name}</td>
                  <td className="px-4 py-3">{project.clientName || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {project.startDate || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {project.endDate || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        project.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400"
                      }`}
                    >
                      {project.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/projects/${project.id}/assignments`}
                        className="flex items-center gap-1 rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        <UserRoundPlusIcon className="h-3.5 w-3.5" />
                        Assign
                      </Link>
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-1 rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(project)}
                        className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {projects.length === 0
                      ? "No projects yet. Create your first project to get started."
                      : "No projects match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete project"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
