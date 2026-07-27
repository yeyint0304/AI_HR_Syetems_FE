"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCountryRequest,
  deleteCountryRequest,
  getCountryListRequest,
  updateCountryRequest,
} from "@/lib/api/country.api";
import type { CreateCountryRequest, UpdateCountryRequest } from "@/types/country.types";

/**
 * Country domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useCurrencies.ts`. Components should never call
 * `lib/api/country.api` directly.
 */

const COUNTRIES_QUERY_KEY = ["countries"] as const;

export function useCountryList() {
  return useQuery({
    queryKey: COUNTRIES_QUERY_KEY,
    queryFn: getCountryListRequest,
  });
}

export function useCreateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCountryRequest) => createCountryRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUNTRIES_QUERY_KEY });
    },
  });
}

export function useUpdateCountry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCountryRequest) => updateCountryRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUNTRIES_QUERY_KEY });
    },
  });
}

export function useDeleteCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCountryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUNTRIES_QUERY_KEY });
    },
  });
}
