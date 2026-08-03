/**
 * @jest-environment node
 */
import { GET } from "@/app/api/reports/cost-revenue/export/route";
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

const userToken = buildToken({ sub: "u1", email: "user@hrsystem.com", role: "User" });
const projectAdminToken = buildToken({ sub: "pa1", email: "pa@d3-sg.com", role: "ProjectAdmin" });
const systemAdminToken = buildToken({ sub: "sa1", email: "sa@hrsystem.com", role: "SystemAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/reports/cost-revenue/export${query}`);
}

describe("GET /api/reports/cost-revenue/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a plain User", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("calls Report/ExportMonthlyCostRevenue for a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith("/Report/ExportMonthlyCostRevenue", expect.anything());
  });

  it("calls Report/ExportMyCostRevenue for a ProjectAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: new ArrayBuffer(0) });

    const response = await GET(getRequest("?year=2026&month=7"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith("/Report/ExportMyCostRevenue", expect.anything());
  });
});
