/**
 * Real API integration for resource role type reference data, used to
 * populate the "role" selector when assigning a user to a project.
 * See `docs/HR_System_BE.postman_collection.json` -> "Reference Data -
 * Resource Role Type" -> "Get All Resource Role Types".
 */
import { apiFetch } from "@/lib/apiClient";
import { ResourceRoleType } from "@/types/resourceRoleType";

interface ResourceRoleTypeDto {
  Id: string;
  Name: string;
  Description?: string | null;
}

interface PagedResult<T> {
  Items?: T[];
  items?: T[];
}

function toResourceRoleType(dto: ResourceRoleTypeDto): ResourceRoleType {
  return {
    id: dto.Id,
    name: dto.Name,
    description: dto.Description ?? null,
  };
}

export async function getResourceRoleTypes(): Promise<ResourceRoleType[]> {
  const data = await apiFetch<ResourceRoleTypeDto[] | PagedResult<ResourceRoleTypeDto>>(
    "/api/v1/ResourceRoleType/GetAllResourceRoleTypes?page=1&pageSize=100",
  );

  const items = Array.isArray(data) ? data : (data?.Items ?? data?.items ?? []);
  return items.map(toResourceRoleType);
}
