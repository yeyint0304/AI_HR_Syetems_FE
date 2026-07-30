/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { POST } from "@/app/api/auth/login/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { setAuthCookies, setUsernameCookie } from "@/lib/server/authCookies";
import { MOCK_LOGIN_HINT } from "@/lib/server/mockAuth";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { post: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  setAuthCookies: jest.fn(),
  setUsernameCookie: jest.fn(),
}));

function buildToken(claims: Record<string, unknown>): string {
  const base64Url = (value: string) =>
    Buffer.from(value, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const originalNodeEnv = process.env.NODE_ENV;

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalNodeEnv, configurable: true });
  });

  it("400s on an invalid payload without calling the backend", async () => {
    const response = await POST(jsonRequest({ usernameOrEmail: "", password: "" }));
    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("signs in against the real backend and sets auth cookies", async () => {
    const accessToken = buildToken({
      sub: "1",
      email: "jane@example.com",
      role: "User",
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { AccessToken: accessToken, RefreshToken: "real-refresh-token" },
    });

    const response = await POST(
      jsonRequest({ usernameOrEmail: "jane@example.com", password: "Password1!" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(expect.objectContaining({ email: "jane@example.com", role: "User" }));
    expect(setAuthCookies).toHaveBeenCalledWith(accessToken, "real-refresh-token", expect.any(Number));
    expect(setUsernameCookie).not.toHaveBeenCalled();
  });

  it("resolves username from the real backend's response body (the JWT itself never carries one) and caches it", async () => {
    const accessToken = buildToken({
      sub: "1",
      email: "admin@hrsystem.com",
      role: "SystemAdmin",
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: { AccessToken: accessToken, RefreshToken: "real-refresh-token", Username: "admin" },
      },
    });

    const response = await POST(jsonRequest({ usernameOrEmail: "admin", password: "Password@123" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(expect.objectContaining({ username: "admin" }));
    expect(setUsernameCookie).toHaveBeenCalledWith("admin");
  });

  it("returns a generic 401 for real backend credential failures (no mock fallback)", async () => {
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    const response = await POST(
      jsonRequest({ usernameOrEmail: "jane@example.com", password: "wrong" })
    );
    expect(response.status).toBe(401);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it("falls back to the mock login when the backend is unreachable and NODE_ENV !== production", async () => {
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      code: "ECONNREFUSED",
      response: undefined,
    });

    const [{ usernameOrEmail, password }] = MOCK_LOGIN_HINT;
    const response = await POST(jsonRequest({ usernameOrEmail, password }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(expect.objectContaining({ username: usernameOrEmail }));
    expect(setAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown mock credentials with a generic 401 even when the backend is unreachable", async () => {
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      code: "ECONNREFUSED",
      response: undefined,
    });

    const response = await POST(
      jsonRequest({ usernameOrEmail: "not-a-mock-user", password: "whatever" })
    );
    expect(response.status).toBe(401);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it("never falls back to the mock login in production, even if the backend is unreachable", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      code: "ECONNREFUSED",
      response: undefined,
    });

    const [{ usernameOrEmail, password }] = MOCK_LOGIN_HINT;
    const response = await POST(jsonRequest({ usernameOrEmail, password }));

    expect(response.status).toBe(502);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });
});
