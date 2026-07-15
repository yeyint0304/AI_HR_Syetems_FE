"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { listProjects, setProjectStatus } from "@/lib/mockProjects";
import { Project } from "@/types/project";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon, UserRoundPlusIcon } from "@/components/icons";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(() => listProjects());
  const [search, setSearch] = useState("");
  const [pendingDeactivate, setPendingDeactivate] = useState<Project | null>(null);
  const { showToast } = useToast();

  const activeCount = useMemo(
    () => projects.filter((project) => project.status === "Active").length,
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(needle) ||
        project.code.toLowerCase().includes(needle) ||
        project.client.toLowerCase().includes(needle),
    );
  }, [projects, search]);

  function handleConfirmDeactivate() {
    if (!pendingDeactivate) return;
    const updated = setProjectStatus(pendingDeactivate.id, "Inactive");
    setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));
    showToast("Project deactivated successfully!", "success");
    setPendingDeactivate(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeCount} active project{activeCount === 1 ? "" : "s"}
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
          className="w-full rounded-md border border-black/15 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
        />
      </div>

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
                <td className="px-4 py-3">{project.client}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {project.startDate}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {project.endDate}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      project.status === "Active"
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400"
                    }`}
                  >
                    {project.status}
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
                      disabled={project.status === "Inactive"}
                      onClick={() => setPendingDeactivate(project)}
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
                  No projects match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={pendingDeactivate !== null}
        title="Deactivate project"
        description={`Are you sure you want to deactivate "${pendingDeactivate?.name}"? It will be hidden from active project lists but existing data will be preserved.`}
        confirmLabel="Deactivate"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </div>
  );
}
