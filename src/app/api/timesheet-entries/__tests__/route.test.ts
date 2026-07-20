/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/__tests__/route.test.ts` for the same rationale.
 */
import { GET, POST } from "@/app/api/timesheet-entries/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), post: jest.fn() },
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

const selfUserId = "f7c326c1-00b9-4aee-90c3-0000d06b37cc";
const otherUserId = "84e4be46-3d9f-4e86-ab08-74d8837958b9";

const userToken = buildToken({ sub: selfUserId, email: "user@hrsystem.com", role: "User" });
const adminToken = buildToken({ sub: "admin-1", email: "admin@hrsystem.com", role: "SystemAdmin" });

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/timesheet-entries${query}`);
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/timesheet-entries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = {
  projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
  timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
  entryDate: "2026-03-07",
  hours: 8,
  taskDescription: "Worked on feature implementation",
};

describe("GET /api/timesheet-entries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on invalid filter query params without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest("?userId=not-a-uuid"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when a plain User requests another user's entries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(getRequest(`?userId=${otherUserId}`));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("self-scopes to the caller's own userId when a plain User omits the filter", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: [] },
    });

    await GET(getRequest());

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetAllTimesheetEntries",
      expect.objectContaining({ params: expect.objectContaining({ userId: selfUserId }) })
    );
  });

  it("allows a SystemAdmin to omit the userId filter (sees every user's entries)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: [] },
    });

    await GET(getRequest());

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetAllTimesheetEntries",
      expect.objectContaining({ params: expect.objectContaining({ userId: undefined }) })
    );
  });

  it("allows a SystemAdmin to request another user's entries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: [] },
    });

    const response = await GET(getRequest(`?userId=${selfUserId}`));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetEntry/GetAllTimesheetEntries",
      expect.objectContaining({ params: expect.objectContaining({ userId: selfUserId }) })
    );
  });

  it("returns the list, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
            UserId: selfUserId,
            ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
            TimesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
            EntryDate: "2025-03-01",
            Hours: 10,
            TaskDescription: "Worked on feature implementation",
            IsApproved: true,
          },
        ],
      },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328", hours: 10, isApproved: true }),
    ]);
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 400, IsSuccess: false, Message: "Invalid filter.", Data: null },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Invalid filter.");
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at TimesheetEntryService.GetAll",
        Data: null,
      },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to load timesheet entries.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(502);
  });
});

describe("POST /api/timesheet-entries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await POST(postRequest({ ...validCreatePayload, hours: 0 }));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the timesheet entry, unwrapping the real backend's Data envelope, and never sends a UserId", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Timesheet entry created successfully.",
        Data: {
          Id: "33b9749a-ca09-4632-8a5b-bc9a8cf128d2",
          UserId: selfUserId,
          ProjectId: validCreatePayload.projectId,
          TimesheetPeriodId: validCreatePayload.timesheetPeriodId,
          EntryDate: validCreatePayload.entryDate,
          Hours: validCreatePayload.hours,
          TaskDescription: validCreatePayload.taskDescription,
          IsApproved: false,
        },
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(expect.objectContaining({ id: "33b9749a-ca09-4632-8a5b-bc9a8cf128d2" }));
    const [, sentPayload] = (backendApiClient.post as jest.Mock).mock.calls[0];
    expect(sentPayload).not.toHaveProperty("UserId");
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "This timesheet period is locked.", Data: null },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("This timesheet period is locked.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Data.SqlClient.SqlException", Data: null },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to log time for this entry.");
  });
});
