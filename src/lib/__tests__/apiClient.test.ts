import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as unknown as Response;
}

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("resolves the base URL from NEXT_PUBLIC_API_BASE_URL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/");
    const { API_BASE_URL } = await import("../apiClient");
    expect(API_BASE_URL).toBe("https://api.example.com");
  });

  it("falls back to the workspace backend host when no env var is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const { API_BASE_URL } = await import("../apiClient");
    expect(API_BASE_URL).toBe("http://131.153.49.2:5093");
  });

  it("attaches a bearer token from storage when present", async () => {
    window.localStorage.setItem("hr_access_token", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch } = await import("../apiClient");
    await apiFetch("/api/v1/Project/GetProjectList");

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not send an Authorization header when no token is stored", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch } = await import("../apiClient");
    await apiFetch("/api/v1/Project/GetProjectList");

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.headers.Authorization).toBeUndefined();
  });

  it("serializes the request body as JSON and sets the Content-Type header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ Id: "1" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch } = await import("../apiClient");
    await apiFetch("/api/v1/Project/CreateProject", { method: "POST", body: { Name: "Alpha" } });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers["Content-Type"]).toBe("application/json");
    expect(requestInit.body).toBe(JSON.stringify({ Name: "Alpha" }));
  });

  it("returns undefined for 204 No Content responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: async () => null,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch } = await import("../apiClient");
    const result = await apiFetch("/api/v1/Project/DeleteProject/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("throws an ApiError with the backend message on non-2xx responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: "Validation failed", errors: { Code: ["Code is required."] } }, { status: 400 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch, ApiError } = await import("../apiClient");

    await expect(apiFetch("/api/v1/Project/CreateProject", { method: "POST", body: {} })).rejects.toMatchObject({
      message: "Validation failed",
      status: 400,
      fieldErrors: { Code: ["Code is required."] },
    });
    await expect(
      apiFetch("/api/v1/Project/CreateProject", { method: "POST", body: {} }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("throws a network-error ApiError with status 0 when fetch itself rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { apiFetch } = await import("../apiClient");
    await expect(apiFetch("/api/v1/Project/GetProjectList")).rejects.toMatchObject({ status: 0 });
  });
});
