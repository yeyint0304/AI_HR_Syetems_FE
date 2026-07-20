/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see
 * `app/api/timesheet-periods/[id]/__tests__/route.test.ts` for the same rationale.
 */
import { DELETE, GET, PUT } from "@/app/api/timesheet-entries/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
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

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/timesheet-entries/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function ownEntryEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      StatusCode: 200,
      IsSuccess: true,
      Message: "Success",
      Data: {
        Id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
        UserId: selfUserId,
        ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        TimesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
        EntryDate: "2025-03-01",
        Hours: 8,
        TaskDescription: "Worked on feature implementation",
        IsApproved: false,
        ...overrides,
      },
    },
  };
}

describe("GET /api/timesheet-entries/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the entry, unwrapping the real backend's Data envelope, when the caller is the owner", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());

    const response = await GET(
      new Request("http://localhost/api/timesheet-entries/b365fa4d-6a30-4c5b-ae33-6161d9f81328"),
      routeParams("b365fa4d-6a30-4c5b-ae33-6161d9f81328")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328", hours: 8 })
    );
  });

  it("403s when the entry belongs to a different user and the caller is not a manager", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ UserId: otherUserId }));

    const response = await GET(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(403);
  });

  it("allows a SystemAdmin to view another user's entry", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(adminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ UserId: otherUserId }));

    const response = await GET(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(200);
  });

  it("returns a 404 when the backend signals a logical failure (IsSuccess: false) at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Timesheet entry not found.", Data: null },
    });

    const response = await GET(new Request("http://localhost/api/timesheet-entries/missing"), routeParams("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Timesheet entry not found.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});

describe("PUT /api/timesheet-entries/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validUpdatePayload = { hours: 6, taskDescription: "Updated task description" };

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await PUT(putRequest({ hours: 0, taskDescription: "" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the entry belongs to a different user and the caller is not a manager", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ UserId: otherUserId }));

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("409s when the entry has already been approved", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ IsApproved: true }));

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/cannot be edited/i);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the entry after confirming ownership", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Timesheet entry updated successfully.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("b365fa4d-6a30-4c5b-ae33-6161d9f81328"));

    expect(response.status).toBe(200);
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/TimesheetEntry/UpdateTimesheetEntry/b365fa4d-6a30-4c5b-ae33-6161d9f81328",
      { Hours: 6, TaskDescription: "Updated task description" },
      expect.objectContaining({ headers: { Authorization: `Bearer ${userToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure on update", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "This timesheet period is locked.", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("This timesheet period is locked.");
  });

  it("sanitizes a 5xx envelope-based logical failure on update", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Data.SqlClient.SqlException", Data: null },
    });

    const response = await PUT(putRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to update the timesheet entry.");
  });
});

describe("DELETE /api/timesheet-entries/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the entry belongs to a different user and the caller is not a manager", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ UserId: otherUserId }));

    const response = await DELETE(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("409s when the entry has already been approved", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope({ IsApproved: true }));

    const response = await DELETE(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toMatch(/cannot be deleted/i);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the entry and returns 204 after confirming ownership", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Timesheet entry deleted successfully.", Data: null },
    });

    const response = await DELETE(
      new Request("http://localhost/api/timesheet-entries/1"),
      routeParams("b365fa4d-6a30-4c5b-ae33-6161d9f81328")
    );

    expect(response.status).toBe(204);
    expect(backendApiClient.delete).toHaveBeenCalledWith(
      "/TimesheetEntry/DeleteTimesheetEntry/b365fa4d-6a30-4c5b-ae33-6161d9f81328",
      expect.objectContaining({ headers: { Authorization: `Bearer ${userToken}` } })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure on delete", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Cannot delete a locked entry.", Data: null },
    });

    const response = await DELETE(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Cannot delete a locked entry.");
  });

  it("sanitizes a 5xx envelope-based logical failure on delete", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce(ownEntryEnvelope());
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 500, IsSuccess: false, Message: "System.Data.SqlClient.SqlException", Data: null },
    });

    const response = await DELETE(new Request("http://localhost/api/timesheet-entries/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to delete the timesheet entry.");
  });
});
