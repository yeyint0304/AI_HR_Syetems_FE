/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/__tests__/route.test.ts` for the same rationale.
 */
import { GET } from "@/app/api/timesheet-entries/project-admin-summary/route";
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

const projectAdminToken = buildToken({
  sub: "pa-1",
  email: "pa@hrsystem.com",
  role: "ProjectAdmin",
});
const systemAdminToken = buildToken({
  sub: "admin-1",
  email: "admin@hrsystem.com",
  role: "SystemAdmin",
});
const userToken = buildToken({ sub: "user-1", email: "user@hrsystem.com", role: "User" });

const PROJECT_ID = "17342891-4f2f-433b-a814-03f64b4f0df3";

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/timesheet-entries/project-admin-summary${query}`);
}

describe("GET /api/timesheet-entries/project-admin-summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a SystemAdmin (has its own GetAllTimesheetEntries route)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(getRequest());

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s for a plain User", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest());

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on an invalid projectId without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);

    const response = await GET(getRequest("?projectId=not-a-uuid"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("calls the backend's GetProjectAdminTimesheetSummary (not GetAllTimesheetEntries) for a ProjectAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: { TotalHours: 0, ApprovedHours: 0, PendingHours: 0, ProjectSummaries: [], Entries: [] },
      },
    });

    await GET(getRequest(`?projectId=${PROJECT_ID}`));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetProjectAdminTimesheetSummary",
      expect.objectContaining({ params: { projectId: PROJECT_ID, page: 1, pageSize: 20 } })
    );
  });

  it("allows omitting projectId", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: null },
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetProjectAdminTimesheetSummary",
      expect.objectContaining({ params: { projectId: undefined, page: 1, pageSize: 20 } })
    );
  });

  it("returns the summary, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          TotalHours: 40,
          ApprovedHours: 20,
          PendingHours: 20,
          ProjectSummaries: [
            {
              ProjectId: PROJECT_ID,
              ProjectCode: "D3SG001",
              ProjectName: "Straight Through Processing Enhancement Phase 1",
              TotalHours: 40,
              ApprovedHours: 20,
              PendingHours: 20,
            },
          ],
          Entries: [
            {
              Id: "5a24c616-eba8-4c6f-b4dd-1928a896d792",
              UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
              ProjectId: PROJECT_ID,
              TimesheetPeriodId: "be79b007-2525-404d-9946-b49efca89872",
              EntryDate: "2026-03-07",
              Hours: 20,
              TaskDescription: "Worked on feature implementation",
              IsApproved: true,
            },
          ],
        },
      },
    });

    const response = await GET(getRequest(`?projectId=${PROJECT_ID}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        totalHours: 40,
        approvedHours: 20,
        pendingHours: 20,
        projectSummaries: [expect.objectContaining({ projectId: PROJECT_ID, totalHours: 40 })],
        entries: [expect.objectContaining({ id: "5a24c616-eba8-4c6f-b4dd-1928a896d792", hours: 20 })],
      })
    );
  });

  // `feature/timesheets-pagination`: this endpoint's `Items`/`TotalCount`/
  // `TotalPages`/`PageNo`/`PageSize` fields mean it paginates its entry list
  // just like `GetAllTimesheetEntries` — an explicit `page`/`pageSize` is
  // forwarded to the backend, and the response echoes back the resolved
  // pagination metadata alongside the existing summary/entries fields.
  it("forwards an explicit page/pageSize and returns pagination metadata", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          TotalHours: 40,
          ApprovedHours: 20,
          PendingHours: 20,
          ProjectSummaries: [],
          TotalCount: 25,
          TotalPages: 3,
          PageNo: 2,
          PageSize: 10,
          Items: [
            {
              Id: "5a24c616-eba8-4c6f-b4dd-1928a896d792",
              UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
              ProjectId: PROJECT_ID,
              TimesheetPeriodId: "be79b007-2525-404d-9946-b49efca89872",
              EntryDate: "2026-03-07",
              Hours: 20,
              TaskDescription: "Worked on feature implementation",
              IsApproved: true,
            },
          ],
        },
      },
    });

    const response = await GET(getRequest(`?projectId=${PROJECT_ID}&page=2&pageSize=10`));
    const body = await response.json();

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetProjectAdminTimesheetSummary",
      expect.objectContaining({ params: { projectId: PROJECT_ID, page: 2, pageSize: 10 } })
    );
    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        totalCount: 25,
        totalPages: 3,
        page: 2,
        pageSize: 10,
        entries: [expect.objectContaining({ id: "5a24c616-eba8-4c6f-b4dd-1928a896d792" })],
      })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 400, IsSuccess: false, Message: "Invalid project.", Data: null },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Invalid project.");
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at TimesheetEntryService.GetProjectAdminSummary",
        Data: null,
      },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to load this project's timesheet summary.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(502);
  });
});
