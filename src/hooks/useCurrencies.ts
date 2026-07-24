"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCurrencyRequest,
  deleteCurrencyRequest,
  getCurrencyListRequest,
  updateCurrencyRequest,
} from "@/lib/api/currency.api";
import type { CreateCurrencyRequest, UpdateCurrencyRequest } from "@/types/currency.types";

/**
 * Currency domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useExchangeRates.ts`. Components should never call
 * `lib/api/currency.api` directly.
 */

const CURRENCIES_QUERY_KEY = ["currencies"] as const;

export function useCurrencyList() {
  return useQuery({
    queryKey: CURRENCIES_QUERY_KEY,
    queryFn: getCurrencyListRequest,
  });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCurrencyRequest) => createCurrencyRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY });
    },
  });
}

export function useUpdateCurrency(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCurrencyRequest) => updateCurrencyRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY });
    },
  });
}

export function useDeleteCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCurrencyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY });
    },
  });
}
