/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `src/__tests__/proxy.test.ts` / `app/api/auth/login/__tests__/route.test.ts`.
 */
import { GET, POST } from "@/app/api/projects/[id]/assignments/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), post: jest.fn() },
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

const nonManagerToken = buildToken({
  sub: "user-2",
  email: "user@hrsystem.com",
  role: "User",
});

const validAssignPayload = {
  userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
  resourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/1/assignments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/projects/[id]/assignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/projects/1/assignments"), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage projects", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(nonManagerToken);

    const response = await GET(new Request("http://localhost/api/projects/1/assignments"), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the assignment list, unwrapping the backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
            UserId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
            ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          },
        ],
      },
    });

    const response = await GET(new Request("http://localhost/api/projects/1/assignments"), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
        userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
      }),
    ]);
  });
});

describe("POST /api/projects/[id]/assignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage projects", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(nonManagerToken);

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload without calling the backend", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);

    const response = await POST(jsonRequest({ userId: "", resourceRoleTypeId: "" }), routeParams("1"));

    expect(response.status).toBe(400);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("assigns the resource, unwrapping the real backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
          ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          UserId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
          ResourceRoleTypeId: "44444444-4444-4444-4444-444444444401",
          AssignedAt: "2026-06-18T14:11:57.214343Z",
        },
      },
    });

    const response = await POST(jsonRequest(validAssignPayload), routeParams("6f2594d9-224a-414a-a409-30dc98f9a1be"));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "12565026-b4b4-45d8-a7db-5d0537cf66ab",
        userId: "84e4be46-3d9f-4e86-ab08-74d8837958b9",
      })
    );
    // The raw enveloped shape (StatusCode/IsSuccess/Message/Data) must never
    // reach the client directly.
    expect(body.data).not.toHaveProperty("StatusCode");
    expect(body.data).not.toHaveProperty("Data");
  });

  it(
    "returns a 409 with the backend's message when the user is already assigned " +
      "(logical failure signaled as IsSuccess: false at HTTP 200 — the bugs/timesheet-history fix)",
    async () => {
      (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
      (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          StatusCode: 409,
          IsSuccess: false,
          Message: "User is already assigned to a project.",
          Data: null,
        },
      });

      const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toBe("User is already assigned to a project.");
    }
  );

  it("falls back to a 409 status when the backend's logical failure omits a usable StatusCode", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { IsSuccess: false, Message: "User is already assigned to a project.", Data: null },
    });

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("User is already assigned to a project.");
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

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to assign the user. Please try again.");
  });

  it("returns a generic 502 (not the raw backend envelope) when the assignment fails to map", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Unexpected: "shape" } },
    });

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to assign the user. Please try again." });
    expect(body).not.toHaveProperty("Unexpected");
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns a 502 fallback when the backend call itself fails (transport-level error)", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await POST(jsonRequest(validAssignPayload), routeParams("1"));

    expect(response.status).toBe(502);
  });
});
