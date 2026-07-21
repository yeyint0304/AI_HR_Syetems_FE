/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts`.
 */
import { GET } from "@/app/api/auth/unassigned-users/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
function buildToken(claims: Record<string, unknown>): string {
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify(claims)),
    "sig",
  ].join(".");
}

const projectAdminToken = buildToken({
  sub: "user-1",
  email: "admin@hrsystem.com",
  role: "ProjectAdmin",
});

describe("GET /api/auth/unassigned-users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage projects", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the unassigned-user list for a ProjectAdmin caller, unwrapping the backend envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            UserId: "00000000-0000-0000-0000-000000000001",
            Username: "admin",
            Email: "admin@hrsystem.com",
            FirstName: "System",
            LastName: "Admin",
            EmployeeId: "EMP-0001",
          },
        ],
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "00000000-0000-0000-0000-000000000001",
        username: "admin",
        email: "admin@hrsystem.com",
        firstName: "System",
        lastName: "Admin",
        employeeId: "EMP-0001",
      },
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/GetUnassignedUsers",
      expect.objectContaining({ headers: { Authorization: `Bearer ${projectAdminToken}` } })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET();

    expect(response.status).toBe(502);
  });

  it("treats a 404 from the backend as an empty list rather than an error", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { message: "Not Found" } },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
