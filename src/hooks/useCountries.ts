"use client";

import { useQuery } from "@tanstack/react-query";
import { getCountryListRequest } from "@/lib/api/country.api";

/**
 * Country reference-data hook (TanStack Query), following the same `use*`
 * naming convention as `hooks/useCurrencies.ts`. Components should never
 * call `lib/api/country.api` directly.
 */
export function useCountryList() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: getCountryListRequest,
  });
}
