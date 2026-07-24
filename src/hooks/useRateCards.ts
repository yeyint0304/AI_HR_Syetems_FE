"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRateCardRequest,
  deleteRateCardRequest,
  getRateCardListRequest,
  updateRateCardRequest,
} from "@/lib/api/rateCard.api";
import type {
  CreateRateCardRequest,
  RateCardListFilters,
  UpdateRateCardRequest,
} from "@/types/rateCard.types";

/**
 * Rate Card domain hooks (TanStack Query), following the same `use*` naming
 * convention as `hooks/useExchangeRates.ts`. Components should never call
 * `lib/api/rateCard.api` directly.
 */

const RATE_CARDS_QUERY_KEY = ["rate-cards"] as const;
const rateCardListQueryKey = (filters?: RateCardListFilters) =>
  [...RATE_CARDS_QUERY_KEY, filters ?? {}] as const;

export function useRateCardList(filters?: RateCardListFilters) {
  return useQuery({
    queryKey: rateCardListQueryKey(filters),
    queryFn: () => getRateCardListRequest(filters),
  });
}

export function useCreateRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRateCardRequest) => createRateCardRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RATE_CARDS_QUERY_KEY });
    },
  });
}

export function useUpdateRateCard(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRateCardRequest) => updateRateCardRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RATE_CARDS_QUERY_KEY });
    },
  });
}

export function useDeleteRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRateCardRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RATE_CARDS_QUERY_KEY });
    },
  });
}
