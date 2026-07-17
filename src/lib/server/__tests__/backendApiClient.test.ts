/**
 * @jest-environment node
 */
const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_URL;

function loadModule() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/lib/server/backendApiClient") as typeof import("@/lib/server/backendApiClient");
}

describe("backendApiClient", () => {
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV;
    }
  });

  it("uses NEXT_PUBLIC_API_URL as the base URL when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.hrsystem.example/api/v1";
    const { backendApiClient } = loadModule();
    expect(backendApiClient.defaults.baseURL).toBe("https://api.hrsystem.example/api/v1");
  });

  it("falls back to the documented local backend URL when unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const { backendApiClient } = loadModule();
    expect(backendApiClient.defaults.baseURL).toBe("https://localhost:7195/api/v1");
  });

  it("sets a 15s timeout and JSON content-type headers", () => {
    const { backendApiClient } = loadModule();
    expect(backendApiClient.defaults.timeout).toBe(15_000);
    expect(backendApiClient.defaults.headers.common["Content-Type"] ?? backendApiClient.defaults.headers["Content-Type"]).toBe(
      "application/json"
    );
  });
});
