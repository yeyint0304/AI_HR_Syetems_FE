/**
 * Shared Currency domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/exchangeRate.types.ts`.
 *
 * Field set is derived from `docs/HR_System_BE.postman_collection.json`'s
 * "Reference Data - Currency" folder (`Currency/GetAllCurrencies`,
 * `Currency/GetCurrencyById`, `Currency/CreateCurrency`,
 * `Currency/UpdateCurrency`, `Currency/DeleteCurrency`) and the
 * `/admin/currencies` wireframe screen (`docs/HR_System_FE_wireframe.pdf`),
 * which lists currencies with CODE / NAME / SYMBOL / BASE CURRENCY / STATUS
 * columns, a "+ Add Currency" action, and per-row Edit (the base currency has
 * no Delete action — see `components/currencies/CurrenciesListView.tsx`).
 *
 * This type also continues to back the read-only "Invoice Currency" dropdown
 * on the Generate Invoice form (`hooks/useCurrencies.ts#useCurrencyList`).
 */
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  isActive: boolean;
}

/** Matches `Currency/CreateCurrency` — `code` must be a unique ISO 4217 code; only one currency may be the base currency at a time. */
export interface CreateCurrencyRequest {
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  isActive: boolean;
}

/** Matches `Currency/UpdateCurrency`, which only accepts Name/Symbol/IsActive — the code and base-currency flag are immutable after creation. */
export interface UpdateCurrencyRequest {
  name: string;
  symbol: string;
  isActive: boolean;
}
