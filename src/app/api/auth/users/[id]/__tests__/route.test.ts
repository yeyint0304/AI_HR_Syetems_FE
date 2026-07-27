/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { PUT } from "@/app/api/auth/users/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
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
  return new Request("http://localhost/api/auth/users/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = {
  username: "testeredited",
  email: "test@d3-sg.com",
  firstName: "Lin Thit",
  lastName: "Htoo",
  employeeId: "EMP002",
  countryId: "22222222-2222-2222-2222-222222222201",
  isActive: true,
  roleId: "",
};

describe("PUT /api/auth/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("401s when the session token cannot be decoded", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("not-a-jwt");

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller is not a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "pm@hrsystem.com", role: "ProjectAdmin" })
    );

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid request body without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await PUT(putRequest({ ...validUpdatePayload, email: "not-an-email" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on malformed JSON", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    const request = new Request("http://localhost/api/auth/users/1", {
      method: "PUT",
      body: "{not-json",
    });

    const response = await PUT(request, routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the user, unwrapping the real backend's Data envelope and defaulting an empty roleId to null", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          UserId: "ab701225-8deb-4fac-b8e0-189f67a1161a",
          Username: "testeredited",
          Email: "test@d3-sg.com",
          FirstName: "Lin Thit",
          LastName: "Htoo",
          EmployeeId: "EMP002",
          CountryId: "22222222-2222-2222-2222-222222222201",
          IsActive: true,
          RoleName: "SystemAdmin",
        },
      },
    });

    const response = await PUT(
      putRequest(validUpdatePayload),
      routeParams("ab701225-8deb-4fac-b8e0-189f67a1161a")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "ab701225-8deb-4fac-b8e0-189f67a1161a",
        username: "testeredited",
        roleName: "SystemAdmin",
        isActive: true,
      })
    );
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/Auth/UpdateUser/ab701225-8deb-4fac-b8e0-189f67a1161a",
      {
        Username: "testeredited",
        Email: "test@d3-sg.com",
        FirstName: "Lin Thit",
        LastName: "Htoo",
        EmployeeId: "EMP002",
        CountryId: "22222222-2222-2222-2222-222222222201",
        IsActive: true,
        RoleId: null,
      },
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated user fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the user. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "User not found.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
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

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(502);
  });

  it("forwards the backend's message when the update is rejected (e.g. duplicate username)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: "Username is already taken." } },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Username is already taken.");
  });
});
