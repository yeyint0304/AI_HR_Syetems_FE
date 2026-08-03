/**
 * @jest-environment node
 */
import { GET } from "@/app/api/reports/roles-summary/route";
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
const projectAdminToken = buildToken({ sub: "pa1", email: "pa@hrsystem.com", role: "ProjectAdmin" });
const systemAdminToken = buildToken({ sub: "sa1", email: "sa@hrsystem.com", role: "SystemAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/reports/roles-summary${query}`);
}

const successEnvelope = {
  StatusCode: 200,
  IsSuccess: true,
  Message: "Success",
  Data: { StartDate: "2026-07-01", EndDate: "2026-07-20", GrandTotalHours: 0, Summary: [] },
};

describe("GET /api/reports/roles-summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a plain User (not SystemAdmin/ProjectAdmin)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("allows a ProjectAdmin, calling Report/GenerateMyUserRolesSummary", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateMyUserRolesSummary",
      expect.anything()
    );
  });

  it("allows a SystemAdmin, calling Report/GenerateUserRolesSummary", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateUserRolesSummary",
      expect.anything()
    );
  });

  it("400s on a missing required date filter, even for an authorized role", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(getRequest());

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the mapped summary, unwrapping the backend envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          StartDate: "2026-07-01",
          EndDate: "2026-07-20",
          GrandTotalHours: 40,
          Summary: [{ ResourceRoleType: { Id: "r1", Name: "Developer" }, TotalHours: 40, UserCount: 2 }],
        },
      },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.grandTotalHours).toBe(40);
    expect(body.data.summary).toEqual([
      { resourceRoleType: { id: "r1", name: "Developer" }, totalHours: 40, userCount: 2 },
    ]);
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Exception internal detail", Data: null },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to generate the user roles summary.");
  });
});
