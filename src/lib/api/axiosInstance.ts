import axios, { type AxiosRequestConfig } from "axios";

/**
 * Central Axios instance used by every `lib/api/*.ts` repository module.
 *
 * It talks to this Next.js app's own Route Handlers (`/api/*`), NOT the
 * .NET backend directly — the Route Handlers act as a Backend-for-Frontend
 * that holds the JWT in httpOnly cookies (see `lib/server/authCookies.ts`)
 * and forwards authenticated calls to the real API. This is what allows the
 * access/refresh tokens to stay out of reach of client-side JavaScript
 * entirely (no localStorage/sessionStorage, ever).
 */
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const NON_REFRESHABLE_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout"];

/**
 * Status codes eligible for the transparent-refresh retry below.
 *
 * `401` is the standard "unauthenticated" response. `403` is included too:
 * some backend auth-middleware configurations (a well-known ASP.NET Core JWT
 * bearer gotcha) return `403 Forbidden` — rather than `401` — for a missing,
 * expired, or otherwise invalid access token when no explicit challenge
 * scheme is configured, indistinguishable client-side from a genuine
 * role-based authorization failure. Retrying once after a refresh is safe
 * either way: a real permission error still fails identically after the
 * retry (refreshing doesn't change the caller's role), while an
 * expired-token-reported-as-403 now recovers transparently instead of
 * surfacing a confusing "Forbidden" error (e.g. the `/api/countries`
 * reference-data fetch backing the Country dropdown/admin screen).
 */
const REFRESHABLE_STATUS_CODES = new Set([401, 403]);

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function isNonRefreshableEndpoint(url?: string): boolean {
  if (!url) return false;
  return NON_REFRESHABLE_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

/**
 * Response interceptor implementing transparent token refresh: on a 401 (or
 * 403 — see `REFRESHABLE_STATUS_CODES`) from any authenticated endpoint,
 * silently call `/auth/refresh` once, then retry the original request.
 * Concurrent 401/403s are queued behind the single in-flight refresh call to
 * avoid a refresh storm.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      !REFRESHABLE_STATUS_CODES.has(status) ||
      originalRequest._retry ||
      isNonRefreshableEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push(() => {
          apiClient(originalRequest).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      await apiClient.post("/auth/refresh");
      isRefreshing = false;
      pendingRequests.forEach((run) => run());
      pendingRequests = [];
      return apiClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      pendingRequests = [];
      return Promise.reject(refreshError);
    }
  }
);
