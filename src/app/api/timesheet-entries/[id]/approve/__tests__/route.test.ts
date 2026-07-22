/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/timesheet-periods/[id]/lock/__tests__/route.test.ts`.
 */
import { PUT } from "@/app/api/timesheet-entries/[id]/approve/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const projectAdminToken = buildToken({
  sub: "manager-1",
  email: "admin@hrsystem.com",
  role: "ProjectAdmin",
});

describe("PUT /api/timesheet-entries/[id]/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not approve timesheet entries", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("approves the entry and returns 200 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Timesheet entry approved successfully.",
        Data: { Id: "1", IsApproved: true, ApprovedAt: "2026-06-22T05:18:00Z", ApprovedBy: "manager-1" },
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Timesheet entry approved successfully.");
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/TimesheetEntry/ApproveTimesheetEntry/1",
      null,
      { headers: { Authorization: expect.stringMatching(/^Bearer /) } }
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Timesheet entry is already approved.", Data: null },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Timesheet entry is already approved.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.Data.SqlClient.SqlException",
        Data: null,
      },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to approve this timesheet entry.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(
      new Request("http://localhost/api/timesheet-entries/1/approve"),
      routeParams("1")
    );

    expect(response.status).toBe(502);
  });
});
