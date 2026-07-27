import { apiClient } from "@/lib/api/axiosInstance";
import type { Country, CreateCountryRequest, UpdateCountryRequest } from "@/types/country.types";

/**
 * Country domain repository, per the layering convention documented in
 * `lib/api/project.api.ts`: every HTTP call for this feature goes through
 * this module (which talks to this app's own `/api/countries/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 *
 * Backs both the read-only "Country" dropdown on the Create User / Update
 * Profile / Rate Card forms (`getCountryListRequest`) and the full
 * Administration > Countries CRUD screen
 * (`components/countries/CountriesListView.tsx`).
 */
export async function getCountryListRequest(): Promise<Country[]> {
  const { data } = await apiClient.get<{ data: Country[] }>("/countries");
  return data.data;
}

export async function createCountryRequest(payload: CreateCountryRequest): Promise<Country> {
  const { data } = await apiClient.post<{ data: Country }>("/countries", payload);
  return data.data;
}

export async function updateCountryRequest(
  id: string,
  payload: UpdateCountryRequest
): Promise<Country> {
  const { data } = await apiClient.put<{ data: Country }>(`/countries/${id}`, payload);
  return data.data;
}

export async function deleteCountryRequest(id: string): Promise<void> {
  await apiClient.delete(`/countries/${id}`);
}
