"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExchangeRateRequest,
  deleteExchangeRateRequest,
  getExchangeRateListRequest,
  updateExchangeRateRequest,
} from "@/lib/api/exchangeRate.api";
import type {
  CreateExchangeRateRequest,
  UpdateExchangeRateRequest,
} from "@/types/exchangeRate.types";

/**
 * Exchange Rate domain hooks (TanStack Query), following the same `use*`
 * naming convention as `hooks/useProjects.ts`. Components should never call
 * `lib/api/exchangeRate.api` directly.
 */

const EXCHANGE_RATES_QUERY_KEY = ["exchange-rates"] as const;

export function useExchangeRateList() {
  return useQuery({
    queryKey: EXCHANGE_RATES_QUERY_KEY,
    queryFn: getExchangeRateListRequest,
  });
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExchangeRateRequest) => createExchangeRateRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_RATES_QUERY_KEY });
    },
  });
}

export function useUpdateExchangeRate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateExchangeRateRequest) => updateExchangeRateRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_RATES_QUERY_KEY });
    },
  });
}

export function useDeleteExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExchangeRateRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_RATES_QUERY_KEY });
    },
  });
}
