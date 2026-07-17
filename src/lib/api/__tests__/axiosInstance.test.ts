/**
 * Verifies the transparent-refresh response interceptor without touching the
 * network: the mocked `axios.create()` returns a fake instance whose
 * `interceptors.response.use` call is captured so the `fulfilled`/`rejected`
 * handlers registered by `axiosInstance.ts` can be invoked directly.
 */
type FulfilledHandler = (response: unknown) => unknown;
type RejectedHandler = (error: unknown) => unknown;

interface FakeApiClient extends jest.Mock {
  post: jest.Mock;
  interceptors: {
    response: {
      handlers: Array<{ fulfilled: FulfilledHandler; rejected: RejectedHandler }>;
      use(fulfilled: FulfilledHandler, rejected: RejectedHandler): void;
    };
  };
}

function createFakeAxiosInstance(): FakeApiClient {
  const instance = jest.fn() as unknown as FakeApiClient;
  instance.post = jest.fn();
  instance.interceptors = {
    response: {
      handlers: [],
      use(fulfilled, rejected) {
        this.handlers.push({ fulfilled, rejected });
      },
    },
  };
  return instance;
}

jest.mock("axios", () => {
  const instance = createFakeAxiosInstance();
  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
    __instance: instance,
  };
});

function getModule(): { apiClient: FakeApiClient } {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/lib/api/axiosInstance") as typeof import("@/lib/api/axiosInstance");
  return { apiClient: mod.apiClient as unknown as FakeApiClient };
}

function getRejectedHandler(apiClient: FakeApiClient): RejectedHandler {
  return apiClient.interceptors.response.handlers[0].rejected;
}

describe("apiClient config", () => {
  it("uses the /api baseURL with credentials and JSON headers", () => {
    getModule();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axios = require("axios").default;
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: "/api",
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  });
});

describe("apiClient response interceptor", () => {
  it("passes successful responses through unchanged", () => {
    const { apiClient } = getModule();
    const fulfilled = apiClient.interceptors.response.handlers[0].fulfilled as (r: unknown) => unknown;
    const response = { data: { ok: true } };
    expect(fulfilled(response)).toBe(response);
  });

  it("rejects immediately when there is no request config", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    const error = { response: { status: 401 } };
    await expect(rejected(error)).rejects.toBe(error);
  });

  it("rejects immediately on non-401 errors", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    const error = { config: { url: "/projects" }, response: { status: 500 } };
    await expect(rejected(error)).rejects.toBe(error);
  });

  it("rejects immediately on a 401 that already retried once", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    const error = { config: { url: "/projects", _retry: true }, response: { status: 401 } };
    await expect(rejected(error)).rejects.toBe(error);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("never attempts a refresh for the login/refresh/logout endpoints themselves", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    const error = { config: { url: "/auth/login" }, response: { status: 401 } };
    await expect(rejected(error)).rejects.toBe(error);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("refreshes once and retries the original request on a 401", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });
    apiClient.mockResolvedValueOnce({ data: { retried: true } });

    const originalRequest = { url: "/projects" };
    const error = { config: originalRequest, response: { status: 401 } };

    await expect(rejected(error)).resolves.toEqual({ data: { retried: true } });
    expect(apiClient.post).toHaveBeenCalledWith("/auth/refresh");
    expect(apiClient).toHaveBeenCalledWith(originalRequest);
    expect((originalRequest as { _retry?: boolean })._retry).toBe(true);
  });

  it("rejects and stops queued requests if the refresh call itself fails", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);
    const refreshError = new Error("refresh failed");
    apiClient.post.mockRejectedValueOnce(refreshError);

    const error = { config: { url: "/projects" }, response: { status: 401 } };
    await expect(rejected(error)).rejects.toBe(refreshError);
  });

  it("queues concurrent 401s behind a single in-flight refresh and retries all of them", async () => {
    const { apiClient } = getModule();
    const rejected = getRejectedHandler(apiClient);

    let resolveRefresh: (value: unknown) => void = () => {};
    apiClient.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );
    apiClient.mockResolvedValue({ data: { retried: true } });

    const firstRequest = { url: "/projects" };
    const secondRequest = { url: "/timesheets" };

    const firstPromise = rejected({ config: firstRequest, response: { status: 401 } });
    const secondPromise = rejected({ config: secondRequest, response: { status: 401 } });

    expect(apiClient.post).toHaveBeenCalledTimes(1);

    resolveRefresh({ data: { ok: true } });

    await expect(firstPromise).resolves.toEqual({ data: { retried: true } });
    await expect(secondPromise).resolves.toEqual({ data: { retried: true } });
    expect(apiClient).toHaveBeenCalledWith(firstRequest);
    expect(apiClient).toHaveBeenCalledWith(secondRequest);
  });
});
