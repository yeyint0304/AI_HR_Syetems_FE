/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-entries/__tests__/route.test.ts` for the same rationale.
 */
import { GET } from "@/app/api/reports/timesheet/route";
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
const otherUserId = "84e4be46-3d9f-4e86-ab08-74d8837958b9";

const userToken = buildToken({ sub: selfUserId, email: "user@hrsystem.com", role: "User" });
const adminToken = buildToken({ sub: "admin-1", email: "admin@hrsystem.com", role: "SystemAdmin" });
const projectAdminToken = buildToken({ sub: "pa-1", email: "pa@d3-sg.com", role: "ProjectAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/reports/timesheet${query}`);
}

const successEnvelope = {
  StatusCode: 200,
  IsSuccess: true,
  Message: "Success",
  Data: {
    ReportGeneratedAt: "2026-07-20T00:00:00Z",
    StartDate: "2026-07-01",
    EndDate: "2026-07-20",
    TotalHours: 8,
    TotalCount: 1,
    Page: 1,
    PageSize: 100,
    Items: [],
  },
};

describe("GET /api/reports/timesheet", () => {
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

  it("400s when startDate is after endDate", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest("?startDate=2026-07-20&endDate=2026-07-01"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when a plain User requests another user's timesheet report", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest(`?startDate=2026-07-01&endDate=2026-07-20&userId=${otherUserId}`));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("self-scopes to the caller's own userId when a plain User omits the filter", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: selfUserId }) })
    );
  });

  it("allows a SystemAdmin to omit the userId filter (sees every user's rows)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
    );
  });

  it("allows a SystemAdmin to request another user's report", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest(`?startDate=2026-07-01&endDate=2026-07-20&userId=${otherUserId}`));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: otherUserId }) })
    );
  });

  it("calls Report/GenerateMyTimesheetReport for a ProjectAdmin, omitting userId", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateMyTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
    );
  });

  it("defaults pageSize to DEFAULT_TIMESHEET_REPORT_PAGE_SIZE when omitted", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Report/GenerateTimesheetReport",
      expect.objectContaining({ params: expect.objectContaining({ pageSize: 100 }) })
    );
  });

  it("returns the mapped report, unwrapping the backend envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: successEnvelope });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ startDate: "2026-07-01", endDate: "2026-07-20", totalHours: 8 })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 400, IsSuccess: false, Message: "Invalid date range.", Data: null },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Invalid date range.");
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at ReportService",
        Data: null,
      },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to generate the timesheet report.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });

  it("returns a 502 fallback when the backend call itself throws", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest("?startDate=2026-07-01&endDate=2026-07-20"));

    expect(response.status).toBe(502);
  });
});
