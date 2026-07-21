"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrencyListRequest } from "@/lib/api/currency.api";

/**
 * Currency reference-data hook (TanStack Query), following the same `use*`
 * naming convention as `hooks/useResourceRoleTypes.ts`. Components should
 * never call `lib/api/currency.api` directly.
 */
export function useCurrencyList() {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: getCurrencyListRequest,
  });
}
