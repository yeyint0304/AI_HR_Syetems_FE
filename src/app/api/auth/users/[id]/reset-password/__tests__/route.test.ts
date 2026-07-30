/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { PUT } from "@/app/api/auth/users/[id]/reset-password/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const systemAdminToken = buildToken({ sub: "user-1", email: "admin@hrsystem.com", role: "SystemAdmin" });

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/users/1/reset-password", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validPayload = {
  newPassword: "P@ssw0rd123",
  confirmNewPassword: "P@ssw0rd123",
};

describe("PUT /api/auth/users/[id]/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validPayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("401s when the session token cannot be decoded", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("not-a-jwt");

    const response = await PUT(putRequest(validPayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller is not a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "pm@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await PUT(putRequest(validPayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid request body without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(
      putRequest({ newPassword: "weak", confirmNewPassword: "weak" }),
      routeParams("1")
    );

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s when the confirmation does not match, without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(
      putRequest({ newPassword: "P@ssw0rd123", confirmNewPassword: "Mismatch123!" }),
      routeParams("1")
    );

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on malformed JSON", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    const request = new Request("http://localhost/api/auth/users/1/reset-password", {
      method: "PUT",
      body: "{not-json",
    });

    const response = await PUT(request, routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("resets the password and forwards the backend's confirmation message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Password reset successfully.",
        Data: null,
      },
    });

    const response = await PUT(putRequest(validPayload), routeParams("84e4be46-3d9f-4e86-ab08-74d8837958b9"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Password reset successfully." });
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/Auth/ResetPassword/84e4be46-3d9f-4e86-ab08-74d8837958b9",
      { NewPassword: "P@ssw0rd123", ConfirmNewPassword: "P@ssw0rd123" },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "User not found.", Data: null },
    });

    const response = await PUT(putRequest(validPayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("User not found.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(putRequest(validPayload), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
