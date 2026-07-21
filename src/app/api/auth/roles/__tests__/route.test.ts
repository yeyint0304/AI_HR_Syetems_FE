/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { GET } from "@/app/api/auth/roles/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/jwt", () => ({
  decodeJwt: jest.fn(),
  mapClaimsToAuthUser: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockSystemAdminClaims = () => {
  (decodeJwt as jest.Mock).mockReturnValueOnce({});
  (mapClaimsToAuthUser as jest.Mock).mockReturnValueOnce({
    id: "user-1",
    email: "admin@hrsystem.com",
    firstName: "System",
    lastName: "Admin",
    role: "SystemAdmin",
  });
};

describe("GET /api/auth/roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("401s when the access token can't be decoded into a user", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (decodeJwt as jest.Mock).mockReturnValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for an authenticated user who is not SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (decodeJwt as jest.Mock).mockReturnValueOnce({});
    (mapClaimsToAuthUser as jest.Mock).mockReturnValueOnce({
      id: "user-2",
      email: "user@hrsystem.com",
      firstName: "Regular",
      lastName: "User",
      role: "User",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the role list for a SystemAdmin, unwrapping the backend envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    mockSystemAdminClaims();
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "11111111-1111-1111-1111-111111111101",
            Name: "SystemAdmin",
            Description: "Full system access including configuration and user management",
          },
          {
            Id: "11111111-1111-1111-1111-111111111103",
            Name: "Employee",
            Description: "Logs daily timesheet entries against assigned projects",
          },
        ],
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111101",
        name: "SystemAdmin",
        description: "Full system access including configuration and user management",
      },
      {
        id: "11111111-1111-1111-1111-111111111103",
        name: "Employee",
        description: "Logs daily timesheet entries against assigned projects",
      },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/GetRoles",
      expect.objectContaining({ headers: { Authorization: "Bearer access-token" } })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    mockSystemAdminClaims();
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET();

    expect(response.status).toBe(502);
  });
});
