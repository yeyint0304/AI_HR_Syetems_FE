import { apiClient } from "@/lib/api/axiosInstance";
import type { CreateCurrencyRequest, Currency, UpdateCurrencyRequest } from "@/types/currency.types";

/**
 * Currency domain repository, per the layering convention documented in
 * `lib/api/project.api.ts`: every HTTP call for this feature goes through
 * this module (which talks to this app's own `/api/currencies/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 *
 * Backs both the read-only "Invoice Currency" dropdown on the Generate
 * Invoice form (`getCurrencyListRequest`) and the full Administration >
 * Currencies CRUD screen (`components/currencies/CurrenciesListView.tsx`).
 */
export async function getCurrencyListRequest(): Promise<Currency[]> {
  const { data } = await apiClient.get<{ data: Currency[] }>("/currencies");
  return data.data;
}

export async function createCurrencyRequest(payload: CreateCurrencyRequest): Promise<Currency> {
  const { data } = await apiClient.post<{ data: Currency }>("/currencies", payload);
  return data.data;
}

export async function updateCurrencyRequest(
  id: string,
  payload: UpdateCurrencyRequest
): Promise<Currency> {
  const { data } = await apiClient.put<{ data: Currency }>(`/currencies/${id}`, payload);
  return data.data;
}

export async function deleteCurrencyRequest(id: string): Promise<void> {
  await apiClient.delete(`/currencies/${id}`);
}
