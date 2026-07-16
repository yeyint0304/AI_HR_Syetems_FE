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

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function isNonRefreshableEndpoint(url?: string): boolean {
  if (!url) return false;
  return NON_REFRESHABLE_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

/**
 * Response interceptor implementing transparent token refresh: on a 401 from
 * any authenticated endpoint, silently call `/auth/refresh` once, then retry
 * the original request. Concurrent 401s are queued behind the single
 * in-flight refresh call to avoid a refresh storm.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
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
