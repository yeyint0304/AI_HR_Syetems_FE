/**
 * Shared Exchange Rate domain types (Data Transfer Objects), following the
 * same minimal-surface convention as `types/project.types.ts`.
 *
 * Field set is derived from `docs/HR_System_BE.postman_collection.json`'s
 * "Exchange Rate" folder (`ExchangeRate/GetAllExchangeRates`,
 * `ExchangeRate/CreateExchangeRate`, `ExchangeRate/UpdateExchangeRate`) and
 * the `/admin/exchange-rates` wireframe screen
 * (`docs/HR_System_FE_wireframe.pdf`), which lists rates "from the base
 * currency to other currencies" with FROM / TO / RATE / EFFECTIVE DATE
 * columns.
 */

/** Minimal currency reference nested on an `ExchangeRate` (id/code/symbol only — no name, per the list/get-by-id backend shape). */
export interface ExchangeRateCurrencyRef {
  id: string;
  code: string;
  symbol: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: ExchangeRateCurrencyRef;
  toCurrency: ExchangeRateCurrencyRef;
  rate: number;
  /** ISO date string (`yyyy-MM-dd`). */
  effectiveDate: string;
  isActive: boolean;
}

/** Matches `ExchangeRate/CreateExchangeRate` — the currency pair is fixed at creation time. */
export interface CreateExchangeRateRequest {
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  effectiveDate: string;
  isActive: boolean;
}

/** Matches `ExchangeRate/UpdateExchangeRate`, which only accepts Rate/EffectiveDate/IsActive — the currency pair is immutable after creation. */
export interface UpdateExchangeRateRequest {
  rate: number;
  effectiveDate: string;
  isActive: boolean;
}
