import "server-only";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";
import type { Country } from "@/types/country.types";

/**
 * Normalizes the .NET backend's `Country/*` response shapes into the
 * camelCase DTOs this app renders, following the same convention as
 * `lib/server/currencyResponseMappers.ts#mapBackendCurrency`. Backs the
 * read-only "Country" dropdown on the Create User / Update Profile forms —
 * see `docs/HR_System_BE.postman_collection.json`'s "Reference Data" folder
 * for the saved `Country/GetAllCountries` example (`Data.Items`, paginated).
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

interface RawCountry {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
}

/** Maps a single backend Country object (tolerates being passed either the raw envelope or an already-unwrapped object). Returns `null` if the minimum required fields are missing. */
export function mapBackendCountry(raw: unknown): Country | null {
  const envelope = readBackendEnvelope(raw);
  if (!envelope.isSuccess) return null;
  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const r = unwrapped as RawCountry;
  const id = r.Id ?? r.id;
  const code = r.Code ?? r.code;
  if (!id || !code) return null;

  return {
    id,
    code,
    name: r.Name ?? r.name ?? "",
  };
}

/** Maps `Country/GetAllCountries`'s `Data.Items` (or top-level array) into a flat `Country[]`. */
export function mapBackendCountryList(raw: unknown): Country[] {
  const envelope = readBackendEnvelope(raw);
  return extractArray(envelope.isSuccess ? envelope.data : raw)
    .map(mapBackendCountry)
    .filter((country): country is Country => country !== null);
}
