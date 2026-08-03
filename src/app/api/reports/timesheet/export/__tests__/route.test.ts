/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/reports/timesheet/__tests__/route.test.ts` for the same rationale.
 */
import { GET } from "@/app/api/reports/timesheet/export/route";
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
  return Buffer.from(value, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(".");
}

const selfUserId = "f7c326c1-00b9-4aee-90c3-0000d06b37cc";
const userToken = buildToken({ sub: selfUserId, email: "user@hrsystem.com", role: "User" });
const adminToken = buildToken({ sub: "admin-1", email: "admin@hrsystem.com", role: "SystemAdmin" });
const projectAdminToken = buildToken({ sub: "pa-1", email: "pa@d3-sg.com", role: "ProjectAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/reports/timesheet/export${query}`);
}

describe("GET /api/reports/timesheet/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s when startDate/endDate are missing", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest());

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("calls Report/ExportTimesheetReport for a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/ExportTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
    );
  });

  it("calls Report/ExportMyTimesheetReport for a ProjectAdmin, omitting userId", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/ExportMyTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
    );
  });

  it("self-scopes to the caller's own userId for a plain User", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/ExportTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: selfUserId }) })
    );
  });

  it("returns a 502 fallback when the backend call itself throws", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: undefined },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(502);
  });
});
