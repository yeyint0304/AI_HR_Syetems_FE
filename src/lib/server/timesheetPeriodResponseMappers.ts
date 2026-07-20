import "server-only";
import type { TimesheetPeriod } from "@/types/timesheetPeriod.types";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import type { BackendEnvelope } from "@/lib/server/backendEnvelope";

/**
 * Normalizes the .NET backend's Timesheet Period response shape into the
 * camelCase DTO this app renders.
 *
 * `docs/HR_System_BE.postman_collection.json` includes concrete saved
 * examples for every Timesheet Period endpoint, all wrapped in the same
 * envelope:
 *
 *   { "StatusCode": number, "IsSuccess": boolean, "Message": string, "Data": T | null }
 *
 * Notably, `TimesheetPeriod/GetTimesheetPeriodById`'s saved "not found"
 * example returns this envelope with `IsSuccess: false` / `StatusCode: 404`
 * at HTTP status 200 (OK) — i.e. the backend can signal a logical failure
 * *without* an HTTP error status, which axios would not treat as a thrown
 * error. `readBackendEnvelope` (see `lib/server/backendEnvelope.ts`, which
 * this module re-exports for backward compatibility) extracts
 * `IsSuccess`/`StatusCode`/`Message` so Route Handlers can detect this and
 * translate it into a proper HTTP error response for the client.
 */

export { readBackendEnvelope, resolveEnvelopeFailure };
export type { BackendEnvelope };

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.Data)) return obj.Data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.Items)) return obj.Items;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

interface RawTimesheetPeriod {
  Id?: string;
  id?: string;
  PeriodStart?: string;
  periodStart?: string;
  PeriodEnd?: string;
  periodEnd?: string;
  IsLocked?: boolean;
  isLocked?: boolean;
  LockedAt?: string | null;
  lockedAt?: string | null;
  LockedBy?: string | null;
  lockedBy?: string | null;
  CreatedAt?: string;
  createdAt?: string;
  UpdatedAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Maps a single backend Timesheet Period object (already unwrapped from the
 * `Data` envelope, e.g. via `readBackendEnvelope(response.data).data`).
 * Returns `null` if the minimum required fields are missing.
 */
export function mapBackendTimesheetPeriod(raw: unknown): TimesheetPeriod | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawTimesheetPeriod;
  const id = r.Id ?? r.id;
  const periodStart = r.PeriodStart ?? r.periodStart;
  const periodEnd = r.PeriodEnd ?? r.periodEnd;
  if (!id || !periodStart || !periodEnd) return null;

  return {
    id,
    periodStart,
    periodEnd,
    isLocked: r.IsLocked ?? r.isLocked ?? false,
    lockedAt: r.LockedAt ?? r.lockedAt ?? null,
    lockedBy: r.LockedBy ?? r.lockedBy ?? null,
    createdAt: r.CreatedAt ?? r.createdAt,
    updatedAt: r.UpdatedAt ?? r.updatedAt ?? null,
  };
}

/** Maps a backend Timesheet Period list (already unwrapped from the `Data` envelope). */
export function mapBackendTimesheetPeriodList(raw: unknown): TimesheetPeriod[] {
  return extractArray(raw)
    .map(mapBackendTimesheetPeriod)
    .filter((period): period is TimesheetPeriod => period !== null);
}
