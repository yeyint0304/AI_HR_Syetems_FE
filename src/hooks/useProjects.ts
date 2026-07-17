"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignResourceRequest,
  createProjectRequest,
  deleteProjectRequest,
  getProjectAssignmentsRequest,
  getProjectListRequest,
  getProjectRequest,
  removeResourceRequest,
  updateProjectRequest,
} from "@/lib/api/project.api";
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
const projectQueryKey = (id: string) => ["projects", id] as const;
const assignmentsQueryKey = (projectId: string) => ["projects", projectId, "assignments"] as const;

export function useProjectList() {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: getProjectListRequest,
  });
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

export function useAssignResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignResourceRequest) => assignResourceRequest(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsQueryKey(projectId) });
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
