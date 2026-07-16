import "server-only";
import axios from "axios";
import { logger } from "@/lib/utils/logger";

interface NormalizedError {
  status: number;
  message: string;
}

interface BackendErrorBody {
  message?: string;
  Message?: string;
  title?: string;
  errors?: unknown;
}

/**
 * Normalizes an error thrown while calling the .NET backend into a safe,
 * user-facing `{ status, message }` pair.
 *
 * - For 4xx responses that include a backend-provided message, that message
 *   is forwarded as-is (these are expected business-rule errors, e.g.
 *   "Username already taken").
 * - For 5xx responses or network failures, the real error is logged
 *   server-side only, and a generic fallback message is returned to the
 *   client to avoid leaking stack traces / internal details (OWASP A05).
 */
export function normalizeBackendError(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again later."
): NormalizedError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 502;
    const data = error.response?.data as BackendErrorBody | undefined;
    const backendMessage = data?.message ?? data?.Message ?? data?.title;

    if (status >= 400 && status < 500 && backendMessage) {
      return { status, message: backendMessage };
    }

    logger.error("Backend request failed", { status, data });
    return { status: status >= 500 ? 502 : status, message: fallbackMessage };
  }

  logger.error("Unexpected error calling backend", error);
  return { status: 500, message: fallbackMessage };
}
