"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assignUserToProject, getProject, removeUserFromProject } from "@/lib/mockProjects";
import { listMockUsers } from "@/lib/mockUsers";
import { AuthUser, ROLE_LABELS } from "@/types/auth";
import { Project } from "@/types/project";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { ChevronLeftIcon, TrashIcon, UserRoundPlusIcon } from "@/components/icons";

const ROLE_BADGE_STYLES: Record<AuthUser["role"], string> = {
  SYSTEM_ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  PROJECT_ADMIN: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  ASSIGNED_USER: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400",
};

export default function ProjectAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [allUsers] = useState<AuthUser[]>(() => listMockUsers());
  const [project, setProject] = useState<Project | undefined>(() => getProject(params.id));
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pendingRemove, setPendingRemove] = useState<AuthUser | null>(null);

  if (!project) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This project may have been removed.
        </p>
      </div>
    );
  }

  const assignedUsers = allUsers.filter((user) => project.assignedUserIds.includes(user.id));
  const unassignedUsers = allUsers.filter((user) => !project.assignedUserIds.includes(user.id));

  function handleAddUser() {
    if (!selectedUserId) return;
    const addedUser = allUsers.find((user) => user.id === selectedUserId);
    const updated = assignUserToProject(project!.id, selectedUserId);
    setProject(updated);
    showToast(`${addedUser?.firstName} ${addedUser?.lastName} assigned to project.`, "success");
    setSelectedUserId("");
  }

  function handleConfirmRemove() {
    if (!pendingRemove) return;
    const updated = removeUserFromProject(project!.id, pendingRemove.id);
    setProject(updated);
    showToast(`${pendingRemove.firstName} ${pendingRemove.lastName} removed from project.`, "success");
    setPendingRemove(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${project.id}`}
          aria-label="Back to edit project"
          className="rounded-md border border-black/15 p-1.5 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">User Assignments</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{project.name}</p>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-lg font-semibold">Assigned users</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {assignedUsers.length} user{assignedUsers.length === 1 ? "" : "s"} currently assigned
        </p>

        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {assignedUsers.map((user) => (
            <li key={user.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_STYLES[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <button
                type="button"
                onClick={() => setPendingRemove(user)}
                className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Remove
              </button>
            </li>
          ))}
          {assignedUsers.length === 0 && (
            <li className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No users assigned yet.
            </li>
          )}
        </ul>
      </div>

      <div className="max-w-2xl rounded-lg border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-lg font-semibold">Add user to project</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Select a user to assign.</p>

        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="assign-user" className="sr-only">
              Select a user
            </label>
            <select
              id="assign-user"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
            >
              <option value="">Select a user…</option>
              {unassignedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} — {ROLE_LABELS[user.role]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedUserId}
            onClick={handleAddUser}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserRoundPlusIcon className="h-4 w-4" />
            Add user
          </button>
        </div>
      </div>

      <ConfirmModal
        open={pendingRemove !== null}
        title="Remove assignment"
        description={`Remove ${pendingRemove?.firstName} ${pendingRemove?.lastName} from ${project.name}?`}
        confirmLabel="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
