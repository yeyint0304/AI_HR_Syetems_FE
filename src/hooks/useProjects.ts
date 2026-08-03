"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignResourceRequest,
  createProjectRequest,
  deleteProjectRequest,
  getMyProjectListRequest,
  getProjectAssignmentsRequest,
  getProjectListRequest,
  getProjectRequest,
  removeResourceRequest,
  updateProjectRequest,
} from "@/lib/api/project.api";
import { useAuth, UNASSIGNED_USERS_QUERY_KEY } from "@/hooks/useAuth";
import type {
  AssignResourceRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types/project.types";

/**
 * Project domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useAuth.ts`. Components should never call
 * `lib/api/project.api` directly.
 */

const PROJECTS_QUERY_KEY = ["projects"] as const;
const MY_PROJECTS_QUERY_KEY = ["projects", "my"] as const;
const projectQueryKey = (id: string) => ["projects", id] as const;
const assignmentsQueryKey = (projectId: string) => ["projects", projectId, "assignments"] as const;

/**
 * Full, org-wide project catalog (`Project/GetProjectList`). Prefer
 * `useProjectSelectOptions` below for anything a `ProjectAdmin`/`Employee`
 * should only see their *own* projects in (e.g. the `/projects` list page,
 * per the `feature/user-deactivate` request) — this unscoped hook remains
 * for the few call sites that are intentionally org-wide regardless of role
 * (e.g. `MyTimesheetView`'s "log time" project picker, which every role uses
 * to log time against *any* active project, not just their assignments).
 */
export function useProjectList() {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: getProjectListRequest,
  });
}

/** The signed-in user's own, scoped project list (`Project/GetMyProjectList`) — see `lib/api/project.api.ts#getMyProjectListRequest`. */
export function useMyProjectList() {
  return useQuery({
    queryKey: MY_PROJECTS_QUERY_KEY,
    queryFn: getMyProjectListRequest,
  });
}

/**
 * Powers every "Project" filter/select dropdown (Reports, Invoices, Timesheet
 * History) rather than `useProjectList` directly. A `SystemAdmin` filters
 * across the full org-wide catalog (`useProjectList`); a `ProjectAdmin`/
 * `Employee` is scoped to only the project(s) they manage/are assigned to
 * (`useMyProjectList`) — matching the scope their underlying
 * `Report/GenerateMy*`/`Invoice/GetMyInvoices` backend calls actually cover,
 * so a manager can never pick a project outside what their report/invoice
 * request will honor. Only one of the two queries is ever `enabled` at a
 * time, so no extra request fires for the branch that doesn't apply.
 */
export function useProjectSelectOptions() {
  const { isSystemAdmin } = useAuth();

  const allProjects = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: getProjectListRequest,
    enabled: isSystemAdmin,
  });
  const myProjects = useQuery({
    queryKey: MY_PROJECTS_QUERY_KEY,
    queryFn: getMyProjectListRequest,
    enabled: !isSystemAdmin,
  });

  return isSystemAdmin ? allProjects : myProjects;
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectQueryKey(id),
    queryFn: () => getProjectRequest(id),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectRequest) => createProjectRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectRequest) => updateProjectRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: projectQueryKey(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProjectRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: assignmentsQueryKey(projectId),
    queryFn: () => getProjectAssignmentsRequest(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * Fetches project assignments for several projects at once, one parallel
 * query per distinct project id (via `useQueries`), sharing the exact same
 * cache entries as `useProjectAssignments` above (identical `assignmentsQueryKey`).
 *
 * Backs `TimesheetHistoryView`'s "own project (assigned user)" gate on the
 * Approve/Reject actions (see that component's doc comment and
 * `lib/constants/timesheetEntry.constants.ts#isProjectScopedTimesheetManager`):
 * a ProjectAdmin reviewing entries across many projects needs to know, for
 * each distinct project appearing in the list, whether they're an assigned
 * resource on it. `docs/HR_System_BE.postman_collection.json` has no batched
 * "assignments for many projects" endpoint — only the per-project
 * `Project/GetProjectAssignments/{projectId}` — so this fans out one request
 * per distinct project id rather than inventing a backend-unsupported one.
 */
export function useProjectAssignmentsForProjects(projectIds: string[]) {
  return useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: assignmentsQueryKey(projectId),
      queryFn: () => getProjectAssignmentsRequest(projectId),
      enabled: Boolean(projectId),
    })),
  });
}

export function useAssignResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignResourceRequest) => assignResourceRequest(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsQueryKey(projectId) });
      // The newly-assigned user is no longer "unassigned" — refresh the
      // Project Assignments "User" dropdown's reference data so they drop
      // out of it (see `hooks/useAuth.ts#useUnassignedUsers`).
      queryClient.invalidateQueries({ queryKey: UNASSIGNED_USERS_QUERY_KEY });
    },
  });
}

export function useRemoveResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => removeResourceRequest(projectId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsQueryKey(projectId) });
    },
  });
}
