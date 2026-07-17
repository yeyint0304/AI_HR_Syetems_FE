/**
 * Thin, dependency-free fetch wrapper for talking to the HR System backend.
 *
 * The base URL comes from `NEXT_PUBLIC_API_BASE_URL` (see `.env.local` /
 * `.env.example`) so it can be swapped per-environment without a code
 * change. It falls back to the backend host configured for this workspace
 * (`scripts/.env.dev` -> `BE_ENDPOINT`) so the app still points at the
 * right server out of the box.
 */

const DEFAULT_API_BASE_URL = "http://131.153.49.2:5093";

const ACCESS_TOKEN_STORAGE_KEY = "hr_access_token";

function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveBaseUrl();

/** Reads the currently stored JWT access token, if any (browser-only). */
export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Error thrown for any non-2xx response (or network failure). Carries the
 * HTTP status (0 for network-level failures) and, when the backend returns
 * ASP.NET Core `ValidationProblemDetails`, a map of per-field error
 * messages keyed by the backend's PascalCase property name.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ApiFetchOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Performs an authenticated JSON request against the backend.
 * Resolves with the parsed JSON body (or `undefined` for empty/204
 * responses), and rejects with an `ApiError` for any failure.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getStoredAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please check your connection and try again.", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      extractFieldErrors(payload),
    );
  }

  return payload as T;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.Message === "string") return record.Message;
    if (typeof record.title === "string") return record.title;
    if (typeof record.Title === "string") return record.Title;
  }

  if (status === 401) return "You are not authorized. Please log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  return `Request failed with status ${status}.`;
}

function extractFieldErrors(payload: unknown): Record<string, string[]> | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const errors = record.errors ?? record.Errors;
  if (!errors || typeof errors !== "object") return undefined;

  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((message): message is string => typeof message === "string");
    }
  }
  return result;
}
