"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
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
import { useUnassignedUsersInfinite } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { ProjectAssignment } from "@/types/project.types";

const SEARCH_DEBOUNCE_MS = 300;

function unassignedUserOptionLabel(user: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  return `${user.firstName} ${user.lastName} — ${user.email}`.trim();
}

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
 * Project" form (User select + Resource role select -> `Project/AssignResource`).
 *
 * Both selects are backed by live reference-data dropdowns:
 *   - "User" is a searchable, scroll-paginated combobox
 *     (`components/ui/SearchableSelectField.tsx`) sourced from
 *     `Auth/GetUserList` (`hooks/useAuth.ts#useUnassignedUsersInfinite`) —
 *     note this only returns users with *no* project assignment at all,
 *     backend-wide, so a user already assigned to a different project won't
 *     appear here (a limitation of the documented backend contract, not
 *     this screen). Typing filters the list (debounced); scrolling to the
 *     bottom of the list loads the next page.
 *   - "Resource role" is sourced from `ResourceRoleType/GetAllResourceRoleTypes`
 *     (`hooks/useResourceRoleTypes.ts`) — a small, fully-loaded list, so it
 *     stays a plain `SelectField`.
 */
export function ProjectAssignmentsView({ projectId }: ProjectAssignmentsViewProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [assignmentPendingRemoval, setAssignmentPendingRemoval] = useState<ProjectAssignment | null>(
    null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserOption, setSelectedUserOption] = useState<SearchableSelectOption | null>(null);
  const debouncedUserSearchTerm = useDebouncedValue(userSearchTerm, SEARCH_DEBOUNCE_MS);

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectAssignments(projectId);
  const { data: resourceRoleTypes, isLoading: isRoleTypesLoading } = useResourceRoleTypes();
  const {
    data: unassignedUsersPages,
    isLoading: isUnassignedUsersLoading,
    isFetchingNextPage: isFetchingMoreUnassignedUsers,
    hasNextPage: hasMoreUnassignedUsers,
    fetchNextPage: fetchMoreUnassignedUsers,
    isError: isUnassignedUsersError,
    error: unassignedUsersError,
    refetch: refetchUnassignedUsers,
  } = useUnassignedUsersInfinite(debouncedUserSearchTerm);

  const unassignedUserOptions: SearchableSelectOption[] = useMemo(
    () =>
      (unassignedUsersPages?.pages ?? []).flatMap((page) =>
        page.items.map((candidate) => ({
          value: candidate.id,
          label: unassignedUserOptionLabel(candidate),
        }))
      ),
    [unassignedUsersPages]
  );

  // Only treat this as "no unassigned users at all" (persistent, page-level
  // empty state that disables the whole form) when there's no active search
  // — otherwise a search with zero matches would incorrectly look like the
  // system has no unassigned users, when `SearchableSelectField`'s own
  // in-popup `emptyMessage` already communicates "no matches" for that case.
  const totalUnassignedUsers = unassignedUsersPages?.pages[0]?.totalCount ?? 0;
  const noUnassignedUsersAtAll =
    !debouncedUserSearchTerm &&
    !isUnassignedUsersLoading &&
    !isUnassignedUsersError &&
    totalUnassignedUsers === 0;

  const assignResourceMutation = useAssignResource(projectId);
  const removeResourceMutation = useRemoveResource(projectId);

  const {
    control,
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
      onSuccess: () => {
        reset();
        setSelectedUserOption(null);
        setUserSearchTerm("");
      },
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

        {noUnassignedUsersAtAll && (
          <div className="mt-4">
            <Alert variant="info">
              There are no unassigned users available right now — every user already belongs to a
              project.
            </Alert>
          </div>
        )}

        <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <SearchableSelectField
                  label="User"
                  name={field.name}
                  disabled={noUnassignedUsersAtAll}
                  placeholder={
                    noUnassignedUsersAtAll ? "No unassigned users available" : "Search by name or email…"
                  }
                  selectedOption={selectedUserOption}
                  onSelect={(option) => {
                    setSelectedUserOption(option);
                    field.onChange(option.value);
                  }}
                  searchTerm={userSearchTerm}
                  onSearchTermChange={setUserSearchTerm}
                  options={unassignedUserOptions}
                  isLoading={isUnassignedUsersLoading}
                  isFetchingMore={isFetchingMoreUnassignedUsers}
                  hasMore={Boolean(hasMoreUnassignedUsers)}
                  onLoadMore={() => {
                    void fetchMoreUnassignedUsers();
                  }}
                  loadError={
                    isUnassignedUsersError
                      ? getApiErrorMessage(unassignedUsersError, "Unable to load users available to assign.")
                      : null
                  }
                  onRetryLoad={() => {
                    void refetchUnassignedUsers();
                  }}
                  error={errors.userId?.message}
                  emptyMessage={
                    debouncedUserSearchTerm ? "No matching users found." : "No unassigned users available."
                  }
                />
              )}
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
          <Button
            type="submit"
            isLoading={assignResourceMutation.isPending}
            disabled={noUnassignedUsersAtAll}
          >
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
