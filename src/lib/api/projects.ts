/**
 * Real API integration for the Project domain. Talks to the backend
 * endpoints documented in
 * `docs/HR_System_BE.postman_collection.json` -> "Project" folder:
 *
 *   GET    /api/v1/Project/GetProjectList
 *   GET    /api/v1/Project/GetProject/{id}
 *   POST   /api/v1/Project/CreateProject
 *   PUT    /api/v1/Project/UpdateProject/{id}
 *   DELETE /api/v1/Project/DeleteProject/{id}
 *   GET    /api/v1/Project/GetProjectAssignments/{id}
 *   POST   /api/v1/Project/AssignResource/{id}
 *   DELETE /api/v1/Project/RemoveResource/{id}/{assignmentId}
 *
 * The backend serializes with `PropertyNamingPolicy = null`, i.e. request
 * and response bodies use PascalCase property names. The DTOs below model
 * that wire format; `toProject`/`toAssignment` adapt it to the camelCase
 * shape the rest of the app consumes.
 */
import { apiFetch } from "@/lib/apiClient";
import type { AssignResourceInput, Project, ProjectAssignment, ProjectInput } from "@/types/project";

interface ProjectDto {
  Id: string;
  Code: string;
  Name: string;
  Description?: string | null;
  ClientName?: string | null;
  ClientEmail?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  MaxDailyHours?: number | null;
  IsActive: boolean;
}

interface ProjectAssignmentDto {
  Id: string;
  ProjectId: string;
  UserId: string;
  ResourceRoleTypeId: string;
}

function toProject(dto: ProjectDto): Project {
  return {
    id: dto.Id,
    code: dto.Code,
    name: dto.Name,
    description: dto.Description ?? null,
    clientName: dto.ClientName ?? null,
    clientEmail: dto.ClientEmail ?? null,
    startDate: dto.StartDate ?? null,
    endDate: dto.EndDate ?? null,
    maxDailyHours: dto.MaxDailyHours ?? null,
    isActive: dto.IsActive,
  };
}

function toAssignment(dto: ProjectAssignmentDto): ProjectAssignment {
  return {
    id: dto.Id,
    projectId: dto.ProjectId,
    userId: dto.UserId,
    resourceRoleTypeId: dto.ResourceRoleTypeId,
  };
}

function toCreatePayload(input: ProjectInput) {
  return {
    Code: input.code.trim(),
    Name: input.name.trim(),
    Description: input.description.trim() || undefined,
    ClientName: input.clientName.trim() || undefined,
    StartDate: input.startDate || undefined,
    EndDate: input.endDate || undefined,
  };
}

function toUpdatePayload(input: ProjectInput) {
  return {
    ...toCreatePayload(input),
    IsActive: input.isActive,
  };
}

export async function getProjectList(): Promise<Project[]> {
  const data = await apiFetch<ProjectDto[]>("/api/v1/Project/GetProjectList");
  return (data ?? []).map(toProject);
}

export async function getProjectById(id: string): Promise<Project> {
  const data = await apiFetch<ProjectDto>(`/api/v1/Project/GetProject/${encodeURIComponent(id)}`);
  return toProject(data);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const data = await apiFetch<ProjectDto>("/api/v1/Project/CreateProject", {
    method: "POST",
    body: toCreatePayload(input),
  });
  return toProject(data);
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const data = await apiFetch<ProjectDto>(`/api/v1/Project/UpdateProject/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: toUpdatePayload(input),
  });
  return toProject(data);
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/Project/DeleteProject/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
  const data = await apiFetch<ProjectAssignmentDto[]>(
    `/api/v1/Project/GetProjectAssignments/${encodeURIComponent(projectId)}`,
  );
  return (data ?? []).map(toAssignment);
}

export async function assignResource(
  projectId: string,
  input: AssignResourceInput,
): Promise<ProjectAssignment> {
  const data = await apiFetch<ProjectAssignmentDto>(
    `/api/v1/Project/AssignResource/${encodeURIComponent(projectId)}`,
    {
      method: "POST",
      body: { UserId: input.userId, ResourceRoleTypeId: input.resourceRoleTypeId },
    },
  );
  return toAssignment(data);
}

export async function removeResource(projectId: string, assignmentId: string): Promise<void> {
  await apiFetch<void>(
    `/api/v1/Project/RemoveResource/${encodeURIComponent(projectId)}/${encodeURIComponent(assignmentId)}`,
    { method: "DELETE" },
  );
}

const FIELD_ERROR_KEY_MAP: Record<string, keyof ProjectInput> = {
  Code: "code",
  Name: "name",
  ClientName: "clientName",
  StartDate: "startDate",
  EndDate: "endDate",
};

/**
 * Maps ASP.NET Core `ValidationProblemDetails.errors` (PascalCase backend
 * field names) onto the camelCase keys used by the New/Edit project forms.
 */
export function mapProjectFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
): Partial<Record<keyof ProjectInput, string>> {
  if (!fieldErrors) return {};

  const mapped: Partial<Record<keyof ProjectInput, string>> = {};
  for (const [backendField, messages] of Object.entries(fieldErrors)) {
    const key = FIELD_ERROR_KEY_MAP[backendField];
    if (key && messages.length > 0) {
      mapped[key] = messages[0];
    }
  }
  return mapped;
}
