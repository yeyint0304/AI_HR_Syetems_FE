"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createResourceRoleTypeRequest,
  deleteResourceRoleTypeRequest,
  getResourceRoleTypesRequest,
  updateResourceRoleTypeRequest,
} from "@/lib/api/resourceRoleType.api";
import type {
  CreateResourceRoleTypeRequest,
  UpdateResourceRoleTypeRequest,
} from "@/types/project.types";

/**
 * ResourceRoleType domain hooks (TanStack Query), following the same `use*`
 * naming convention as `hooks/useCurrencies.ts`. Components should never call
 * `lib/api/resourceRoleType.api` directly.
 */

const RESOURCE_ROLE_TYPES_QUERY_KEY = ["resource-role-types"] as const;

/** Read-only resource-role-type reference data (used by the Assign Resource and Rate Card dropdowns). */
export function useResourceRoleTypes() {
  return useQuery({
    queryKey: RESOURCE_ROLE_TYPES_QUERY_KEY,
    queryFn: getResourceRoleTypesRequest,
  });
}

export function useCreateResourceRoleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateResourceRoleTypeRequest) => createResourceRoleTypeRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESOURCE_ROLE_TYPES_QUERY_KEY });
    },
  });
}

export function useUpdateResourceRoleType(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateResourceRoleTypeRequest) => updateResourceRoleTypeRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESOURCE_ROLE_TYPES_QUERY_KEY });
    },
  });
}

export function useDeleteResourceRoleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResourceRoleTypeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESOURCE_ROLE_TYPES_QUERY_KEY });
    },
  });
}
