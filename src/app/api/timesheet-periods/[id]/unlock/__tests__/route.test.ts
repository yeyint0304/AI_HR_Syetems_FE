/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/projects/[id]/__tests__/route.test.ts`.
 */
import { PUT } from "@/app/api/timesheet-periods/[id]/unlock/route";
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
  sub: "user-1",
  email: "admin@hrsystem.com",
  role: "ProjectAdmin",
});

describe("PUT /api/timesheet-periods/[id]/unlock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage timesheet periods", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("unlocks the period and returns 200 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Period unlocked.", Data: null },
    });

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Period unlocked.");
    expect(backendApiClient.put).toHaveBeenCalledWith(
      "/TimesheetPeriod/UnlockTimesheetPeriod/1",
      null,
      { headers: { Authorization: expect.stringMatching(/^Bearer /) } }
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Period is already unlocked.", Data: null },
    });

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Period is already unlocked.");
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

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to unlock the timesheet period.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await PUT(new Request("http://localhost/api/timesheet-periods/1/unlock"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
