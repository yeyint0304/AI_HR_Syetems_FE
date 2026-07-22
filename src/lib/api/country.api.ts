import { apiClient } from "@/lib/api/axiosInstance";
import type { Country } from "@/types/country.types";

/**
 * Country reference-data repository, per the layering convention documented
 * in `lib/api/project.api.ts`. Backs the "Country" dropdown on the Create
 * User and Update Profile forms only — full Country CRUD (Administration >
 * Countries) remains a separate, not-yet-implemented module.
 */
export async function getCountryListRequest(): Promise<Country[]> {
  const { data } = await apiClient.get<{ data: Country[] }>("/countries");
  return data.data;
}
