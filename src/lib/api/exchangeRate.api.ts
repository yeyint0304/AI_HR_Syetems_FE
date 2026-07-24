import { apiClient } from "@/lib/api/axiosInstance";
import type {
  CreateExchangeRateRequest,
  ExchangeRate,
  UpdateExchangeRateRequest,
} from "@/types/exchangeRate.types";

/**
 * Exchange Rate domain repository, per the layering convention documented in
 * `lib/api/project.api.ts`: every HTTP call for this feature goes through
 * this module (which talks to this app's own `/api/exchange-rates/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 */

export async function getExchangeRateListRequest(): Promise<ExchangeRate[]> {
  const { data } = await apiClient.get<{ data: ExchangeRate[] }>("/exchange-rates");
  return data.data;
}

export async function createExchangeRateRequest(
  payload: CreateExchangeRateRequest
): Promise<ExchangeRate> {
  const { data } = await apiClient.post<{ data: ExchangeRate }>("/exchange-rates", payload);
  return data.data;
}

export async function updateExchangeRateRequest(
  id: string,
  payload: UpdateExchangeRateRequest
): Promise<ExchangeRate> {
  const { data } = await apiClient.put<{ data: ExchangeRate }>(`/exchange-rates/${id}`, payload);
  return data.data;
}

export async function deleteExchangeRateRequest(id: string): Promise<void> {
  await apiClient.delete(`/exchange-rates/${id}`);
}
