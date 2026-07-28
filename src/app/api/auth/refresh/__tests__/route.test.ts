/**
 * @jest-environment node
 */
import { POST } from "@/app/api/auth/refresh/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { clearAuthCookies, getRefreshToken, getUsernameCookie, setAuthCookies } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { post: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  clearAuthCookies: jest.fn(),
  getRefreshToken: jest.fn(),
  getUsernameCookie: jest.fn(),
  setAuthCookies: jest.fn(),
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

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s with no cookie clearing when there is no refresh-token cookie", async () => {
    (getRefreshToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST();
    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("overlays the cached username cookie when the refreshed JWT has no username claim", async () => {
    (getRefreshToken as jest.Mock).mockResolvedValueOnce("refresh-token");
    const accessToken = buildToken({
      sub: "1",
      email: "admin@hrsystem.com",
      role: "SystemAdmin",
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { AccessToken: accessToken, RefreshToken: "new-refresh-token" },
    });
    (getUsernameCookie as jest.Mock).mockResolvedValueOnce("admin");

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(expect.objectContaining({ username: "admin" }));
    expect(setAuthCookies).toHaveBeenCalledWith(accessToken, "new-refresh-token", expect.any(Number));
  });

  it("keeps the JWT-derived username as-is when the refreshed JWT already carries one", async () => {
    (getRefreshToken as jest.Mock).mockResolvedValueOnce("refresh-token");
    const accessToken = buildToken({
      sub: "1",
      email: "jane@example.com",
      unique_name: "jane",
      role: "Employee",
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { AccessToken: accessToken, RefreshToken: "new-refresh-token" },
    });

    const response = await POST();
    const body = await response.json();

    expect(body.user).toEqual(expect.objectContaining({ username: "jane" }));
    expect(getUsernameCookie).not.toHaveBeenCalled();
  });

  it("clears cookies and returns 401 when the backend rejects the refresh token", async () => {
    (getRefreshToken as jest.Mock).mockResolvedValueOnce("stale-refresh-token");
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    const response = await POST();
    expect(response.status).toBe(401);
    expect(clearAuthCookies).toHaveBeenCalledTimes(1);
  });
});
