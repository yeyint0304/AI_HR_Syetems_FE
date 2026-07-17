import "server-only";

/**
 * Shared helper for unwrapping the .NET backend's standard response envelope:
 *
 *   { "StatusCode": number, "IsSuccess": boolean, "Message": string, "Data": T }
 *
 * Confirmed against the saved examples in
 * `docs/HR_System_BE.postman_collection.json` for `Auth/Login` and
 * `Project/GetProject` (among others) — every endpoint wraps its payload in
 * this envelope, including single-object responses that previous mappers
 * (`lib/server/tokenUtils.ts#extractTokens`,
 * `lib/server/projectResponseMappers.ts`) only read from the *top level*,
 * which caused those mappers to silently fail (returning `null`) and the
 * calling Route Handlers to respond with a generic 502 — even though the
 * backend call itself succeeded. Originally introduced for
 * `lib/server/timesheetPeriodResponseMappers.ts`, which re-exports this
 * module for backward compatibility.
 *
 * Some backend endpoints (see `TimesheetPeriod/GetTimesheetPeriodById`'s
 * saved "not found" example) can also return this envelope with
 * `IsSuccess: false` at HTTP 200 (OK) — i.e. a logical failure signaled
 * *without* an HTTP error status, which axios would not treat as a thrown
 * error. Callers should check `isSuccess` explicitly rather than assuming a
 * 2xx response always means success.
 */

export interface BackendEnvelope {
  isSuccess: boolean;
  /** Falls back to `200` when the field is absent (defensive: not every backend response is guaranteed to include it). */
  statusCode: number;
  message?: string;
  data: unknown;
}

export function readBackendEnvelope(raw: unknown): BackendEnvelope {
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const hasEnvelopeShape = "IsSuccess" in obj || "Data" in obj || "isSuccess" in obj || "data" in obj;
    if (hasEnvelopeShape) {
      const isSuccessField = obj.IsSuccess ?? obj.isSuccess;
      const statusCodeField = obj.StatusCode ?? obj.statusCode;
      const messageField = obj.Message ?? obj.message;
      return {
        isSuccess: typeof isSuccessField === "boolean" ? isSuccessField : true,
        statusCode: typeof statusCodeField === "number" ? statusCodeField : 200,
        message: typeof messageField === "string" ? messageField : undefined,
        data: obj.Data ?? obj.data ?? null,
      };
    }
  }
  return { isSuccess: true, statusCode: 200, data: raw };
}
