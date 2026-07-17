"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assignResource, getProjectAssignments, getProjectById, removeResource } from "@/lib/api/projects";
import { getResourceRoleTypes } from "@/lib/api/resourceRoleTypes";
import { ApiError } from "@/lib/apiClient";
import { listMockUsers } from "@/lib/mockUsers";
import { AuthUser } from "@/types/auth";
import { Project, ProjectAssignment } from "@/types/project";
import { ResourceRoleType } from "@/types/resourceRoleType";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { ChevronLeftIcon, TrashIcon, UserRoundPlusIcon } from "@/components/icons";

type LoadState = "loading" | "loaded" | "error" | "not-found";

function userLabel(user: AuthUser | undefined, userId: string): string {
  return user ? `${user.firstName} ${user.lastName}` : `Unknown user (${userId})`;
}

export default function ProjectAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();

  // NOTE: the Project API contract has no endpoint to list all users, so
  // the existing local user directory is used to resolve a friendly
  // name/email for the "assign user" picker and the assigned-users list.
  // The `userId` sent to the real AssignResource/RemoveResource endpoints
  // is always the directory entry's `id`.
  const [allUsers] = useState<AuthUser[]>(() => listMockUsers());

  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [roleTypes, setRoleTypes] = useState<ResourceRoleType[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleTypeId, setSelectedRoleTypeId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ProjectAssignment | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectData, assignmentData, roleTypeData] = await Promise.all([
        getProjectById(params.id),
        getProjectAssignments(params.id),
        getResourceRoleTypes(),
      ]);
      setProject(projectData);
      setAssignments(assignmentData);
      setRoleTypes(roleTypeData);
      setLoadState("loaded");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoadState("not-found");
      } else {
        setLoadError(error instanceof ApiError ? error.message : "Unable to load assignments.");
        setLoadState("error");
      }
    }
  }, [params.id]);

  useEffect(() => {
    // Fetch-on-mount: `fetchData` only sets state from its async
    // continuation once the requests settle, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, state is set asynchronously after the request settles
    void fetchData();
  }, [fetchData]);

  function retryLoadData() {
    setLoadState("loading");
    setLoadError(null);
    void fetchData();
  }

  const assignedUserIds = useMemo(() => new Set(assignments.map((a) => a.userId)), [assignments]);
  const unassignedUsers = useMemo(
    () => allUsers.filter((user) => !assignedUserIds.has(user.id)),
    [allUsers, assignedUserIds],
  );

  function roleTypeName(roleTypeId: string): string {
    return roleTypes.find((role) => role.id === roleTypeId)?.name ?? roleTypeId;
  }

  async function handleAddUser() {
    if (!project || !selectedUserId || !selectedRoleTypeId) return;
    const addedUser = allUsers.find((user) => user.id === selectedUserId);

    setIsAdding(true);
    try {
      const created = await assignResource(project.id, {
        userId: selectedUserId,
        resourceRoleTypeId: selectedRoleTypeId,
      });
      setAssignments((prev) => [...prev, created]);
      showToast(`${userLabel(addedUser, selectedUserId)} assigned to project.`, "success");
      setSelectedUserId("");
      setSelectedRoleTypeId("");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to assign user.";
      showToast(message, "error");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleConfirmRemove() {
    if (!project || !pendingRemove) return;
    setIsRemoving(true);
    try {
      await removeResource(project.id, pendingRemove.id);
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== pendingRemove.id));
      const removedUser = allUsers.find((user) => user.id === pendingRemove.userId);
      showToast(`${userLabel(removedUser, pendingRemove.userId)} removed from project.`, "success");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to remove assignment.";
      showToast(message, "error");
    } finally {
      setIsRemoving(false);
      setPendingRemove(null);
    }
  }

  if (loadState === "loading") {
    return (
      <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading assignments…
      </p>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This project may have been removed.
        </p>
      </div>
    );
  }

  if (loadState === "error" || !project) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
      >
        <p>{loadError ?? "Unable to load assignments."}</p>
        <button
          type="button"
          onClick={retryLoadData}
          className="self-start rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
        >
          Retry
        </button>
      </div>
    );
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
          {assignments.length} user{assignments.length === 1 ? "" : "s"} currently assigned
        </p>

        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {assignments.map((assignment) => {
            const user = allUsers.find((candidate) => candidate.id === assignment.userId);
            return (
              <li key={assignment.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{userLabel(user, assignment.userId)}</p>
                  {user && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>}
                </div>
                <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400">
                  {roleTypeName(assignment.resourceRoleTypeId)}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingRemove(assignment)}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            );
          })}
          {assignments.length === 0 && (
            <li className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No users assigned yet.
            </li>
          )}
        </ul>
      </div>

      <div className="max-w-2xl rounded-lg border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-lg font-semibold">Add user to project</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Select a user and their resource role to assign.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                  {user.firstName} {user.lastName} — {user.jobRole}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="assign-role" className="sr-only">
              Select a resource role
            </label>
            <select
              id="assign-role"
              value={selectedRoleTypeId}
              onChange={(event) => setSelectedRoleTypeId(event.target.value)}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
            >
              <option value="">Select a role…</option>
              {roleTypes.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedUserId || !selectedRoleTypeId || isAdding}
            onClick={() => void handleAddUser()}
            className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserRoundPlusIcon className="h-4 w-4" />
            {isAdding ? "Adding…" : "Add user"}
          </button>
        </div>
        {roleTypes.length === 0 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            No resource role types are configured yet, so users cannot be assigned. Add one under
            Reference Data first.
          </p>
        )}
      </div>

      <ConfirmModal
        open={pendingRemove !== null}
        title="Remove assignment"
        description={`Remove ${userLabel(
          allUsers.find((user) => user.id === pendingRemove?.userId),
          pendingRemove?.userId ?? "",
        )} from ${project.name}?`}
        confirmLabel={isRemoving ? "Removing…" : "Remove"}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
