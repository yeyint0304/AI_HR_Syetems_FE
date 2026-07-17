/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/projects/[id]/__tests__/route.test.ts`.
 */
import { GET, DELETE } from "@/app/api/timesheet-periods/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), delete: jest.fn() },
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

describe("GET /api/timesheet-periods/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the period, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          PeriodStart: "2025-01-01",
          PeriodEnd: "2025-01-31",
          IsLocked: false,
        },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/timesheet-periods/6f2594d9-224a-414a-a409-30dc98f9a1be"),
      routeParams("6f2594d9-224a-414a-a409-30dc98f9a1be")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "6f2594d9-224a-414a-a409-30dc98f9a1be", periodStart: "2025-01-01" })
    );
  });

  it("returns a 404 when the backend signals a logical failure (IsSuccess: false) at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Timesheet period not found.", Data: null },
    });

    const response = await GET(new Request("http://localhost/api/timesheet-periods/missing"), routeParams("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Timesheet period not found.");
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at TimesheetPeriodService.GetById",
        Data: null,
      },
    });

    const response = await GET(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Timesheet period not found.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });
});

describe("DELETE /api/timesheet-periods/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage timesheet periods", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await DELETE(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the period and returns 204 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: null },
    });

    const response = await DELETE(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));

    expect(response.status).toBe(204);
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Cannot delete a locked period.", Data: null },
    });

    const response = await DELETE(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Cannot delete a locked period.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.Data.SqlClient.SqlException",
        Data: null,
      },
    });

    const response = await DELETE(new Request("http://localhost/api/timesheet-periods/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to delete the timesheet period.");
  });
});
