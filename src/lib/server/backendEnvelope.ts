import "server-only";
import { logger } from "@/lib/utils/logger";

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

/**
 * Clamps a backend-supplied status code to a valid HTTP *error* range
 * (400–599), falling back to `fallback` when the value is missing,
 * non-integer, or out of range (e.g. `StatusCode: 0`). `NextResponse.json`
 * throws a `RangeError` for anything outside 100–599, so this guards Route
 * Handlers against a malformed/unexpected backend envelope taking down the
 * response entirely.
 */
export function toHttpStatus(code: number, fallback: number): number {
  return Number.isInteger(code) && code >= 400 && code <= 599 ? code : fallback;
}

/**
 * Builds a safe `{ status, message }` pair for an envelope-based *logical*
 * failure (`IsSuccess: false`), applying the same trust-boundary discipline
 * as `normalizeBackendError` (used for thrown/transport-level errors): the
 * backend's raw `Message` is only forwarded to the client for expected 4xx
 * business errors. For a logical failure carrying a 5xx `StatusCode` (still
 * HTTP 200 on the wire), the real message is logged server-side only and a
 * generic fallback is returned instead — otherwise backend-internal details
 * could leak straight to the browser (OWASP A05 / A09).
 *
 * Use this anywhere `readBackendEnvelope`'s `!envelope.isSuccess` branch is
 * turned into a client-facing `NextResponse.json` (GET/POST/PUT/DELETE
 * Route Handlers for projects and timesheet periods).
 */
export function resolveEnvelopeFailure(
  envelope: BackendEnvelope,
  fallbackMessage: string,
  fallbackStatus = 400
): { status: number; message: string } {
  const status = toHttpStatus(envelope.statusCode, fallbackStatus);
  if (status >= 500) {
    logger.error("Backend reported a logical failure", { status, message: envelope.message });
    return { status, message: fallbackMessage };
  }
  return { status, message: envelope.message ?? fallbackMessage };
}
