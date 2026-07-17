/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/projects/[id]/__tests__/route.test.ts`.
 */
import { GET, POST } from "@/app/api/timesheet-periods/route";
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

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/timesheet-periods${query}`);
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/timesheet-periods", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validCreatePayload = {
  periodStart: "2025-01-01",
  periodEnd: "2025-01-31",
};

describe("GET /api/timesheet-periods", () => {
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
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");

    const response = await GET(getRequest("?year=abc"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the list, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
            PeriodStart: "2025-01-01",
            PeriodEnd: "2025-01-31",
            IsLocked: false,
          },
        ],
      },
    });

    const response = await GET(getRequest("?isLocked=false&year=2025&month=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({ id: "6f2594d9-224a-414a-a409-30dc98f9a1be", isLocked: false }),
    ]);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/TimesheetPeriod/GetAllTimesheetPeriods",
      expect.objectContaining({
        params: { isLocked: "false", year: 2025, month: 1 },
        headers: { Authorization: "Bearer access-token" },
      })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 400, IsSuccess: false, Message: "Invalid filter.", Data: null },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Invalid filter.");
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at TimesheetPeriodService.GetAll",
        Data: null,
      },
    });

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to load timesheet periods.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(502);
  });
});

describe("POST /api/timesheet-periods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage timesheet periods", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await POST(postRequest(validCreatePayload));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);

    const response = await POST(postRequest({ periodStart: "2025-01-31", periodEnd: "2025-01-01" }));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("creates the timesheet period, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
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

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "6f2594d9-224a-414a-a409-30dc98f9a1be", periodStart: "2025-01-01" })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Overlapping timesheet period.", Data: null },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Overlapping timesheet period.");
  });

  it("sanitizes a 5xx envelope-based logical failure instead of forwarding the raw backend message", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.Data.SqlClient.SqlException",
        Data: null,
      },
    });

    const response = await POST(postRequest(validCreatePayload));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to create the timesheet period.");
  });
});
