import "server-only";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";
import type {
  RateCard,
  RateCardCountryRef,
  RateCardCurrencyRef,
  RateCardResourceRoleTypeRef,
} from "@/types/rateCard.types";

/**
 * Normalizes the .NET backend's `RateCard/*` response shapes into the
 * camelCase DTOs this app renders, following the same convention as
 * `lib/server/exchangeRateResponseMappers.ts`. See
 * `docs/HR_System_BE.postman_collection.json`'s "Rate Card" folder for the
 * saved examples this mapper tolerates:
 *
 *  - `GetAllRateCards` / `GetRateCardById` nest full refs (`Country: { Id,
 *    Code, Name }`, `ResourceRoleType: { Id, Name }`, `Currency: { Id, Code,
 *    Symbol }`).
 *  - `CreateRateCard` / `UpdateRateCard` only echo back flat `CountryId` /
 *    `ResourceRoleTypeId` / `CurrencyId` guids (no nested name/code). Those
 *    are mapped into minimal refs with empty name/code/symbol — this is fine
 *    since the UI never renders a mutation response directly; it always
 *    re-fetches the full (nested) list via TanStack Query cache invalidation
 *    after a create/update/delete (see `hooks/useRateCards.ts`).
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

interface RawCountryRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
}

interface RawResourceRoleTypeRef {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
}

interface RawCurrencyRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Symbol?: string;
  symbol?: string;
}

interface RawRateCard {
  Id?: string;
  id?: string;
  Country?: RawCountryRef;
  country?: RawCountryRef;
  ResourceRoleType?: RawResourceRoleTypeRef;
  resourceRoleType?: RawResourceRoleTypeRef;
  Currency?: RawCurrencyRef;
  currency?: RawCurrencyRef;
  CountryId?: string;
  countryId?: string;
  ResourceRoleTypeId?: string;
  resourceRoleTypeId?: string;
  CurrencyId?: string;
  currencyId?: string;
  HourlyRate?: number;
  hourlyRate?: number;
  BillingRate?: number;
  billingRate?: number;
  EffectiveDate?: string;
  effectiveDate?: string;
  IsActive?: boolean;
  isActive?: boolean;
}

function mapCountryRef(
  nested: RawCountryRef | undefined,
  fallbackId: string | undefined
): RateCardCountryRef | null {
  const id = nested?.Id ?? nested?.id ?? fallbackId;
  if (!id) return null;
  return { id, code: nested?.Code ?? nested?.code ?? "", name: nested?.Name ?? nested?.name ?? "" };
}

function mapResourceRoleTypeRef(
  nested: RawResourceRoleTypeRef | undefined,
  fallbackId: string | undefined
): RateCardResourceRoleTypeRef | null {
  const id = nested?.Id ?? nested?.id ?? fallbackId;
  if (!id) return null;
  return { id, name: nested?.Name ?? nested?.name ?? "" };
}

function mapCurrencyRef(
  nested: RawCurrencyRef | undefined,
  fallbackId: string | undefined
): RateCardCurrencyRef | null {
  const id = nested?.Id ?? nested?.id ?? fallbackId;
  if (!id) return null;
  return { id, code: nested?.Code ?? nested?.code ?? "", symbol: nested?.Symbol ?? nested?.symbol ?? "" };
}

/** Maps a single backend RateCard object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendRateCard(raw: unknown): RateCard | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawRateCard;

  const id = r.Id ?? r.id;
  const country = mapCountryRef(r.Country ?? r.country, r.CountryId ?? r.countryId);
  const resourceRoleType = mapResourceRoleTypeRef(
    r.ResourceRoleType ?? r.resourceRoleType,
    r.ResourceRoleTypeId ?? r.resourceRoleTypeId
  );
  const currency = mapCurrencyRef(r.Currency ?? r.currency, r.CurrencyId ?? r.currencyId);
  const hourlyRate = r.HourlyRate ?? r.hourlyRate;
  const billingRate = r.BillingRate ?? r.billingRate;
  const effectiveDate = r.EffectiveDate ?? r.effectiveDate;

  if (
    !id ||
    !country ||
    !resourceRoleType ||
    !currency ||
    typeof hourlyRate !== "number" ||
    typeof billingRate !== "number" ||
    !effectiveDate
  ) {
    return null;
  }

  return {
    id,
    country,
    resourceRoleType,
    currency,
    hourlyRate,
    billingRate,
    effectiveDate,
    isActive: Boolean(r.IsActive ?? r.isActive ?? true),
  };
}

/** Maps `RateCard/GetAllRateCards`'s `Data.Items` (or top-level array) into a flat `RateCard[]`. */
export function mapBackendRateCardList(raw: unknown): RateCard[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendRateCard)
    .filter((rateCard): rateCard is RateCard => rateCard !== null);
}
