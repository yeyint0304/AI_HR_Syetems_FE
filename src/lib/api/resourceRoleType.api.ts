import { apiClient } from "@/lib/api/axiosInstance";
import type { ResourceRoleType } from "@/types/project.types";

/**
 * ResourceRoleType read-only reference-data repository. Backs the "Resource
 * role" dropdown on the Project Assignments screen (`Project/AssignResource`
 * requires a `ResourceRoleTypeId`).
 */
export async function getResourceRoleTypesRequest(): Promise<ResourceRoleType[]> {
  const { data } = await apiClient.get<{ data: ResourceRoleType[] }>("/resource-role-types");
  return data.data;
}
