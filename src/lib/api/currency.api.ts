import { apiClient } from "@/lib/api/axiosInstance";
import type { Currency } from "@/types/currency.types";

/**
 * Currency reference-data repository, per the layering convention documented
 * in `lib/api/project.api.ts`. Backs the "Invoice Currency" dropdown on the
 * Generate Invoice form only — full Currency CRUD (Administration >
 * Currencies) remains a separate, not-yet-implemented module.
 */
export async function getCurrencyListRequest(): Promise<Currency[]> {
  const { data } = await apiClient.get<{ data: Currency[] }>("/currencies");
  return data.data;
}
