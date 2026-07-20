/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/auth/login/__tests__/route.test.ts`.
 */
import { GET, PUT } from "@/app/api/projects/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), put: jest.fn() },
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

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

const validUpdatePayload = {
  name: "Project Helix",
  code: "PRJ-001",
  clientName: "Tokio Marine",
  clientEmail: "lin.htoo@tokiomarine-life.sg",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  maxDailyHours: 20,
  isActive: true,
};

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/projects/1"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the project, unwrapping the real backend's Data envelope (per the saved Project/GetProject example)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          Code: "PRJ-001",
          Name: "Project Helix",
          Description: "Straight Through Processing",
          ClientName: "Tokio Marine",
          ClientEmail: "lin.htoo@tokiomarine-life.sg",
          StartDate: "2025-01-01",
          EndDate: "2025-12-31",
          MaxDailyHours: 20,
          IsActive: true,
        },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/projects/6f2594d9-224a-414a-a409-30dc98f9a1be"),
      routeParams("6f2594d9-224a-414a-a409-30dc98f9a1be")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        code: "PRJ-001",
        name: "Project Helix",
      })
    );
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Project/GetProject/6f2594d9-224a-414a-a409-30dc98f9a1be",
      { headers: { Authorization: "Bearer access-token" } }
    );
  });

  it("returns a 404 when the backend signals a logical failure (IsSuccess: false) at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Project not found.", Data: null },
    });

    const response = await GET(new Request("http://localhost/api/projects/missing"), routeParams("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Project not found.");
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(new Request("http://localhost/api/projects/1"), routeParams("1"));

    expect(response.status).toBe(502);
  });

  it("hides the backend's raw message for a 5xx logical failure at HTTP 200 (Security Report finding #1)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce("access-token");
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 500,
        IsSuccess: false,
        Message: "System.NullReferenceException at ProjectService.GetProject",
        Data: null,
      },
    });

    const response = await GET(new Request("http://localhost/api/projects/1"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Project not found.");
    expect(body.message).not.toMatch(/NullReferenceException/);
  });
});

describe("PUT /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage projects", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(
      buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" })
    );

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);

    const response = await PUT(jsonRequest({ ...validUpdatePayload, clientEmail: "not-an-email" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the project, unwrapping the real backend's Data envelope (Security Report finding #4)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          Code: "PRJ-001",
          Name: "Project Helix",
          ClientName: "Tokio Marine",
          ClientEmail: "lin.htoo@tokiomarine-life.sg",
          StartDate: "2025-01-01",
          EndDate: "2025-12-31",
          MaxDailyHours: 20,
          IsActive: true,
        },
      },
    });

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("6f2594d9-224a-414a-a409-30dc98f9a1be"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "6f2594d9-224a-414a-a409-30dc98f9a1be", code: "PRJ-001" })
    );
    // The raw enveloped shape (StatusCode/IsSuccess/Message/Data) must never
    // reach the client directly.
    expect(body.data).not.toHaveProperty("StatusCode");
    expect(body.data).not.toHaveProperty("Data");
  });

  it("returns a generic 502 (not the raw backend envelope) when the updated project fails to map (Security Report finding #4)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to update the project. Please try again." });
    expect(body).not.toHaveProperty("Unexpected");
    expect(logger.error).toHaveBeenCalled();
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

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to update the project. Please try again.");
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Project code already in use.", Data: null },
    });

    const response = await PUT(jsonRequest(validUpdatePayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Project code already in use.");
  });
});
