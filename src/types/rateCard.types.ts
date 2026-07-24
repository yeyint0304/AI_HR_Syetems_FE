/**
 * Shared Rate Card domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/exchangeRate.types.ts`.
 *
 * Field set is derived from `docs/HR_System_BE.postman_collection.json`'s
 * "Rate Card" folder (`RateCard/GetAllRateCards`, `RateCard/GetRateCardById`,
 * `RateCard/CreateRateCard`, `RateCard/UpdateRateCard`) and the
 * `/admin/rate-cards` wireframe screen (`docs/HR_System_FE_wireframe.pdf`),
 * which lists "Daily billing rates by country and role... used in cost and
 * invoice calculations" with COUNTRY / ROLE / DAILY RATE / CURRENCY /
 * EFFECTIVE DATE columns.
 */

/** Minimal country reference nested on a `RateCard` (id/code/name only). */
export interface RateCardCountryRef {
  id: string;
  code: string;
  name: string;
}

/** Minimal resource-role-type reference nested on a `RateCard` (id/name only). */
export interface RateCardResourceRoleTypeRef {
  id: string;
  name: string;
}

/** Minimal currency reference nested on a `RateCard` (id/code/symbol only). */
export interface RateCardCurrencyRef {
  id: string;
  code: string;
  symbol: string;
}

export interface RateCard {
  id: string;
  country: RateCardCountryRef;
  resourceRoleType: RateCardResourceRoleTypeRef;
  currency: RateCardCurrencyRef;
  hourlyRate: number;
  billingRate: number;
  /** ISO date string (`yyyy-MM-dd`). */
  effectiveDate: string;
  isActive: boolean;
}

/** Matches `RateCard/CreateRateCard` — country/role/currency are fixed at creation time. */
export interface CreateRateCardRequest {
  countryId: string;
  resourceRoleTypeId: string;
  currencyId: string;
  hourlyRate: number;
  billingRate: number;
  effectiveDate: string;
  isActive: boolean;
}

/** Matches `RateCard/UpdateRateCard`, which only accepts rates/effective date/active status — country/role/currency are immutable after creation. */
export interface UpdateRateCardRequest {
  hourlyRate: number;
  billingRate: number;
  effectiveDate: string;
  isActive: boolean;
}

/** Optional filters for `RateCard/GetAllRateCards` (all query params are optional). */
export interface RateCardListFilters {
  countryId?: string;
  resourceRoleTypeId?: string;
  currencyId?: string;
  isActive?: boolean;
}
