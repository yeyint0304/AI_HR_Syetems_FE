"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  assignResourceSchema,
  type AssignResourceFormValues,
} from "@/lib/validators/project.validators";
import {
  useAssignResource,
  useProject,
  useProjectAssignments,
  useRemoveResource,
} from "@/hooks/useProjects";
import { useResourceRoleTypes } from "@/hooks/useResourceRoleTypes";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { ProjectAssignment } from "@/types/project.types";

interface ProjectAssignmentsViewProps {
  projectId: string;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`;
  return initials ? initials.toUpperCase() : "?";
}

/**
 * `/projects/[id]/assignments` — "User Assignments" screen per the
 * wireframe: assigned-users list with per-row Remove, plus an "Add User to
 * Project" form (User ID + Resource role -> `Project/AssignResource`).
 *
 * There is no "list all users" endpoint in `docs/HR_System_BE.postman_collection.json`,
 * so — following the same precedent as `CreateUserForm`'s "Role ID"/"Country ID"
 * fields — the user to assign is referenced by GUID via a text field rather
 * than a fetched dropdown. The "Resource role" field IS backed by a live
 * dropdown, since `ResourceRoleType/GetAllResourceRoleTypes` does exist.
 */
export function ProjectAssignmentsView({ projectId }: ProjectAssignmentsViewProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [assignmentPendingRemoval, setAssignmentPendingRemoval] = useState<ProjectAssignment | null>(
    null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectAssignments(projectId);
  const { data: resourceRoleTypes, isLoading: isRoleTypesLoading } = useResourceRoleTypes();

  const assignResourceMutation = useAssignResource(projectId);
  const removeResourceMutation = useRemoveResource(projectId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignResourceFormValues>({
    resolver: zodResolver(assignResourceSchema),
    defaultValues: { userId: "", resourceRoleTypeId: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    assignResourceMutation.mutate(values, {
      onSuccess: () => reset(),
      onError: (mutationError) => {
        setFormError(getApiErrorMessage(mutationError, "Unable to assign the user. Please try again."));
      },
    });
  });

  function handleRemoveConfirm() {
    if (!assignmentPendingRemoval) return;
    setRemoveError(null);
    removeResourceMutation.mutate(assignmentPendingRemoval.id, {
      onSuccess: () => setAssignmentPendingRemoval(null),
      onError: (mutationError) => {
        setRemoveError(getApiErrorMessage(mutationError, "Unable to remove the user. Please try again."));
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">User Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isProjectLoading ? "Loading project…" : (project?.name ?? "Project")}
        </p>
      </div>

      {removeError && <Alert variant="error">{removeError}</Alert>}

      <section
        aria-labelledby="assigned-users-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id="assigned-users-heading" className="text-sm font-semibold text-slate-900">
          Assigned Users
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500" role="status">
            Loading assigned users…
          </p>
        ) : isError ? (
          <div className="mt-4">
            <Alert variant="error">{getApiErrorMessage(error, "Unable to load assignments.")}</Alert>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No users are currently assigned to this project.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
                  >
                    {getInitials(assignment.userName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {assignment.userName ?? assignment.userId}
                    </p>
                    {assignment.userEmail && (
                      <p className="truncate text-xs text-slate-500">{assignment.userEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {assignment.resourceRoleTypeName && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {assignment.resourceRoleTypeName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssignmentPendingRemoval(assignment)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="add-user-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id="add-user-heading" className="text-sm font-semibold text-slate-900">
          Add User to Project
        </h2>
        <p className="mt-1 text-sm text-slate-500">Select a user to assign to this project.</p>

        {formError && (
          <div className="mt-4">
            <Alert variant="error">{formError}</Alert>
          </div>
        )}

        <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label="User ID"
              hint="GUID of the user to assign."
              autoComplete="off"
              error={errors.userId?.message}
              {...register("userId")}
            />
          </div>
          <div className="flex-1">
            <Controller
              control={control}
              name="resourceRoleTypeId"
              render={({ field }) => (
                <SelectField
                  label="Resource role"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  disabled={isRoleTypesLoading}
                  placeholder={isRoleTypesLoading ? "Loading roles…" : "Select a role..."}
                  error={errors.resourceRoleTypeId?.message}
                  options={(resourceRoleTypes ?? []).map((roleType) => ({
                    value: roleType.id,
                    label: roleType.name,
                  }))}
                />
              )}
            />
          </div>
          <Button type="submit" isLoading={assignResourceMutation.isPending}>
            Add User
          </Button>
        </form>
      </section>

      <ConfirmDialog
        open={assignmentPendingRemoval !== null}
        title="Remove assignment"
        description={`Are you sure you want to remove ${
          assignmentPendingRemoval?.userName ?? "this user"
        } from this project?`}
        confirmLabel="Remove"
        isConfirming={removeResourceMutation.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setAssignmentPendingRemoval(null)}
      />
    </div>
  );
}
