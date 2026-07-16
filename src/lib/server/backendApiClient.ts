import "server-only";
import axios from "axios";

/**
 * Server-only Axios instance used exclusively by Next.js Route Handlers (the
 * Backend-for-Frontend layer under `src/app/api/auth/*`) to call the real
 * .NET Core backend. Browser code must never import this module — it is
 * guarded by the `server-only` package, which throws a build error if it
 * ever ends up in a client bundle.
 *
 * `NEXT_PUBLIC_API_URL` is intentionally reused here (rather than a
 * server-only env var): it is not a secret, and per the Technical
 * Requirements it is the documented, client-exposed base URL for the HR
 * System API (https://localhost:7195/api/v1 in local development).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:7195/api/v1";

export const backendApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});
