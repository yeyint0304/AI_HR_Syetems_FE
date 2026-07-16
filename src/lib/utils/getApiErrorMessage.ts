import axios from "axios";
import type { ApiErrorBody } from "@/types/auth.types";

/**
 * Extracts a user-safe error message from an Axios error thrown by one of the
 * `lib/api/*.ts` repository functions. Falls back to a generic message so
 * internal details are never leaked to the UI.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

/** Extracts per-field validation errors returned by a Route Handler, if any. */
export function getApiFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    return data?.errors;
  }
  return undefined;
}
