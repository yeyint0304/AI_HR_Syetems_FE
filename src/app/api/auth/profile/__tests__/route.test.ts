/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { PUT } from "@/app/api/auth/profile/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken, getUsernameCookie, setUsernameCookie } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
  getUsernameCookie: jest.fn(),
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
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validPayload = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  countryId: null,
};

describe("PUT /api/auth/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(null);
    const response = await PUT(jsonRequest(validPayload));
    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "Employee" })
    );
    const response = await PUT(jsonRequest({ firstName: "", lastName: "", email: "not-an-email" }));
    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it(
    "caches Username from the Auth/UpdateProfile response body, since the real backend's JWT " +
      "carries no username claim",
    async () => {
      (getAccessToken as jest.Mock).mockResolvedValue(
        buildToken({ sub: "1", email: "jane@example.com", role: "Employee" })
      );
      (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 200,
          IsSuccess: true,
          Message: "Success",
          Data: {
            UserId: "1",
            Username: "jane.doe",
            Email: "jane@example.com",
            FirstName: "Jane",
            LastName: "Doe",
            CountryId: null,
          },
        },
      });

      const response = await PUT(jsonRequest(validPayload));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.user).toEqual(expect.objectContaining({ username: "jane.doe", email: "jane@example.com" }));
      expect(setUsernameCookie).toHaveBeenCalledWith("jane.doe");
    }
  );

  it("falls back to the previously cached USERNAME_COOKIE when the backend response omits Username", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "Employee" })
    );
    (getUsernameCookie as jest.Mock).mockResolvedValue("jane.doe");
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({ data: { Data: {} } });

    const response = await PUT(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual(expect.objectContaining({ username: "jane.doe" }));
  });

  it("normalizes a backend failure into a friendly error response", async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(
      buildToken({ sub: "1", email: "jane@example.com", role: "Employee" })
    );
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(jsonRequest(validPayload));
    expect(response.status).toBe(502);
    expect(setUsernameCookie).not.toHaveBeenCalled();
  });
});
