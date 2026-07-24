import { apiClient } from "@/lib/api/axiosInstance";
import type {
  CreateRateCardRequest,
  RateCard,
  RateCardListFilters,
  UpdateRateCardRequest,
} from "@/types/rateCard.types";

/**
 * Rate Card domain repository, per the layering convention documented in
 * `lib/api/exchangeRate.api.ts`: every HTTP call for this feature goes
 * through this module (which talks to this app's own `/api/rate-cards/*`
 * Route Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 */

export async function getRateCardListRequest(filters?: RateCardListFilters): Promise<RateCard[]> {
  const { data } = await apiClient.get<{ data: RateCard[] }>("/rate-cards", { params: filters });
  return data.data;
}

export async function createRateCardRequest(payload: CreateRateCardRequest): Promise<RateCard> {
  const { data } = await apiClient.post<{ data: RateCard }>("/rate-cards", payload);
  return data.data;
}

export async function updateRateCardRequest(
  id: string,
  payload: UpdateRateCardRequest
): Promise<RateCard> {
  const { data } = await apiClient.put<{ data: RateCard }>(`/rate-cards/${id}`, payload);
  return data.data;
}

export async function deleteRateCardRequest(id: string): Promise<void> {
  await apiClient.delete(`/rate-cards/${id}`);
}
