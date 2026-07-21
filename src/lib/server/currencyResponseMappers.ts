import "server-only";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";
import type { Currency } from "@/types/currency.types";

/**
 * Normalizes the .NET backend's `Currency/*` response shapes into the
 * camelCase DTOs this app renders, following the same convention as
 * `lib/server/projectResponseMappers.ts#mapBackendResourceRoleType`. Backs
 * the read-only "Invoice Currency" dropdown on the Generate Invoice form —
 * see `docs/HR_System_BE.postman_collection.json`'s "Reference Data -
 * Currency" folder for the saved `Currency/GetAllCurrencies` example.
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

interface RawCurrency {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
  Symbol?: string;
  symbol?: string;
  IsBaseCurrency?: boolean;
  isBaseCurrency?: boolean;
  IsActive?: boolean;
  isActive?: boolean;
}

/** Maps a single backend Currency object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendCurrency(raw: unknown): Currency | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawCurrency;
  const id = r.Id ?? r.id;
  const code = r.Code ?? r.code;
  if (!id || !code) return null;

  return {
    id,
    code,
    name: r.Name ?? r.name ?? "",
    symbol: r.Symbol ?? r.symbol ?? "",
    isBaseCurrency: Boolean(r.IsBaseCurrency ?? r.isBaseCurrency ?? false),
    isActive: Boolean(r.IsActive ?? r.isActive ?? true),
  };
}

/** Maps `Currency/GetAllCurrencies`'s `Data.Items` (or top-level array) into a flat `Currency[]`. */
export function mapBackendCurrencyList(raw: unknown): Currency[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendCurrency)
    .filter((currency): currency is Currency => currency !== null);
}
