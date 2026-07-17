import { apiClient } from "@/lib/api/axiosInstance";
import type {
  AssignResourceRequest,
  CreateProjectRequest,
  Project,
  ProjectAssignment,
  UpdateProjectRequest,
} from "@/types/project.types";

/**
 * Project domain repository, per the layering convention documented in
 * `lib/api/auth.api.ts`: every HTTP call for the Project feature goes through
 * this module (which talks to this app's own `/api/projects/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 */

export async function getProjectListRequest(): Promise<Project[]> {
  const { data } = await apiClient.get<{ data: Project[] }>("/projects");
  return data.data;
}

export async function getProjectRequest(id: string): Promise<Project> {
  const { data } = await apiClient.get<{ data: Project }>(`/projects/${id}`);
  return data.data;
}

export async function createProjectRequest(payload: CreateProjectRequest): Promise<Project> {
  const { data } = await apiClient.post<{ data: Project }>("/projects", payload);
  return data.data;
}

export async function updateProjectRequest(
  id: string,
  payload: UpdateProjectRequest
): Promise<Project> {
  const { data } = await apiClient.put<{ data: Project }>(`/projects/${id}`, payload);
  return data.data;
}

export async function deleteProjectRequest(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function getProjectAssignmentsRequest(id: string): Promise<ProjectAssignment[]> {
  const { data } = await apiClient.get<{ data: ProjectAssignment[] }>(`/projects/${id}/assignments`);
  return data.data;
}

export async function assignResourceRequest(
  id: string,
  payload: AssignResourceRequest
): Promise<ProjectAssignment> {
  const { data } = await apiClient.post<{ data: ProjectAssignment }>(
    `/projects/${id}/assignments`,
    payload
  );
  return data.data;
}

export async function removeResourceRequest(projectId: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/assignments/${assignmentId}`);
}
