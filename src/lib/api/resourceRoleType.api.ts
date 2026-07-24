import { apiClient } from "@/lib/api/axiosInstance";
import type {
  CreateResourceRoleTypeRequest,
  ResourceRoleType,
  UpdateResourceRoleTypeRequest,
} from "@/types/project.types";

/**
 * ResourceRoleType domain repository, per the layering convention documented
 * in `lib/api/project.api.ts`: every HTTP call for this feature goes through
 * this module (which talks to this app's own `/api/resource-role-types/*`
 * Route Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 *
 * Backs both the read-only "Resource role" dropdown on the Project
 * Assignments and Rate Card screens (`getResourceRoleTypesRequest`) and the
 * full Administration > Resource Role Types CRUD screen
 * (`components/resourceRoleTypes/ResourceRoleTypesListView.tsx`).
 */
export async function getResourceRoleTypesRequest(): Promise<ResourceRoleType[]> {
  const { data } = await apiClient.get<{ data: ResourceRoleType[] }>("/resource-role-types");
  return data.data;
}

export async function createResourceRoleTypeRequest(
  payload: CreateResourceRoleTypeRequest
): Promise<ResourceRoleType> {
  const { data } = await apiClient.post<{ data: ResourceRoleType }>("/resource-role-types", payload);
  return data.data;
}

export async function updateResourceRoleTypeRequest(
  id: string,
  payload: UpdateResourceRoleTypeRequest
): Promise<ResourceRoleType> {
  const { data } = await apiClient.put<{ data: ResourceRoleType }>(
    `/resource-role-types/${id}`,
    payload
  );
  return data.data;
}

export async function deleteResourceRoleTypeRequest(id: string): Promise<void> {
  await apiClient.delete(`/resource-role-types/${id}`);
}
