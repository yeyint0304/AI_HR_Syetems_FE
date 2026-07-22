import "server-only";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";
import type { ExchangeRate, ExchangeRateCurrencyRef } from "@/types/exchangeRate.types";

/**
 * Normalizes the .NET backend's `ExchangeRate/*` response shapes into the
 * camelCase DTOs this app renders, following the same convention as
 * `lib/server/currencyResponseMappers.ts`. See
 * `docs/HR_System_BE.postman_collection.json`'s "Exchange Rate" folder for
 * the saved examples this mapper tolerates:
 *
 *  - `GetAllExchangeRates` / `GetExchangeRateById` nest full currency refs
 *    (`FromCurrency: { Id, Code, Symbol }`, `ToCurrency: { ... }`).
 *  - `CreateExchangeRate` / `UpdateExchangeRate` only echo back flat
 *    `FromCurrencyId` / `ToCurrencyId` guids (no code/symbol). Those are
 *    mapped into a minimal ref with an empty code/symbol — this is fine
 *    since the UI never renders a mutation response directly; it always
 *    re-fetches the full (nested) list via TanStack Query cache
 *    invalidation after a create/update/delete (see `hooks/useExchangeRates.ts`).
 */

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.Items)) return obj.Items;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.Data)) return obj.Data;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

interface RawCurrencyRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Symbol?: string;
  symbol?: string;
}

interface RawExchangeRate {
  Id?: string;
  id?: string;
  FromCurrency?: RawCurrencyRef;
  fromCurrency?: RawCurrencyRef;
  ToCurrency?: RawCurrencyRef;
  toCurrency?: RawCurrencyRef;
  FromCurrencyId?: string;
  fromCurrencyId?: string;
  ToCurrencyId?: string;
  toCurrencyId?: string;
  Rate?: number;
  rate?: number;
  EffectiveDate?: string;
  effectiveDate?: string;
  IsActive?: boolean;
  isActive?: boolean;
}

function mapCurrencyRef(
  nested: RawCurrencyRef | undefined,
  fallbackId: string | undefined
): ExchangeRateCurrencyRef | null {
  const id = nested?.Id ?? nested?.id ?? fallbackId;
  if (!id) return null;
  return {
    id,
    code: nested?.Code ?? nested?.code ?? "",
    symbol: nested?.Symbol ?? nested?.symbol ?? "",
  };
}

/** Maps a single backend ExchangeRate object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendExchangeRate(raw: unknown): ExchangeRate | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawExchangeRate;

  const id = r.Id ?? r.id;
  const fromCurrency = mapCurrencyRef(r.FromCurrency ?? r.fromCurrency, r.FromCurrencyId ?? r.fromCurrencyId);
  const toCurrency = mapCurrencyRef(r.ToCurrency ?? r.toCurrency, r.ToCurrencyId ?? r.toCurrencyId);
  const rate = r.Rate ?? r.rate;
  const effectiveDate = r.EffectiveDate ?? r.effectiveDate;

  if (!id || !fromCurrency || !toCurrency || typeof rate !== "number" || !effectiveDate) {
    return null;
  }

  return {
    id,
    fromCurrency,
    toCurrency,
    rate,
    effectiveDate,
    isActive: Boolean(r.IsActive ?? r.isActive ?? true),
  };
}

/** Maps `ExchangeRate/GetAllExchangeRates`'s `Data.Items` (or top-level array) into a flat `ExchangeRate[]`. */
export function mapBackendExchangeRateList(raw: unknown): ExchangeRate[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendExchangeRate)
    .filter((exchangeRate): exchangeRate is ExchangeRate => exchangeRate !== null);
}
