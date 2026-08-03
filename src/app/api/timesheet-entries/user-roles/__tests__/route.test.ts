/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/__tests__/route.test.ts` for the same rationale.
 */
import { GET } from "@/app/api/timesheet-entries/user-roles/route";
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

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const projectAdminToken = buildToken({ sub: "pa-1", email: "pa@hrsystem.com", role: "ProjectAdmin" });
const systemAdminToken = buildToken({ sub: "admin-1", email: "admin@hrsystem.com", role: "SystemAdmin" });
const employeeToken = buildToken({ sub: "emp-1", email: "employee@hrsystem.com", role: "Employee" });

describe("GET /api/timesheet-entries/user-roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a plain Employee", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(employeeToken);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("calls Auth/SearchUsers?isAllRole=true and returns the mapped directory for a ProjectAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          TotalCount: 2,
          PageNo: 1,
          PageSize: 500,
          Items: [
            { UserId: "user-1", RoleName: "SystemAdmin" },
            { UserId: "user-2", RoleName: "Employee" },
          ],
        },
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Auth/SearchUsers",
      expect.objectContaining({ params: expect.objectContaining({ isAllRole: true }) })
    );
    expect(body.data).toEqual([
      { userId: "user-1", roleName: "SystemAdmin" },
      { userId: "user-2", roleName: "Employee" },
    ]);
  });

  it("also succeeds for a SystemAdmin caller", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Items: [] } },
    });

    const response = await GET();

    expect(response.status).toBe(200);
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
});
