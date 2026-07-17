"use client";

import { useQuery } from "@tanstack/react-query";
import { getResourceRoleTypesRequest } from "@/lib/api/resourceRoleType.api";

/** Read-only resource-role-type reference data (used by the Assign Resource dropdown). */
export function useResourceRoleTypes() {
  return useQuery({
    queryKey: ["resource-role-types"],
    queryFn: getResourceRoleTypesRequest,
  });
}
